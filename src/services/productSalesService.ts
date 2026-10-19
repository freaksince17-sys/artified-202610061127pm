import { db } from '../firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  increment,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { Product, TrackedOrderData } from '../types';
import { PRODUCTS } from '../data/products';
import { normalizeOrderId, getCanonicalOrderKey } from '../data/trackingData';
import { calculateTotalSold } from '../utils/productStats';

const CONFIRMED_SALES_ORDERS_STORAGE_KEY = 'artified_confirmed_sales_order_ids_v1';
const SALES_HISTORY_STORAGE_KEY = 'artified_sales_history_v1';
const PRODUCT_SALES_LEDGER_STORAGE_KEY = 'artified_product_sales_ledger_v1';

export interface SalesHistoryRecord {
  id: string;
  productId: string;
  productTitle?: string;
  orderId: string;
  quantity: number;
  timestamp: string;
  createdAt: string;
  status: 'completed';
}

/**
 * Helper to check if an order phase or status qualifies as "Order confirmed and paid" or completed
 */
export function isOrderConfirmedOrCompleted(order: TrackedOrderData): boolean {
  if (!order) return false;
  const phase = order.currentPhase;
  // Stage 1 ('confirmed' = "1. Order Confirmed & Paid"), Stage 2, Stage 3, or Stage 4 ('delivered')
  if (
    phase === 'confirmed' ||
    phase === 'handcrafting_and_packaging' ||
    phase === 'beading_in_progress' ||
    phase === 'quality_and_packaging' ||
    phase === 'out_for_delivery' ||
    phase === 'delivered'
  ) {
    return true;
  }
  const paymentLower = (order.paymentStatus || '').toLowerCase();
  return paymentLower.includes('confirmed') || paymentLower.includes('paid') || paymentLower.includes('verified');
}

const SEED_SALES_HISTORY: SalesHistoryRecord[] = [
  {
    id: 'ART20261852_apsara-layered-pearl-collar',
    orderId: '#ART-2026-1852',
    productId: 'apsara-layered-pearl-collar',
    productTitle: 'Caviar Pearl Bag',
    quantity: 1,
    timestamp: '2026-10-18T11:29:34.277Z',
    createdAt: '2026-10-18T11:29:34.277Z',
    status: 'completed'
  },
  {
    id: 'ART20261853_lalitpur-bloom-pearl-tote',
    orderId: '#ART-2026-1853',
    productId: 'lalitpur-bloom-pearl-tote',
    productTitle: 'Pearl Beaded Bag',
    quantity: 1,
    timestamp: '2026-10-18T11:32:45.558Z',
    createdAt: '2026-10-18T11:32:45.558Z',
    status: 'completed'
  },
  {
    id: 'ART20261854_art-1790323549756-24tl6',
    orderId: '#ART-2026-1854',
    productId: 'art-1790323549756-24tl6',
    productTitle: 'Beaded Pearl Layer Necklace with Earrings',
    quantity: 1,
    timestamp: '2026-10-18T12:05:38.714Z',
    createdAt: '2026-10-18T12:05:38.714Z',
    status: 'completed'
  },
  {
    id: 'ART20261855_art-1790323202380-nw0zi',
    orderId: '#ART-2026-1855',
    productId: 'art-1790323202380-nw0zi',
    productTitle: 'Handmade Macrame Plant Hanger without pot',
    quantity: 1,
    timestamp: '2026-10-18T11:42:48.894Z',
    createdAt: '2026-10-18T11:42:48.894Z',
    status: 'completed'
  },
  {
    id: 'ART20261856_art-1790321559072-ym8ui',
    orderId: '#ART-2026-1856',
    productId: 'art-1790321559072-ym8ui',
    productTitle: 'Marble Bead Hand Bag',
    quantity: 1,
    timestamp: '2026-10-18T12:08:36.748Z',
    createdAt: '2026-10-18T12:08:36.748Z',
    status: 'completed'
  },
  {
    id: 'ART20261858_art-1790334939460-sj7ss',
    orderId: '#ART-2026-1858',
    productId: 'art-1790334939460-sj7ss',
    productTitle: 'Pearl Beaded Keyring Set of 4',
    quantity: 1,
    timestamp: '2026-10-18T12:31:09.962Z',
    createdAt: '2026-10-18T12:31:09.962Z',
    status: 'completed'
  },
  {
    id: 'ART20261859_art-1790339748217-gx4df',
    orderId: '#ART-2026-1859',
    productId: 'art-1790339748217-gx4df',
    productTitle: 'Silk Scrunchies Set of 4',
    quantity: 1,
    timestamp: '2026-10-18T12:57:55.453Z',
    createdAt: '2026-10-18T12:57:55.453Z',
    status: 'completed'
  },
  {
    id: 'ART20261865_lalitpur-bloom-pearl-tote',
    orderId: '#ART-2026-1865',
    productId: 'lalitpur-bloom-pearl-tote',
    productTitle: 'Pearl Beaded Bag',
    quantity: 1,
    timestamp: '2026-10-19T17:33:55.488Z',
    createdAt: '2026-10-19T17:33:55.488Z',
    status: 'completed'
  }
];

