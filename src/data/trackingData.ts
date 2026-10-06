import { TrackedOrderData, OrderDetails, OrderProductionPhase, TrackingMilestone } from '../types';
import { recordOrderStatusChange } from '../utils/orderNotificationManager';
import { saveOrderToFirestore } from '../services/orderTrackingService';
import { CAVIAR_PEARL_BAG_IMAGE, getRealProductImage } from '../utils/productImages';
import SAVED_TRACKED_ORDERS from './tracked_orders.json';

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
  const isConfirmed = true;

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
      completed: (phase === 'out_for_delivery' || isDelivered),
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

const savedOrders = (SAVED_TRACKED_ORDERS as Record<string, Partial<TrackedOrderData>>) || {};
const initialOrder5526 = savedOrders['ART-2026-5526'] || {};
const activePhase5526: OrderProductionPhase = (initialOrder5526.currentPhase as OrderProductionPhase) || 'out_for_delivery';

export const DEMO_TRACKED_ORDERS: Record<string, TrackedOrderData> = {
  'ART-2026-5526': {
    orderId: 'ART-2026-5526',
    customerName: initialOrder5526.customerName || 'Lamar Anzelov',
    phone: initialOrder5526.phone || '9703726980',
    deliveryAddress: initialOrder5526.deliveryAddress || '175/25, Kathmandu Valley',
    deliveryZoneName: initialOrder5526.deliveryZoneName || 'Inside Ring Road (Kathmandu / Lalitpur)',
    paymentMethodText: initialOrder5526.paymentMethodText || 'Direct Order / Cash on Delivery',
    paymentStatus: initialOrder5526.paymentStatus || 'Paid & Verified',
    items: [
      {
        title: 'Caviar Pearl Bag',
        image: CAVIAR_PEARL_BAG_IMAGE,
        quantity: 1,
        price: 2499,
        customization: 'Handcrafted by Sahina Shrestha'
      }
    ],
    total: initialOrder5526.total || 2499,
    orderPlacedDate: initialOrder5526.orderPlacedDate || 'Recent Order',
    estimatedDeliveryDate: initialOrder5526.estimatedDeliveryDate || '1-2 business days',
    currentPhase: activePhase5526,
    progressPercentage: getProgressPercentage(activePhase5526),
    artisanName: 'Sahina Shrestha',
    artisanRole: 'Founder and Creator',
    studioLocation: 'Artified Workshop, Kathmandu, Nepal',
    liveCraftNotes: initialOrder5526.liveCraftNotes || 'Your Caviar Pearl Bag was meticulously hand-woven and inspected at our Kathmandu workshop. It has been handed over to our express courier for delivery to your doorstep.',
    courierPartner: initialOrder5526.courierPartner || 'Kathmandu Valley Express Courier',
    consignmentCode: initialOrder5526.consignmentCode || 'KTM-EXP-5526',
    milestones: buildMilestonesForPhase(activePhase5526, 'Recent Order', '1-2 business days', '175/25, Inside Ring Road')
  }
};

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
  return id.replace(/[#\s]/g, '').toUpperCase();
}

/**
 * Persists an updated tracked order to browser storage.
 */
export function saveTrackedOrder(order: TrackedOrderData): void {
  try {
    const raw = localStorage.getItem('artified_tracked_orders');
    const map: Record<string, TrackedOrderData> = raw ? JSON.parse(raw) : {};
    const norm = normalizeOrderId(order.orderId);
    map[norm] = order;
    localStorage.setItem('artified_tracked_orders', JSON.stringify(map));

    // Also update in-memory DEMO_TRACKED_ORDERS so it never reverts
    if (DEMO_TRACKED_ORDERS[norm]) {
      DEMO_TRACKED_ORDERS[norm] = {
        ...DEMO_TRACKED_ORDERS[norm],
        ...order
      };
    }

    // Sync to server disk
    try {
      fetch('/api/tracked-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      }).catch(() => {});
    } catch {}

    // Real-time Firestore sync
    saveOrderToFirestore(order).catch((err) => {
      console.warn('Notice: Firestore order tracking save:', err);
    });

    recordOrderStatusChange(order.orderId, order.currentPhase, order.customerName);
    window.dispatchEvent(new CustomEvent('artified_order_updated', { detail: order }));
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
  const current = getTrackedOrder(orderIdInput) || generateDynamicTrackedOrder(orderIdInput);
  const targetPhase: OrderProductionPhase = phase || current.currentPhase || 'out_for_delivery';
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

  const norm = normalizeOrderId(orderIdInput);
  if (DEMO_TRACKED_ORDERS[norm]) {
    DEMO_TRACKED_ORDERS[norm] = {
      ...DEMO_TRACKED_ORDERS[norm],
      ...updated
    };
  }

  saveTrackedOrder(updated);
  return updated;
}

/**
 * Synchronizes tracked orders from server disk into in-memory state and localStorage.
 */
export function syncTrackedOrdersFromServer(ordersMap: Record<string, TrackedOrderData>): void {
  if (!ordersMap || typeof ordersMap !== 'object') return;

  try {
    const raw = localStorage.getItem('artified_tracked_orders');
    const localMap: Record<string, TrackedOrderData> = raw ? JSON.parse(raw) : {};

    Object.entries(ordersMap).forEach(([rawKey, serverOrder]) => {
      const norm = normalizeOrderId(serverOrder.orderId || rawKey);
      const enrichedOrder: TrackedOrderData = {
        ...serverOrder,
        orderId: norm,
        progressPercentage: getProgressPercentage(serverOrder.currentPhase),
        milestones: serverOrder.milestones && serverOrder.milestones.length > 0
          ? serverOrder.milestones
          : buildMilestonesForPhase(
              serverOrder.currentPhase || 'out_for_delivery',
              serverOrder.orderPlacedDate || 'Recent Order',
              serverOrder.estimatedDeliveryDate || '1-2 business days',
              serverOrder.deliveryAddress || 'Kathmandu Valley'
            )
      };

      localMap[norm] = enrichedOrder;

      if (DEMO_TRACKED_ORDERS[norm]) {
        DEMO_TRACKED_ORDERS[norm] = {
          ...DEMO_TRACKED_ORDERS[norm],
          ...enrichedOrder
        };
      }

      window.dispatchEvent(new CustomEvent('artified_order_updated', { detail: enrichedOrder }));
    });

    localStorage.setItem('artified_tracked_orders', JSON.stringify(localMap));
  } catch (err) {
    console.warn('Notice: Error syncing tracked orders from server:', err);
  }
}

/**
 * Fetches order tracking data from updated local storage records,
 * pre-configured demo records, or locally placed orders.
 */
export function getTrackedOrder(orderIdInput: string): TrackedOrderData | null {
  if (!orderIdInput.trim()) return null;

  const normalized = normalizeOrderId(orderIdInput);

  // 1. Check seller-saved / modified tracking records first
  try {
    const raw = localStorage.getItem('artified_tracked_orders');
    if (raw) {
      const map: Record<string, TrackedOrderData> = JSON.parse(raw);
      if (map[normalized]) {
        return sanitizeOrderItems(map[normalized]);
      }
    }
  } catch {
    // ignore
  }

  // 2. Check pre-configured demo orders
  if (DEMO_TRACKED_ORDERS[normalized]) {
    return sanitizeOrderItems(DEMO_TRACKED_ORDERS[normalized]);
  }

  // 3. Check locally placed orders in browser storage
  try {
    const savedOrdersRaw = localStorage.getItem('artified_orders');
    if (savedOrdersRaw) {
      const orders: OrderDetails[] = JSON.parse(savedOrdersRaw);
      const matched = orders.find((o) => normalizeOrderId(o.orderId) === normalized);
      if (matched) {
        return sanitizeOrderItems(buildTrackedOrderFromOrderDetails(matched));
      }
    }
  } catch {
    // ignore parsing errors
  }

  // 4. If user entered a realistic ART- format, generate realistic tracking
  if (normalized.startsWith('ART-') || normalized.startsWith('ART')) {
    return sanitizeOrderItems(generateDynamicTrackedOrder(normalized));
  }

  return null;
}

/**
 * Returns all active orders for the seller to manage in one central place:
 * Merges demo orders, customer placed orders, and seller-created orders.
 */
export function getAllOrdersForSeller(): TrackedOrderData[] {
  const result: Record<string, TrackedOrderData> = {};
  const legacyDefaultIds = ['ART-2026-8842', 'ART-2026-5521', 'ART-2026-3190'];

  // 1. Add demo orders (only ART-2026-5526)
  Object.values(DEMO_TRACKED_ORDERS).forEach((order) => {
    result[normalizeOrderId(order.orderId)] = order;
  });

  // 2. Add customer checkout orders from localStorage
  try {
    const raw = localStorage.getItem('artified_orders');
    if (raw) {
      const customerOrders: OrderDetails[] = JSON.parse(raw);
      customerOrders.forEach((o) => {
        const norm = normalizeOrderId(o.orderId);
        if (!legacyDefaultIds.includes(norm) && !result[norm]) {
          result[norm] = buildTrackedOrderFromOrderDetails(o);
        }
      });
    }
  } catch (e) {
    console.warn('Error reading customer orders for seller', e);
  }

  // 3. Overlay any seller-updated tracked orders
  try {
    const rawTracked = localStorage.getItem('artified_tracked_orders');
    if (rawTracked) {
      const trackedMap: Record<string, TrackedOrderData> = JSON.parse(rawTracked);
      // Clean legacy defaults from localStorage
      let hasLegacy = false;
      legacyDefaultIds.forEach((id) => {
        if (trackedMap[id]) {
          delete trackedMap[id];
          hasLegacy = true;
        }
      });
      if (hasLegacy) {
        localStorage.setItem('artified_tracked_orders', JSON.stringify(trackedMap));
      }

      Object.entries(trackedMap).forEach(([norm, order]) => {
        if (!legacyDefaultIds.includes(norm)) {
          result[norm] = order;
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
    )
  };
}

function generateDynamicTrackedOrder(orderId: string): TrackedOrderData {
  const phase: OrderProductionPhase = 'handcrafting_and_packaging';
  return {
    orderId: orderId.startsWith('#') ? orderId : `#${orderId}`,
    customerName: 'Valued Artified Customer',
    phone: '98XXXXXXXX',
    deliveryAddress: 'Kathmandu Valley, Nepal',
    deliveryZoneName: 'Kathmandu Valley',
    paymentMethodText: 'Verified Order Booking',
    paymentStatus: 'Confirmed & Paid',
    items: [
      {
        title: 'Handcrafted Pearl Creation',
        image: CAVIAR_PEARL_BAG_IMAGE,
        quantity: 1,
        price: 4200,
        customization: 'Handmade slow-fashion piece'
      }
    ],
    total: 4300,
    orderPlacedDate: 'Recently Placed',
    estimatedDeliveryDate: '1 to 2 days',
    currentPhase: phase,
    progressPercentage: getProgressPercentage(phase),
    artisanName: 'Sahina Shrestha',
    artisanRole: 'Founder and Creator',
    studioLocation: 'Artified Workshop, Kathmandu, Nepal',
    liveCraftNotes: 'Handcrafting underway in Kathmandu workshop by Sahina Shrestha. Each bead is manually anchored to ensure structural longevity.',
    milestones: buildMilestonesForPhase(phase, 'Recently Placed', '1 to 2 days', 'Kathmandu Valley')
  };
}
