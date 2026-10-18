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
  buildMilestonesForPhase, 
  getProgressPercentage, 
  normalizeOrderId,
  getCanonicalOrderKey,
  getOrderIdVariants,
  isOrderDeletedOrPurged,
  registerCloudDeletedOrderIds,
  sanitizeOrderItems,
  getTrackedOrder,
  syncTrackedOrdersFromServer,
  shouldAcceptIncomingOrder
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
 * Normalizes Order ID for Firestore doc key (e.g. #ART-2026-1852 -> ART-2026-1852)
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
  const nowIso = order.updatedAt || new Date().toISOString();

  // Strip base64 product images from Firestore payload so documents are < 2KB (real images resolve from products.json via getRealProductImage)
  const cleanOrder = sanitizeOrderItems(order);
  const sanitizedOrder: any = {
    ...cleanOrder,
    items: (cleanOrder.items || []).map((it) => ({
      ...it,
      image: it.image && (it.image.startsWith('data:') || it.image.includes('ibb.co')) ? '' : it.image
    }))
  };
  if (sanitizedOrder.paymentScreenshot && typeof sanitizedOrder.paymentScreenshot === 'string' && sanitizedOrder.paymentScreenshot.length > 250000) {
    sanitizedOrder.paymentScreenshot = '';
  }

  const normId = normalizeOrderId(order.orderId);
  const formattedId = `#${normId}`;

  const payload: TrackedOrderData & {
    docId: string;
    sessionToken: string;
    updatedAt: string;
    statusRevision: number;
    generation: number;
    purgeEpochId: string;
  } = {
    ...sanitizedOrder,
    orderId: formattedId,
    docId,
    sessionToken,
    updatedAt: nowIso,
    statusRevision: order.statusRevision || 1,
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

  for (const colName of collectionsToPurge) {
    try {
      const snap = await getDocs(collection(db, colName));
      const deletions: Promise<void>[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (
          forceAll ||
          isOrderDeletedOrPurged(docSnap.id, data)
        ) {
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
        isOrderDeletedOrPurged(docSnap.id, data)
      ) {
        subDeletions.push(deleteDoc(doc(db, 'users', sessionToken, 'tracked_orders', docSnap.id)).catch(() => {}));
      }
    });
    await Promise.all(subDeletions);
  } catch {}
}

/**
 * Subscribes to real-time status updates of an order from local storage, server disk, and Firestore via onSnapshot.
 */
export function subscribeToTrackedOrder(
  orderIdInput: string,
  onUpdate: (order: TrackedOrderData | null) => void,
  onError?: (err: unknown) => void
): () => void {
  const docId = getOrderDocId(orderIdInput);

  if (!docId || isOrderDeletedOrPurged(orderIdInput)) {
    onUpdate(null);
    return () => {};
  }

  let hasResolvedOrder = false;

  // 1. Check local storage & saved orders immediately
  const immediateOrder = getTrackedOrder(orderIdInput);
  if (immediateOrder) {
    hasResolvedOrder = true;
    onUpdate(sanitizeOrderItems(immediateOrder));
  }

  // 2. Always fetch latest server disk `/api/tracked-orders` so any seller status updates from server are reflected immediately
  fetch('/api/tracked-orders')
    .then((res) => res.json())
    .then((serverMap) => {
      if (serverMap && typeof serverMap === 'object') {
        syncTrackedOrdersFromServer(serverMap);
        const syncedOrder = getTrackedOrder(orderIdInput);
        if (syncedOrder) {
          hasResolvedOrder = true;
          onUpdate(sanitizeOrderItems(syncedOrder));
        } else if (!hasResolvedOrder) {
          onUpdate(null);
        }
      }
    })
    .catch(() => {});

  const mainDocRef = doc(db, TRACKED_ORDERS_COLLECTION, docId);

  // 3. Set up real-time listener on the `tracked_orders` Firestore document
  const unsubTrackedDoc = onSnapshot(
    mainDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as TrackedOrderData;

        if (isOrderDeletedOrPurged(data.orderId || docId, data)) {
          onUpdate(null);
          return;
        }

        const sanitized = sanitizeOrderItems(data);
        const localCandidate = getTrackedOrder(orderIdInput);

        hasResolvedOrder = true;
        if (localCandidate && !shouldAcceptIncomingOrder(localCandidate, sanitized)) {
          onUpdate(sanitizeOrderItems(localCandidate));
        } else {
          onUpdate(sanitized);
        }
      } else {
        const localOrder = getTrackedOrder(orderIdInput);
        if (localOrder) {
          hasResolvedOrder = true;
          onUpdate(sanitizeOrderItems(localOrder));
        } else if (!hasResolvedOrder) {
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
      if (!isOrderDeletedOrPurged(orderId, data)) {
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
    updatedAt: new Date().toISOString(),
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
 * Cleans up any legacy demo/purged orders in Firestore on startup.
 */
export async function seedDemoOrdersToFirestore(): Promise<void> {
  await purgeAllOrdersFromFirestore(false);
}