/**
 * Reads local sales_history records from localStorage merged with baseline confirmed order history
 */
export function getLocalSalesHistory(): SalesHistoryRecord[] {
  const map = new Map<string, SalesHistoryRecord>();
  for (const r of SEED_SALES_HISTORY) {
    map.set(r.id, r);
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SALES_HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const r of parsed) {
            if (r && r.id && r.productId) {
              map.set(String(r.id).trim(), r);
            }
          }
        }
      }
    }
  } catch {}
  return Array.from(map.values());
}

/**
 * Saves deduplicated sales_history records to localStorage and updates the lightweight product sales ledger
 */
export function saveLocalSalesHistory(records: SalesHistoryRecord[]): Map<string, SalesHistoryRecord> {
  const map = new Map<string, SalesHistoryRecord>();
  for (const r of records || []) {
    if (r && r.id && r.productId) {
      const cleanId = String(r.id).trim();
      const ts =
        typeof r.timestamp === 'string'
          ? r.timestamp
          : typeof r.createdAt === 'string'
          ? r.createdAt
          : new Date().toISOString();
      map.set(cleanId, {
        id: cleanId,
        productId: String(r.productId).trim(),
        productTitle: r.productTitle || '',
        orderId: r.orderId || '',
        quantity: Math.max(1, Number(r.quantity) || 1),
        timestamp: ts,
        createdAt: r.createdAt || ts,
        status: 'completed'
      });
    }
  }

  const deduped = Array.from(map.values());
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SALES_HISTORY_STORAGE_KEY, JSON.stringify(deduped));

      // Also compute and persist the lightweight product sales ledger (< 2KB)
      const byProduct: Record<string, number> = {};
      const orderIds = new Set<string>(getCountedSalesOrderIds());
      for (const rec of deduped) {
        byProduct[rec.productId] = (byProduct[rec.productId] || 0) + rec.quantity;
        if (rec.orderId) {
          const c = getCanonicalOrderKey(rec.orderId);
          if (c) orderIds.add(c);
        }
      }
      const existingLedger = getLocalProductSalesLedger();
      for (const [pid, qty] of Object.entries(byProduct)) {
        existingLedger[pid] = Math.max(existingLedger[pid] || 0, qty);
      }
      localStorage.setItem(PRODUCT_SALES_LEDGER_STORAGE_KEY, JSON.stringify(existingLedger));
      localStorage.setItem(CONFIRMED_SALES_ORDERS_STORAGE_KEY, JSON.stringify(Array.from(orderIds)));
    }
  } catch {}

  return map;
}

/**
 * Merges incoming sales_history records with local sales_history records
 */
export function mergeSalesHistoryRecords(incoming: SalesHistoryRecord[]): {
  salesHistory: SalesHistoryRecord[];
  verifiedSalesByProduct: Record<string, number>;
} {
  const current = getLocalSalesHistory();
  const map = saveLocalSalesHistory([...current, ...(incoming || [])]);
  const salesHistory = Array.from(map.values());
  const verifiedSalesByProduct: Record<string, number> = {};
  for (const rec of salesHistory) {
    verifiedSalesByProduct[rec.productId] = (verifiedSalesByProduct[rec.productId] || 0) + rec.quantity;
  }
  return { salesHistory, verifiedSalesByProduct };
}

