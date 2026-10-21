import { db } from '../firebase';
import {
  doc,
  setDoc,
  collection,
  getDocs,
  increment,
  serverTimestamp,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { Product, TrackedOrderData } from '../types';
import { PRODUCTS } from '../data/products';
import { normalizeOrderId, getCanonicalOrderKey, syncTrackedOrdersFromServer, getAllOrdersForSeller } from '../data/trackingData';
import { calculateTotalSold } from '../utils/productStats';
import { isFirestoreQuotaExceeded, detectQuotaError } from '../utils/safeFirestore';

const CONFIRMED_SALES_ORDERS_STORAGE_KEY = 'artified_confirmed_sales_order_ids_v1';
const SALES_HISTORY_STORAGE_KEY = 'artified_sales_history_v1';
const PRODUCT_SALES_LEDGER_STORAGE_KEY = 'artified_product_sales_ledger_v1';

export interface SalesHistoryRecord {
  id: string;
  productId: string;
  productTitle?: string;
  category?: string;
  orderId: string;
  quantity: number;
  unitPrice?: number;
  revenue?: number;
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

export const SEED_SALES_HISTORY: SalesHistoryRecord[] = [
  {
    id: 'ART20261852_apsara-layered-pearl-collar',
    orderId: '#ART-2026-1852',
    productId: 'apsara-layered-pearl-collar',
    productTitle: 'Caviar Pearl Bag',
    category: 'pearl-bags',
    quantity: 1,
    unitPrice: 3000,
    revenue: 3000,
    timestamp: '2026-10-18T11:29:34.277Z',
    createdAt: '2026-10-18T11:29:34.277Z',
    status: 'completed'
  },
  {
    id: 'ART20261853_lalitpur-bloom-pearl-tote',
    orderId: '#ART-2026-1853',
    productId: 'lalitpur-bloom-pearl-tote',
    productTitle: 'Pearl Beaded Bag',
    category: 'pearl-bags',
    quantity: 1,
    unitPrice: 2800,
    revenue: 2800,
    timestamp: '2026-10-18T11:32:45.558Z',
    createdAt: '2026-10-18T11:32:45.558Z',
    status: 'completed'
  },
  {
    id: 'ART20261854_art-1790323549756-24tl6',
    orderId: '#ART-2026-1854',
    productId: 'art-1790323549756-24tl6',
    productTitle: 'Beaded Pearl Layer Necklace with Earrings',
    category: 'pearl-necklaces',
    quantity: 1,
    unitPrice: 800,
    revenue: 800,
    timestamp: '2026-10-18T12:05:38.714Z',
    createdAt: '2026-10-18T12:05:38.714Z',
    status: 'completed'
  },
  {
    id: 'ART20261855_art-1790323202380-nw0zi',
    orderId: '#ART-2026-1855',
    productId: 'art-1790323202380-nw0zi',
    productTitle: 'Handmade Macrame Plant Hanger without pot',
    category: 'macrame',
    quantity: 1,
    unitPrice: 850,
    revenue: 850,
    timestamp: '2026-10-18T11:42:48.894Z',
    createdAt: '2026-10-18T11:42:48.894Z',
    status: 'completed'
  },
  {
    id: 'ART20261856_art-1790321559072-ym8ui',
    orderId: '#ART-2026-1856',
    productId: 'art-1790321559072-ym8ui',
    productTitle: 'Marble Bead Hand Bag',
    category: 'pearl-bags',
    quantity: 1,
    unitPrice: 2800,
    revenue: 2800,
    timestamp: '2026-10-18T12:08:36.748Z',
    createdAt: '2026-10-18T12:08:36.748Z',
    status: 'completed'
  },
  {
    id: 'ART20261858_art-1790334939460-sj7ss',
    orderId: '#ART-2026-1858',
    productId: 'art-1790334939460-sj7ss',
    productTitle: 'Pearl Beaded Keyring Set of 4',
    category: 'accessories',
    quantity: 1,
    unitPrice: 600,
    revenue: 600,
    timestamp: '2026-10-18T12:31:09.962Z',
    createdAt: '2026-10-18T12:31:09.962Z',
    status: 'completed'
  },
  {
    id: 'ART20261859_art-1790339748217-gx4df',
    orderId: '#ART-2026-1859',
    productId: 'art-1790339748217-gx4df',
    productTitle: 'Silk Scrunchies Set of 4',
    category: 'accessories',
    quantity: 1,
    unitPrice: 300,
    revenue: 300,
    timestamp: '2026-10-18T12:57:55.453Z',
    createdAt: '2026-10-18T12:57:55.453Z',
    status: 'completed'
  },
  {
    id: 'ART20261865_lalitpur-bloom-pearl-tote',
    orderId: '#ART-2026-1865',
    productId: 'lalitpur-bloom-pearl-tote',
    productTitle: 'Pearl Beaded Bag',
    category: 'pearl-bags',
    quantity: 1,
    unitPrice: 2800,
    revenue: 2800,
    timestamp: '2026-10-19T17:33:55.488Z',
    createdAt: '2026-10-19T17:33:55.488Z',
    status: 'completed'
  },
  {
    id: 'ART20261866_tara-micro-pearl-clutch',
    orderId: '#ART-2026-1866',
    productId: 'tara-micro-pearl-clutch',
    productTitle: 'Three Layer Pearl Necklace with Earrings',
    category: 'pearl-necklaces',
    quantity: 1,
    unitPrice: 650,
    revenue: 650,
    timestamp: '2026-10-19T18:06:19.073Z',
    createdAt: '2026-10-19T18:06:19.073Z',
    status: 'completed'
  }
];

const PURGED_ORDER_IDS = new Set([
  'ART20264846',
  'ART20265526',
  'ART20268842',
  'ART20265521',
  'ART20263190',
  'ART20263829',
  'ART20265157',
  'ART20264729'
]);

function isSaleRecordPurged(rec: Partial<SalesHistoryRecord>): boolean {
  if (!rec) return true;
  const orderKey = getCanonicalOrderKey(rec.orderId || '');
  if (orderKey && PURGED_ORDER_IDS.has(orderKey)) return true;
  const idPrefix = String(rec.id || '').split('_')[0].toUpperCase();
  if (idPrefix && PURGED_ORDER_IDS.has(idPrefix)) return true;
  return false;
}

/**
 * Enriches a SalesHistoryRecord with productTitle, category, unitPrice, and revenue from the product catalog
 */
export function enrichSalesHistoryRecord(
  rec: SalesHistoryRecord,
  catalog: Product[] = PRODUCTS
): Required<SalesHistoryRecord> {
  const prod = catalog.find((p) => p.id === rec.productId) || PRODUCTS.find((p) => p.id === rec.productId);
  const qty = Math.max(1, Number(rec.quantity) || 1);
  const unitPrice = Number(rec.unitPrice) > 0 ? Number(rec.unitPrice) : prod?.price || 1500;
  const revenue = Number(rec.revenue) > 0 ? Number(rec.revenue) : qty * unitPrice;
  const ts =
    typeof rec.timestamp === 'string' && rec.timestamp
      ? rec.timestamp
      : typeof rec.createdAt === 'string' && rec.createdAt
      ? rec.createdAt
      : new Date().toISOString();

  return {
    id: String(rec.id).trim(),
    productId: String(rec.productId).trim(),
    productTitle: rec.productTitle || prod?.title || 'Handcrafted Piece',
    category: rec.category || prod?.category || 'pearl-bags',
    orderId: rec.orderId || '',
    quantity: qty,
    unitPrice,
    revenue,
    timestamp: ts,
    createdAt: rec.createdAt || ts,
    status: 'completed'
  };
}

/**
 * Reads local sales_history records from localStorage merged with baseline confirmed order history
 */
export function getLocalSalesHistory(catalog: Product[] = PRODUCTS): Required<SalesHistoryRecord>[] {
  const map = new Map<string, Required<SalesHistoryRecord>>();
  for (const r of SEED_SALES_HISTORY) {
    if (!isSaleRecordPurged(r)) {
      map.set(r.id, enrichSalesHistoryRecord(r, catalog));
    }
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SALES_HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const r of parsed) {
            if (r && r.id && r.productId && !isSaleRecordPurged(r)) {
              map.set(String(r.id).trim(), enrichSalesHistoryRecord(r, catalog));
            }
          }
        }
      }
    }
  } catch {}
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Saves deduplicated sales_history records to localStorage and updates the lightweight product sales ledger
 */
