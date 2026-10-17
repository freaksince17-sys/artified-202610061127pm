import { db } from '../firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs,
  arrayUnion
} from 'firebase/firestore';
import {
  safeSetDoc as setDoc,
  safeDeleteDoc as deleteDoc,
  safeOnSnapshot as onSnapshot
} from '../utils/safeFirestore';
import { TrackedOrderData, OrderProductionPhase } from '../types';
import { 
  DEMO_TRACKED_ORDERS, 
  buildMilestonesForPhase, 
  getProgressPercentage, 
  normalizeOrderId,
  getCanonicalOrderKey,
  getOrderIdVariants,
  isOrderDeletedOrPurged,
  registerCloudDeletedOrderIds,
  sanitizeOrderItems,
  getTrackedOrder,
  deleteTrackedOrder
} from '../data/trackingData';

const TRACKED_ORDERS_COLLECTION = 'tracked_orders';
const ORDERS_COLLECTION = 'orders';
const ORDER_STATUS_LOGS_COLLECTION = 'order_status_logs';
export const CURRENT_ORDER_GENERATION = 6;
export const CURRENT_PURGE_EPOCH = 'artified_clean_slate_v6';

/**
 * Retrieves or generates a secure, unique buyer session token to prevent unauthorized access
 */
export function getUserSessionToken(): string {
  try {
    let token = localStorage.getItem('artified_user_session_token');
    if (!token) {
      token = `buyer_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
      localStorage.setItem('artified_user_session_token', token);
    }
    return token;
  } catch {
    return 'guest_buyer_session';
  }
}

/**
 * Normalizes Order ID for Firestore doc key (e.g. #ART-2026-5526 -> ART-2026-5526)
 */
export function getOrderDocId(rawId: string): string {
  const compact = getCanonicalOrderKey(rawId);
  const matchCompact = compact.match(/^([A-Z]+)(\d{4})(\d+)$/);
  if (matchCompact) {
    return `${matchCompact[1]}-${matchCompact[2]}-${matchCompact[3]}`;
  }
  return normalizeOrderId(rawId).replace(/[^A-Za-z0-9_-]/g, '').toUpperCase();
}

/**
 * Saves a tracked order to Firestore in `orders`, `tracked_orders`, `order_status_logs`,
 * and the user's `tracked_orders` sub-collection.
 */
export async function saveOrderToFirestore(order: TrackedOrderData, userSessionId?: string): Promise<void> {
  const docId = getOrderDocId(order.orderId);
  if (!docId) return;

  const sessionToken = userSessionId || getUserSessionToken();
  const nowIso = new Date().toISOString();

  const payload: TrackedOrderData & {
    docId: string;
    sessionToken: string;
    updatedAt: string;
    generation: number;
    purgeEpochId: string;
  } = {
    ...order,
    orderId: order.orderId.startsWith('#') ? order.orderId : `#${order.orderId}`,
    docId,
    sessionToken,
    updatedAt: nowIso,
    generation: CURRENT_ORDER_GENERATION,
    purgeEpochId: CURRENT_PURGE_EPOCH
  };

  try {
    // 1. Save to primary `orders` collection
    const orderDocRef = doc(db, ORDERS_COLLECTION, docId);
    await setDoc(orderDocRef, payload, { merge: true });

    // 2. Save to `tracked_orders` collection
    const mainDocRef = doc(db, TRACKED_ORDERS_COLLECTION, docId);
    await setDoc(mainDocRef, payload, { merge: true });

    // 3. Save status log entry in `order_status_logs`
    const statusLogRef = doc(db, ORDER_STATUS_LOGS_COLLECTION, docId);
    await setDoc(
      statusLogRef,
      {
        orderId: payload.orderId,
        docId,
        currentPhase: payload.currentPhase,
        progressPercentage: payload.progressPercentage,
        milestones: payload.milestones || [],
        updatedAt: nowIso,
        generation: CURRENT_ORDER_GENERATION,
        purgeEpochId: CURRENT_PURGE_EPOCH
      },
      { merge: true }
    );

    // 4. Save to user-keyed sub-collection for customer order history
    const userSubDocRef = doc(db, 'users', sessionToken, 'tracked_orders', docId);
    await setDoc(userSubDocRef, payload, { merge: true });
  } catch (error) {
    console.warn('Notice: Firestore save error, saving locally:', error);
  }

  // Maintain local storage for instant offline recovery
  try {
    const raw = localStorage.getItem('artified_tracked_orders');
    const map: Record<string, TrackedOrderData> = raw ? JSON.parse(raw) : {};
    map[normalizeOrderId(order.orderId)] = {
      ...order,
      generation: CURRENT_ORDER_GENERATION,
      purgeEpochId: CURRENT_PURGE_EPOCH
    } as TrackedOrderData;
    localStorage.setItem('artified_tracked_orders', JSON.stringify(map));
  } catch {}

  // Sync to server disk
  try {
    fetch('/api/tracked-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...order,
        generation: CURRENT_ORDER_GENERATION,
        purgeEpochId: CURRENT_PURGE_EPOCH
      })
    }).catch(() => {});
  } catch {}
}