/**
 * Reads lightweight product onlineSalesCount ledger from localStorage
 */
export function getLocalProductSalesLedger(): Record<string, number> {
  const ledger: Record<string, number> = {};
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(PRODUCT_SALES_LEDGER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed)) {
            const num = Number(v);
            if (!isNaN(num) && num > 0) {
              ledger[k] = num;
            }
          }
        }
      }
      // Also verify against local sales_history records
      const history = getLocalSalesHistory();
      const historyTotals: Record<string, number> = {};
      for (const rec of history) {
        historyTotals[rec.productId] = (historyTotals[rec.productId] || 0) + rec.quantity;
      }
      for (const [pid, total] of Object.entries(historyTotals)) {
        ledger[pid] = Math.max(ledger[pid] || 0, total);
      }
    }
  } catch {}
  return ledger;
}

/**
 * Applies verified sales counts from the sales_history ledger to a list of products
 */
export function applyVerifiedSalesToProducts(
  productList: Product[],
  extraVerifiedByProduct?: Record<string, number>,
  bestsellerThreshold: number = 50
): Product[] {
  const localLedger = getLocalProductSalesLedger();
  return (productList || []).map((prod) => {
    if (!prod || !prod.id) return prod;
    const baseSold = prod.soldCount !== undefined ? Number(prod.soldCount) : 54;
    const verifiedOnline = Math.max(
      Number(prod.onlineSalesCount) || 0,
      localLedger[prod.id] || 0,
      extraVerifiedByProduct?.[prod.id] || 0
    );
    const verifiedTotal = Math.max(
      Number(prod.totalSold) || 0,
      baseSold + verifiedOnline
    );
    return {
      ...prod,
      soldCount: baseSold,
      onlineSalesCount: verifiedOnline,
      totalSold: verifiedTotal,
      isBestSeller: verifiedTotal >= bestsellerThreshold || prod.isBestSeller
    };
  });
}

/**
 * Returns the set of canonical order IDs whose sales have already been counted in sales_history
 */
export function getCountedSalesOrderIds(): Set<string> {
  const set = new Set<string>();
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(CONFIRMED_SALES_ORDERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => {
            if (typeof id === 'string' && id.trim()) {
              set.add(getCanonicalOrderKey(id));
            }
          });
        }
      }
      const history = getLocalSalesHistory();
      history.forEach((rec) => {
        if (rec.orderId) {
          const c = getCanonicalOrderKey(rec.orderId);
          if (c) set.add(c);
        }
      });
    }
  } catch {}
  return set;
}

/**
 * Saves the set of canonical order IDs whose sales have been counted
 */
function saveCountedSalesOrderIds(ids: Set<string>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CONFIRMED_SALES_ORDERS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
    }
  } catch {}
}

/**
 * Resolves a product ID from an order line item (by explicit productId or matching title against catalog)
 */
export function resolveProductIdFromOrderItem(
  item: { productId?: string; title: string },
  catalog: Product[] = PRODUCTS
): string | null {
  if (item.productId && item.productId.trim()) {
    const exact = catalog.find((p) => p.id === item.productId);
    if (exact) return exact.id;
    return item.productId.trim();
  }

  const cleanTitle = (item.title || '').trim().toLowerCase();
  if (!cleanTitle) return null;

  if (cleanTitle.includes('beaded pearl layer necklace')) return 'art-1790323549756-24tl6';
  if (cleanTitle.includes('macrame plant hanger')) return 'art-1790323202380-nw0zi';
  if (cleanTitle.includes('marble bead')) return 'art-1790321559072-ym8ui';

  // 1. Exact title match
  const exactMatch = catalog.find((p) => p.title.trim().toLowerCase() === cleanTitle);
  if (exactMatch) return exactMatch.id;

  // 2. Partial inclusion match
  const partialMatch = catalog.find(
    (p) =>
      cleanTitle.includes(p.title.trim().toLowerCase()) ||
      p.title.trim().toLowerCase().includes(cleanTitle)
  );
  if (partialMatch) return partialMatch.id;

  return null;
}