export function saveLocalSalesHistory(
  records: SalesHistoryRecord[],
  catalog: Product[] = PRODUCTS
): Map<string, Required<SalesHistoryRecord>> {
  const map = new Map<string, Required<SalesHistoryRecord>>();
  for (const r of SEED_SALES_HISTORY) {
    if (!isSaleRecordPurged(r)) {
      map.set(r.id, enrichSalesHistoryRecord(r, catalog));
    }
  }
  for (const r of records || []) {
    if (r && r.id && r.productId && !isSaleRecordPurged(r)) {
      const cleanId = String(r.id).trim();
      map.set(cleanId, enrichSalesHistoryRecord(r, catalog));
    }
  }

  const deduped = Array.from(map.values());
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SALES_HISTORY_STORAGE_KEY, JSON.stringify(deduped));

      // Also compute and persist the lightweight product sales ledger (< 2KB)
      const byProduct: Record<string, number> = {};
      const orderIds = new Set<string>();
      for (const rec of deduped) {
        byProduct[rec.productId] = (byProduct[rec.productId] || 0) + rec.quantity;
        if (rec.orderId) {
          const c = getCanonicalOrderKey(rec.orderId);
          if (c) orderIds.add(c);
        }
      }
      localStorage.setItem(PRODUCT_SALES_LEDGER_STORAGE_KEY, JSON.stringify(byProduct));
      localStorage.setItem(CONFIRMED_SALES_ORDERS_STORAGE_KEY, JSON.stringify(Array.from(orderIds)));
    }
  } catch {}

  return map;
}

