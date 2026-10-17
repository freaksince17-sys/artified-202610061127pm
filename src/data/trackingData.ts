import { TrackedOrderData, OrderDetails, OrderProductionPhase, TrackingMilestone } from '../types';
import { recordOrderStatusChange } from '../utils/orderNotificationManager';
import {
  saveOrderToFirestore,
  deleteOrderFromFirestore,
  purgeAllOrdersFromFirestore,
  CURRENT_ORDER_GENERATION,
  CURRENT_PURGE_EPOCH
} from '../services/orderTrackingService';
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
  'ART20263829'
]);

/**
 * In-memory set of deleted canonical Order IDs synced from Firestore `store_settings/deleted_orders`
 */
const CLOUD_DELETED_CANONICAL_IDS = new Set<string>();

export function registerCloudDeletedOrderIds(ids: string[]): void {
  if (!Array.isArray(ids)) return;
  for (const raw of ids) {
    if (typeof raw === 'string' && raw.trim()) {
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
 * Normalizes item images to authentic product photos
 */
export function sanitizeOrderItems(order: TrackedOrderData): TrackedOrderData {
  return {
    ...order,
    items: (order.items || []).map((item) => ({
      ...item,
      image: getRealProductImage(item.title, item.image)
    }))
  };
}

/**
 * Normalizes input order id (e.g. "#art-2026-8842" -> "ART-2026-8842")
 */
export function normalizeOrderId(id: string): string {
  return (id || '').replace(/[#\s]/g, '').toUpperCase();
}

/**
 * Canonical order key that strips '#', whitespace, and hyphens '-'
 * so "ART-2026-4846", "art 2026 4846", and "#ART20264846" all resolve to "ART20264846".
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
      const isMatch = deletedList.some((d) => getCanonicalOrderKey(d) === canonical);
      if (isMatch) return true;
    }
  } catch {}

  if (orderObj) {
    if (orderObj.deleted === true) {
      return true;
    }
    const customer = (orderObj.customerName || '').trim();
    if (
      customer === 'Valued Artified Customer' ||
      customer === 'Lamar Anzelov' ||
      customer === '1st customer'
    ) {
      return true;
    }
    // Strictly require current order generation AND current purge epoch on all order records
    if (
      orderObj.generation !== CURRENT_ORDER_GENERATION ||
      orderObj.purgeEpochId !== CURRENT_PURGE_EPOCH
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Persists an updated tracked order to browser storage, server disk, and Firestore.
 */
export function saveTrackedOrder(order: TrackedOrderData): void {
  try {
    const norm = normalizeOrderId(order.orderId);
    const canonical = getCanonicalOrderKey(order.orderId);

    // If seller or customer creates a new order, ensure it's not blocked in artified_deleted_orders
    CLOUD_DELETED_CANONICAL_IDS.delete(canonical);
    try {
      const rawDeleted = localStorage.getItem('artified_deleted_orders');
      if (rawDeleted) {
        const deletedIds: string[] = JSON.parse(rawDeleted);
        const filteredDeleted = deletedIds.filter((d) => getCanonicalOrderKey(d) !== canonical);
        localStorage.setItem('artified_deleted_orders', JSON.stringify(filteredDeleted));
      }
    } catch {}

    const stampedOrder: TrackedOrderData & { generation: number; purgeEpochId: string } = {
      ...order,
      generation: CURRENT_ORDER_GENERATION,
      purgeEpochId: CURRENT_PURGE_EPOCH
    };

    const raw = localStorage.getItem('artified_tracked_orders');
    const map: Record<string, TrackedOrderData> = raw ? JSON.parse(raw) : {};
    map[norm] = stampedOrder;
    localStorage.setItem('artified_tracked_orders', JSON.stringify(map));

    // Sync to server disk
    try {
      fetch('/api/tracked-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stampedOrder)
      }).catch(() => {});
    } catch {}

    // Real-time Firestore sync
    saveOrderToFirestore(stampedOrder).catch((err) => {
      console.warn('Notice: Firestore order tracking save:', err);
    });

    recordOrderStatusChange(stampedOrder.orderId, stampedOrder.currentPhase, stampedOrder.customerName);
    window.dispatchEvent(new CustomEvent('artified_order_updated', { detail: stampedOrder }));
  } catch (e) {
    console.warn('Failed to save tracked order to localStorage', e);
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
  const updated: TrackedOrderData = {
    ...current,
    currentPhase: targetPhase,
    progressPercentage: getProgressPercentage(targetPhase),
    liveCraftNotes: updates?.liveCraftNotes ?? current.liveCraftNotes,
    courierPartner: updates?.courierPartner ?? current.courierPartner,
    consignmentCode: updates?.consignmentCode ?? current.consignmentCode,
    estimatedDeliveryDate: updates?.estimatedDeliveryDate ?? current.estimatedDeliveryDate,
    milestones: buildMilestonesForPhase(
      targetPhase,
      current.orderPlacedDate,
      updates?.estimatedDeliveryDate ?? current.estimatedDeliveryDate,
      current.deliveryAddress || current.deliveryZoneName
    )
  };

  saveTrackedOrder(updated);
  return updated;
}

/**
 * Synchronizes tracked orders from server disk into in-memory state and localStorage,
 * ignoring any purged or deleted orders.
 */
export function syncTrackedOrdersFromServer(ordersMap: Record<string, TrackedOrderData>): void {
  if (!ordersMap || typeof ordersMap !== 'object') return;

  try {
    const raw = localStorage.getItem('artified_tracked_orders');
    const localMap: Record<string, TrackedOrderData> = raw ? JSON.parse(raw) : {};

    Object.entries(ordersMap).forEach(([rawKey, serverOrder]) => {
      if (!serverOrder || typeof serverOrder !== 'object') return;
      const norm = normalizeOrderId(serverOrder.orderId || rawKey);
      if (isOrderDeletedOrPurged(norm, serverOrder)) {
        return;
      }

      const enrichedOrder: TrackedOrderData = {
        ...serverOrder,
        orderId: norm,
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
      window.dispatchEvent(new CustomEvent('artified_order_updated', { detail: enrichedOrder }));
    });

    localStorage.setItem('artified_tracked_orders', JSON.stringify(localMap));
  } catch (err) {
    console.warn('Notice: Error syncing tracked orders from server:', err);
  }
}

/**
 * Fetches order tracking data from valid local storage records.
 * Returns null if the order was deleted or purged.
 */
export function getTrackedOrder(orderIdInput: string): TrackedOrderData | null {
  if (!orderIdInput.trim()) return null;

  const canonical = getCanonicalOrderKey(orderIdInput);
  if (isOrderDeletedOrPurged(orderIdInput)) {
    return null;
  }

  // 1. Check seller-saved / modified tracking records first
  try {
    const raw = localStorage.getItem('artified_tracked_orders');
    if (raw) {
      const map: Record<string, TrackedOrderData> = JSON.parse(raw);
      for (const [key, order] of Object.entries(map)) {
        if (getCanonicalOrderKey(key) === canonical || getCanonicalOrderKey(order.orderId) === canonical) {
          if (!isOrderDeletedOrPurged(order.orderId, order)) {
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

  return null;
}

/**
 * Returns all active orders for the seller to manage in one central place.
 * Excludes all purged and deleted orders.
 */
export function getAllOrdersForSeller(): TrackedOrderData[] {
  const result: Record<string, TrackedOrderData> = {};

  // 1. Add saved tracked orders from tracked_orders.json if valid generation & epoch
  if (SAVED_TRACKED_ORDERS && typeof SAVED_TRACKED_ORDERS === 'object') {
    Object.entries(SAVED_TRACKED_ORDERS).forEach(([rawKey, order]) => {
      if (order && typeof order === 'object') {
        const tOrder = order as TrackedOrderData & { generation?: number; purgeEpochId?: string };
        const norm = normalizeOrderId(tOrder.orderId || rawKey);
        const canonical = getCanonicalOrderKey(norm);
        if (!isOrderDeletedOrPurged(norm, tOrder) && !result[canonical]) {
          result[canonical] = {
            ...tOrder,
            orderId: norm,
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
        if (!isOrderDeletedOrPurged(norm, o)) {
          result[canonical] = buildTrackedOrderFromOrderDetails(o);
        }
      });
    }
  } catch (e) {
    console.warn('Error reading customer orders for seller', e);
  }

  // 3. Overlay any seller-updated tracked orders (artified_tracked_orders)
  try {
    const rawTracked = localStorage.getItem('artified_tracked_orders');
    if (rawTracked) {
      const trackedMap: Record<string, TrackedOrderData & { generation?: number; purgeEpochId?: string }> = JSON.parse(rawTracked);
      Object.entries(trackedMap).forEach(([rawKey, order]) => {
        const norm = normalizeOrderId(order.orderId || rawKey);
        const canonical = getCanonicalOrderKey(norm);
        if (!isOrderDeletedOrPurged(norm, order)) {
          result[canonical] = order;
        }
      });
    }
  } catch (e) {
    console.warn('Error reading tracked orders overlay', e);
  }

  return Object.values(result).map((o) => sanitizeOrderItems(o));
}

export function buildTrackedOrderFromOrderDetails(order: OrderDetails): TrackedOrderData {
  const phase: OrderProductionPhase = 'confirmed';
  return {
    orderId: order.orderId,
    customerName: order.customerName,
    phone: order.phone,
    deliveryAddress: `${order.address}${order.landmark ? ` (Near ${order.landmark})` : ''}`,
    deliveryZoneName: order.deliveryZone.name,
    paymentMethodText: 
      order.paymentMethod === 'cod'
        ? 'Cash on Delivery (COD)'
        : order.paymentMethod === 'esewa'
        ? `eSewa (Txn: ${order.transactionId || 'Pending'})`
        : `Khalti (Txn: ${order.transactionId || 'Pending'})`,
    paymentStatus: order.paymentMethod === 'cod' ? 'Pay on Delivery' : 'Paid & Verified',
    items: order.items.map((i) => ({
      title: i.product.title,
      image: getRealProductImage(i.product.title, i.product.images[0]),
      quantity: i.quantity,
      price: i.product.price,
      customization: i.customizationNote,
    })),
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
    ...({
      generation: CURRENT_ORDER_GENERATION,
      purgeEpochId: CURRENT_PURGE_EPOCH
    } as any)
  };
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

    // 1. Remove from artified_tracked_orders
    const rawTracked = localStorage.getItem('artified_tracked_orders');
    if (rawTracked) {
      const map: Record<string, TrackedOrderData> = JSON.parse(rawTracked);
      for (const k of Object.keys(map)) {
        if (getCanonicalOrderKey(k) === canonical || getCanonicalOrderKey(map[k]?.orderId || '') === canonical) {
          delete map[k];
        }
      }
      localStorage.setItem('artified_tracked_orders', JSON.stringify(map));
    }

    // 2. Remove from artified_orders (customer placed orders)
    const rawOrders = localStorage.getItem('artified_orders');
    if (rawOrders) {
      const orders: OrderDetails[] = JSON.parse(rawOrders);
      const filtered = orders.filter((o) => getCanonicalOrderKey(o.orderId) !== canonical);
      localStorage.setItem('artified_orders', JSON.stringify(filtered));
    }

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
    // Collect any order IDs currently in localStorage so they are permanently added to deletedIds
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

// Run one-time total purge for generation v6 so all historical orders are wiped cleanly
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('artified_all_orders_deleted');
    const purgeKey = `artified_purge_gen_${CURRENT_ORDER_GENERATION}_${CURRENT_PURGE_EPOCH}`;
    if (localStorage.getItem(purgeKey) !== 'done') {
      localStorage.setItem(purgeKey, 'done');
      deleteAllOrders();
    } else {
      // Always ensure legacy Firestore orders are purged in background
      purgeAllOrdersFromFirestore(false).catch(() => {});
    }
  }
} catch {}