/**
 * Tracks and increments total items sold in Firestore per product document using `increment(1)`
 * and records a timestamp + productId entry in the `sales_history` collection whenever a sale is completed.
 */
export async function trackConfirmedOrderSalesInFirestore(
  order: TrackedOrderData,
  currentProducts: Product[] = PRODUCTS
): Promise<{ updatedProductQuantities: Record<string, number>; wasNewlyCounted: boolean }> {
  const canonicalOrderId = getCanonicalOrderKey(order?.orderId || '');
  if (!canonicalOrderId || !isOrderConfirmedOrCompleted(order)) {
    return { updatedProductQuantities: {}, wasNewlyCounted: false };
  }

  // Calculate quantities per product from order items
  const productQuantities: Record<string, number> = {};
  for (const item of order.items || []) {
    const pid = resolveProductIdFromOrderItem(item, currentProducts);
    if (pid) {
      const qty = Math.max(1, Number(item.quantity) || 1);
      productQuantities[pid] = (productQuantities[pid] || 0) + qty;
    }
  }

  if (Object.keys(productQuantities).length === 0) {
    return { updatedProductQuantities: {}, wasNewlyCounted: false };
  }

  // Check if all (orderId, productId) records already exist in local sales_history
  const existingHistory = getLocalSalesHistory();
  const existingIds = new Set(existingHistory.map((r) => r.id));
  const nowIso = order.updatedAt || new Date().toISOString();
  const normOrderId = normalizeOrderId(order.orderId);
  const formattedOrderId = `#${normOrderId}`;

  const newRecords: SalesHistoryRecord[] = [];
  const newlyAddedQuantities: Record<string, number> = {};

  for (const [productId, qtyToAdd] of Object.entries(productQuantities)) {
    const recId = `${canonicalOrderId}_${productId}`;
    if (!existingIds.has(recId)) {
      const existingProd = currentProducts.find((p) => p.id === productId);
      newRecords.push({
        id: recId,
        productId,
        productTitle: existingProd?.title || '',
        orderId: formattedOrderId,
        quantity: qtyToAdd,
        timestamp: nowIso,
        createdAt: nowIso,
        status: 'completed'
      });
      newlyAddedQuantities[productId] = qtyToAdd;
    }
  }

  // Mark order ID in counted set
  const countedSet = getCountedSalesOrderIds();
  countedSet.add(canonicalOrderId);
  saveCountedSalesOrderIds(countedSet);

  // Save new records to local sales_history & lightweight ledger immediately (< 2KB, never fails quota)
  const { verifiedSalesByProduct } = mergeSalesHistoryRecords(newRecords);

  // Dispatch global browser event immediately so CartContext and all UI components update with 0ms latency
  if (typeof window !== 'undefined' && (Object.keys(newlyAddedQuantities).length > 0 || Object.keys(verifiedSalesByProduct).length > 0)) {
    window.dispatchEvent(
      new CustomEvent('artified_sales_incremented', {
        detail: {
          orderId: formattedOrderId,
          productQuantities: newlyAddedQuantities,
          verifiedSalesByProduct
        }
      })
    );
  }

  // 1. Invoke Server-Side Cloud Function endpoint (/api/sales/increment) for atomic persistence & sales_history verification
  try {
    const res = await fetch('/api/sales/increment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: formattedOrderId,
        timestamp: nowIso,
        items: Object.entries(productQuantities).map(([pid, qty]) => {
          const prod = currentProducts.find((p) => p.id === pid);
          return {
            productId: pid,
            productTitle: prod?.title || '',
            quantity: qty
          };
        })
      })
    });
    if (res.ok) {
      const serverData = await res.json();
      if (Array.isArray(serverData?.salesHistory)) {
        const merged = mergeSalesHistoryRecords(serverData.salesHistory);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('artified_sales_incremented', {
              detail: {
                orderId: formattedOrderId,
                productQuantities: {},
                verifiedSalesByProduct: merged.verifiedSalesByProduct
              }
            })
          );
        }
      }
    }
  } catch {}

  // 2. Direct Firestore atomic increment(1) + sales_history collection write (if newly counted)
  if (newRecords.length > 0) {
    try {
      const batch = writeBatch(db);
      for (const rec of newRecords) {
        const historyRef = doc(db, 'sales_history', rec.id);
        batch.set(
          historyRef,
          {
            ...rec,
            timestamp: serverTimestamp()
          },
          { merge: true }
        );
      }

      const trackerDocRef = doc(db, 'store_settings', 'confirmed_sales_orders');
      batch.set(
        trackerDocRef,
        {
          orderIds: Array.from(getCountedSalesOrderIds()),
          lastConfirmedOrderId: formattedOrderId,
          updatedAt: nowIso
        },
        { merge: true }
      );

      await batch.commit();

      // Use Firestore's atomic increment(1) operator per unit sold on products/{productId}
      for (const [productId, qtyToAdd] of Object.entries(newlyAddedQuantities)) {
        const prodRef = doc(db, 'products', productId);
        for (let i = 0; i < qtyToAdd; i++) {
          await setDoc(
            prodRef,
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
    } catch (err) {
      console.warn('Notice: Firestore sales_history & increment(1) sync:', err);
    }
  }

  return {
    updatedProductQuantities: newlyAddedQuantities,
    wasNewlyCounted: Object.keys(newlyAddedQuantities).length > 0
  };
}

/**
 * Syncs and verifies total sold counts from the server-side & Firestore `sales_history` collection,
 * and reconciles any confirmed/completed orders so sales never revert on refresh.
 */
export async function syncConfirmedSalesOrdersFromFirestore(
  ordersToReconcile?: TrackedOrderData[],
  currentProducts: Product[] = PRODUCTS
): Promise<Set<string>> {
  // 1. Fetch verified sales_history from server endpoint
  try {
    const res = await fetch(`/api/sales/history?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.salesHistory)) {
        const { verifiedSalesByProduct } = mergeSalesHistoryRecords(data.salesHistory);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('artified_sales_incremented', {
              detail: {
                productQuantities: {},
                verifiedSalesByProduct
              }
            })
          );
        }
      }
    }
  } catch {}

  // 2. Also query Firestore `sales_history` collection directly when quota allows
  try {
    const snap = await getDocs(collection(db, 'sales_history'));
    if (!snap.empty) {
      const cloudRecords: SalesHistoryRecord[] = [];
      snap.forEach((docSnap: any) => {
        const d = docSnap.data();
        if (d && (d.productId || docSnap.id)) {
          cloudRecords.push({
            id: d.id || docSnap.id,
            productId: d.productId,
            productTitle: d.productTitle || '',
            orderId: d.orderId || '',
            quantity: Math.max(1, Number(d.quantity) || 1),
            timestamp: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
            createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
            status: 'completed'
          });
        }
      });
      if (cloudRecords.length > 0) {
        const { verifiedSalesByProduct } = mergeSalesHistoryRecords(cloudRecords);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('artified_sales_incremented', {
              detail: {
                productQuantities: {},
                verifiedSalesByProduct
              }
            })
          );
        }
      }
    }
  } catch {}

  // 3. Reconcile any confirmed/completed orders from ordersToReconcile that are missing from sales_history
  if (Array.isArray(ordersToReconcile) && ordersToReconcile.length > 0) {
    const existingIds = new Set(getLocalSalesHistory().map((r) => r.id));
    for (const order of ordersToReconcile) {
      if (!order || !isOrderConfirmedOrCompleted(order)) continue;
      const canonicalOrderId = getCanonicalOrderKey(order.orderId || '');
      if (!canonicalOrderId) continue;

      let missingAnyItem = false;
      for (const item of order.items || []) {
        const pid = resolveProductIdFromOrderItem(item, currentProducts);
        if (pid && !existingIds.has(`${canonicalOrderId}_${pid}`)) {
          missingAnyItem = true;
          break;
        }
      }

      if (missingAnyItem) {
        await trackConfirmedOrderSalesInFirestore(order, currentProducts);
      }
    }
  }

  return getCountedSalesOrderIds();
}

/**
 * Calculates total creations sold across the entire catalog (base sold + live online sales)
 */
export function calculateCatalogTotalCreationsSold(products: Product[] = PRODUCTS): number {
  return (products || []).reduce((sum, prod) => sum + calculateTotalSold(prod), 0);
}