/**
 * Merges incoming sales_history records with local sales_history records
 */
export function mergeSalesHistoryRecords(
  incoming: SalesHistoryRecord[],
  catalog: Product[] = PRODUCTS
): {
  salesHistory: Required<SalesHistoryRecord>[];
  verifiedSalesByProduct: Record<string, number>;
} {
  const current = getLocalSalesHistory(catalog);
  const map = saveLocalSalesHistory([...current, ...(incoming || [])], catalog);
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
    const history = getLocalSalesHistory();
    for (const rec of history) {
      ledger[rec.productId] = (ledger[rec.productId] || 0) + rec.quantity;
    }
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(PRODUCT_SALES_LEDGER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed)) {
            const num = Number(v);
            if (!isNaN(num) && num > (ledger[k] || 0)) {
              ledger[k] = num;
            }
          }
        }
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
  if (!productList || productList.length === 0) return productList;
  const localLedger = getLocalProductSalesLedger();
  let anyChanged = false;

  const updatedList = productList.map((prod) => {
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
    const currentStock = typeof prod.stockCount === 'number' ? prod.stockCount : (typeof prod.inventoryCount === 'number' ? prod.inventoryCount : 8);
    const updatedInStock = prod.inStock !== false && currentStock > 0;
    const updatedBestSeller = verifiedTotal >= bestsellerThreshold || Boolean(prod.isBestSeller);

    if (
      prod.soldCount === baseSold &&
      (prod.onlineSalesCount || 0) === verifiedOnline &&
      prod.totalSold === verifiedTotal &&
      prod.stockCount === currentStock &&
      prod.inventoryCount === currentStock &&
      prod.inStock === updatedInStock &&
      Boolean(prod.isBestSeller) === updatedBestSeller
    ) {
      return prod;
    }

    anyChanged = true;
    return {
      ...prod,
      soldCount: baseSold,
      onlineSalesCount: verifiedOnline,
      totalSold: verifiedTotal,
      inventoryCount: currentStock,
      stockCount: currentStock,
      inStock: updatedInStock,
      isBestSeller: updatedBestSeller
    };
  });

  return anyChanged ? updatedList : productList;
}