/**
 * Deletes an order and all associated tracking records and status logs from Firestore
 * across `orders`, `tracked_orders`, `order_status_logs`, and `users/{session}/tracked_orders`,
 * and records the tombstone in `store_settings/deleted_orders`.
 */
export async function deleteOrderFromFirestore(rawOrderId: string): Promise<void> {
  const variants = getOrderIdVariants(rawOrderId);
  const sessionToken = getUserSessionToken();

  registerCloudDeletedOrderIds(variants);

  const deletePromises: Promise<void>[] = [];

  for (const variant of variants) {
    const docKey = variant.replace(/^#/, '');
    if (!docKey) continue;

    deletePromises.push(deleteDoc(doc(db, ORDERS_COLLECTION, docKey)).catch(() => {}));
    deletePromises.push(deleteDoc(doc(db, TRACKED_ORDERS_COLLECTION, docKey)).catch(() => {}));
    deletePromises.push(deleteDoc(doc(db, ORDER_STATUS_LOGS_COLLECTION, docKey)).catch(() => {}));
    deletePromises.push(deleteDoc(doc(db, 'users', sessionToken, 'tracked_orders', docKey)).catch(() => {}));
  }

  // Also record in Firestore tombstone document so all clients know this order was deleted
  deletePromises.push(
    setDoc(
      doc(db, 'store_settings', 'deleted_orders'),
      {
        deletedIds: arrayUnion(...variants),
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    ).catch(() => {})
  );

  await Promise.all(deletePromises);
}

/**
 * Purges all legacy/existing orders from Firestore (`orders`, `tracked_orders`, `order_status_logs`,
 * and `users/{sessionToken}/tracked_orders`) that do not belong to CURRENT_ORDER_GENERATION / CURRENT_PURGE_EPOCH.
 */
export async function purgeAllOrdersFromFirestore(forceAll = false): Promise<void> {
  const sessionToken = getUserSessionToken();
  const collectionsToPurge = [
    ORDERS_COLLECTION,
    TRACKED_ORDERS_COLLECTION,
    ORDER_STATUS_LOGS_COLLECTION
  ];

  // Sync cloud deleted tombstones first
  try {
    const deletedSnap = await getDoc(doc(db, 'store_settings', 'deleted_orders'));
    if (deletedSnap.exists()) {
      const data = deletedSnap.data();
      if (Array.isArray(data?.deletedIds)) {
        registerCloudDeletedOrderIds(data.deletedIds);
      }
    }
  } catch {}

  // Explicitly delete known legacy document IDs immediately
  await Promise.all([
    deleteOrderFromFirestore('ART-2026-4846'),
    deleteOrderFromFirestore('ART20264846'),
    deleteOrderFromFirestore('ART-2026-5526'),
    deleteOrderFromFirestore('ART20265526'),
    deleteOrderFromFirestore('ART-2026-8842'),
    deleteOrderFromFirestore('ART-2026-5521'),
    deleteOrderFromFirestore('ART-2026-3190')
  ]).catch(() => {});

  for (const colName of collectionsToPurge) {
    try {
      const snap = await getDocs(collection(db, colName));
      const deletions: Promise<void>[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (
          forceAll ||
          data?.generation !== CURRENT_ORDER_GENERATION ||
          data?.purgeEpochId !== CURRENT_PURGE_EPOCH ||
          isOrderDeletedOrPurged(docSnap.id, data)
        ) {
          registerCloudDeletedOrderIds([docSnap.id, data?.orderId].filter(Boolean));
          deletions.push(deleteDoc(doc(db, colName, docSnap.id)).catch(() => {}));
        }
      });
      await Promise.all(deletions);
    } catch {}
  }

  try {
    const userSubSnap = await getDocs(collection(db, 'users', sessionToken, 'tracked_orders'));
    const subDeletions: Promise<void>[] = [];
    userSubSnap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      if (
        forceAll ||
        data?.generation !== CURRENT_ORDER_GENERATION ||
        data?.purgeEpochId !== CURRENT_PURGE_EPOCH ||
        isOrderDeletedOrPurged(docSnap.id, data)
      ) {
        registerCloudDeletedOrderIds([docSnap.id, data?.orderId].filter(Boolean));
        subDeletions.push(deleteDoc(doc(db, 'users', sessionToken, 'tracked_orders', docSnap.id)).catch(() => {}));
      }
    });
    await Promise.all(subDeletions);
  } catch {}
}

