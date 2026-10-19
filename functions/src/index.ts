import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  increment,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../src/firebase';

export interface SalesHistoryEntry {
  id: string;
  productId: string;
  productTitle?: string;
  orderId: string;
  quantity: number;
  timestamp: any;
  createdAt: string;
  status: 'completed';
}

export interface IncrementSalesRequest {
  orderId?: string;
  items: Array<{
    productId: string;
    productTitle?: string;
    quantity?: number;
  }>;
  timestamp?: string;
}

/**
 * Server-side Firebase Cloud Function handler to atomically increment product sales
 * using Firestore's field increment operator `increment(1)` and log each sale into
 * the `sales_history` collection in Firestore.
 */
export async function handleAtomicSalesIncrementCloudFunction(
  payload: IncrementSalesRequest
): Promise<{
  success: boolean;
  processedRecords: SalesHistoryEntry[];
  updatedProductQuantities: Record<string, number>;
}> {
  const nowIso = payload.timestamp || new Date().toISOString();
  const rawOrderId = (payload.orderId || `SALE-${Date.now()}`).trim();
  const canonicalOrderId = rawOrderId.replace(/[^A-Z0-9]/gi, '').toUpperCase();

  const processedRecords: SalesHistoryEntry[] = [];
  const updatedProductQuantities: Record<string, number> = {};

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return { success: false, processedRecords: [], updatedProductQuantities: {} };
  }

  // Group quantities by productId
  for (const item of payload.items) {
    const pid = (item.productId || '').trim();
    if (!pid) continue;
    const qty = Math.max(1, Number(item.quantity) || 1);
    updatedProductQuantities[pid] = (updatedProductQuantities[pid] || 0) + qty;
  }

  const batch = writeBatch(db);

  for (const [productId, quantity] of Object.entries(updatedProductQuantities)) {
    const historyDocId = `${canonicalOrderId}_${productId}`;
    const historyRef = doc(db, 'sales_history', historyDocId);
    const productRef = doc(db, 'products', productId);

    // Check if this (orderId, productId) sale record was already processed in Firestore
    let alreadyExists = false;
    try {
      const existingSnap = await getDoc(historyRef);
      if (existingSnap.exists()) {
        alreadyExists = true;
      }
    } catch {
      // If daily read quota is exhausted, proceed with deterministic idempotent write
    }

    const matchingItem = payload.items.find((i) => i.productId === productId);
    const record: SalesHistoryEntry = {
      id: historyDocId,
      productId,
      productTitle: matchingItem?.productTitle || '',
      orderId: rawOrderId.startsWith('#') ? rawOrderId : `#${rawOrderId}`,
      quantity,
      timestamp: serverTimestamp(),
      createdAt: nowIso,
      status: 'completed'
    };

    // 1. Record sale in Firestore `sales_history` collection with timestamp and productId
    batch.set(historyRef, record, { merge: true });
    processedRecords.push({ ...record, timestamp: nowIso });

    // 2. Atomically increment product sales in `products/{productId}` using `increment(1)` per unit sold
    if (!alreadyExists) {
      for (let i = 0; i < quantity; i++) {
        await setDoc(
          productRef,
          {
            id: productId,
            onlineSalesCount: increment(1),
            totalSold: increment(1),
            updatedAt: nowIso
          },
          { merge: true }
        );
      }
    }
  }

  await batch.commit();

  return {
    success: true,
    processedRecords,
    updatedProductQuantities
  };
}

/**
 * Verifies the total online sold count for a given productId by querying
 * the `sales_history` collection in Firestore.
 */
export async function verifyProductSalesFromFirestoreHistory(productId: string): Promise<{
  productId: string;
  verifiedOnlineSoldCount: number;
  recordsCount: number;
}> {
  const q = query(collection(db, 'sales_history'), where('productId', '==', productId));
  const snap = await getDocs(q);
  let verifiedOnlineSoldCount = 0;
  snap.forEach((docSnap: any) => {
    const data = docSnap.data();
    const qty = Math.max(1, Number(data?.quantity) || 1);
    verifiedOnlineSoldCount += qty;
  });

  return {
    productId,
    verifiedOnlineSoldCount,
    recordsCount: snap.size
  };
}