/**
 * Returns the set of canonical order IDs whose sales have already been counted in sales_history
 */
export function getCountedSalesOrderIds(): Set<string> {
  const set = new Set<string>();
  try {
    const history = getLocalSalesHistory();
    history.forEach((rec) => {
      if (rec.orderId) {
        const c = getCanonicalOrderKey(rec.orderId);
        if (c && !PURGED_ORDER_IDS.has(c)) set.add(c);
      }
    });
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(CONFIRMED_SALES_ORDERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => {
            if (typeof id === 'string' && id.trim()) {
              const c = getCanonicalOrderKey(id);
              if (c && !PURGED_ORDER_IDS.has(c)) set.add(c);
            }
          });
        }
      }
    }
  } catch {}
  return set;
}

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
    const cleanId = item.productId.trim();
    const exact = catalog.find((p) => p.id === cleanId) || PRODUCTS.find((p) => p.id === cleanId);
    if (exact) return exact.id;
    if (cleanId === 'kumari-pearl-choker') {
      const choker = catalog.find((p) => p.title.toLowerCase().includes('choker')) || PRODUCTS.find((p) => p.title.toLowerCase().includes('choker'));
      if (choker) return choker.id;
    }
  }

  const cleanTitle = (item.title || '').trim().toLowerCase();
  if (!cleanTitle) return null;

  if (cleanTitle.includes('beaded pearl layer necklace')) return 'art-1790323549756-24tl6';
  if (cleanTitle.includes('macrame plant hanger')) return 'art-1790323202380-nw0zi';
  if (cleanTitle.includes('marble bead')) return 'art-1790321559072-ym8ui';
  if (cleanTitle.includes('three layer pearl necklace')) return 'tara-micro-pearl-clutch';
  if (cleanTitle.includes('pearl beaded keyring')) return 'art-1790334939460-sj7ss';
  if (cleanTitle.includes('silk scrunchies')) return 'art-1790339748217-gx4df';

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
  if (!canonicalOrderId || PURGED_ORDER_IDS.has(canonicalOrderId) || !isOrderConfirmedOrCompleted(order)) {
    return { updatedProductQuantities: {}, wasNewlyCounted: false };
  }

  // Calculate quantities and prices per product from order items
  const productQuantities: Record<string, number> = {};
  const productPrices: Record<string, number> = {};
  for (const item of order.items || []) {
    const pid = resolveProductIdFromOrderItem(item, currentProducts);
    if (pid) {
      const qty = Math.max(1, Number(item.quantity) || 1);
      productQuantities[pid] = (productQuantities[pid] || 0) + qty;
      if (Number(item.price) > 0) {
        productPrices[pid] = Number(item.price);
      }
    }
  }

  if (Object.keys(productQuantities).length === 0) {
    return { updatedProductQuantities: {}, wasNewlyCounted: false };
  }

  const existingHistory = getLocalSalesHistory(currentProducts);
  const existingIds = new Set(existingHistory.map((r) => r.id));
  const nowIso = order.updatedAt || new Date().toISOString();
  const normOrderId = normalizeOrderId(order.orderId);
  const formattedOrderId = `#${normOrderId}`;

  const newRecords: SalesHistoryRecord[] = [];
  const newlyAddedQuantities: Record<string, number> = {};

  for (const [productId, qtyToAdd] of Object.entries(productQuantities)) {
    const recId = `${canonicalOrderId}_${productId}`;
    if (!existingIds.has(recId)) {
      const existingProd =
        currentProducts.find((p) => p.id === productId) || PRODUCTS.find((p) => p.id === productId);
      const unitPrice = productPrices[productId] || existingProd?.price || 1500;
      newRecords.push({
        id: recId,
        productId,
        productTitle: existingProd?.title || '',
        category: existingProd?.category || 'pearl-bags',
        orderId: formattedOrderId,
        quantity: qtyToAdd,
        unitPrice,
        revenue: qtyToAdd * unitPrice,
        timestamp: nowIso,
        createdAt: nowIso,
        status: 'completed'
      });
      newlyAddedQuantities[productId] = qtyToAdd;
    }
  }

  const countedSet = getCountedSalesOrderIds();
  countedSet.add(canonicalOrderId);
  saveCountedSalesOrderIds(countedSet);

  const { verifiedSalesByProduct } = mergeSalesHistoryRecords(newRecords, currentProducts);

  if (
    typeof window !== 'undefined' &&
    (Object.keys(newlyAddedQuantities).length > 0 || Object.keys(verifiedSalesByProduct).length > 0)
  ) {
    window.dispatchEvent(
      new CustomEvent('artified_sales_incremented', {
        detail: {
          orderId: formattedOrderId,
          productQuantities: newlyAddedQuantities,
          verifiedSalesByProduct
        }
      })
    );
    if ('BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('artified_sync_channel');
        bc.postMessage({ type: 'ORDER_PLACED', orderId: formattedOrderId });
        bc.close();
      } catch {}
    }
  }

  // 1. Invoke Server-Side Cloud Function endpoint (/api/sales/increment) for atomic persistence & cross-browser sync
  try {
    const res = await fetch('/api/sales/increment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: formattedOrderId,
        timestamp: nowIso,
        items: Object.entries(productQuantities).map(([pid, qty]) => {
          const prod = currentProducts.find((p) => p.id === pid) || PRODUCTS.find((p) => p.id === pid);
          const unitPrice = productPrices[pid] || prod?.price || 1500;
          return {
            productId: pid,
            productTitle: prod?.title || '',
            category: prod?.category || 'pearl-bags',
            quantity: qty,
            unitPrice,
            revenue: qty * unitPrice
          };
        })
      })
    });
    if (res.ok) {
      const serverData = await res.json();
      if (Array.isArray(serverData?.salesHistory)) {
        const merged = mergeSalesHistoryRecords(serverData.salesHistory, currentProducts);
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

  // 2. Direct Firestore atomic transaction to decrement inventoryCount and increment onlineSalesCount / totalSold without race conditions
  if (newRecords.length > 0 && !isFirestoreQuotaExceeded) {
    try {
      const itemsToTransact = Object.entries(newlyAddedQuantities).map(([pid, qtyToAdd]) => {
        const prod = currentProducts.find((p) => p.id === pid) || PRODUCTS.find((p) => p.id === pid);
        return {
          productId: pid,
          quantity: qtyToAdd,
          unitPrice: productPrices[pid] || prod?.price || 1500,
          productTitle: prod?.title || ''
        };
      });

      await executeProductPurchaseTransaction(itemsToTransact, formattedOrderId, currentProducts);
    } catch (err) {
      detectQuotaError(err);
    }
  }

  return {
    updatedProductQuantities: newlyAddedQuantities,
    wasNewlyCounted: Object.keys(newlyAddedQuantities).length > 0
  };
}

/**
 * Syncs and verifies total sold counts across browsers (Chrome, Edge, Safari) from `/api/sales/history`
 * and `/api/tracked-orders` (as well as Firestore `sales_history` when read quota is available).
 */
export async function syncConfirmedSalesOrdersFromFirestore(
  ordersToReconcile?: TrackedOrderData[],
  currentProducts: Product[] = PRODUCTS
): Promise<Set<string>> {
  // 1. Fetch latest tracked orders from server so orders placed in Chrome are immediately known in Edge
  try {
    const ordersRes = await fetch(`/api/tracked-orders?t=${Date.now()}`, { cache: 'no-store' });
    if (ordersRes.ok) {
      const serverOrdersMap = await ordersRes.json();
      if (serverOrdersMap && typeof serverOrdersMap === 'object') {
        syncTrackedOrdersFromServer(serverOrdersMap);
      }
    }
  } catch {}

  // 2. Fetch verified sales_history from server endpoint
  try {
    const res = await fetch(`/api/sales/history?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.salesHistory)) {
        const { verifiedSalesByProduct } = mergeSalesHistoryRecords(data.salesHistory, currentProducts);
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

  // 3. Query Firestore `sales_history` collection directly ONLY if Firestore read quota is not exceeded
  if (!isFirestoreQuotaExceeded) {
    try {
      const snap = await getDocs(collection(db, 'sales_history'));
      if (!snap.empty) {
        const cloudRecords: SalesHistoryRecord[] = [];
        snap.forEach((docSnap: any) => {
          const d = docSnap.data();
          if (d && (d.productId || docSnap.id) && !isSaleRecordPurged(d)) {
            cloudRecords.push({
              id: d.id || docSnap.id,
              productId: d.productId,
              productTitle: d.productTitle || '',
              category: d.category || '',
              orderId: d.orderId || '',
              quantity: Math.max(1, Number(d.quantity) || 1),
              unitPrice: Number(d.unitPrice) || undefined,
              revenue: Number(d.revenue) || undefined,
              timestamp: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
              createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
              status: 'completed'
            });
          }
        });
        if (cloudRecords.length > 0) {
          const { verifiedSalesByProduct } = mergeSalesHistoryRecords(cloudRecords, currentProducts);
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
    } catch (err) {
      detectQuotaError(err);
    }
  }

  // 4. Reconcile any confirmed/completed orders from server + local orders that are missing from sales_history
  const effectiveOrders =
    Array.isArray(ordersToReconcile) && ordersToReconcile.length > 0
      ? ordersToReconcile
      : getAllOrdersForSeller();

  if (effectiveOrders.length > 0) {
    const existingIds = new Set(getLocalSalesHistory(currentProducts).map((r) => r.id));
    for (const order of effectiveOrders) {
      if (!order || !isOrderConfirmedOrCompleted(order)) continue;
      const canonicalOrderId = getCanonicalOrderKey(order.orderId || '');
      if (!canonicalOrderId || PURGED_ORDER_IDS.has(canonicalOrderId)) continue;

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

/**
 * Executes an atomic Firestore transaction during product purchase to decrement inventoryCount
 * and increment onlineSalesCount / totalSold without race conditions across multiple browser sessions.
 */
export async function executeProductPurchaseTransaction(
  items: Array<{ productId: string; quantity: number; unitPrice?: number; productTitle?: string }>,
  orderId: string,
  currentProducts: Product[] = PRODUCTS
): Promise<Record<string, { newInventory: number; newOnlineSales: number; newTotalSold: number }>> {
  const results: Record<string, { newInventory: number; newOnlineSales: number; newTotalSold: number }> = {};
  if (!db || isFirestoreQuotaExceeded || !items || items.length === 0) return results;

  try {
    await runTransaction(db, async (transaction) => {
      const nowIso = new Date().toISOString();

      for (const item of items) {
        if (!item || !item.productId) continue;
        const pid = item.productId;
        const qtyToBuy = Math.max(1, Number(item.quantity) || 1);
        const prodRef = doc(db, 'products', pid);

        // 1. Read the product document inside the transaction
        const prodSnap = await transaction.get(prodRef);
        const catalogProd = currentProducts.find((p) => p.id === pid) || PRODUCTS.find((p) => p.id === pid);

        let currentInventory = 10;
        let currentOnlineSales = 0;
        let currentBaseSold = catalogProd?.soldCount ?? 54;
        let currentTotalSold = catalogProd?.totalSold ?? (currentBaseSold + currentOnlineSales);

        if (prodSnap.exists()) {
          const data = prodSnap.data() as Partial<Product>;
          if (typeof data.inventoryCount === 'number' && !isNaN(data.inventoryCount)) {
            currentInventory = data.inventoryCount;
          } else if (typeof data.stockCount === 'number' && !isNaN(data.stockCount)) {
            currentInventory = data.stockCount;
          } else if (catalogProd && typeof catalogProd.inventoryCount === 'number') {
            currentInventory = catalogProd.inventoryCount;
          }

          if (typeof data.onlineSalesCount === 'number' && !isNaN(data.onlineSalesCount)) {
            currentOnlineSales = data.onlineSalesCount;
          }
          if (typeof data.soldCount === 'number' && !isNaN(data.soldCount)) {
            currentBaseSold = data.soldCount;
          }
          if (typeof data.totalSold === 'number' && !isNaN(data.totalSold)) {
            currentTotalSold = data.totalSold;
          } else {
            currentTotalSold = currentBaseSold + currentOnlineSales;
          }
        } else if (catalogProd) {
          currentInventory = catalogProd.inventoryCount ?? catalogProd.stockCount ?? 10;
          currentOnlineSales = catalogProd.onlineSalesCount ?? 0;
          currentTotalSold = catalogProd.totalSold ?? ((catalogProd.soldCount ?? 54) + currentOnlineSales);
        }

        // 2. Compute atomic decrements & increments
        const newInventory = Math.max(0, currentInventory - qtyToBuy);
        const newOnlineSales = currentOnlineSales + qtyToBuy;
        const newTotalSold = currentTotalSold + qtyToBuy;
        const newInStock = newInventory > 0;

        results[pid] = {
          newInventory,
          newOnlineSales,
          newTotalSold
        };

        // 3. Write atomic updates back to Firestore product doc inside transaction only if valid product exists
        if (catalogProd || (prodSnap.exists() && typeof prodSnap.data()?.price === 'number')) {
          transaction.set(
            prodRef,
            {
              id: pid,
              title: catalogProd?.title || item.productTitle || pid,
              ...(catalogProd?.price ? { price: catalogProd.price } : {}),
              ...(catalogProd?.category ? { category: catalogProd.category } : {}),
              inventoryCount: newInventory,
              stockCount: newInventory,
              inStock: newInStock,
              onlineSalesCount: newOnlineSales,
              totalSold: newTotalSold,
              updatedAt: nowIso
            },
            { merge: true }
          );
        }

        // 4. Record sales_history entry inside the transaction
        const canonical = getCanonicalOrderKey(orderId);
        const recId = `${canonical}_${pid}`;
        const historyRef = doc(db, 'sales_history', recId);
        const unitPrice = item.unitPrice || catalogProd?.price || 1500;

        transaction.set(
          historyRef,
          {
            id: recId,
            productId: pid,
            productTitle: catalogProd?.title || item.productTitle || '',
            category: catalogProd?.category || 'pearl-bags',
            orderId,
            quantity: qtyToBuy,
            unitPrice,
            revenue: qtyToBuy * unitPrice,
            timestamp: serverTimestamp(),
            createdAt: nowIso,
            status: 'completed'
          },
          { merge: true }
        );
      }
    });
    // Trigger low stock Cloud Function email dispatch for any product whose inventoryCount dropped below 5
    for (const [pid, res] of Object.entries(results)) {
      if (res.newInventory < 5) {
        const prod = currentProducts.find((p) => p.id === pid) || PRODUCTS.find((p) => p.id === pid);
        fetch('/api/send-low-stock-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: pid,
            productTitle: prod?.title || pid,
            remainingInventory: res.newInventory,
            sellerEmail: 'freaksince17@gmail.com'
          })
        }).catch(() => {});
      }
    }
  } catch (err) {
    detectQuotaError(err);
    console.warn('Notice: executeProductPurchaseTransaction notice:', err);
  }

  return results;
}
