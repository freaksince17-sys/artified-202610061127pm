import { TrackedOrderData, OrderDetails, OrderProductionPhase, TrackingMilestone } from '../types';
import { recordOrderStatusChange } from '../utils/orderNotificationManager';
import {
  saveOrderToFirestore,
  deleteOrderFromFirestore,
  purgeAllOrdersFromFirestore,
  CURRENT_ORDER_GENERATION,
  CURRENT_PURGE_EPOCH
} from '../services/orderTrackingService';
import { db } from '../firebase';
import { doc, getDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { getRealProductImage } from '../utils/productImages';
import SAVED_TRACKED_ORDERS from './tracked_orders.json';

/**
 * Permanently purged legacy Order IDs (canonical compact uppercase without '#' or '-')
 */
const PERMANENTLY_PURGED_CANONICAL_IDS = new Set<string>([
  'ART20264846',
  'ART20265526',
  'ART20268842',
  'ART20265521',
  'ART20263190',
  'ART20263829',
  'ART20265157',
  'ART20264729'
]);

/**
 * Maps the customer's first two random Order IDs (#ART-2026-615397 and #ART-2026-423390)
 * to their official progressive Order IDs (#ART-2026-1852 and #ART-2026-1853) so that pasting
 * either the original random ID or the progressive ID works seamlessly everywhere.
 */
export const LEGACY_ORDER_ID_ALIASES: Record<string, string> = {
  'ART2026615397': 'ART-2026-1852',
  '615397': 'ART-2026-1852',
  'ART2026423390': 'ART-2026-1853',
  '423390': 'ART-2026-1853'
};

/**
 * Raw legacy strings that were mistakenly added to deleted_orders previously and must never block
 * the customer's rescued orders #ART-2026-615397 (#ART-2026-1852) and #ART-2026-423390 (#ART-2026-1853).
 */
const RESCUED_RAW_LEGACY_COMPACT_IDS = new Set<string>([
  'ART2026615397',
  'ART2026423390'
]);

/**
 * In-memory set of deleted canonical Order IDs synced from Firestore `store_settings/deleted_orders`
 */
const CLOUD_DELETED_CANONICAL_IDS = new Set<string>();

/**
 * In-memory map of highest progressive sequence number per year synced from Firestore `store_settings/order_sequence`
 */
const CLOUD_MAX_SEQUENCE: Record<number, number> = {};

function getRawCompactKey(id: string): string {
  return (id || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function registerCloudDeletedOrderIds(ids: string[]): void {
  if (!Array.isArray(ids)) return;
  for (const raw of ids) {
    if (typeof raw === 'string' && raw.trim()) {
      const rawCompact = getRawCompactKey(raw);
      if (RESCUED_RAW_LEGACY_COMPACT_IDS.has(rawCompact)) {
        continue;
      }
      const canonical = getCanonicalOrderKey(raw);
      if (canonical) {
        CLOUD_DELETED_CANONICAL_IDS.add(canonical);
      }
    }
  }
}

/**
 * Builds the 4 exact milestones requested:
 * 1. Order Confirmed & Paid
 * 2. Handcrafting & Packaging
 * 3. Out for Delivery
 * 4. Delivered
 */
export function buildMilestonesForPhase(
  phase: OrderProductionPhase,
  orderPlacedDate = 'Recently Placed',
  estimatedDeliveryDate = 'Within 1–2 days',
  location = 'Inside Ring Road (Kathmandu / Lalitpur)'
): TrackingMilestone[] {
  const isDelivered = phase === 'delivered';
  const isOut = phase === 'out_for_delivery' || isDelivered;
  const isCrafting = phase === 'handcrafting_and_packaging' || isOut;

  return [
    {
      stage: 'confirmed',
      label: 'Order Confirmed & Paid',
      description: 'Order confirmed and verified. Materials and pearls reserved at Kathmandu workshop.',
      timestamp: orderPlacedDate,
      location: 'Artified Workshop, Kathmandu',
      completed: phase !== 'confirmed' || isDelivered,
      current: phase === 'confirmed',
    },
    {
      stage: 'handcrafting_and_packaging',
      label: 'Handcrafting & Packaging',
      description: 'Handcrafted with precision by Sahina Shrestha & team, inspected for quality, and packaged in luxury dust pouch.',
      timestamp: isCrafting ? (phase === 'handcrafting_and_packaging' ? 'In Progress Now' : 'Completed') : 'Upcoming',
      location: 'Craft Bench, Kathmandu, Nepal',
      completed: phase === 'out_for_delivery' || isDelivered,
      current: phase === 'handcrafting_and_packaging',
    },
    {
      stage: 'out_for_delivery',
      label: 'Out for Delivery',
      description: 'Handed over to express courier rider for safe doorstep transit.',
      timestamp: isOut ? (phase === 'out_for_delivery' ? 'On Route Today' : 'Completed') : `Estimated: ${estimatedDeliveryDate}`,
      location: 'Kathmandu Valley Logistics Hub',
      completed: isDelivered,
      current: phase === 'out_for_delivery',
    },
    {
      stage: 'delivered',
      label: 'Delivered',
      description: 'Safely delivered to customer with happiness, care card, and 48-hour check guarantee.',
      timestamp: isDelivered ? 'Handed Over' : `Expected ${estimatedDeliveryDate}`,
      location: location,
      completed: isDelivered,
      current: isDelivered,
    },
  ];
}

export function getProgressPercentage(phase?: OrderProductionPhase): number {
  switch (phase) {
    case 'confirmed': return 25;
    case 'handcrafting_and_packaging':
    case 'beading_in_progress':
    case 'quality_and_packaging':
      return 60;
    case 'out_for_delivery': return 85;
    case 'delivered': return 100;
    default: return 85;
  }
}

/**
 * Empty demo orders map (all legacy demo orders have been purged).
 */
export const DEMO_TRACKED_ORDERS: Record<string, TrackedOrderData> = {};

/**
 * Calculates the items subtotal for a tracked order
 */
export function getOrderItemsSubtotal(order: TrackedOrderData): number {
  if (typeof order.subtotal === 'number' && order.subtotal > 0) {
    return order.subtotal;
  }
  const computed = (order.items || []).reduce((sum, item) => {
    const qty = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity) || 1;
    const price = typeof item.price === 'number' ? item.price : Number(item.price) || 0;
    return sum + price * qty;
  }, 0);
  return computed > 0 ? computed : (Number(order.total) || 0);
}

/**
 * Calculates the delivery charge (in NPR) for a tracked order
 */
export function getOrderDeliveryFee(order: TrackedOrderData): number {
  if (typeof order.deliveryFee === 'number' && order.deliveryFee >= 0) {
    return order.deliveryFee;
  }
  const total = typeof order.total === 'number' ? order.total : Number(order.total) || 0;
  const itemsSub = (order.items || []).reduce((sum, item) => {
    const qty = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity) || 1;
    const price = typeof item.price === 'number' ? item.price : Number(item.price) || 0;
    return sum + price * qty;
  }, 0);
  if (itemsSub > 0 && total > itemsSub) {
    return total - itemsSub;
  }
  const zone = (order.deliveryZoneName || '').toLowerCase();
  if (zone.includes('outside valley') || zone.includes('pokhara') || zone.includes('chitwan')) return 200;
  if (zone.includes('outside ring') || zone.includes('bhaktapur')) return 150;
  if (zone.includes('kathmandu') || zone.includes('ring road') || zone.includes('lalitpur')) return 120;
  return 0;
}

/**
 * Normalizes item images and guarantees numeric values for total, subtotal, deliveryFee, and prices
 */
export function sanitizeOrderItems(order: TrackedOrderData): TrackedOrderData {
  const normId = normalizeOrderId(order.orderId);
  const items = (order.items || []).map((item) => ({
    ...item,
    quantity: typeof item.quantity === 'number' ? item.quantity : Number(item.quantity) || 1,
    price: typeof item.price === 'number' ? item.price : Number(item.price) || 0,
    image: getRealProductImage(item?.title, item?.image)
  }));
  const total = typeof order.total === 'number' ? order.total : Number(order.total) || 0;
  const computedSub = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const subtotal = typeof order.subtotal === 'number' && order.subtotal > 0 ? order.subtotal : computedSub;
  const deliveryFee =
    typeof order.deliveryFee === 'number' && order.deliveryFee >= 0
      ? order.deliveryFee
      : total > subtotal && subtotal > 0
      ? total - subtotal
      : 0;

  return {
    ...order,
    orderId: normId.startsWith('#') ? normId : `#${normId}`,
    total,
    subtotal,
    deliveryFee,
    items
  };
}

/**
 * Normalizes input order id (e.g. "#art-2026-1852" -> "ART-2026-1852")
 * and maps legacy random IDs (#ART-2026-615397 -> ART-2026-1852, #ART-2026-423390 -> ART-2026-1853).
 */
export function normalizeOrderId(id: string): string {
  const clean = (id || '').replace(/[#\s]/g, '').toUpperCase();
  const rawCompact = clean.replace(/[^A-Z0-9]/g, '');
  if (LEGACY_ORDER_ID_ALIASES[rawCompact]) {
    return LEGACY_ORDER_ID_ALIASES[rawCompact];
  }
  if (LEGACY_ORDER_ID_ALIASES[clean]) {
    return LEGACY_ORDER_ID_ALIASES[clean];
  }
  return clean;
}

/**
 * Canonical order key that strips '#', whitespace, and hyphens '-'
 * so "ART-2026-1852", "art 2026 1852", "#ART20261852", and "#ART-2026-615397" all resolve to "ART20261852".
 */
export function getCanonicalOrderKey(id: string): string {
  return normalizeOrderId(id).replace(/[^A-Z0-9]/g, '');
}

/**
 * Generates all possible string representations of an Order ID (with/without '#' and hyphens)
 */
export function getOrderIdVariants(rawId: string): string[] {
  const clean = normalizeOrderId(rawId);
  const compact = getCanonicalOrderKey(rawId);
  const variants = new Set<string>([clean, compact, `#${clean}`, `#${compact}`]);

  const matchCompact = compact.match(/^([A-Z]+)(\d{4})(\d+)$/);
  if (matchCompact) {
    const hyphenated = `${matchCompact[1]}-${matchCompact[2]}-${matchCompact[3]}`;
    variants.add(hyphenated);
    variants.add(`#${hyphenated}`);
  }
  return Array.from(variants).filter(Boolean);
}

/**
 * Authoritative in-memory map of tracked orders for the active browser session,
 * ensuring seller status updates succeed immediately even if browser localStorage is full.
 */
const IN_MEMORY_TRACKED_ORDERS: Record<string, TrackedOrderData> = {};

/**
 * Compares statusRevision and timestamps so a newer local seller status update
 * is never overwritten by older server/Firestore data (or container clock drift).
 */
export function shouldAcceptIncomingOrder(localOrder: TrackedOrderData | undefined, incomingOrder: TrackedOrderData): boolean {
  if (!localOrder) return true;

  const localRev = typeof localOrder.statusRevision === 'number' ? localOrder.statusRevision : 1;
  const incomingRev = typeof incomingOrder.statusRevision === 'number' ? incomingOrder.statusRevision : 1;

  if (incomingRev > localRev) return true;
  if (localRev > incomingRev) return false;

  const parseEffectiveTime = (iso?: string, rev?: number): number => {
    if (!iso) return 0;
    // Ignore container-generated 2026-10-18 baseline timestamps on revision 1
    if ((rev || 1) <= 1 && iso.startsWith('2026-10-18')) {
      return Date.parse('2025-01-01T00:00:00.000Z');
    }
    const parsed = Date.parse(iso);
    return isNaN(parsed) ? 0 : parsed;
  };

  const localTime = parseEffectiveTime(localOrder.updatedAt, localRev);
  const incomingTime = parseEffectiveTime(incomingOrder.updatedAt, incomingRev);

  if (localTime > 0 && incomingTime > 0) {
    return incomingTime >= localTime;
  }
  if (localTime > 0 && incomingTime === 0) {
    return false;
  }
  return true;
}

/**
 * Safely writes `artified_tracked_orders` to localStorage, automatically freeing space
 * from redundant multi-megabyte catalog caches if localStorage hits the 5MB browser quota.
 */
function persistTrackedOrdersMapToLocalStorage(map: Record<string, TrackedOrderData>): void {
  Object.entries(map).forEach(([k, v]) => {
    if (v) {
      const normKey = normalizeOrderId(v.orderId || k);
      const existingMem = IN_MEMORY_TRACKED_ORDERS[normKey];
      IN_MEMORY_TRACKED_ORDERS[normKey] = {
        ...v,
        paymentScreenshot: v.paymentScreenshot !== undefined ? v.paymentScreenshot : existingMem?.paymentScreenshot
      };
    }
  });
  try {
    localStorage.setItem('artified_tracked_orders', JSON.stringify(map));
  } catch {
    try {
      // Free redundant 4.8MB product/workshop caches (which are already stored in products.json & /api/products)
      localStorage.removeItem('artified_products_custom');
      localStorage.removeItem('artified_workshop_media');
      localStorage.setItem('artified_tracked_orders', JSON.stringify(map));
    } catch {
      try {
        // Fallback: strip screenshots only from browser localStorage while keeping them in IN_MEMORY_TRACKED_ORDERS, server disk, and Firestore
        const ultraLightMap: Record<string, TrackedOrderData> = {};
        Object.entries(map).forEach(([k, v]) => {
          ultraLightMap[k] = { ...v, paymentScreenshot: undefined };
        });
        localStorage.setItem('artified_tracked_orders', JSON.stringify(ultraLightMap));
      } catch {}
    }
  }
}

/**
 * One-time rescue & progressive ID migration for browser localStorage so that
 * #ART-2026-615397 (#ART-2026-1852) and #ART-2026-423390 (#ART-2026-1853) are restored,
 * broken ibb.co icons are stripped, and artified_last_order_id is removed so refreshing never exposes an order.
 */
function rescueAndMigrateLocalStorageOrders(): void {
  if (typeof window === 'undefined') return;
  try {
    // Always remove artified_last_order_id so refreshing the website never auto-displays an order in Track Order
    localStorage.removeItem('artified_last_order_id');

    // Free localStorage if artified_products_custom is bloating storage (> 500KB) so order status updates never hit QuotaExceededError
    try {
      const customProds = localStorage.getItem('artified_products_custom');
      if (customProds && customProds.length > 500000) {
        localStorage.removeItem('artified_products_custom');
      }
    } catch {}

    // 1. Clean mistaken raw legacy IDs (615397, 423390) from artified_deleted_orders
    const rawDeleted = localStorage.getItem('artified_deleted_orders');
    if (rawDeleted) {
      const deletedList: string[] = JSON.parse(rawDeleted);
      const cleanedDeleted = deletedList.filter((d) => {
        const rc = getRawCompactKey(d);
        return !RESCUED_RAW_LEGACY_COMPACT_IDS.has(rc);
      });
      if (cleanedDeleted.length !== deletedList.length) {
        localStorage.setItem('artified_deleted_orders', JSON.stringify(cleanedDeleted));
      }
    }

    // 2. Migrate artified_orders (customer order history) to progressive IDs & strip heavy base64 images
    const rawOrders = localStorage.getItem('artified_orders');
    if (rawOrders) {
      const orders: OrderDetails[] = JSON.parse(rawOrders);
      const seen = new Set<string>();
      const migratedOrders: OrderDetails[] = [];
      for (const o of orders) {
        if (!o || !o.orderId) continue;
        const norm = normalizeOrderId(o.orderId);
        const canonical = getCanonicalOrderKey(norm);
        if (PERMANENTLY_PURGED_CANONICAL_IDS.has(canonical)) continue;
        const formattedId = `#${norm}`;
        if (!seen.has(canonical)) {
          seen.add(canonical);
          migratedOrders.push({
            ...o,
            orderId: formattedId,
            paymentScreenshot: undefined,
            items: (o.items || []).map((item) => ({
              ...item,
              product: item.product
                ? {
                    ...item.product,
                    images: []
                  }
                : item.product
            }))
          });
        }
      }
      try {
        localStorage.setItem('artified_orders', JSON.stringify(migratedOrders));
      } catch {}
    }

    // 3. Migrate artified_tracked_orders to progressive IDs, strip broken ibb.co URLs, and remove purged 5157/4729
    const rawTracked = localStorage.getItem('artified_tracked_orders');
    if (rawTracked) {
      const map: Record<string, TrackedOrderData> = JSON.parse(rawTracked);
      const newMap: Record<string, TrackedOrderData> = {};
      for (const [k, v] of Object.entries(map)) {
        if (!v) continue;
        const norm = normalizeOrderId(v.orderId || k);
        const canonical = getCanonicalOrderKey(norm);
        if (PERMANENTLY_PURGED_CANONICAL_IDS.has(canonical)) continue;
        const cleanItems = (v.items || []).map((it) => ({
          ...it,
          image: it.image && (it.image.includes('ibb.co') || (it.image.startsWith('data:') && it.image.length > 5000)) ? '' : it.image
        }));
        const fixedUpdatedAt =
          v.updatedAt && v.updatedAt.startsWith('2026-10-18') && (!v.statusRevision || v.statusRevision <= 1)
            ? '2025-01-01T00:00:00.000Z'
            : v.updatedAt;
        const cleanedOrder = sanitizeOrderItems({
          ...v,
          orderId: `#${norm}`,
          statusRevision: v.statusRevision || 1,
          updatedAt: fixedUpdatedAt,
          items: cleanItems
        });
        newMap[norm] = {
          ...cleanedOrder,
          items: cleanItems
        };
        IN_MEMORY_TRACKED_ORDERS[norm] = newMap[norm];
      }
      persistTrackedOrdersMapToLocalStorage(newMap);
    }
  } catch {}
}

rescueAndMigrateLocalStorageOrders();

/**
 * Checks whether an Order ID or Order object has been deleted or belongs to a purged generation.
 */
export function isOrderDeletedOrPurged(orderIdInput: string, orderObj?: any): boolean {
  const canonical = getCanonicalOrderKey(orderIdInput);
  if (!canonical) return true;

  if (PERMANENTLY_PURGED_CANONICAL_IDS.has(canonical) || CLOUD_DELETED_CANONICAL_IDS.has(canonical)) {
    return true;
  }

  try {
    const rawDeleted = localStorage.getItem('artified_deleted_orders');
    if (rawDeleted) {
      const deletedList: string[] = JSON.parse(rawDeleted);
      const isMatch = deletedList.some((d) => {
        const rc = getRawCompactKey(d);
        if (RESCUED_RAW_LEGACY_COMPACT_IDS.has(rc)) return false;
        return getCanonicalOrderKey(d) === canonical;
      });
      if (isMatch) return true;
    }
  } catch {}

  if (orderObj) {
    if (orderObj.deleted === true) {
      return true;
    }
    const customer = (orderObj.customerName || '').trim();
    if (customer === 'Valued Artified Customer') {
      return true;
    }
  }

  return false;
}

/**
 * Auto-generates a progressive, sequential Artified Order ID:
 * - For year 2026: starts at #ART-2026-1852 (2026 being the year, 1852 being the items sold before launch),
 *   then #ART-2026-1853, #ART-2026-1854, etc.
 * - For year 2027 and onwards: starts at #ART-2027-1, #ART-2027-2, etc.
 */
export function generateUniqueOrderId(): string {
  const year = new Date().getFullYear();
  const baseStart = year <= 2026 ? 1852 : 1;
  let maxSeq = baseStart - 1;

  const extractSeq = (rawId?: string) => {
    if (!rawId) return;
    const norm = normalizeOrderId(rawId);
    const match = norm.match(new RegExp(`^ART-${year}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num >= baseStart && num < 100000) {
        if (num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  };

  let activeCountForYear = 0;
  try {
    const activeOrders = getAllOrdersForSeller();
    activeOrders.forEach((o) => {
      const norm = normalizeOrderId(o.orderId);
      if (norm.startsWith(`ART-${year}-`)) {
        activeCountForYear++;
      }
      extractSeq(o.orderId);
    });
  } catch {}

  if (CLOUD_MAX_SEQUENCE[year] && CLOUD_MAX_SEQUENCE[year] > maxSeq) {
    maxSeq = CLOUD_MAX_SEQUENCE[year];
  }

  if (activeCountForYear > 0) {
    try {
      const storedSeqRaw = localStorage.getItem(`artified_last_seq_${year}`);
      if (storedSeqRaw) {
        const storedSeq = parseInt(storedSeqRaw, 10);
        if (!isNaN(storedSeq) && storedSeq >= baseStart && storedSeq < 100000 && storedSeq > maxSeq) {
          maxSeq = storedSeq;
        }
      }
    } catch {}
  }

  const nextSeq = maxSeq + 1;
  return `#ART-${year}-${nextSeq}`;
}

/**
 * Persists an updated tracked order to browser storage, server disk, and Firestore.
 */
export async function saveTrackedOrder(order: TrackedOrderData): Promise<void> {
  try {
    const norm = normalizeOrderId(order.orderId);
    const canonical = getCanonicalOrderKey(norm);
    const formattedOrderId = `#${norm}`;
    const nowIso = new Date().toISOString();

    // Record sequence number for progressive counter
    const seqMatch = norm.match(/^ART-(\d{4})-(\d+)$/);
    if (seqMatch) {
      const orderYear = parseInt(seqMatch[1], 10);
      const orderSeq = parseInt(seqMatch[2], 10);
      if (!isNaN(orderYear) && !isNaN(orderSeq) && orderSeq < 100000) {
        if (!CLOUD_MAX_SEQUENCE[orderYear] || orderSeq > CLOUD_MAX_SEQUENCE[orderYear]) {
          CLOUD_MAX_SEQUENCE[orderYear] = orderSeq;
        }
        try {
          const prevSeq = parseInt(localStorage.getItem(`artified_last_seq_${orderYear}`) || '0', 10);
          if (orderSeq > prevSeq) {
            localStorage.setItem(`artified_last_seq_${orderYear}`, String(orderSeq));
          }
        } catch {}
      }
    }

    // If seller or customer creates/updates an order, ensure it's not blocked in artified_deleted_orders
    CLOUD_DELETED_CANONICAL_IDS.delete(canonical);
    try {
      const rawDeleted = localStorage.getItem('artified_deleted_orders');
      if (rawDeleted) {
        const deletedIds: string[] = JSON.parse(rawDeleted);
        const filteredDeleted = deletedIds.filter((d) => getCanonicalOrderKey(d) !== canonical);
        localStorage.setItem('artified_deleted_orders', JSON.stringify(filteredDeleted));
      }
    } catch {}

    const nextRev = typeof order.statusRevision === 'number' && order.statusRevision > 0
      ? order.statusRevision
      : (IN_MEMORY_TRACKED_ORDERS[norm]?.statusRevision || 1);

    const preservedScreenshot =
      order.paymentScreenshot !== undefined
        ? order.paymentScreenshot
        : IN_MEMORY_TRACKED_ORDERS[norm]?.paymentScreenshot;

    const sanitized = sanitizeOrderItems({
      ...order,
      orderId: formattedOrderId,
      paymentScreenshot: preservedScreenshot || '',
      statusRevision: nextRev,
      updatedAt: nowIso
    });

    // Store lightweight item entries in localStorage and server disk (real images are resolved via getRealProductImage)
    const lightweightForStorage: TrackedOrderData & { generation: number; purgeEpochId: string; updatedAt: string; statusRevision: number } = {
      ...sanitized,
      paymentScreenshot: preservedScreenshot || '',
      items: (sanitized.items || []).map((it) => ({
        title: it.title || 'Handcrafted Piece',
        image: it.image && (it.image.includes('ibb.co') || (it.image.startsWith('data:') && it.image.length > 5000)) ? '' : (it.image || ''),
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
        customization: it.customization || ''
      })),
      statusRevision: nextRev,
      updatedAt: nowIso,
      generation: CURRENT_ORDER_GENERATION,
      purgeEpochId: CURRENT_PURGE_EPOCH
    };

    // 1. Update in-memory store and bundled seed reference immediately
    IN_MEMORY_TRACKED_ORDERS[norm] = lightweightForStorage;
    if (SAVED_TRACKED_ORDERS && typeof SAVED_TRACKED_ORDERS === 'object') {
      (SAVED_TRACKED_ORDERS as Record<string, any>)[norm] = lightweightForStorage;
    }

    // 2. Persist to localStorage safely (never throws or aborts subsequent steps)
    try {
      const raw = localStorage.getItem('artified_tracked_orders');
      const map: Record<string, TrackedOrderData> = raw ? JSON.parse(raw) : {};
      map[norm] = lightweightForStorage;
      persistTrackedOrdersMapToLocalStorage(map);
    } catch {}

    // 3. Sync to server disk
    try {
      fetch('/api/tracked-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lightweightForStorage)
      }).catch(() => {});
    } catch {}

    recordOrderStatusChange(sanitized.orderId, sanitized.currentPhase, sanitized.customerName);
    window.dispatchEvent(new CustomEvent('artified_order_updated', { detail: sanitized }));

    // 4. Real-time Firestore sync (awaited so callers like CheckoutModal guarantee cloud persistence across browsers/incognito)
    await saveOrderToFirestore(lightweightForStorage).catch((err) => {
      console.warn('Notice: Firestore order tracking save:', err);
    });
  } catch (e) {
    console.warn('Failed to save tracked order', e);
  }
}

/**
 * Updates an order's progress phase and optional craft notes/courier info.
 */
export function updateOrderPhase(
  orderIdInput: string,
  phase?: OrderProductionPhase,
  updates?: {
    liveCraftNotes?: string;
    courierPartner?: string;
    consignmentCode?: string;
    estimatedDeliveryDate?: string;
  }
): TrackedOrderData {
  const current = getTrackedOrder(orderIdInput);
  if (!current) {
    throw new Error(`Order ${orderIdInput} not found or has been deleted.`);
  }

  const targetPhase: OrderProductionPhase = phase || current.currentPhase || 'confirmed';
  const defaultPhaseNotes: Record<OrderProductionPhase, string> = {
    confirmed: 'Your order was received and confirmed! Sahina Shrestha has reserved the required luster pearls and high-strength threads. Handcrafting is scheduled at our Kathmandu workshop.',
    handcrafting_and_packaging: 'Your piece is now being handcrafted with precision by Sahina Shrestha at our Kathmandu workshop, inspected for knot tension, and prepared in its luxury dust pouch.',
    beading_in_progress: 'Your piece is now being handcrafted with precision by Sahina Shrestha at our Kathmandu workshop.',
    quality_and_packaging: 'Handcrafting complete! Final quality inspection and luxury gift packaging in progress.',
    out_for_delivery: 'Your handcrafted piece has been dispatched from our Kathmandu workshop and is out for doorstep delivery!',
    delivered: 'Your order has been safely delivered! Thank you for supporting Sahina Shrestha & Artified Nepal.'
  };

  const nextRevision = Math.max(current.statusRevision || 1, 1) + 1;

  const updated: TrackedOrderData = {
    ...current,
    currentPhase: targetPhase,
    progressPercentage: getProgressPercentage(targetPhase),
    liveCraftNotes: updates?.liveCraftNotes ?? defaultPhaseNotes[targetPhase] ?? current.liveCraftNotes,
    courierPartner: updates?.courierPartner ?? current.courierPartner,
    consignmentCode: updates?.consignmentCode ?? current.consignmentCode,
    estimatedDeliveryDate: updates?.estimatedDeliveryDate ?? current.estimatedDeliveryDate,
    statusRevision: nextRevision,
    updatedAt: new Date().toISOString(),
    milestones: buildMilestonesForPhase(
      targetPhase,
      current.orderPlacedDate,
      updates?.estimatedDeliveryDate ?? current.estimatedDeliveryDate,
      current.deliveryAddress || current.deliveryZoneName
    )
  };

  saveTrackedOrder(updated);
  return sanitizeOrderItems(updated);
}

/**
 * Synchronizes tracked orders from server disk into in-memory state and localStorage,
 * ignoring any purged or deleted orders and preserving newer local updates.
 */
export function syncTrackedOrdersFromServer(ordersMap: Record<string, TrackedOrderData>): void {
  if (!ordersMap || typeof ordersMap !== 'object') return;

  try {
    let localMap: Record<string, TrackedOrderData> = { ...IN_MEMORY_TRACKED_ORDERS };
    try {
      const raw = localStorage.getItem('artified_tracked_orders');
      if (raw) {
        const parsed: Record<string, TrackedOrderData> = JSON.parse(raw);
        Object.entries(parsed).forEach(([k, v]) => {
          const n = normalizeOrderId(v?.orderId || k);
          if (shouldAcceptIncomingOrder(localMap[n], v)) {
            localMap[n] = v;
          }
        });
      }
    } catch {}

    Object.entries(ordersMap).forEach(([rawKey, serverOrder]) => {
      if (!serverOrder || typeof serverOrder !== 'object') return;
      const norm = normalizeOrderId(serverOrder.orderId || rawKey);
      if (isOrderDeletedOrPurged(norm, serverOrder)) {
        return;
      }

      const existingLocal = IN_MEMORY_TRACKED_ORDERS[norm] || localMap[norm];
      if (!shouldAcceptIncomingOrder(existingLocal, serverOrder)) {
        return;
      }

      const enrichedOrder: TrackedOrderData = {
        ...serverOrder,
        orderId: `#${norm}`,
        statusRevision: serverOrder.statusRevision || 1,
        items: (serverOrder.items || []).map((it) => ({
          ...it,
          image: it.image && (it.image.includes('ibb.co') || (it.image.startsWith('data:') && it.image.length > 5000)) ? '' : it.image
        })),
        progressPercentage: getProgressPercentage(serverOrder.currentPhase),
        milestones: serverOrder.milestones && serverOrder.milestones.length > 0
          ? serverOrder.milestones
          : buildMilestonesForPhase(
              serverOrder.currentPhase || 'confirmed',
              serverOrder.orderPlacedDate || 'Recent Order',
              serverOrder.estimatedDeliveryDate || '1-2 business days',
              serverOrder.deliveryAddress || 'Kathmandu Valley'
            )
      };

      localMap[norm] = enrichedOrder;
      IN_MEMORY_TRACKED_ORDERS[norm] = enrichedOrder;
    });

    persistTrackedOrdersMapToLocalStorage(localMap);
  } catch (err) {
    console.warn('Notice: Error syncing tracked orders from server:', err);
  }
}

/**
 * Fetches order tracking data from valid in-memory state, local storage, and saved server records.
 * Supports both progressive IDs (#ART-2026-1852, #ART-2026-1853) and legacy random IDs (#ART-2026-615397, #ART-2026-423390).
 */
export function getTrackedOrder(orderIdInput: string): TrackedOrderData | null {
  if (!orderIdInput || !orderIdInput.trim()) return null;

  const canonical = getCanonicalOrderKey(orderIdInput);
  const rawCompact = getRawCompactKey(orderIdInput);
  if (isOrderDeletedOrPurged(orderIdInput)) {
    return null;
  }

  const matchesOrder = (key: string, order: any): boolean => {
    if (!order) return false;
    if (getCanonicalOrderKey(key) === canonical || getCanonicalOrderKey(order.orderId || '') === canonical) {
      return true;
    }
    if (order.legacyOrderId && (getCanonicalOrderKey(order.legacyOrderId) === canonical || getRawCompactKey(order.legacyOrderId) === rawCompact)) {
      return true;
    }
    return false;
  };

  // 0. Check in-memory authoritative records first
  for (const [key, order] of Object.entries(IN_MEMORY_TRACKED_ORDERS)) {
    if (matchesOrder(key, order) && !isOrderDeletedOrPurged(order.orderId, order)) {
      return sanitizeOrderItems(order);
    }
  }

  // 1. Check seller-saved / modified tracking records in localStorage
  try {
    const raw = localStorage.getItem('artified_tracked_orders');
    if (raw) {
      const map: Record<string, TrackedOrderData> = JSON.parse(raw);
      for (const [key, order] of Object.entries(map)) {
        if (matchesOrder(key, order)) {
          if (!isOrderDeletedOrPurged(order.orderId, order)) {
            IN_MEMORY_TRACKED_ORDERS[normalizeOrderId(order.orderId || key)] = order;
            return sanitizeOrderItems(order);
          }
        }
      }
    }
  } catch {}

  // 2. Check locally placed orders in browser storage
  try {
    const savedOrdersRaw = localStorage.getItem('artified_orders');
    if (savedOrdersRaw) {
      const orders: (OrderDetails & { generation?: number; purgeEpochId?: string })[] = JSON.parse(savedOrdersRaw);
      const matched = orders.find(
        (o) =>
          getCanonicalOrderKey(o.orderId) === canonical &&
          !isOrderDeletedOrPurged(o.orderId, o)
      );
      if (matched) {
        return sanitizeOrderItems(buildTrackedOrderFromOrderDetails(matched));
      }
    }
  } catch {}

  // 3. Check saved tracked orders from tracked_orders.json
  if (SAVED_TRACKED_ORDERS && typeof SAVED_TRACKED_ORDERS === 'object') {
    for (const [rawKey, order] of Object.entries(SAVED_TRACKED_ORDERS)) {
      if (order && typeof order === 'object') {
        const tOrder = order as TrackedOrderData;
        if (matchesOrder(rawKey, tOrder) && !isOrderDeletedOrPurged(tOrder.orderId || rawKey, tOrder)) {
          return sanitizeOrderItems({
            ...tOrder,
            orderId: `#${normalizeOrderId(tOrder.orderId || rawKey)}`,
            progressPercentage: getProgressPercentage(tOrder.currentPhase || 'confirmed'),
            milestones: tOrder.milestones || buildMilestonesForPhase(
              tOrder.currentPhase || 'confirmed',
              tOrder.orderPlacedDate || 'Recent Order',
              tOrder.estimatedDeliveryDate || '1-2 business days',
              tOrder.deliveryAddress || 'Kathmandu Valley'
            )
          });
        }
      }
    }
  }

  return null;
}

/**
 * Returns all active orders for the seller to manage in one central place.
 * Excludes all purged and deleted orders.
 */
export function getAllOrdersForSeller(): TrackedOrderData[] {
  const result: Record<string, TrackedOrderData> = {};

  // 1. Add saved tracked orders from tracked_orders.json
  if (SAVED_TRACKED_ORDERS && typeof SAVED_TRACKED_ORDERS === 'object') {
    Object.entries(SAVED_TRACKED_ORDERS).forEach(([rawKey, order]) => {
      if (order && typeof order === 'object') {
        const tOrder = order as TrackedOrderData & { generation?: number; purgeEpochId?: string };
        const norm = normalizeOrderId(tOrder.orderId || rawKey);
        const canonical = getCanonicalOrderKey(norm);
        if (!isOrderDeletedOrPurged(norm, tOrder) && !result[canonical]) {
          result[canonical] = {
            ...tOrder,
            orderId: `#${norm}`,
            progressPercentage: getProgressPercentage(tOrder.currentPhase || 'confirmed'),
            milestones: tOrder.milestones || buildMilestonesForPhase(
              tOrder.currentPhase || 'confirmed',
              tOrder.orderPlacedDate || 'Recent Order',
              tOrder.estimatedDeliveryDate || '1-2 business days',
              tOrder.deliveryAddress || 'Kathmandu Valley'
            )
          };
        }
      }
    });
  }

  // 2. Add customer checkout orders from localStorage (artified_orders)
  try {
    const raw = localStorage.getItem('artified_orders');
    if (raw) {
      const customerOrders: (OrderDetails & { generation?: number; purgeEpochId?: string })[] = JSON.parse(raw);
      customerOrders.forEach((o) => {
        const norm = normalizeOrderId(o.orderId);
        const canonical = getCanonicalOrderKey(norm);
        if (!isOrderDeletedOrPurged(norm, o) && !result[canonical]) {
          result[canonical] = buildTrackedOrderFromOrderDetails({
            ...o,
            orderId: `#${norm}`
          });
        }
      });
    }
  } catch (e) {
    console.warn('Error reading customer orders for seller', e);
  }

  // 3. Overlay any seller-updated tracked orders from localStorage (artified_tracked_orders)
  try {
    const rawTracked = localStorage.getItem('artified_tracked_orders');
    if (rawTracked) {
      const trackedMap: Record<string, TrackedOrderData & { generation?: number; purgeEpochId?: string }> = JSON.parse(rawTracked);
      Object.entries(trackedMap).forEach(([rawKey, order]) => {
        const norm = normalizeOrderId(order.orderId || rawKey);
        const canonical = getCanonicalOrderKey(norm);
        if (!isOrderDeletedOrPurged(norm, order) && shouldAcceptIncomingOrder(result[canonical], order)) {
          result[canonical] = {
            ...result[canonical],
            ...order,
            orderId: `#${norm}`
          };
        }
      });
    }
  } catch (e) {
    console.warn('Error reading tracked orders overlay', e);
  }

  // 4. Overlay authoritative in-memory tracked orders (highest priority for instant seller updates)
  Object.entries(IN_MEMORY_TRACKED_ORDERS).forEach(([rawKey, order]) => {
    const norm = normalizeOrderId(order.orderId || rawKey);
    const canonical = getCanonicalOrderKey(norm);
    if (!isOrderDeletedOrPurged(norm, order) && shouldAcceptIncomingOrder(result[canonical], order)) {
      result[canonical] = {
        ...result[canonical],
        ...order,
        orderId: `#${norm}`
      };
    }
  });

  return Object.values(result).map((o) => sanitizeOrderItems(o));
}

/**
 * Fetches and synchronizes orders from Cloud Firestore so orders placed
 * across different devices and browsers are visible to the seller immediately.
 */
export async function syncOrdersFromFirestore(): Promise<TrackedOrderData[]> {
  try {
    const [snap, deletedSnap, seqSnap] = await Promise.all([
      getDocs(collection(db, 'orders')),
      getDoc(doc(db, 'store_settings', 'deleted_orders')).catch(() => null),
      getDoc(doc(db, 'store_settings', 'order_sequence')).catch(() => null)
    ]);

    if (deletedSnap && deletedSnap.exists()) {
      const delData = deletedSnap.data();
      if (delData && Array.isArray(delData.deletedIds)) {
        registerCloudDeletedOrderIds(delData.deletedIds);
      }
    }

    if (seqSnap && seqSnap.exists()) {
      const seqData = seqSnap.data();
      if (seqData && typeof seqData === 'object') {
        Object.entries(seqData).forEach(([k, v]) => {
          const m = k.match(/^lastSeq_(\d{4})$/);
          if (m && typeof v === 'number' && v < 100000) {
            const yr = parseInt(m[1], 10);
            if (!CLOUD_MAX_SEQUENCE[yr] || v > CLOUD_MAX_SEQUENCE[yr]) {
              CLOUD_MAX_SEQUENCE[yr] = v;
            }
            try {
              const prev = parseInt(localStorage.getItem(`artified_last_seq_${yr}`) || '0', 10);
              if (v > prev) {
                localStorage.setItem(`artified_last_seq_${yr}`, String(v));
              }
            } catch {}
          }
        });
      }
    }

    const remoteList: TrackedOrderData[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as TrackedOrderData;
      if (data && data.orderId) {
        const norm = normalizeOrderId(data.orderId);
        const seqMatch = norm.match(/^ART-(\d{4})-(\d+)$/);
        if (seqMatch) {
          const yr = parseInt(seqMatch[1], 10);
          const sq = parseInt(seqMatch[2], 10);
          if (!isNaN(yr) && !isNaN(sq) && sq < 100000) {
            if (!CLOUD_MAX_SEQUENCE[yr] || sq > CLOUD_MAX_SEQUENCE[yr]) {
              CLOUD_MAX_SEQUENCE[yr] = sq;
            }
            try {
              const prev = parseInt(localStorage.getItem(`artified_last_seq_${yr}`) || '0', 10);
              if (sq > prev) {
                localStorage.setItem(`artified_last_seq_${yr}`, String(sq));
              }
            } catch {}
          }
        }
        if (!isOrderDeletedOrPurged(data.orderId, data)) {
          remoteList.push(data);
        }
      }
    });

    if (remoteList.length > 0) {
      try {
        let map: Record<string, TrackedOrderData> = { ...IN_MEMORY_TRACKED_ORDERS };
        try {
          const raw = localStorage.getItem('artified_tracked_orders');
          if (raw) {
            const parsed = JSON.parse(raw);
            Object.entries(parsed).forEach(([k, v]: [string, any]) => {
              const n = normalizeOrderId(v?.orderId || k);
              if (shouldAcceptIncomingOrder(map[n], v)) {
                map[n] = v;
              }
            });
          }
        } catch {}

        remoteList.forEach((o) => {
          const norm = normalizeOrderId(o.orderId);
          if (shouldAcceptIncomingOrder(map[norm], o)) {
            map[norm] = {
              ...o,
              orderId: `#${norm}`,
              items: (o.items || []).map((it) => ({
                ...it,
                image: it.image && (it.image.includes('ibb.co') || (it.image.startsWith('data:') && it.image.length > 5000)) ? '' : it.image
              }))
            };
            IN_MEMORY_TRACKED_ORDERS[norm] = map[norm];
          }
        });
        persistTrackedOrdersMapToLocalStorage(map);
      } catch {}
    }

    return getAllOrdersForSeller();
  } catch (err) {
    console.warn('Notice: Firestore orders sync:', err);
    return getAllOrdersForSeller();
  }
}

/**
 * Subscribes to real-time order updates across all customer devices
 */
export function subscribeAllOrdersForSeller(onUpdate: (orders: TrackedOrderData[]) => void): () => void {
  try {
    const unsub = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const remoteList: TrackedOrderData[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as TrackedOrderData;
          if (data && data.orderId) {
            const norm = normalizeOrderId(data.orderId);
            const seqMatch = norm.match(/^ART-(\d{4})-(\d+)$/);
            if (seqMatch) {
              const yr = parseInt(seqMatch[1], 10);
              const sq = parseInt(seqMatch[2], 10);
              if (!isNaN(yr) && !isNaN(sq) && sq < 100000) {
                if (!CLOUD_MAX_SEQUENCE[yr] || sq > CLOUD_MAX_SEQUENCE[yr]) {
                  CLOUD_MAX_SEQUENCE[yr] = sq;
                }
              }
            }
            if (!isOrderDeletedOrPurged(data.orderId, data)) {
              remoteList.push(data);
            }
          }
        });

        if (remoteList.length > 0) {
          try {
            let map: Record<string, TrackedOrderData> = { ...IN_MEMORY_TRACKED_ORDERS };
            try {
              const raw = localStorage.getItem('artified_tracked_orders');
              if (raw) {
                const parsed = JSON.parse(raw);
                Object.entries(parsed).forEach(([k, v]: [string, any]) => {
                  const n = normalizeOrderId(v?.orderId || k);
                  if (shouldAcceptIncomingOrder(map[n], v)) {
                    map[n] = v;
                  }
                });
              }
            } catch {}

            remoteList.forEach((o) => {
              const norm = normalizeOrderId(o.orderId);
              if (shouldAcceptIncomingOrder(map[norm], o)) {
                map[norm] = {
                  ...o,
                  orderId: `#${norm}`,
                  items: (o.items || []).map((it) => ({
                    ...it,
                    image: it.image && (it.image.includes('ibb.co') || (it.image.startsWith('data:') && it.image.length > 5000)) ? '' : it.image
                  }))
                };
                IN_MEMORY_TRACKED_ORDERS[norm] = map[norm];
              }
            });
            persistTrackedOrdersMapToLocalStorage(map);
          } catch {}
        }

        onUpdate(getAllOrdersForSeller());
      },
      () => {
        onUpdate(getAllOrdersForSeller());
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

export function buildTrackedOrderFromOrderDetails(order: OrderDetails): TrackedOrderData {
  const phase: OrderProductionPhase = 'confirmed';
  const norm = normalizeOrderId(order.orderId);
  return {
    orderId: `#${norm}`,
    customerName: order.customerName,
    phone: order.phone,
    deliveryAddress: `${order.address}${order.landmark ? ` (Near ${order.landmark})` : ''}`,
    deliveryZoneName: order.deliveryZone.name,
    paymentMethodText: 
      order.paymentMethod === 'cod'
        ? 'Cash on Delivery (COD)'
        : order.paymentMethod === 'fonepay'
        ? `Fonepay / Bank QR (Txn: ${order.transactionId || 'Screenshot Attached'})`
        : order.paymentMethod === 'esewa'
        ? `eSewa QR (Txn: ${order.transactionId || 'Screenshot Attached'})`
        : `Khalti QR (Txn: ${order.transactionId || 'Screenshot Attached'})`,
    paymentStatus: order.paymentMethod === 'cod' ? 'Pay on Delivery' : 'Paid & Verified',
    paymentScreenshot: order.paymentScreenshot || '',
    items: order.items.map((i) => ({
      title: i.product.title,
      image: getRealProductImage(i.product.title, i.product.images[0]),
      quantity: i.quantity,
      price: i.product.price,
      customization: i.customizationNote || '',
    })),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    orderPlacedDate: order.createdAt || 'Just now',
    estimatedDeliveryDate: order.deliveryZone.estimatedDays,
    currentPhase: phase,
    progressPercentage: getProgressPercentage(phase),
    artisanName: 'Sahina Shrestha',
    artisanRole: 'Founder and Creator',
    studioLocation: 'Artified Workshop, Kathmandu, Nepal',
    liveCraftNotes: `Your order was received and confirmed! Sahina Shrestha has reserved the required luster pearls and high-strength threads. Handcrafting is scheduled at our Kathmandu workshop.`,
    milestones: buildMilestonesForPhase(
      phase,
      order.createdAt || 'Today',
      order.deliveryZone.estimatedDays,
      order.deliveryZone.name
    ),
    updatedAt: new Date().toISOString(),
    ...({
      generation: CURRENT_ORDER_GENERATION,
      purgeEpochId: CURRENT_PURGE_EPOCH
    } as any)
  };
}

/**
 * Removes the payment screenshot from a specific order after seller verification
 * to free memory/storage while keeping the order record intact.
 */
export function removeOrderPaymentScreenshot(orderIdInput: string): TrackedOrderData | null {
  const current = getTrackedOrder(orderIdInput);
  if (!current) return null;
  const nextRevision = Math.max(current.statusRevision || 1, 1) + 1;
  const updated: TrackedOrderData = {
    ...current,
    paymentScreenshot: '',
    statusRevision: nextRevision,
    updatedAt: new Date().toISOString()
  };
  saveTrackedOrder(updated);
  return updated;
}

/**
 * Deletes an order from seller tracked orders, local storage records, server disk, and Firestore.
 */
export function deleteTrackedOrder(orderIdInput: string): void {
  try {
    const norm = normalizeOrderId(orderIdInput);
    const canonical = getCanonicalOrderKey(orderIdInput);
    const variants = getOrderIdVariants(orderIdInput);

    registerCloudDeletedOrderIds(variants);

    // 0. Add all variants to deleted IDs list so it never reappears
    let deletedIds: string[] = [];
    try {
      const rawDeleted = localStorage.getItem('artified_deleted_orders');
      if (rawDeleted) {
        deletedIds = JSON.parse(rawDeleted);
      }
    } catch {}
    for (const v of variants) {
      if (!deletedIds.includes(v)) {
        deletedIds.push(v);
      }
    }
    localStorage.setItem('artified_deleted_orders', JSON.stringify(deletedIds));

    // 1. Remove from IN_MEMORY_TRACKED_ORDERS and artified_tracked_orders
    for (const k of Object.keys(IN_MEMORY_TRACKED_ORDERS)) {
      if (getCanonicalOrderKey(k) === canonical || getCanonicalOrderKey(IN_MEMORY_TRACKED_ORDERS[k]?.orderId || '') === canonical) {
        delete IN_MEMORY_TRACKED_ORDERS[k];
      }
    }
    try {
      const rawTracked = localStorage.getItem('artified_tracked_orders');
      if (rawTracked) {
        const map: Record<string, TrackedOrderData> = JSON.parse(rawTracked);
        for (const k of Object.keys(map)) {
          if (getCanonicalOrderKey(k) === canonical || getCanonicalOrderKey(map[k]?.orderId || '') === canonical) {
            delete map[k];
          }
        }
        persistTrackedOrdersMapToLocalStorage(map);
      }
    } catch {}

    // 2. Remove from artified_orders (customer placed orders)
    const rawOrders = localStorage.getItem('artified_orders');
    if (rawOrders) {
      const orders: OrderDetails[] = JSON.parse(rawOrders);
      const filtered = orders.filter((o) => getCanonicalOrderKey(o.orderId) !== canonical);
      localStorage.setItem('artified_orders', JSON.stringify(filtered));
    }

    // If no active orders remain for this year, reset the sequence counter so the first order starts at 1852 (for 2026) or 1 (for 2027+)
    try {
      const remaining = getAllOrdersForSeller();
      if (remaining.length === 0) {
        const currentYear = new Date().getFullYear();
        localStorage.removeItem(`artified_last_seq_${currentYear}`);
      }
    } catch {}

    // 3. Notify server disk endpoint
    try {
      fetch(`/api/tracked-order/${encodeURIComponent(norm)}`, {
        method: 'DELETE'
      }).catch(() => {});
    } catch {}

    // 4. Delete from Firestore (`orders`, `tracked_orders`, `order_status_logs`, `users/.../tracked_orders`)
    deleteOrderFromFirestore(orderIdInput).catch(() => {});

    window.dispatchEvent(new CustomEvent('artified_order_updated', { detail: { orderId: norm, deleted: true } }));
  } catch (e) {
    console.warn('Failed to delete tracked order', e);
  }
}

/**
 * Purges all orders placed on this website across localStorage, server disk, and Firestore.
 */
export function deleteAllOrders(): void {
  try {
    const allKnownDeleted = new Set<string>(Array.from(PERMANENTLY_PURGED_CANONICAL_IDS));
    try {
      const prevDeleted = localStorage.getItem('artified_deleted_orders');
      if (prevDeleted) {
        JSON.parse(prevDeleted).forEach((id: string) => allKnownDeleted.add(id));
      }
    } catch {}
    try {
      const rawOrders = localStorage.getItem('artified_orders');
      if (rawOrders) {
        JSON.parse(rawOrders).forEach((o: any) => {
          if (o?.orderId) {
            getOrderIdVariants(o.orderId).forEach((v) => allKnownDeleted.add(v));
          }
        });
      }
    } catch {}
    try {
      const rawTracked = localStorage.getItem('artified_tracked_orders');
      if (rawTracked) {
        Object.values(JSON.parse(rawTracked)).forEach((o: any) => {
          if (o?.orderId) {
            getOrderIdVariants(o.orderId).forEach((v) => allKnownDeleted.add(v));
          }
        });
      }
    } catch {}

    const deletedArray = Array.from(allKnownDeleted);
    registerCloudDeletedOrderIds(deletedArray);

    const currentYear = new Date().getFullYear();
    localStorage.removeItem(`artified_last_seq_${currentYear}`);
    localStorage.removeItem('artified_last_order_id');
    localStorage.removeItem('artified_all_orders_deleted');
    localStorage.removeItem('artified_orders');
    localStorage.removeItem('artified_tracked_orders');
    localStorage.removeItem('artified_order_notifications');
    localStorage.removeItem('artified_order_last_phases');
    localStorage.setItem('artified_deleted_orders', JSON.stringify(deletedArray));

    try {
      fetch('/api/tracked-orders', { method: 'DELETE' }).catch(() => {});
    } catch {}

    purgeAllOrdersFromFirestore(true).catch(() => {});

    window.dispatchEvent(new CustomEvent('artified_order_updated', { detail: { deletedAll: true } }));
  } catch (e) {
    console.warn('Failed to delete all orders', e);
  }
}