/**
 * Subscribes to real-time status updates of an order from Firestore via onSnapshot.
 * Monitors both `orders/{docId}` and `tracked_orders/{docId}` so that if an order is deleted
 * from the `orders` collection, all associated tracking records and status logs are automatically
 * removed and `onUpdate(null)` is triggered immediately.
 */
export function subscribeToTrackedOrder(
  orderIdInput: string,
  onUpdate: (order: TrackedOrderData | null) => void,
  onError?: (err: unknown) => void
): () => void {
  const docId = getOrderDocId(orderIdInput);

  if (!docId || isOrderDeletedOrPurged(orderIdInput)) {
    if (docId) {
      deleteOrderFromFirestore(orderIdInput).catch(() => {});
    }
    onUpdate(null);
    return () => {};
  }

  // 1. Check local session storage first (only valid generation & epoch orders)
  const immediateOrder = getTrackedOrder(orderIdInput);
  if (immediateOrder) {
    onUpdate(sanitizeOrderItems(immediateOrder));
  }

  const orderDocRef = doc(db, ORDERS_COLLECTION, docId);
  const mainDocRef = doc(db, TRACKED_ORDERS_COLLECTION, docId);
  const deletedSettingsRef = doc(db, 'store_settings', 'deleted_orders');

  let hasSeenOrderDoc = false;

  // Listen to `store_settings/deleted_orders` tombstone in real time
  const unsubTombstone = onSnapshot(
    deletedSettingsRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.deletedIds)) {
          registerCloudDeletedOrderIds(data.deletedIds);
          if (isOrderDeletedOrPurged(orderIdInput)) {
            deleteTrackedOrder(orderIdInput);
            onUpdate(null);
          }
        }
      }
    },
    () => {}
  );

  // Listen to primary `orders/{docId}` document to detect deletion from the `orders` collection
  const unsubOrderDoc = onSnapshot(
    orderDocRef,
    (orderSnap) => {
      if (orderSnap.exists()) {
        const data = orderSnap.data() as TrackedOrderData & { generation?: number; purgeEpochId?: string };
        if (
          data.generation !== CURRENT_ORDER_GENERATION ||
          data.purgeEpochId !== CURRENT_PURGE_EPOCH ||
          isOrderDeletedOrPurged(data.orderId || docId, data)
        ) {
          deleteTrackedOrder(data.orderId || docId);
          onUpdate(null);
          return;
        }
        hasSeenOrderDoc = true;
      } else if (hasSeenOrderDoc) {
        // Order was deleted from the `orders` collection while listening: cascade delete tracking records & logs
        deleteTrackedOrder(orderIdInput);
        onUpdate(null);
      }
    },
    () => {}
  );

  // Set up real-time listener on the `tracked_orders` Firestore document
  const unsubTrackedDoc = onSnapshot(
    mainDocRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as TrackedOrderData & { generation?: number; purgeEpochId?: string };

        // Strictly reject and cascade-delete any order from before the current purge epoch/generation
        if (
          data.generation !== CURRENT_ORDER_GENERATION ||
          data.purgeEpochId !== CURRENT_PURGE_EPOCH ||
          isOrderDeletedOrPurged(data.orderId || docId, data)
        ) {
          deleteTrackedOrder(data.orderId || docId);
          onUpdate(null);
          return;
        }

        // Verify the parent order still exists in `orders/{docId}`; if deleted from `orders`, cascade delete tracking records
        try {
          const parentOrderSnap = await getDoc(orderDocRef);
          if (!parentOrderSnap.exists()) {
            deleteTrackedOrder(data.orderId || docId);
            onUpdate(null);
            return;
          }
        } catch {}

        const sanitized = sanitizeOrderItems(data);
        const localCandidate = getTrackedOrder(orderIdInput);

        const phaseWeights: Record<string, number> = {
          confirmed: 1,
          handcrafting_and_packaging: 2,
          beading_in_progress: 2,
          quality_and_packaging: 2,
          out_for_delivery: 3,
          delivered: 4
        };

        const localWeight = localCandidate ? (phaseWeights[localCandidate.currentPhase] || 0) : 0;
        const remoteWeight = phaseWeights[sanitized.currentPhase] || 0;

        if (localCandidate && localWeight > remoteWeight) {
          onUpdate(sanitizeOrderItems(localCandidate));
          saveOrderToFirestore(localCandidate).catch(() => {});
        } else {
          onUpdate(sanitized);
        }
      } else {
        // Document not found in `tracked_orders`: check local valid orders
        const localOrder = getTrackedOrder(orderIdInput);
        if (localOrder) {
          onUpdate(sanitizeOrderItems(localOrder));
        } else {
          onUpdate(null);
        }
      }
    },
    (error) => {
      console.warn('Firestore onSnapshot notice for order tracking:', error);
      if (onError) onError(error);
      onUpdate(getTrackedOrder(orderIdInput));
    }
  );

  return () => {
    unsubTombstone();
    unsubOrderDoc();
    unsubTrackedDoc();
  };
}

/**
 * Updates an order phase and details in Firestore in real-time.
 */
export async function updateOrderStatusInFirestore(
  orderId: string,
  newPhase: OrderProductionPhase,
  updates?: {
    liveCraftNotes?: string;
    courierPartner?: string;
    consignmentCode?: string;
    estimatedDeliveryDate?: string;
    riderName?: string;
    riderPhone?: string;
  }
): Promise<TrackedOrderData | null> {
  const docId = getOrderDocId(orderId);
  if (!docId || isOrderDeletedOrPurged(orderId)) return null;

  const docRef = doc(db, TRACKED_ORDERS_COLLECTION, docId);
  let existing: TrackedOrderData | null = null;

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as TrackedOrderData & { generation?: number; purgeEpochId?: string };
      if (
        data.generation === CURRENT_ORDER_GENERATION &&
        data.purgeEpochId === CURRENT_PURGE_EPOCH &&
        !isOrderDeletedOrPurged(orderId, data)
      ) {
        existing = data;
      }
    }
  } catch {}

  if (!existing) {
    existing = getTrackedOrder(orderId);
  }

  if (!existing) return null;

  const updated: TrackedOrderData = {
    ...existing,
    currentPhase: newPhase,
    progressPercentage: getProgressPercentage(newPhase),
    liveCraftNotes: updates?.liveCraftNotes ?? existing.liveCraftNotes,
    courierPartner: updates?.courierPartner ?? existing.courierPartner,
    consignmentCode: updates?.consignmentCode ?? existing.consignmentCode,
    estimatedDeliveryDate: updates?.estimatedDeliveryDate ?? existing.estimatedDeliveryDate,
    riderName: updates?.riderName ?? existing.riderName,
    riderPhone: updates?.riderPhone ?? existing.riderPhone,
    milestones: buildMilestonesForPhase(
      newPhase,
      existing.orderPlacedDate,
      updates?.estimatedDeliveryDate ?? existing.estimatedDeliveryDate,
      existing.deliveryAddress || existing.deliveryZoneName
    )
  };

  await saveOrderToFirestore(updated);
  return updated;
}

/**
 * Cleans up any legacy demo/purged orders in Firestore on startup instead of seeding demo orders.
 */
export async function seedDemoOrdersToFirestore(): Promise<void> {
  await purgeAllOrdersFromFirestore(false);
}
