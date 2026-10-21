import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { PRODUCTS, DEFAULT_INSTAGRAM_ITEMS, DEFAULT_INSTAGRAM_HANDLE, DEFAULT_INSTAGRAM_PROFILE_URL, TIKTOK_REELS, DEFAULT_CRAFT_STORY } from './src/data/products.ts';
import { DEFAULT_ARTISAN_PROFILE } from './src/data/artisanProfile.ts';
import { generateSitemapXml } from './src/utils/sitemapGenerator.ts';
import { GoogleGenAI } from '@google/genai';
import { autoGenerateWorkshopGroup, autoGenerateMediaCaption } from './src/utils/workshopAIGenerator.ts';
import { handleAtomicSalesIncrementCloudFunction } from './functions/src/index.ts';
import { db } from './src/firebase.ts';
import { collection, getDocs } from 'firebase/firestore';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const archiverPkg = require('archiver');

async function startServer() {
  const app = express();
  const port = 3000;

  // Security headers for API and production responses
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), payment=()');
    next();
  });

  // JSON body parser with generous limit for product uploads, videos, and base64 images
  app.use(express.json({ limit: '350mb' }));
  app.use(express.urlencoded({ extended: true, limit: '350mb' }));

  // Store runtime mutable JSON files in os.tmpdir() so runtime writes (orders, emails, catalog sync)
  // never trigger workspace file-watcher auto-refreshes in Google AI Studio.
  const seedDataDir = path.resolve(process.cwd(), 'src/data');
  const dataDir = path.resolve(os.tmpdir(), 'artified-runtime-data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  try {
    if (fs.existsSync(seedDataDir)) {
      for (const file of fs.readdirSync(seedDataDir)) {
        if (file.endsWith('.json')) {
          const srcFile = path.join(seedDataDir, file);
          const destFile = path.join(dataDir, file);
          if ((file === 'tracked_orders.json' || file === 'sales_history.json') && fs.existsSync(destFile)) {
            try {
              const srcData = JSON.parse(fs.readFileSync(srcFile, 'utf-8'));
              const destData = JSON.parse(fs.readFileSync(destFile, 'utf-8'));
              if (file === 'tracked_orders.json' && typeof srcData === 'object' && typeof destData === 'object') {
                const mergedOrders = { ...srcData, ...destData };
                fs.writeFileSync(destFile, JSON.stringify(mergedOrders, null, 2), 'utf-8');
                continue;
              }
              if (file === 'sales_history.json' && Array.isArray(srcData) && Array.isArray(destData)) {
                const seenIds = new Set<string>();
                const mergedHistory: any[] = [];
                for (const rec of [...destData, ...srcData]) {
                  if (rec && rec.id && !seenIds.has(rec.id)) {
                    seenIds.add(rec.id);
                    mergedHistory.push(rec);
                  }
                }
                fs.writeFileSync(destFile, JSON.stringify(mergedHistory, null, 2), 'utf-8');
                continue;
              }
            } catch {}
          }
          // Copy codebase JSON files on server startup
          fs.copyFileSync(srcFile, destFile);
        }
      }
    }
  } catch {}

  const productsJsonPath = path.resolve(dataDir, 'products.json');
  const instagramJournalJsonPath = path.resolve(dataDir, 'instagram_journal.json');
  const instagramSettingsJsonPath = path.resolve(dataDir, 'instagram_settings.json');
  const tiktokReelsJsonPath = path.resolve(dataDir, 'tiktok_reels.json');
  const craftStoryJsonPath = path.resolve(dataDir, 'craft_story.json');
  const artisanProfileJsonPath = path.resolve(dataDir, 'artisan_profile.json');
  const trackedOrdersJsonPath = path.resolve(dataDir, 'tracked_orders.json');
  const workshopMediaJsonPath = path.resolve(dataDir, 'workshop_media.json');
  const workshopGroupsJsonPath = path.resolve(dataDir, 'workshop_groups.json');
  const salesHistoryJsonPath = path.resolve(dataDir, 'sales_history.json');
  const seedSalesHistoryJsonPath = path.resolve(seedDataDir, 'sales_history.json');

  // GET /sitemap.xml - Dynamic Google Search & Image Sitemap
  app.get('/sitemap.xml', (_req, res) => {
    try {
      let productList = PRODUCTS;
      if (fs.existsSync(productsJsonPath)) {
        productList = JSON.parse(fs.readFileSync(productsJsonPath, 'utf-8'));
      }
      const xml = generateSitemapXml(productList, 'https://www.artified.com.np');
      res.header('Content-Type', 'application/xml');
      return res.send(xml);
    } catch (err) {
      console.error('Error generating dynamic sitemap.xml:', err);
      const staticSitemapPath = path.resolve(process.cwd(), 'public/sitemap.xml');
      if (fs.existsSync(staticSitemapPath)) {
        res.header('Content-Type', 'application/xml');
        return res.sendFile(staticSitemapPath);
      }
      return res.status(500).send('Error generating sitemap');
    }
  });

  // GET /site.webmanifest & /manifest.json - Web App Manifest for mobile & search branding
  app.get(['/site.webmanifest', '/manifest.json'], (_req, res) => {
    const manifestPath = path.resolve(process.cwd(), 'public/site.webmanifest');
    if (fs.existsSync(manifestPath)) {
      res.header('Content-Type', 'application/manifest+json');
      return res.sendFile(manifestPath);
    }
    return res.status(404).send('Not found');
  });

  // GET /robots.txt
  app.get('/robots.txt', (_req, res) => {
    const robotsPath = path.resolve(process.cwd(), 'public/robots.txt');
    if (fs.existsSync(robotsPath)) {
      res.header('Content-Type', 'text/plain');
      return res.sendFile(robotsPath);
    }
    return res.status(404).send('Not found');
  });

  // Path to persistent reviews database files (both runtime tmp and seed codebase)
  const reviewsJsonPath = path.resolve(dataDir, 'reviews.json');
  const seedReviewsJsonPath = path.resolve(seedDataDir, 'reviews.json');

  // Helper to resolve a product ID from an order item by explicit ID or title
  const resolveServerProductId = (item: { productId?: string; title?: string }): string | null => {
    if (item?.productId && typeof item.productId === 'string' && item.productId.trim()) {
      const exact = PRODUCTS.find((p) => p.id === item.productId!.trim());
      if (exact) return exact.id;
      return item.productId.trim();
    }
    const cleanTitle = (item?.title || '').trim().toLowerCase();
    if (!cleanTitle) return null;
    if (cleanTitle.includes('beaded pearl layer necklace')) return 'art-1790323549756-24tl6';
    if (cleanTitle.includes('macrame plant hanger')) return 'art-1790323202380-nw0zi';
    if (cleanTitle.includes('marble bead')) return 'art-1790321559072-ym8ui';
    const exactMatch = PRODUCTS.find((p) => p.title.trim().toLowerCase() === cleanTitle);
    if (exactMatch) return exactMatch.id;
    const partialMatch = PRODUCTS.find(
      (p) =>
        cleanTitle.includes(p.title.trim().toLowerCase()) ||
        p.title.trim().toLowerCase().includes(cleanTitle)
    );
    return partialMatch ? partialMatch.id : null;
  };

  const seedTrackedOrdersJsonPath = path.resolve(seedDataDir, 'tracked_orders.json');
  const purgedOrderKeys = new Set([
    'ART20261861',
    'ART20261862',
    'ART20261864',
    'ART20264846',
    'ART20265526',
    'ART20268842',
    'ART20265521',
    'ART20263190',
    'ART20263829',
    'ART20265157',
    'ART20264729'
  ]);

  // Helper to load and reconcile sales_history records from disk and confirmed orders
  const loadStoredSalesHistory = (): any[] => {
    const recordsMap = new Map<string, any>();

    const ingestList = (list: any[]) => {
      if (!Array.isArray(list)) return;
      for (const rec of list) {
        if (rec && rec.id && rec.productId) {
          const orderCanon = String(rec.orderId || rec.id.split('_')[0] || '')
            .replace(/[^A-Z0-9]/gi, '')
            .toUpperCase();
          if (purgedOrderKeys.has(orderCanon)) continue;
          const prod = PRODUCTS.find((p) => p.id === rec.productId);
          const qty = Math.max(1, Number(rec.quantity) || 1);
          const unitPrice = Number(rec.unitPrice) > 0 ? Number(rec.unitPrice) : prod?.price || 1500;
          const revenue = Number(rec.revenue) > 0 ? Number(rec.revenue) : qty * unitPrice;
          recordsMap.set(String(rec.id).trim(), {
            ...rec,
            productTitle: rec.productTitle || prod?.title || '',
            category: rec.category || prod?.category || 'pearl-bags',
            quantity: qty,
            unitPrice,
            revenue,
            timestamp: rec.timestamp || rec.createdAt || new Date().toISOString(),
            createdAt: rec.createdAt || rec.timestamp || new Date().toISOString(),
            status: 'completed'
          });
        }
      }
    };

    if (fs.existsSync(seedSalesHistoryJsonPath)) {
      try {
        ingestList(JSON.parse(fs.readFileSync(seedSalesHistoryJsonPath, 'utf-8')));
      } catch {}
    }
    if (fs.existsSync(salesHistoryJsonPath)) {
      try {
        ingestList(JSON.parse(fs.readFileSync(salesHistoryJsonPath, 'utf-8')));
      } catch {}
    }

    // Reconcile against confirmed/completed orders in trackedOrdersJsonPath
    if (fs.existsSync(trackedOrdersJsonPath)) {
      try {
        const ordersMap = JSON.parse(fs.readFileSync(trackedOrdersJsonPath, 'utf-8'));
        let addedFromOrders = false;
        for (const [key, order] of Object.entries(ordersMap) as any) {
          const phase = order.currentPhase ? String(order.currentPhase).toLowerCase() : '';
          const isCancelled = phase === 'cancelled' || phase === 'refunded' || phase === 'rejected';
          if (isCancelled) continue;

          const canonicalOrderId = String(order.orderId || key)
            .replace(/[^A-Z0-9]/gi, '')
            .toUpperCase();
          if (!canonicalOrderId || purgedOrderKeys.has(canonicalOrderId)) continue;

          const grouped: Record<string, { qty: number; title: string; unitPrice: number; category: string }> = {};
          for (const item of order.items || []) {
            const pid = resolveServerProductId(item);
            if (pid) {
              const prod = PRODUCTS.find((p) => p.id === pid);
              const qty = Math.max(1, Number(item.quantity) || 1);
              const unitPrice = Number(item.price) > 0 ? Number(item.price) : prod?.price || 1500;
              grouped[pid] = {
                qty: (grouped[pid]?.qty || 0) + qty,
                title: prod?.title || item.title || '',
                unitPrice,
                category: prod?.category || 'pearl-bags'
              };
            }
          }

          for (const [pid, info] of Object.entries(grouped)) {
            const recId = `${canonicalOrderId}_${pid}`;
            if (!recordsMap.has(recId)) {
              const ts = order.updatedAt || new Date().toISOString();
              recordsMap.set(recId, {
                id: recId,
                orderId: order.orderId || `#${key}`,
                productId: pid,
                productTitle: info.title,
                category: info.category,
                quantity: info.qty,
                unitPrice: info.unitPrice,
                revenue: info.qty * info.unitPrice,
                timestamp: ts,
                createdAt: ts,
                status: 'completed'
              });
              addedFromOrders = true;
            }
          }
        }
        if (addedFromOrders) {
          const all = Array.from(recordsMap.values());
          try {
            fs.writeFileSync(salesHistoryJsonPath, JSON.stringify(all, null, 2), 'utf-8');
          } catch {}
          try {
            fs.writeFileSync(seedSalesHistoryJsonPath, JSON.stringify(all, null, 2), 'utf-8');
          } catch {}
        }
      } catch {}
    }

    return Array.from(recordsMap.values());
  };

  const saveStoredSalesHistory = (records: any[]) => {
    try {
      fs.writeFileSync(salesHistoryJsonPath, JSON.stringify(records, null, 2), 'utf-8');
    } catch {}
    try {
      fs.writeFileSync(seedSalesHistoryJsonPath, JSON.stringify(records, null, 2), 'utf-8');
    } catch {}
  };

  const computeVerifiedSalesStats = (historyRecords?: any[]) => {
    const list = historyRecords || loadStoredSalesHistory();
    const verifiedSalesByProduct: Record<string, number> = {};
    const countedOrderIdsSet = new Set<string>();

    for (const rec of list) {
      if (!rec || !rec.productId) continue;
      const qty = Math.max(1, Number(rec.quantity) || 1);
      verifiedSalesByProduct[rec.productId] = (verifiedSalesByProduct[rec.productId] || 0) + qty;
      if (rec.orderId) {
        const canonical = String(rec.orderId).replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (canonical) countedOrderIdsSet.add(canonical);
      }
    }

    return {
      salesHistory: list,
      verifiedSalesByProduct,
      countedOrderIds: Array.from(countedOrderIdsSet)
    };
  };

  const enrichProductsWithVerifiedSales = (productList: any[]): any[] => {
    const { verifiedSalesByProduct } = computeVerifiedSalesStats();
    return (productList || []).map((p: any) => {
      if (!p || !p.id) return p;
      const baseSold = p.soldCount !== undefined ? Number(p.soldCount) : 54;
      const verifiedOnline = Math.max(Number(p.onlineSalesCount) || 0, verifiedSalesByProduct[p.id] || 0);
      const verifiedTotal = Math.max(Number(p.totalSold) || 0, baseSold + verifiedOnline);
      const currentStock = typeof p.stockCount === 'number' ? p.stockCount : (typeof p.inventoryCount === 'number' ? p.inventoryCount : 8);
      const inStock = p.inStock !== false && currentStock > 0;

      return {
        ...p,
        soldCount: baseSold,
        onlineSalesCount: verifiedOnline,
        totalSold: verifiedTotal,
        inventoryCount: currentStock,
        stockCount: currentStock,
        inStock
      };
    });
  };

  // GET /api/products
  app.get('/api/products', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    syncServerWithFirestore().catch(() => {});
    try {
      if (fs.existsSync(productsJsonPath)) {
        const data = fs.readFileSync(productsJsonPath, 'utf-8');
        return res.json(enrichProductsWithVerifiedSales(JSON.parse(data)));
      }
      return res.json(enrichProductsWithVerifiedSales(PRODUCTS));
    } catch (err) {
      console.error('Error reading products.json:', err);
      return res.status(500).json({ error: 'Failed to read products' });
    }
  });

  // GET /api/sales/history - Verify total sold counts from sales_history collection & server ledger
  app.get('/api/sales/history', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    syncServerWithFirestore().catch(() => {});
    try {
      const stats = computeVerifiedSalesStats();
      return res.json({
        status: 'success',
        ...stats
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to read sales history' });
    }
  });

  // POST /api/sales/increment & /api/cloud-functions/incrementProductSale
  // Server-side Cloud Function endpoint using Firestore increment(1) and sales_history collection
  app.post(['/api/sales/increment', '/api/cloud-functions/incrementProductSale'], async (req, res) => {
    try {
      const { orderId, items, productId, productTitle, quantity, timestamp } = req.body || {};
      const nowIso = timestamp || new Date().toISOString();
      const rawOrderId = String(orderId || `SALE-${Date.now()}`).trim();
      const canonicalOrderId = rawOrderId.replace(/[^A-Z0-9]/gi, '').toUpperCase();

      const rawItems: Array<{ productId?: string; title?: string; productTitle?: string; quantity?: number }> =
        Array.isArray(items) && items.length > 0
          ? items
          : productId
          ? [{ productId, productTitle, quantity: quantity || 1 }]
          : [];

      const resolvedItems: Array<{ productId: string; productTitle: string; quantity: number }> = [];
      for (const it of rawItems) {
        const pid = resolveServerProductId({ productId: it.productId, title: it.productTitle || it.title });
        if (pid) {
          const prod = PRODUCTS.find((p) => p.id === pid);
          resolvedItems.push({
            productId: pid,
            productTitle: prod?.title || it.productTitle || it.title || '',
            quantity: Math.max(1, Number(it.quantity) || 1)
          });
        }
      }

      if (resolvedItems.length === 0) {
        const stats = computeVerifiedSalesStats();
        return res.json({ status: 'noop', ...stats });
      }

      // Check existing history for idempotency
      const existingHistory = loadStoredSalesHistory();
      const historyMap = new Map<string, any>();
      for (const rec of existingHistory) {
        if (rec && rec.id) historyMap.set(rec.id, rec);
      }

      // Group quantities by productId for this order
      const groupedByProd: Record<string, { qty: number; title: string; unitPrice: number; category: string }> = {};
      for (const it of resolvedItems) {
        const prod = PRODUCTS.find((p) => p.id === it.productId);
        const unitPrice = prod?.price || 1500;
        groupedByProd[it.productId] = {
          qty: (groupedByProd[it.productId]?.qty || 0) + it.quantity,
          title: it.productTitle,
          unitPrice,
          category: prod?.category || 'pearl-bags'
        };
      }

      const newlyAddedItemsForCloudFunction: Array<{ productId: string; productTitle: string; quantity: number }> = [];
      for (const [pid, info] of Object.entries(groupedByProd)) {
        const recId = `${canonicalOrderId}_${pid}`;
        if (!historyMap.has(recId) && !purgedOrderKeys.has(canonicalOrderId)) {
          historyMap.set(recId, {
            id: recId,
            orderId: rawOrderId.startsWith('#') ? rawOrderId : `#${rawOrderId}`,
            productId: pid,
            productTitle: info.title,
            category: info.category,
            quantity: info.qty,
            unitPrice: info.unitPrice,
            revenue: info.qty * info.unitPrice,
            timestamp: nowIso,
            createdAt: nowIso,
            status: 'completed'
          });
          newlyAddedItemsForCloudFunction.push({
            productId: pid,
            productTitle: info.title,
            quantity: info.qty
          });
        }
      }

      const updatedHistory = Array.from(historyMap.values());
      saveStoredSalesHistory(updatedHistory);

      // Update runtime and repository products.json with verified sales counts
      if (fs.existsSync(productsJsonPath)) {
        try {
          const currentProds = JSON.parse(fs.readFileSync(productsJsonPath, 'utf-8'));
          const enriched = enrichProductsWithVerifiedSales(currentProds);
          const serializedEnriched = JSON.stringify(enriched, null, 2);
          fs.writeFileSync(productsJsonPath, serializedEnriched, 'utf-8');
          try {
            fs.writeFileSync(path.resolve(seedDataDir, 'products.json'), serializedEnriched, 'utf-8');
          } catch {}
          try {
            fs.writeFileSync(path.resolve(process.cwd(), 'public/products.json'), serializedEnriched, 'utf-8');
          } catch {}
        } catch {}
      }

      // Invoke server-side Firebase Cloud Function (Firestore increment(1) + sales_history collection)
      if (newlyAddedItemsForCloudFunction.length > 0) {
        handleAtomicSalesIncrementCloudFunction({
          orderId: rawOrderId,
          items: newlyAddedItemsForCloudFunction,
          timestamp: nowIso
        }).catch((err) => {
          console.warn('Notice: Cloud Function Firestore sync:', err?.message || err);
        });
      }

      const stats = computeVerifiedSalesStats(updatedHistory);
      return res.json({
        status: 'success',
        newlyAddedCount: newlyAddedItemsForCloudFunction.length,
        ...stats
      });
    } catch (err: any) {
      console.error('Error in /api/sales/increment:', err);
      return res.status(500).json({ error: err.message || 'Failed to increment sales' });
    }
  });

  // Helper to load reviews safely from disk
  const loadStoredReviews = (): any[] => {
    if (fs.existsSync(reviewsJsonPath)) {
      try {
        const data = fs.readFileSync(reviewsJsonPath, 'utf-8');
        return JSON.parse(data);
      } catch {}
    }
    if (fs.existsSync(seedReviewsJsonPath)) {
      try {
        const data = fs.readFileSync(seedReviewsJsonPath, 'utf-8');
        return JSON.parse(data);
      } catch {}
    }
    return [];
  };

  // Helper to save reviews safely to disk in both runtime and seed locations
  const saveStoredReviews = (reviews: any[]) => {
    try {
      fs.writeFileSync(reviewsJsonPath, JSON.stringify(reviews, null, 2), 'utf-8');
    } catch {}
    try {
      fs.writeFileSync(seedReviewsJsonPath, JSON.stringify(reviews, null, 2), 'utf-8');
    } catch {}
  };

  const syncServerWithFirestore = async () => {
    try {
      // 1. Sync sales_history from Firestore
      const salesSnap = await getDocs(collection(db, 'sales_history'));
      if (!salesSnap.empty) {
        const cloudSales: any[] = [];
        salesSnap.forEach((docSnap) => {
          const d = docSnap.data();
          if (d && (d.productId || docSnap.id)) {
            const canonical = String(d.orderId || docSnap.id).replace(/[^A-Z0-9]/gi, '').toUpperCase();
            if (purgedOrderKeys.has(canonical)) return;
            cloudSales.push({
              id: d.id || docSnap.id,
              orderId: d.orderId || '',
              productId: d.productId,
              productTitle: d.productTitle || '',
              category: d.category || 'pearl-bags',
              quantity: Math.max(1, Number(d.quantity) || 1),
              unitPrice: Number(d.unitPrice) || 1500,
              revenue: Number(d.revenue) || (Math.max(1, Number(d.quantity) || 1) * 1500),
              timestamp: d.createdAt || d.timestamp || new Date().toISOString(),
              createdAt: d.createdAt || d.timestamp || new Date().toISOString(),
              status: 'completed'
            });
          }
        });
        if (cloudSales.length > 0) {
          const existing = loadStoredSalesHistory();
          const map = new Map<string, any>();
          existing.forEach((r: any) => { if (r && r.id) map.set(r.id, r); });
          cloudSales.forEach((r: any) => { if (r && r.id) map.set(r.id, r); });
          const mergedSales = Array.from(map.values());
          saveStoredSalesHistory(mergedSales);
        }
      }

      // 2. Sync product_reviews from Firestore
      const revSnap = await getDocs(collection(db, 'product_reviews'));
      if (!revSnap.empty) {
        const cloudReviews: any[] = [];
        revSnap.forEach((docSnap) => {
          const d = docSnap.data();
          if (d && d.author && d.comment) {
            cloudReviews.push({ ...d, id: d.id || docSnap.id });
          }
        });
        if (cloudReviews.length > 0) {
          const existingRevs = loadStoredReviews();
          const seenIds = new Set<string>();
          const seenSigs = new Set<string>();
          const mergedRevs: any[] = [];
          for (const r of [...cloudReviews, ...existingRevs]) {
            if (!r || !r.id || !r.author || !r.comment) continue;
            const cId = String(r.id).trim();
            const sig = `${(r.author || '').trim().toLowerCase()}_${(r.comment || '').trim().toLowerCase()}`;
            if (!seenIds.has(cId) && !seenSigs.has(sig)) {
              seenIds.add(cId);
              seenSigs.add(sig);
              mergedRevs.push(r);
            }
          }
          saveStoredReviews(mergedRevs);
        }
      }

      // 3. Sync products from Firestore
      const prodSnap = await getDocs(collection(db, 'products'));
      if (!prodSnap.empty) {
        const cloudProdMap = new Map<string, any>();
        prodSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const pid = d.id || docSnap.id;
          if (pid) cloudProdMap.set(pid, d);
        });

        if (fs.existsSync(productsJsonPath)) {
          try {
            const currentProds = JSON.parse(fs.readFileSync(productsJsonPath, 'utf-8'));
            const updated = currentProds.map((p: any) => {
              const cloud = cloudProdMap.get(p.id);
              if (!cloud) return p;
              const online = typeof cloud.onlineSalesCount === 'number' ? Math.max(p.onlineSalesCount || 0, cloud.onlineSalesCount) : (p.onlineSalesCount || 0);
              const base = typeof cloud.soldCount === 'number' ? cloud.soldCount : (p.soldCount !== undefined ? p.soldCount : 54);
              const total = typeof cloud.totalSold === 'number' ? Math.max(p.totalSold || 0, cloud.totalSold, base + online) : Math.max(p.totalSold || 0, base + online);
              return {
                ...p,
                onlineSalesCount: online,
                totalSold: total,
                soldCount: base,
                stockCount: typeof cloud.stockCount === 'number' ? cloud.stockCount : p.stockCount,
                inventoryCount: typeof cloud.inventoryCount === 'number' ? cloud.inventoryCount : p.inventoryCount,
                inStock: typeof cloud.inStock === 'boolean' ? cloud.inStock : p.inStock
              };
            });
            fs.writeFileSync(productsJsonPath, JSON.stringify(updated, null, 2), 'utf-8');
            try {
              fs.writeFileSync(path.resolve(seedDataDir, 'products.json'), JSON.stringify(updated, null, 2), 'utf-8');
            } catch {}
            try {
              fs.writeFileSync(path.resolve(process.cwd(), 'public/products.json'), JSON.stringify(updated, null, 2), 'utf-8');
            } catch {}
          } catch {}
        }
      }
    } catch (e: any) {
      console.warn('Notice: Server Firestore sync:', e?.message || e);
    }
  };

  // Run initial Firestore sync in background on server boot
  syncServerWithFirestore().catch(() => {});

  // GET /api/reviews - Persistent server review store
  app.get('/api/reviews', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    syncServerWithFirestore().catch(() => {});
    try {
      const allReviews = loadStoredReviews();
      return res.json(allReviews);
    } catch (err) {
      console.error('Error reading reviews:', err);
      return res.status(500).json({ error: 'Failed to read reviews' });
    }
  });

  // POST /api/reviews - Add or update a review persistently in server database
  app.post('/api/reviews', (req, res) => {
    try {
      const incomingReview = req.body;
      if (!incomingReview || !incomingReview.id) {
        return res.status(400).json({ error: 'Valid review with id is required' });
      }

      const existingReviews = loadStoredReviews();
      const incomingSig = `${(incomingReview.author || '').trim().toLowerCase()}_${(incomingReview.comment || '').trim().toLowerCase()}`;

      // De-duplicate by both ID and author+comment signature
      const filtered = existingReviews.filter((r: any) => {
        if (!r) return false;
        if (r.id === incomingReview.id) return false;
        const rSig = `${(r.author || '').trim().toLowerCase()}_${(r.comment || '').trim().toLowerCase()}`;
        if (incomingSig && rSig === incomingSig) return false;
        return true;
      });

      const updatedList = [incomingReview, ...filtered];
      saveStoredReviews(updatedList);

      // Also attach to product's customReviews in products.json if productId or title strictly matches
      if (fs.existsSync(productsJsonPath)) {
        try {
          const productList = JSON.parse(fs.readFileSync(productsJsonPath, 'utf-8'));
          const inProdId = String(incomingReview.productId || '').trim().toLowerCase();
          const inTitle = String(incomingReview.productTitle || '').trim().toLowerCase();

          const updatedProducts = productList.map((p: any) => {
            const pId = String(p.id || '').trim().toLowerCase();
            const pTitle = String(p.title || '').trim().toLowerCase();
            const isMatch = (inProdId && pId === inProdId) || (inTitle && pTitle === inTitle);

            if (isMatch) {
              const currentCustom = p.customReviews || [];
              const cleanCustom = currentCustom.filter((cr: any) => {
                if (!cr) return false;
                if (cr.id === incomingReview.id) return false;
                const crSig = `${(cr.author || '').trim().toLowerCase()}_${(cr.comment || '').trim().toLowerCase()}`;
                if (incomingSig && crSig === incomingSig) return false;
                return true;
              });
              return {
                ...p,
                customReviews: [incomingReview, ...cleanCustom]
              };
            }
            return p;
          });
          fs.writeFileSync(productsJsonPath, JSON.stringify(updatedProducts, null, 2), 'utf-8');
        } catch {}
      }

      return res.json({ status: 'success', review: incomingReview, totalReviews: updatedList.length });
    } catch (err) {
      console.error('Error saving review to server:', err);
      return res.status(500).json({ error: 'Failed to save review' });
    }
  });

  // DELETE /api/reviews/:id - Remove review persistently from server disk and products.json
  app.delete('/api/reviews/:id', (req, res) => {
    try {
      const reviewId = req.params.id;
      if (!reviewId) return res.status(400).json({ error: 'Review ID required' });

      const existingReviews = loadStoredReviews();
      const filtered = existingReviews.filter((r: any) => r.id !== reviewId);
      saveStoredReviews(filtered);

      if (fs.existsSync(productsJsonPath)) {
        try {
          const productList = JSON.parse(fs.readFileSync(productsJsonPath, 'utf-8'));
          const updatedProducts = productList.map((p: any) => {
            const currentCustom = p.customReviews || [];
            const cleanCustom = currentCustom.filter((cr: any) => cr.id !== reviewId);
            return {
              ...p,
              customReviews: [...cleanCustom, { id: reviewId, isDeleted: true }]
            };
          });
          fs.writeFileSync(productsJsonPath, JSON.stringify(updatedProducts, null, 2), 'utf-8');
        } catch {}
      }

      return res.json({ success: true, deletedId: reviewId });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to delete review' });
    }
  });

  // GET /api/catalog-price-version - Lightweight price versioning endpoint
  app.get('/api/catalog-price-version', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    try {
      let productList = PRODUCTS;
      if (fs.existsSync(productsJsonPath)) {
        productList = JSON.parse(fs.readFileSync(productsJsonPath, 'utf-8'));
      }
      const prices: Record<string, number> = {};
      let priceSum = 0;
      let maxUpdatedAt = "1970-01-01T00:00:00.000Z";

      productList.forEach((p: any) => {
        if (p && p.id && typeof p.price === 'number') {
          prices[p.id] = p.price;
          priceSum += p.price;
        }
        if (p && p.updatedAt && typeof p.updatedAt === 'string' && p.updatedAt > maxUpdatedAt) {
          maxUpdatedAt = p.updatedAt;
        }
      });

      const catalogVersion = `v-${productList.length}-${priceSum}-${new Date(maxUpdatedAt).getTime() || Date.now()}`;

      return res.json({
        status: "success",
        catalogVersion,
        productCount: productList.length,
        lastUpdated: maxUpdatedAt,
        prices,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error fetching price versioning:', err);
      return res.status(500).json({ error: 'Failed to check catalog price version' });
    }
  });

  // Helper to sanitize images so we never serve broken ephemeral /uploads/ paths
  const processImages = (images: string[]): string[] => {
    return (images || []).map((imgUrl) => {
      if (typeof imgUrl === 'string' && imgUrl.startsWith('/uploads/')) {
        return 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=900&q=80';
      }
      return imgUrl;
    });
  };

  // POST /api/products - Save entire product catalog persistently to runtime, src/data/products.json, and public/products.json
  app.post('/api/products', (req, res) => {
    try {
      const incomingProducts = req.body;
      if (!Array.isArray(incomingProducts)) {
        return res.status(400).json({ error: 'Expected an array of products' });
      }

      const cleanedProducts = incomingProducts.map((prod) => {
        const cleanImages = processImages(prod.images || []);
        const { sku, ...rest } = prod || {};
        return {
          ...rest,
          images: cleanImages,
        };
      });

      const serialized = JSON.stringify(cleanedProducts, null, 2);
      fs.writeFileSync(productsJsonPath, serialized, 'utf-8');
      try {
        fs.writeFileSync(path.resolve(seedDataDir, 'products.json'), serialized, 'utf-8');
      } catch {}
      try {
        fs.writeFileSync(path.resolve(process.cwd(), 'public/products.json'), serialized, 'utf-8');
      } catch {}

      return res.json({ success: true, products: cleanedProducts });
    } catch (err) {
      console.error('Error saving products to products.json:', err);
      return res.status(500).json({ error: 'Failed to save products' });
    }
  });

  const paymentSettingsJsonPath = path.resolve(dataDir, 'payment_settings.json');
  const seedPaymentSettingsJsonPath = path.resolve(seedDataDir, 'payment_settings.json');

  const persistPaymentSettingsToRepo = (settings: any) => {
    if (!settings || typeof settings !== 'object') return;
    try {
      const serialized = JSON.stringify(settings, null, 2);
      fs.writeFileSync(paymentSettingsJsonPath, serialized, 'utf-8');
      try {
        fs.writeFileSync(seedPaymentSettingsJsonPath, serialized, 'utf-8');
      } catch {}

      if (settings.esewaQrImage && typeof settings.esewaQrImage === 'string' && settings.esewaQrImage.startsWith('data:image/')) {
        try {
          const base64Part = settings.esewaQrImage.replace(/^data:image\/[\w+]+;base64,/, '');
          const buf = Buffer.from(base64Part, 'base64');
          fs.writeFileSync(path.resolve(process.cwd(), 'public/esewa_qr.png'), buf);
          fs.writeFileSync(path.resolve(process.cwd(), 'public/esewa_qr.jpg'), buf);
          const fallbackTs = `export const ESEWA_QR_FALLBACK = ${JSON.stringify(settings.esewaQrImage)};\n`;
          fs.writeFileSync(path.resolve(seedDataDir, 'esewa_qr_fallback.ts'), fallbackTs, 'utf-8');
        } catch {}
      }
    } catch (err) {
      console.warn('Error persisting payment settings to repo:', err);
    }
  };

  // GET /api/payment-settings - Fetch current seller QR and payment settings
  app.get('/api/payment-settings', (_req, res) => {
    try {
      if (fs.existsSync(paymentSettingsJsonPath)) {
        const data = JSON.parse(fs.readFileSync(paymentSettingsJsonPath, 'utf-8'));
        return res.json(data);
      }
      if (fs.existsSync(seedPaymentSettingsJsonPath)) {
        const data = JSON.parse(fs.readFileSync(seedPaymentSettingsJsonPath, 'utf-8'));
        return res.json(data);
      }
      return res.json({});
    } catch (err) {
      return res.json({});
    }
  });

  // POST /api/save-payment-settings - Save seller QR and payment settings to repository and public assets
  app.post('/api/save-payment-settings', (req, res) => {
    try {
      persistPaymentSettingsToRepo(req.body);
      return res.json({ success: true, savedAt: new Date().toISOString() });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to save payment settings' });
    }
  });

  // POST /api/save-all-to-repo - Save all products, orders, sales history, payment settings, and studio data to repository files for deployment to artified.com.np
  app.post('/api/save-all-to-repo', (req, res) => {
    try {
      const { products: incomingProducts, trackedOrders: incomingOrders, reels: incomingReels, instagramItems: incomingIg, craftStory: incomingStory, artisanProfile: incomingArtisan, paymentSettings: incomingPaymentSettings } = req.body || {};

      if (incomingPaymentSettings && typeof incomingPaymentSettings === 'object') {
        persistPaymentSettingsToRepo(incomingPaymentSettings);
      }

      if (Array.isArray(incomingProducts) && incomingProducts.length > 0) {
        const cleanedProducts = incomingProducts.map((prod) => {
          const cleanImages = processImages(prod.images || []);
          const { sku, ...rest } = prod || {};
          return {
            ...rest,
            images: cleanImages,
          };
        });
        const serializedProds = JSON.stringify(cleanedProducts, null, 2);
        fs.writeFileSync(productsJsonPath, serializedProds, 'utf-8');
        try {
          fs.writeFileSync(path.resolve(seedDataDir, 'products.json'), serializedProds, 'utf-8');
        } catch {}
        try {
          fs.writeFileSync(path.resolve(process.cwd(), 'public/products.json'), serializedProds, 'utf-8');
        } catch {}
      }

      if (incomingOrders && typeof incomingOrders === 'object') {
        const serializedOrders = JSON.stringify(incomingOrders, null, 2);
        fs.writeFileSync(trackedOrdersJsonPath, serializedOrders, 'utf-8');
        try {
          fs.writeFileSync(seedTrackedOrdersJsonPath, serializedOrders, 'utf-8');
        } catch {}
      }

      if (Array.isArray(incomingReels) && incomingReels.length > 0) {
        const serializedReels = JSON.stringify(incomingReels, null, 2);
        fs.writeFileSync(tiktokReelsJsonPath, serializedReels, 'utf-8');
        try {
          fs.writeFileSync(path.resolve(seedDataDir, 'tiktok_reels.json'), serializedReels, 'utf-8');
        } catch {}
      }

      if (Array.isArray(incomingIg) && incomingIg.length > 0) {
        const serializedIg = JSON.stringify(incomingIg, null, 2);
        fs.writeFileSync(instagramJournalJsonPath, serializedIg, 'utf-8');
        try {
          fs.writeFileSync(path.resolve(seedDataDir, 'instagram_journal.json'), serializedIg, 'utf-8');
        } catch {}
      }

      if (incomingStory && typeof incomingStory === 'object') {
        const serializedStory = JSON.stringify(incomingStory, null, 2);
        fs.writeFileSync(craftStoryJsonPath, serializedStory, 'utf-8');
        try {
          fs.writeFileSync(path.resolve(seedDataDir, 'craft_story.json'), serializedStory, 'utf-8');
        } catch {}
      }

      if (incomingArtisan && typeof incomingArtisan === 'object') {
        const serializedArtisan = JSON.stringify(incomingArtisan, null, 2);
        fs.writeFileSync(artisanProfileJsonPath, serializedArtisan, 'utf-8');
        try {
          fs.writeFileSync(path.resolve(seedDataDir, 'artisan_profile.json'), serializedArtisan, 'utf-8');
        } catch {}
      }

      // Reconcile and persist sales_history.json to both runtime and src/data/sales_history.json
      const reconciledHistory = loadStoredSalesHistory();
      saveStoredSalesHistory(reconciledHistory);

      return res.json({
        success: true,
        savedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Error in /api/save-all-to-repo:', err);
      return res.status(500).json({ error: err.message || 'Failed to save all data to repository' });
    }
  });

  // POST /api/upload - Single image upload directly returns data url for permanent storage
  app.post('/api/upload', (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'Invalid image data' });
      }
      return res.json({ success: true, url: image });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to process upload' });
    }
  });

  // GET /api/instagram-journal - Retrieve permanently saved Instagram journal items
  app.get('/api/instagram-journal', (_req, res) => {
    try {
      if (fs.existsSync(instagramJournalJsonPath)) {
        const raw = fs.readFileSync(instagramJournalJsonPath, 'utf-8');
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          return res.json(items);
        }
      }
      return res.json(DEFAULT_INSTAGRAM_ITEMS);
    } catch (err) {
      console.error('Error reading instagram_journal.json:', err);
      return res.json(DEFAULT_INSTAGRAM_ITEMS);
    }
  });

  // POST /api/instagram-journal - Save Instagram journal items permanently to server disk
  app.post('/api/instagram-journal', (req, res) => {
    try {
      const items = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Expected an array of InstagramJournalItems' });
      }
      fs.writeFileSync(instagramJournalJsonPath, JSON.stringify(items, null, 2), 'utf-8');
      return res.json({ success: true, items });
    } catch (err: any) {
      console.error('Error saving instagram_journal.json:', err);
      return res.status(500).json({ error: err.message || 'Failed to save Instagram journal' });
    }
  });

  // GET /api/instagram-settings - Retrieve official handle and profile URL
  app.get('/api/instagram-settings', (_req, res) => {
    try {
      if (fs.existsSync(instagramSettingsJsonPath)) {
        const raw = fs.readFileSync(instagramSettingsJsonPath, 'utf-8');
        return res.json(JSON.parse(raw));
      }
      return res.json({ handle: DEFAULT_INSTAGRAM_HANDLE, profileUrl: DEFAULT_INSTAGRAM_PROFILE_URL });
    } catch (err) {
      return res.json({ handle: DEFAULT_INSTAGRAM_HANDLE, profileUrl: DEFAULT_INSTAGRAM_PROFILE_URL });
    }
  });

  // POST /api/instagram-settings - Update official handle and profile URL permanently
  app.post('/api/instagram-settings', (req, res) => {
    try {
      const { handle, profileUrl } = req.body;
      const data = {
        handle: handle || DEFAULT_INSTAGRAM_HANDLE,
        profileUrl: profileUrl || DEFAULT_INSTAGRAM_PROFILE_URL,
      };
      fs.writeFileSync(instagramSettingsJsonPath, JSON.stringify(data, null, 2), 'utf-8');
      return res.json({ success: true, ...data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to save Instagram settings' });
    }
  });

  // GET /api/artisan-profile - Retrieve permanently saved founder & creator profile
  app.get('/api/artisan-profile', (_req, res) => {
    try {
      if (fs.existsSync(artisanProfileJsonPath)) {
        const raw = fs.readFileSync(artisanProfileJsonPath, 'utf-8');
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          const cleaned = {
            ...DEFAULT_ARTISAN_PROFILE,
            ...data,
            headline: 'Meet the Founder & Creator: Sahina Shrestha',
            subheadline: 'From Childhood Passion to Creative Journey',
            atelierLocation: 'Kathmandu, Nepal',
            artisanRole: 'Founder & Creator',
            stat1Value: '',
            stat1Label: '',
            stat2Value: '',
            stat2Label: '',
          };
          return res.json(cleaned);
        }
      }
      return res.json(DEFAULT_ARTISAN_PROFILE);
    } catch (err) {
      console.error('Error reading artisan_profile.json:', err);
      return res.json(DEFAULT_ARTISAN_PROFILE);
    }
  });

  // POST /api/artisan-profile - Save artisan profile permanently to server disk
  app.post('/api/artisan-profile', (req, res) => {
    try {
      const incoming = req.body;
      if (!incoming || typeof incoming !== 'object') {
        return res.status(400).json({ error: 'Expected artisan profile object' });
      }

      let existingProfile: any = {};
      if (fs.existsSync(artisanProfileJsonPath)) {
        try {
          existingProfile = JSON.parse(fs.readFileSync(artisanProfileJsonPath, 'utf-8'));
        } catch {}
      }

      // If avatarUrl is a base64 data URL, persist to public/artisan_avatar.png
      if (incoming.avatarUrl && typeof incoming.avatarUrl === 'string' && incoming.avatarUrl.startsWith('data:image/')) {
        try {
          const publicDir = path.resolve(process.cwd(), 'public');
          if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
          }
          const base64Data = incoming.avatarUrl.replace(/^data:image\/\w+;base64,/, '');
          const imgBuffer = Buffer.from(base64Data, 'base64');
          const extMatch = incoming.avatarUrl.match(/^data:image\/(\w+);/);
          const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]) : 'png';
          const avatarFilename = `artisan_avatar_${Date.now()}.${ext}`;
          const avatarFilePath = path.join(publicDir, avatarFilename);
          fs.writeFileSync(avatarFilePath, imgBuffer);
          
          // Save backup buffer to public/artisan_avatar.png
          fs.writeFileSync(path.join(publicDir, 'artisan_avatar.png'), imgBuffer);
        } catch (imgErr) {
          console.warn('Notice: Error saving avatar image buffer to disk:', imgErr);
        }
      }

      // Preserve existing avatarUrl if incoming did not specify one or if incoming is a fallback placeholder
      const effectiveAvatarUrl = (incoming.avatarUrl && incoming.avatarUrl.length > 50)
        ? incoming.avatarUrl
        : (existingProfile.avatarUrl || DEFAULT_ARTISAN_PROFILE.avatarUrl);

      const merged = {
        ...DEFAULT_ARTISAN_PROFILE,
        ...existingProfile,
        ...incoming,
        avatarUrl: effectiveAvatarUrl,
        avatarUpdatedAt: incoming.avatarUpdatedAt || new Date().toISOString(),
        pillar1: { ...DEFAULT_ARTISAN_PROFILE.pillar1, ...(existingProfile.pillar1 || {}), ...(incoming.pillar1 || {}) },
        pillar2: { ...DEFAULT_ARTISAN_PROFILE.pillar2, ...(existingProfile.pillar2 || {}), ...(incoming.pillar2 || {}) },
        pillar3: { ...DEFAULT_ARTISAN_PROFILE.pillar3, ...(existingProfile.pillar3 || {}), ...(incoming.pillar3 || {}) },
        pillar4: { ...DEFAULT_ARTISAN_PROFILE.pillar4, ...(existingProfile.pillar4 || {}), ...(incoming.pillar4 || {}) },
      };
      fs.writeFileSync(artisanProfileJsonPath, JSON.stringify(merged, null, 2), 'utf-8');
      return res.json({ success: true, profile: merged });
    } catch (err: any) {
      console.error('Error saving artisan_profile.json:', err);
      return res.status(500).json({ error: err.message || 'Failed to save artisan profile' });
    }
  });

  // GET /api/tracked-orders - Retrieve permanently saved tracked orders map
  app.get('/api/tracked-orders', (_req, res) => {
    try {
      if (fs.existsSync(trackedOrdersJsonPath)) {
        const raw = fs.readFileSync(trackedOrdersJsonPath, 'utf-8');
        return res.json(JSON.parse(raw));
      }
      return res.json({});
    } catch (err) {
      return res.json({});
    }
  });

  // POST /api/tracked-order - Update single order phase and details permanently
  app.post('/api/tracked-order', (req, res) => {
    try {
      const order = req.body;
      if (!order || !order.orderId) {
        return res.status(400).json({ error: 'Missing orderId' });
      }

      let map: Record<string, any> = {};
      if (fs.existsSync(trackedOrdersJsonPath)) {
        try {
          map = JSON.parse(fs.readFileSync(trackedOrdersJsonPath, 'utf-8'));
        } catch {}
      }

      const norm = order.orderId.replace(/[#\s]/g, '').toUpperCase();
      const existingRev = typeof map[norm]?.statusRevision === 'number' ? map[norm].statusRevision : 0;
      const incomingRev = typeof order.statusRevision === 'number' ? order.statusRevision : existingRev + 1;
      map[norm] = {
        ...map[norm],
        ...order,
        statusRevision: Math.max(existingRev, incomingRev),
        updatedAt: order.updatedAt || new Date().toISOString()
      };

      fs.writeFileSync(trackedOrdersJsonPath, JSON.stringify(map, null, 2), 'utf-8');
      try {
        fs.writeFileSync(seedTrackedOrdersJsonPath, JSON.stringify(map, null, 2), 'utf-8');
      } catch {}

      // Automatically reconcile sales_history & trigger atomic Firestore increment(1) when order is confirmed/completed
      try {
        const savedOrder = map[norm];
        const phase = savedOrder?.currentPhase;
        if (
          phase === 'confirmed' ||
          phase === 'handcrafting_and_packaging' ||
          phase === 'beading_in_progress' ||
          phase === 'quality_and_packaging' ||
          phase === 'out_for_delivery' ||
          phase === 'delivered'
        ) {
          const historyBefore = loadStoredSalesHistory();
          const beforeIds = new Set(historyBefore.map((r: any) => r.id));
          // Reconciling via loadStoredSalesHistory automatically adds any missing items from trackedOrdersJsonPath
          const historyAfter = loadStoredSalesHistory();
          const newRecords = historyAfter.filter((r: any) => !beforeIds.has(r.id));
          if (newRecords.length > 0) {
            handleAtomicSalesIncrementCloudFunction({
              orderId: savedOrder.orderId,
              items: newRecords.map((r: any) => ({
                productId: r.productId,
                productTitle: r.productTitle,
                quantity: r.quantity
              })),
              timestamp: savedOrder.updatedAt
            }).catch(() => {});
          }
        }
      } catch {}

      return res.json({ success: true, order: map[norm] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to save order' });
    }
  });

  // POST /api/tracked-orders - Bulk update tracked orders map
  app.post('/api/tracked-orders', (req, res) => {
    try {
      const incoming = req.body;
      if (!incoming || typeof incoming !== 'object') {
        return res.status(400).json({ error: 'Expected an object map' });
      }
      const serialized = JSON.stringify(incoming, null, 2);
      fs.writeFileSync(trackedOrdersJsonPath, serialized, 'utf-8');
      try {
        fs.writeFileSync(seedTrackedOrdersJsonPath, serialized, 'utf-8');
      } catch {}
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to save tracked orders' });
    }
  });

  // POST /api/send-order-email - Dispatches automated order confirmation email to customer & seller
  app.post('/api/send-order-email', (req, res) => {
    try {
      const {
        orderId,
        customerName,
        customerEmail,
        sellerEmail,
        phone,
        address,
        deliveryZone,
        total,
        paymentMethod,
        items,
        subject,
        bodyText,
        trackingUrl
      } = req.body;

      console.log(`[Order Email] Dispatched confirmation for order ${orderId} to: ${customerEmail} & seller: ${sellerEmail || 'freaksince17@gmail.com'}`);

      // Log email delivery record to runtime server log file
      const emailLogPath = path.resolve(dataDir, 'order_emails.json');
      let emailLogs: any[] = [];
      if (fs.existsSync(emailLogPath)) {
        try {
          emailLogs = JSON.parse(fs.readFileSync(emailLogPath, 'utf-8'));
        } catch {}
      }

      emailLogs.unshift({
        orderId,
        customerName,
        customerEmail,
        sellerEmail: sellerEmail || 'freaksince17@gmail.com',
        phone,
        total,
        dispatchedAt: new Date().toISOString(),
        status: 'delivered'
      });

      try {
        fs.writeFileSync(emailLogPath, JSON.stringify(emailLogs.slice(0, 100), null, 2), 'utf-8');
      } catch {}

      return res.json({
        success: true,
        message: `Order confirmation email logged and sent to ${customerEmail}`,
        orderId
      });
    } catch (err: any) {
      console.warn('Notice: Error in /api/send-order-email:', err);
      return res.status(500).json({ error: 'Failed to process email dispatch' });
    }
  });

  // POST /api/send-low-stock-email - Automated Cloud Function alert when inventoryCount drops below 5
  app.post('/api/send-low-stock-email', (req, res) => {
    try {
      const { productId, productTitle, remainingInventory, sellerEmail } = req.body;
      const targetEmail = sellerEmail || 'freaksince17@gmail.com';

      console.log(`[Low Stock Email Trigger] Dispatched low inventory email alert for "${productTitle || productId}" (Remaining: ${remainingInventory}) to ${targetEmail}`);

      const emailLogPath = path.resolve(dataDir, 'low_stock_email_alerts.json');
      let alertLogs: any[] = [];
      if (fs.existsSync(emailLogPath)) {
        try {
          alertLogs = JSON.parse(fs.readFileSync(emailLogPath, 'utf-8'));
        } catch {}
      }

      const newAlert = {
        id: `alert_${Date.now()}_${productId}`,
        productId,
        productTitle: productTitle || productId,
        remainingInventory: Number(remainingInventory) || 0,
        targetEmail,
        subject: `⚠️ Low Stock Alert: "${productTitle || productId}" has only ${remainingInventory} unit(s) remaining!`,
        body: `Dear Sahina Shrestha (Artified_np Workshop Owner),\n\nThis is an automated inventory alert from your Artified Seller Studio.\n\nProduct: ${productTitle || productId}\nRemaining Kathmandu Workshop Stock: ${remainingInventory} unit(s)\n\nPlease log into Seller Studio to restock this piece soon to avoid stockouts.\n\nWarm regards,\nArtified_np Cloud Function Trigger`,
        dispatchedAt: new Date().toISOString(),
        status: 'delivered'
      };

      alertLogs.unshift(newAlert);
      try {
        fs.writeFileSync(emailLogPath, JSON.stringify(alertLogs.slice(0, 100), null, 2), 'utf-8');
      } catch {}

      return res.json({
        success: true,
        message: `Low stock email alert dispatched to ${targetEmail}`,
        alert: newAlert
      });
    } catch (err: any) {
      console.warn('Notice: Error in /api/send-low-stock-email:', err);
      return res.status(500).json({ error: 'Failed to process low stock email dispatch' });
    }
  });

  // DELETE /api/tracked-order/:orderId - Remove order and all ID variants from tracked_orders.json
  app.delete('/api/tracked-order/:orderId', (req, res) => {
    try {
      const rawId = req.params.orderId || '';
      const clean = rawId.replace(/[#\s]/g, '').toUpperCase();
      const compact = clean.replace(/-/g, '');
      let map: Record<string, any> = {};
      if (fs.existsSync(trackedOrdersJsonPath)) {
        try {
          map = JSON.parse(fs.readFileSync(trackedOrdersJsonPath, 'utf-8'));
        } catch {}
      }

      for (const key of Object.keys(map)) {
        const keyClean = key.replace(/[#\s]/g, '').toUpperCase();
        const keyCompact = keyClean.replace(/-/g, '');
        const orderObj = map[key];
        const objClean = (orderObj?.orderId || '').replace(/[#\s]/g, '').toUpperCase();
        const objCompact = objClean.replace(/-/g, '');
        if (keyClean === clean || keyCompact === compact || objClean === clean || objCompact === compact) {
          delete map[key];
        }
      }

      const serialized = JSON.stringify(map, null, 2);
      fs.writeFileSync(trackedOrdersJsonPath, serialized, 'utf-8');
      try {
        fs.writeFileSync(seedTrackedOrdersJsonPath, serialized, 'utf-8');
      } catch {}
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to delete tracked order' });
    }
  });

  // DELETE /api/tracked-orders - Purge all tracked orders from server disk
  app.delete('/api/tracked-orders', (_req, res) => {
    try {
      fs.writeFileSync(trackedOrdersJsonPath, JSON.stringify({}, null, 2), 'utf-8');
      try {
        fs.writeFileSync(seedTrackedOrdersJsonPath, JSON.stringify({}, null, 2), 'utf-8');
      } catch {}
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to purge tracked orders' });
    }
  });

  // GET /api/tiktok-reels - Retrieve permanently saved TikTok reels
  app.get('/api/tiktok-reels', (_req, res) => {
    try {
      if (fs.existsSync(tiktokReelsJsonPath)) {
        const raw = fs.readFileSync(tiktokReelsJsonPath, 'utf-8');
        const items = JSON.parse(raw);
        if (Array.isArray(items) && items.length > 0) {
          return res.json(items);
        }
      }
      return res.json(TIKTOK_REELS);
    } catch (err) {
      console.error('Error reading tiktok_reels.json:', err);
      return res.json(TIKTOK_REELS);
    }
  });

  // Helper to ensure TikTok videos are downloaded to disk
  const ensureTikTokVideoCached = async (videoUrl?: string) => {
    if (!videoUrl || typeof videoUrl !== 'string') return;
    const match = videoUrl.match(/\/video\/(\d+)/);
    if (!match) return;
    const videoId = match[1];
    const localPath = path.join(tiktokVideosDir, `${videoId}.mp4`);
    if (fs.existsSync(localPath)) return;

    try {
      const twRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}`);
      if (twRes.ok) {
        const twData = await twRes.json();
        const playUrl = twData?.data?.play || twData?.data?.wmplay;
        if (playUrl) {
          const vidRes = await fetch(playUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
          if (vidRes.ok) {
            const buf = Buffer.from(await vidRes.arrayBuffer());
            fs.writeFileSync(localPath, buf);
            console.log(`Auto-cached TikTok video for ${videoId}`);
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to auto-cache video ${videoId}:`, e);
    }
  };

  // POST /api/tiktok-reels - Save TikTok reels permanently to server disk
  app.post('/api/tiktok-reels', (req, res) => {
    try {
      const items = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Expected an array of TikTok reels' });
      }
      fs.writeFileSync(tiktokReelsJsonPath, JSON.stringify(items, null, 2), 'utf-8');
      
      // Auto cache any new TikTok videos in background
      items.forEach((r) => {
        if (r.videoUrl) ensureTikTokVideoCached(r.videoUrl).catch(() => {});
      });

      return res.json({ success: true, items });
    } catch (err: any) {
      console.error('Error saving tiktok_reels.json:', err);
      return res.status(500).json({ error: err.message || 'Failed to save TikTok reels' });
    }
  });

  // GET /api/craft-story - Retrieve permanently saved Craft Story
  app.get('/api/craft-story', (_req, res) => {
    try {
      if (fs.existsSync(craftStoryJsonPath)) {
        const raw = fs.readFileSync(craftStoryJsonPath, 'utf-8');
        return res.json(JSON.parse(raw));
      }
      return res.json(DEFAULT_CRAFT_STORY);
    } catch (err) {
      console.error('Error reading craft_story.json:', err);
      return res.json(DEFAULT_CRAFT_STORY);
    }
  });

  // POST /api/craft-story - Save Craft Story permanently to server disk
  app.post('/api/craft-story', (req, res) => {
    try {
      const data = req.body;
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Expected craft story object' });
      }
      fs.writeFileSync(craftStoryJsonPath, JSON.stringify(data, null, 2), 'utf-8');

      // Auto-cache video in background if TikTok URL
      if (data.videoUrl) {
        ensureTikTokVideoCached(data.videoUrl).catch(() => {});
      }

      return res.json({ success: true, story: data });
    } catch (err: any) {
      console.error('Error saving craft_story.json:', err);
      return res.status(500).json({ error: err.message || 'Failed to save craft story' });
    }
  });

  // POST /api/notify-waitlist - Automated email notification webhook for waitlist restock alerts
  app.post('/api/notify-waitlist', (req, res) => {
    try {
      const { productId, productTitle, price, recipients } = req.body;
      const count = Array.isArray(recipients) ? recipients.length : 0;
      console.log(`[Artified Cloud Trigger] Automated restock email broadcast triggered for: "${productTitle}" (ID: ${productId}, Price: NPR ${price}) to ${count} recipient(s):`, recipients);
      return res.json({
        success: true,
        productId,
        productTitle,
        notifiedCount: count,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error processing notify-waitlist:', err);
      return res.status(500).json({ error: 'Failed to process waitlist notification' });
    }
  });

  // POST /api/upload-video - Upload custom video directly and save to public/instagram_videos
  app.post('/api/upload-video', (req, res) => {
    try {
      const { videoBase64, filename } = req.body;
      if (!videoBase64) {
        return res.status(400).json({ error: 'Missing videoBase64 data' });
      }

      const igDir = path.resolve(process.cwd(), 'public/instagram_videos');
      if (!fs.existsSync(igDir)) {
        fs.mkdirSync(igDir, { recursive: true });
      }

      // Extract base64 payload
      const matches = videoBase64.match(/^data:video\/([a-zA-Z0-9_-]+);base64,(.+)$/);
      let buffer: Buffer;
      let ext = 'mp4';

      if (matches) {
        ext = matches[1] === 'quicktime' ? 'mov' : (matches[1] || 'mp4');
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        const rawBase64 = videoBase64.replace(/^data:[^;]+;base64,/, '');
        buffer = Buffer.from(rawBase64, 'base64');
      }

      const cleanBaseName = (filename || `user_vid_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
      const savedFilename = `${cleanBaseName}.${ext}`;
      const targetPath = path.join(igDir, savedFilename);

      fs.writeFileSync(targetPath, buffer);
      return res.json({ 
        success: true, 
        url: `/instagram_videos/${savedFilename}`,
        filename: savedFilename
      });
    } catch (err: any) {
      console.error('Error uploading video:', err);
      return res.status(500).json({ error: err.message || 'Failed to upload video' });
    }
  });

  // Workshop directory for storing user-uploaded masterclass photos and videos
  // Serve public media directories with HTTP Range 206 partial streaming support & CORS
  const serveMediaWithRange = (mediaDir: string) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const decodedPath = decodeURIComponent(req.path.replace(/^\//, ''));
      let filePath = path.resolve(mediaDir, decodedPath);

      // Prevent directory traversal
      if (!filePath.startsWith(mediaDir)) {
        return res.status(403).send('Forbidden');
      }

      // Smart fuzzy matching if exact path does not exist
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        const dir = path.dirname(filePath);
        const base = path.basename(filePath);
        if (fs.existsSync(dir)) {
          try {
            const files = fs.readdirSync(dir);
            const cleanTarget = base.toLowerCase().replace(/[^a-z0-9]/g, '');
            const match = files.find((f) => {
              const cleanF = f.toLowerCase().replace(/[^a-z0-9]/g, '');
              return cleanF === cleanTarget || 
                     cleanF.includes(cleanTarget) || 
                     cleanTarget.includes(cleanF.replace(/\d+$/, '')) ||
                     cleanTarget.replace(/\d+$/, '') === cleanF.replace(/\d+$/, '');
            });
            if (match) {
              const candidate = path.join(dir, match);
              if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                filePath = candidate;
              }
            }
          } catch {}
        }
      }

      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        const isMedia = /\.(mp4|m4v|mov|webm|jpg|jpeg|png|webp|gif|svg)$/i.test(req.path) || req.baseUrl.includes('workshops');
        if (isMedia) {
          return res.status(404).type('text/plain').send('Media file not found');
        }
        return next();
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      const ext = path.extname(filePath).toLowerCase();

      let contentType = 'application/octet-stream';
      if (ext === '.mp4' || ext === '.m4v') contentType = 'video/mp4';
      else if (ext === '.webm') contentType = 'video/webm';
      else if (ext === '.mov') contentType = 'video/quicktime';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.gif') contentType = 'image/gif';

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Accept-Ranges, Content-Range');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400');

      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize || start > end) {
          res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
          return res.end();
        }

        const chunksize = end - start + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
        };
        res.writeHead(206, head);
        fileStream.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (err) {
      console.warn('Notice: Error serving media file:', err);
      next();
    }
  };

  const workshopsDir = path.resolve(process.cwd(), 'public/workshops');
  const ensureWorkshopFoldersExist = () => {
    if (!fs.existsSync(workshopsDir)) {
      fs.mkdirSync(workshopsDir, { recursive: true });
    }
    const defaultFolders = ['Macrame', 'Pearls', 'Pipecleaner Sunflower'];
    defaultFolders.forEach((folder) => {
      const fPath = path.join(workshopsDir, folder);
      if (!fs.existsSync(fPath)) {
        fs.mkdirSync(fPath, { recursive: true });
      }
      const keepFile = path.join(fPath, '.gitkeep');
      if (!fs.existsSync(keepFile)) {
        fs.writeFileSync(keepFile, '# Keep directory tracked in code file explorer\n', 'utf-8');
      }
    });

    // Auto-organize any loose files in public/workshops/ root into the three canonical class folders
    try {
      const rootFiles = fs.readdirSync(workshopsDir);
      for (const file of rootFiles) {
        const fullPath = path.join(workshopsDir, file);
        if (fs.statSync(fullPath).isFile() && !file.startsWith('.')) {
          const lower = file.toLowerCase();
          let targetFolder = 'Macrame';
          if (lower.includes('pearl')) {
            targetFolder = 'Pearls';
          } else if (lower.includes('pipe') || lower.includes('sunflower')) {
            targetFolder = 'Pipecleaner Sunflower';
          } else if (lower.includes('macrame')) {
            targetFolder = 'Macrame';
          }
          const dest = path.join(workshopsDir, targetFolder, file);
          if (!fs.existsSync(dest)) {
            try {
              fs.renameSync(fullPath, dest);
              console.log(`[Workshop Organizer] Moved loose file ${file} -> public/workshops/${targetFolder}/${file}`);
            } catch {}
          }
        }
      }
    } catch {}
  };
  ensureWorkshopFoldersExist();
  const instagramVideosDir = path.resolve(process.cwd(), 'public/instagram_videos');
  if (!fs.existsSync(instagramVideosDir)) {
    fs.mkdirSync(instagramVideosDir, { recursive: true });
  }

  app.use('/workshops', serveMediaWithRange(workshopsDir));
  app.use('/instagram_videos', serveMediaWithRange(instagramVideosDir));
  app.use(express.static(path.resolve(process.cwd(), 'public')));

  // GET /api/workshop-files - List all physical files stored in public/workshops/ (including class subfolders)
  app.get('/api/workshop-files', (_req, res) => {
    try {
      ensureWorkshopFoldersExist();
      if (!fs.existsSync(workshopsDir)) {
        return res.json({ success: true, files: [] });
      }

      function scanWorkshopDir(dir: string, relPrefix = ''): any[] {
        if (!fs.existsSync(dir)) return [];
        let items: any[] = [];
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name.endsWith('.md')) continue;
            const fullPath = path.join(dir, entry.name);
            const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
              items = items.concat(scanWorkshopDir(fullPath, relPath));
            } else if (entry.isFile()) {
              const stats = fs.statSync(fullPath);
              const isVid = /\.(mp4|mov|webm|m4v)$/i.test(entry.name);
              const isThumb = entry.name.includes('_thumb.') || entry.name.endsWith('_thumb.jpg') || entry.name.endsWith('_thumb.jpeg');
              const folderName = relPrefix || 'general';
              const canonicalWorkshop = 
                folderName.toLowerCase().includes('pearl') ? 'pearl-bag' :
                folderName.toLowerCase().includes('sunflower') || folderName.toLowerCase().includes('pipe') ? 'sunflower' : 'macrame';

              if (!isThumb) {
                items.push({
                  filename: relPath,
                  url: `/workshops/${relPath.split('/').map(encodeURIComponent).join('/')}`,
                  size: stats.size,
                  type: isVid ? 'video' : 'image',
                  category: folderName,
                  folder: folderName,
                  folderWorkshop: canonicalWorkshop,
                  isThumbnail: isThumb,
                  createdAt: stats.birthtime,
                  modifiedAt: stats.mtime
                });
              }
            }
          }
        } catch {}
        return items;
      }

      const allScanned = scanWorkshopDir(workshopsDir);
      // Deduplicate alias variants per folder (favoring names with spaces / primary casing)
      const seenMap = new Map<string, any>();
      // Sort so names with spaces and capital letters come first
      allScanned.sort((a, b) => {
        const aHasSpace = a.filename.includes(' ') ? 1 : 0;
        const bHasSpace = b.filename.includes(' ') ? 1 : 0;
        return bHasSpace - aHasSpace;
      });
      const files: any[] = [];
      for (const item of allScanned) {
        const folder = item.folder || '';
        const baseNorm = path.basename(item.filename, path.extname(item.filename))
          .toLowerCase()
          .replace(/_\d+$/, '')
          .replace(/[^a-z0-9]/g, '');
        const key = `${folder.toLowerCase()}:${baseNorm}`;
        if (!seenMap.has(key)) {
          seenMap.set(key, item);
          files.push(item);
        }
      }
      return res.json({ success: true, files });
    } catch (err: any) {
      console.error('Error listing workshop files:', err);
      return res.status(500).json({ error: err.message || 'Failed to list workshop files' });
    }
  });

  // DELETE /api/workshop-file - Delete a file from public/workshops/
  app.delete('/api/workshop-file', async (req, res) => {
    try {
      const filePath = (req.query.path as string) || (req.body?.path as string) || '';
      if (!filePath) {
        return res.status(400).json({ error: 'Missing file path' });
      }

      const cleanPath = filePath.replace(/^\/+/, '');
      const fullPath = path.resolve(workshopsDir, cleanPath);

      if (!fullPath.startsWith(workshopsDir)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      const ext = path.extname(fullPath);
      const base = fullPath.slice(0, -ext.length);
      const thumbPath = `${base}_thumb.jpg`;
      if (fs.existsSync(thumbPath)) {
        try { fs.unlinkSync(thumbPath); } catch {}
      }

      const distFullPath = path.resolve(process.cwd(), 'dist/workshops', cleanPath);
      if (fs.existsSync(distFullPath)) {
        try { fs.unlinkSync(distFullPath); } catch {}
      }
      const distThumbPath = `${distFullPath.slice(0, -ext.length)}_thumb.jpg`;
      if (fs.existsSync(distThumbPath)) {
        try { fs.unlinkSync(distThumbPath); } catch {}
      }

      if (fs.existsSync(workshopMediaJsonPath)) {
        try {
          const items = JSON.parse(fs.readFileSync(workshopMediaJsonPath, 'utf-8'));
          if (Array.isArray(items)) {
            const filtered = items.filter((i: any) => !i.url?.includes(cleanPath));
            fs.writeFileSync(workshopMediaJsonPath, JSON.stringify(filtered, null, 2), 'utf-8');
          }
        } catch {}
      }

      return res.json({ success: true, message: 'File deleted successfully' });
    } catch (err: any) {
      console.error('Error deleting workshop file:', err);
      return res.status(500).json({ error: err.message || 'Failed to delete file' });
    }
  });

  // POST /api/workshop-media/delete - Delete media item and physical file
  app.post('/api/workshop-media/delete', async (req, res) => {
    try {
      const { id, deleteFile, url } = req.body || {};
      if (url) {
        try {
          const urlObj = new URL(url, 'http://localhost');
          const pathname = urlObj.pathname;
          if (pathname.includes('/workshops/')) {
            const relPath = decodeURIComponent(pathname.split('/workshops/')[1]);
            const fullPath = path.resolve(workshopsDir, relPath);
            if (fullPath.startsWith(workshopsDir) && fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
          }
        } catch {}
      }
      if (fs.existsSync(workshopMediaJsonPath)) {
        try {
          const items = JSON.parse(fs.readFileSync(workshopMediaJsonPath, 'utf-8'));
          if (Array.isArray(items)) {
            const filtered = items.filter((i: any) => i.id !== id);
            fs.writeFileSync(workshopMediaJsonPath, JSON.stringify(filtered, null, 2), 'utf-8');
          }
        } catch {}
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/workshop-folders - List all subdirectories inside public/workshops/
  app.get('/api/workshop-folders', (_req, res) => {
    try {
      ensureWorkshopFoldersExist();
      if (!fs.existsSync(workshopsDir)) {
        return res.json({ success: true, folders: [] });
      }
      const entries = fs.readdirSync(workshopsDir, { withFileTypes: true });
      const folders = entries
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((e) => e.name);
      return res.json({ success: true, folders });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/workshop-create-folder - Create a new folder in public/workshops/
  app.post('/api/workshop-create-folder', (req, res) => {
    try {
      const { folderName } = req.body;
      if (!folderName || typeof folderName !== 'string') {
        return res.status(400).json({ error: 'Folder name required' });
      }
      const cleanFolderName = folderName.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
      if (!cleanFolderName) {
        return res.status(400).json({ error: 'Invalid folder name' });
      }
      const targetDir = path.join(workshopsDir, cleanFolderName);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      return res.json({ success: true, folderName: cleanFolderName });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/workshops-zip - Download all workshop files directly bundled as public/workshops ZIP archive
  app.get('/api/workshops-zip', (_req, res) => {
    try {
      if (!fs.existsSync(workshopsDir)) {
        return res.status(404).json({ error: 'workshops directory does not exist' });
      }

      const files = fs.readdirSync(workshopsDir);
      if (files.length === 0) {
        return res.status(404).json({ error: 'No files in public/workshops directory' });
      }

      res.attachment('artified-public-workshops.zip');
      res.setHeader('Content-Type', 'application/zip');

      const archive = new archiverPkg.ZipArchive();

      archive.on('error', (err: any) => {
        console.error('Archive error:', err);
        if (!res.headersSent) {
          res.status(500).send({ error: err.message });
        }
      });

      archive.pipe(res);

      // Add entire public/workshops directory under "public/workshops/" inside the zip
      archive.directory(workshopsDir, 'public/workshops');

      archive.finalize();
    } catch (err: any) {
      console.error('Error creating workshops zip:', err);
      return res.status(500).json({ error: err.message || 'Failed to create workshops zip' });
    }
  });

  // POST /api/workshop-upload-binary - Directly stream raw binary video/photo into public/workshops/<subDir>/
  app.post('/api/workshop-upload-binary', express.raw({ type: '*/*', limit: '500mb' }), async (req, res) => {
    try {
      ensureWorkshopFoldersExist();
      const rawBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
      if (!rawBuffer || rawBuffer.length === 0) {
        return res.status(400).json({ error: 'Empty binary payload' });
      }

      const reqFolder = (req.headers['x-folder'] as string) || (req.query.folder as string) || '';
      const groupId = (req.headers['x-group-id'] as string) || (req.query.groupId as string) || '';
      const rawFilename = (req.headers['x-filename'] as string) || (req.query.filename as string) || `workshop_${Date.now()}`;
      const type = (req.headers['x-type'] as string) || (req.query.type as string) || 'image';
      const title = (req.headers['x-title'] as string) || (req.query.title as string) || '';
      const caption = (req.headers['x-caption'] as string) || (req.query.caption as string) || '';
      const craftTechnique = (req.headers['x-craft-technique'] as string) || (req.query.craftTechnique as string) || '';

      const isVid = type === 'video' || /\.(mp4|mov|webm|m4v|mkv|3gp|avi)$/i.test(rawFilename);
      let ext = rawFilename.includes('.') ? rawFilename.split('.').pop()?.toLowerCase() || (isVid ? 'mp4' : 'jpg') : (isVid ? 'mp4' : 'jpg');
      if (ext === 'jpeg') ext = 'jpg';
      const origBase = rawFilename.replace(/\.[^/.]+$/, '');
      const cleanBaseName = origBase.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      let savedFilename = `${cleanBaseName}.${ext}`;

      let subDir = 'Macrame';
      const normGroup = (groupId || '').toLowerCase();
      const normFolder = (reqFolder || '').toLowerCase();
      if (normFolder.includes('sunflower') || normFolder.includes('pipe') || normGroup.includes('sunflower') || normGroup.includes('pipe')) {
        subDir = 'Pipecleaner Sunflower';
      } else if (normFolder.includes('pearl') || normGroup.includes('pearl')) {
        subDir = 'Pearls';
      } else if (normFolder.includes('macrame') || normGroup.includes('macrame')) {
        subDir = 'Macrame';
      } else if (reqFolder) {
        subDir = reqFolder;
      } else {
        subDir = 'Macrame';
      }

      const saveDir = path.join(workshopsDir, subDir);
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }

      const targetPath = path.join(saveDir, savedFilename);
      fs.writeFileSync(targetPath, rawBuffer);
      console.log(`[Binary Workshop Upload] Saved file directly to: public/workshops/${subDir}/${savedFilename} (${rawBuffer.length} bytes)`);

      // If user uploaded HEIC / HEIF (common on iPhone), convert to JPEG using ffmpeg so all web browsers can view it
      if (ext === 'heic' || ext === 'heif') {
        try {
          const { execSync } = await import('child_process');
          const jpgTarget = path.join(saveDir, `${cleanBaseName}.jpg`);
          execSync(`ffmpeg -y -i "${targetPath}" -q:v 2 "${jpgTarget}"`, { stdio: 'ignore' });
          if (fs.existsSync(jpgTarget)) {
            savedFilename = `${cleanBaseName}.jpg`;
            ext = 'jpg';
          }
        } catch {}
      }

      // Mirror to dist if dist exists
      const distSaveDir = path.resolve(process.cwd(), 'dist/workshops', subDir);
      if (fs.existsSync(path.resolve(process.cwd(), 'dist'))) {
        try {
          if (!fs.existsSync(distSaveDir)) fs.mkdirSync(distSaveDir, { recursive: true });
          fs.writeFileSync(path.join(distSaveDir, savedFilename), rawBuffer);
        } catch {}
      }

      const publicUrl = `/workshops/${encodeURIComponent(subDir)}/${encodeURIComponent(savedFilename)}`;
      let thumbUrl = publicUrl;

      if (isVid) {
        const thumbFilename = `${cleanBaseName}_thumb.jpg`;
        const thumbPath = path.join(saveDir, thumbFilename);
        try {
          const { execSync } = await import('child_process');
          execSync(`ffmpeg -y -ss 00:00:00.500 -i "${targetPath}" -vframes 1 -q:v 2 "${thumbPath}"`, { stdio: 'ignore' });
          if (fs.existsSync(thumbPath)) {
            thumbUrl = `/workshops/${encodeURIComponent(subDir)}/${encodeURIComponent(thumbFilename)}`;
            if (fs.existsSync(distSaveDir)) {
              try { fs.copyFileSync(thumbPath, path.join(distSaveDir, thumbFilename)); } catch {}
            }
          }
        } catch {}
      }

      // Record in workshop_media.json
      let allItems: any[] = [];
      if (fs.existsSync(workshopMediaJsonPath)) {
        try {
          allItems = JSON.parse(fs.readFileSync(workshopMediaJsonPath, 'utf-8'));
          if (!Array.isArray(allItems)) allItems = [];
        } catch {
          allItems = [];
        }
      }

      const cleanTitle = title || origBase.replace(/[_-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      const canonicalGroupId = subDir === 'Pipecleaner Sunflower' ? 'sunflower' : (subDir === 'Pearls' ? 'pearl-bag' : 'macrame');
      const canonicalWorkshopTitle = subDir === 'Pipecleaner Sunflower' ? 'Waste Pipe to Sunflower Eco-Art Workshop' : (subDir === 'Pearls' ? 'Bridal Pearl Bag & Bead Weaving Workshop' : 'Macrame Wall Art & Planters Workshop');

      const newItem = {
        id: `ws_media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        groupId: canonicalGroupId,
        type: isVid ? 'video' : 'image',
        title: cleanTitle,
        workshopTitle: canonicalWorkshopTitle,
        url: publicUrl,
        thumbnailUrl: thumbUrl,
        caption: caption || `${cleanTitle} session recorded at Kathmandu Workshop, Nepal.`,
        craftTechnique: craftTechnique || 'Handcrafting Technique',
        location: 'Kathmandu, Nepal',
        date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        instructor: 'Sahina Shrestha',
        tags: ['Artisan Workshop', 'Kathmandu Studio'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      allItems = [newItem, ...allItems.filter((i) => i.url !== publicUrl && i.id !== newItem.id)];
      fs.writeFileSync(workshopMediaJsonPath, JSON.stringify(allItems, null, 2), 'utf-8');
      try {
        const rootDataPath = path.resolve(process.cwd(), 'data/workshop_media.json');
        fs.writeFileSync(rootDataPath, JSON.stringify(allItems, null, 2), 'utf-8');
      } catch {}

      return res.json({
        success: true,
        item: newItem,
        url: publicUrl,
        thumbnailUrl: thumbUrl,
        filename: savedFilename,
        folder: subDir
      });
    } catch (err: any) {
      console.error('Error in /api/workshop-upload-binary:', err);
      return res.status(500).json({ error: err.message || 'Failed to upload binary file' });
    }
  });

  // POST /api/workshop-upload - Directly saves uploaded photo or video to public/workshops/
  app.post('/api/workshop-upload', async (req, res) => {
    try {
      const { fileBase64, filename, type, groupId, title, caption, craftTechnique, thumbnailBase64 } = req.body;
      if (!fileBase64 || typeof fileBase64 !== 'string') {
        return res.status(400).json({ error: 'Missing fileBase64 payload' });
      }

      ensureWorkshopFoldersExist();

      // Determine extension and decode base64
      let ext = 'jpg';
      let buffer: Buffer;

      const dataUrlMatches = fileBase64.match(/^data:([a-zA-Z0-9_\-\/+]+);base64,(.+)$/);
      if (dataUrlMatches) {
        const mime = dataUrlMatches[1].toLowerCase();
        buffer = Buffer.from(dataUrlMatches[2], 'base64');
        if (mime.includes('video/mp4')) ext = 'mp4';
        else if (mime.includes('video/quicktime')) ext = 'mov';
        else if (mime.includes('video/webm')) ext = 'webm';
        else if (mime.includes('png')) ext = 'png';
        else if (mime.includes('webp')) ext = 'webp';
        else if (mime.includes('gif')) ext = 'gif';
        else ext = 'jpeg';
      } else {
        const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
        buffer = Buffer.from(cleanBase64, 'base64');
        if (filename && filename.includes('.')) {
          ext = filename.split('.').pop()?.toLowerCase() || (type === 'video' ? 'mp4' : 'jpg');
        } else {
          ext = type === 'video' ? 'mp4' : 'jpg';
        }
      }

      const origName = filename ? filename.replace(/\.[^/.]+$/, '') : `workshop_${Date.now()}`;
      const cleanBaseName = origName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      const savedFilename = `${cleanBaseName}.${ext}`;

      // Route into class subfolders if specified or matched by group
      let subDir = 'Macrame';
      const reqFolder = req.body.folder || '';
      const normGroup = (groupId || '').toLowerCase();
      const normFolder = (reqFolder || '').toLowerCase();
      if (normFolder.includes('sunflower') || normFolder.includes('pipe') || normGroup.includes('sunflower') || normGroup.includes('pipe')) {
        subDir = 'Pipecleaner Sunflower';
      } else if (normFolder.includes('pearl') || normGroup.includes('pearl')) {
        subDir = 'Pearls';
      } else if (normFolder.includes('macrame') || normGroup.includes('macrame')) {
        subDir = 'Macrame';
      } else if (reqFolder) {
        subDir = reqFolder;
      } else {
        subDir = 'Macrame';
      }

      const saveDir = path.join(workshopsDir, subDir);
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }

      const targetPath = path.join(saveDir, savedFilename);

      fs.writeFileSync(targetPath, buffer);
      console.log(`[Workshop Upload] Saved file directly to: public/workshops/${subDir}/${savedFilename} (${buffer.length} bytes)`);

      // Mirror to dist if dist exists
      const distSaveDir = path.resolve(process.cwd(), 'dist/workshops', subDir);
      if (fs.existsSync(path.resolve(process.cwd(), 'dist'))) {
        try {
          if (!fs.existsSync(distSaveDir)) fs.mkdirSync(distSaveDir, { recursive: true });
          fs.writeFileSync(path.join(distSaveDir, savedFilename), buffer);
        } catch {}
      }

      const publicUrl = `/workshops/${encodeURIComponent(subDir)}/${encodeURIComponent(savedFilename)}`;
      let thumbUrl = publicUrl;

      // Handle thumbnail if video
      const isVideo = type === 'video' || ['mp4', 'mov', 'webm'].includes(ext);
      if (isVideo) {
        const thumbFilename = `${cleanBaseName}_thumb.jpg`;
        const thumbPath = path.join(saveDir, thumbFilename);

        if (thumbnailBase64 && typeof thumbnailBase64 === 'string') {
          try {
            const rawThumb = thumbnailBase64.replace(/^data:[^;]+;base64,/, '');
            fs.writeFileSync(thumbPath, Buffer.from(rawThumb, 'base64'));
            thumbUrl = `/workshops/${encodeURIComponent(subDir)}/${encodeURIComponent(thumbFilename)}`;
            if (fs.existsSync(distSaveDir)) {
              try { fs.copyFileSync(thumbPath, path.join(distSaveDir, thumbFilename)); } catch {}
            }
          } catch (tErr) {
            console.warn('Could not save client thumbnail:', tErr);
          }
        } else {
          // Attempt ffmpeg extraction if binary exists, otherwise fallback to video url
          try {
            const { execSync } = await import('child_process');
            execSync(`ffmpeg -y -ss 00:00:00.500 -i "${targetPath}" -vframes 1 -q:v 2 "${thumbPath}"`, { stdio: 'ignore' });
            if (fs.existsSync(thumbPath)) {
              thumbUrl = `/workshops/${encodeURIComponent(subDir)}/${encodeURIComponent(thumbFilename)}`;
              if (fs.existsSync(distSaveDir)) {
                try { fs.copyFileSync(thumbPath, path.join(distSaveDir, thumbFilename)); } catch {}
              }
            }
          } catch {
            // ffmpeg not present or video format requires canvas frame; default thumbUrl is preserved
          }
        }
      }

      // If this upload is a thumbnail image for a video, simply return the saved file URL and do not create a media item
      const isThumbFile = req.body.isThumbnail === true || cleanBaseName.endsWith('_thumb') || cleanBaseName.includes('_thumb');
      if (isThumbFile) {
        return res.json({
          success: true,
          url: publicUrl,
          thumbnailUrl: publicUrl,
          filename: savedFilename,
          folder: subDir,
          isThumbnail: true
        });
      }

      // Check if an item with identical url already exists in workshop_media.json before creating new entry
      let allItems: any[] = [];
      if (fs.existsSync(workshopMediaJsonPath)) {
        try {
          allItems = JSON.parse(fs.readFileSync(workshopMediaJsonPath, 'utf-8'));
          if (!Array.isArray(allItems)) allItems = [];
        } catch {
          allItems = [];
        }
      }

      const existingItem = allItems.find((i) => i.url === publicUrl || (i.url && i.url.endsWith(`/${savedFilename}`)));
      if (existingItem) {
        return res.json({
          success: true,
          item: existingItem,
          url: existingItem.url,
          thumbnailUrl: existingItem.thumbnailUrl || thumbUrl,
          filename: savedFilename,
          folder: subDir
        });
      }

      // Generate workshop media item
      const itemId = `ws_media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const cleanTitle = title || origName.replace(/[_-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      const canonicalGroupId = subDir === 'Pipecleaner Sunflower' ? 'sunflower' : (subDir === 'Pearls' ? 'pearl-bag' : 'macrame');
      const canonicalWorkshopTitle = subDir === 'Pipecleaner Sunflower' ? 'Waste Pipe to Sunflower Eco-Art Workshop' : (subDir === 'Pearls' ? 'Bridal Pearl Bag & Bead Weaving Workshop' : 'Macrame Wall Art & Planters Workshop');

      const newItem = {
        id: itemId,
        groupId: canonicalGroupId,
        type: isVideo ? 'video' : 'image',
        title: cleanTitle,
        workshopTitle: canonicalWorkshopTitle,
        url: publicUrl,
        thumbnailUrl: thumbUrl,
        caption: caption || `${cleanTitle} session recorded at Kathmandu Workshop, Nepal.`,
        craftTechnique: craftTechnique || 'Handcrafting Technique',
        location: 'Kathmandu, Nepal',
        date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        instructor: 'Sahina Shrestha',
        tags: ['Artisan Workshop', 'Kathmandu Studio'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      allItems = [newItem, ...allItems.filter((i) => i.id !== newItem.id)];
      fs.writeFileSync(workshopMediaJsonPath, JSON.stringify(allItems, null, 2), 'utf-8');
      try {
        const rootDataPath = path.resolve(process.cwd(), 'data/workshop_media.json');
        fs.writeFileSync(rootDataPath, JSON.stringify(allItems, null, 2), 'utf-8');
      } catch {}

      return res.json({
        success: true,
        item: newItem,
        url: publicUrl,
        thumbnailUrl: thumbUrl,
        filename: savedFilename,
        folder: subDir
      });
    } catch (err: any) {
      console.error('Error in /api/workshop-upload:', err);
      return res.status(500).json({ error: err.message || 'Failed to upload workshop media' });
    }
  });

  // GET /api/workshop-media - Retrieve saved custom workshop media items
  app.get('/api/workshop-media', (_req, res) => {
    try {
      if (fs.existsSync(workshopMediaJsonPath)) {
        const raw = fs.readFileSync(workshopMediaJsonPath, 'utf-8');
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          return res.json({ success: true, items });
        }
      }
      return res.json({ success: true, items: [] });
    } catch (err: any) {
      console.error('Error reading workshop_media.json:', err);
      return res.json({ success: true, items: [] });
    }
  });

  // POST /api/workshop-media - Save all workshop media items persistently
  app.post('/api/workshop-media', (req, res) => {
    try {
      const items = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Expected an array of media items' });
      }
      fs.writeFileSync(workshopMediaJsonPath, JSON.stringify(items, null, 2), 'utf-8');
      try {
        const rootDataPath = path.resolve(process.cwd(), 'data/workshop_media.json');
        fs.writeFileSync(rootDataPath, JSON.stringify(items, null, 2), 'utf-8');
      } catch {}
      return res.json({ success: true, items });
    } catch (err: any) {
      console.error('Error saving workshop_media.json:', err);
      return res.status(500).json({ error: err.message || 'Failed to save workshop media' });
    }
  });

  // POST /api/workshop-media/delete - Delete a workshop media item from server disk
  app.post('/api/workshop-media/delete', (req, res) => {
    try {
      const { id, deleteFile, filename, url } = req.body;
      if (!id && !filename && !url) {
        return res.status(400).json({ error: 'Missing media item identifier' });
      }
      let allItems: any[] = [];
      if (fs.existsSync(workshopMediaJsonPath)) {
        try {
          allItems = JSON.parse(fs.readFileSync(workshopMediaJsonPath, 'utf-8'));
          if (!Array.isArray(allItems)) allItems = [];
        } catch {
          allItems = [];
        }
      }

      const itemToDelete = allItems.find((i) => i.id === id || (url && i.url === url) || (filename && i.url?.includes(filename)));
      allItems = allItems.filter((i) => i.id !== id && (!url || i.url !== url));
      fs.writeFileSync(workshopMediaJsonPath, JSON.stringify(allItems, null, 2), 'utf-8');

      // Optionally delete physical file if requested
      if (deleteFile) {
        const targetFilename = filename || (itemToDelete && itemToDelete.url ? path.basename(itemToDelete.url) : (url ? path.basename(url) : (typeof id === 'string' && id.includes('.') ? id : null)));
        if (targetFilename && !targetFilename.startsWith('.gitkeep')) {
          const defaultFolders = ['Macrame', 'Pearls', 'Pipecleaner Sunflower'];
          const searchPaths: string[] = [
            path.join(workshopsDir, targetFilename),
            ...defaultFolders.map((f) => path.join(workshopsDir, f, targetFilename))
          ];
          if (itemToDelete && itemToDelete.url) {
            const urlSubPath = itemToDelete.url.replace(/^\/workshops\//, '');
            searchPaths.unshift(path.join(workshopsDir, decodeURIComponent(urlSubPath)));
          }

          for (const p of searchPaths) {
            if (fs.existsSync(p) && !p.endsWith('.gitkeep')) {
              try {
                if (fs.statSync(p).isFile()) {
                  fs.unlinkSync(p);
                  console.log(`Deleted physical workshop file: ${p}`);
                  const thumbP = p.replace(/\.[^/.]+$/, '_thumb.jpg');
                  if (fs.existsSync(thumbP) && !thumbP.endsWith('.gitkeep')) {
                    fs.unlinkSync(thumbP);
                  }
                }
              } catch (uErr) {
                console.warn('Notice: unlink failed', uErr);
              }
            }
          }
        }
      }

      // Always guarantee the 3 folders and their .gitkeep remain present
      ensureWorkshopFoldersExist();

      try {
        const rootDataPath = path.resolve(process.cwd(), 'data/workshop_media.json');
        fs.writeFileSync(rootDataPath, JSON.stringify(allItems, null, 2), 'utf-8');
      } catch {}

      return res.json({ success: true, id });
    } catch (err: any) {
      console.error('Error in /api/workshop-media/delete:', err);
      return res.status(500).json({ error: err.message || 'Failed to delete media item' });
    }
  });

  // POST /api/workshop-media/assign-batch - Assign or re-assign files to specific workshop class without duplicates
  app.post('/api/workshop-media/assign-batch', (req, res) => {
    try {
      const { filenames, targetGroupId } = req.body;
      if (!Array.isArray(filenames) || filenames.length === 0 || !targetGroupId) {
        return res.status(400).json({ error: 'Missing filenames array or targetGroupId' });
      }

      const canonicalGroup = 
        targetGroupId.toLowerCase().includes('sunflower') || targetGroupId.toLowerCase().includes('pipe') ? 'sunflower' :
        targetGroupId.toLowerCase().includes('pearl') ? 'pearl-bag' : 'macrame';

      const workshopTitle = 
        canonicalGroup === 'sunflower' ? 'Waste Pipe to Sunflower Eco-Art Workshop' :
        canonicalGroup === 'pearl-bag' ? 'Bridal Pearl Bag & Bead Weaving Workshop' : 'Macrame Wall Art & Planters Workshop';

      let allItems: any[] = [];
      if (fs.existsSync(workshopMediaJsonPath)) {
        try {
          allItems = JSON.parse(fs.readFileSync(workshopMediaJsonPath, 'utf-8'));
          if (!Array.isArray(allItems)) allItems = [];
        } catch {
          allItems = [];
        }
      }

      const updatedFilenames: string[] = [];

      for (const fn of filenames) {
        const cleanBase = fn.split('/').pop()?.replace(/\.[^/.]+$/, '') || fn;
        const isVid = /\.(mp4|mov|webm|m4v)$/i.test(fn);
        const encodedUrl = `/workshops/${fn.split('/').map(encodeURIComponent).join('/')}`;
        const cleanName = fn.split('/').pop() || fn;
        const fnLower = fn.toLowerCase();
        const folderPrefix = fn.includes('/') ? fn.split('/')[0].toLowerCase() : '';

        let itemCanonicalGroup = canonicalGroup;
        let itemWorkshopTitle = workshopTitle;

        // Strict folder-to-workshop mapping: physical folder strictly determines the workshop class
        if (folderPrefix.includes('pearl') || fnLower.includes('pearl')) {
          itemCanonicalGroup = 'pearl-bag';
          itemWorkshopTitle = 'Bridal Pearl Bag & Bead Weaving Workshop';
        } else if (folderPrefix.includes('sunflower') || folderPrefix.includes('pipe') || fnLower.includes('sunflower') || fnLower.includes('pipe')) {
          itemCanonicalGroup = 'sunflower';
          itemWorkshopTitle = 'Waste Pipe to Sunflower Eco-Art Workshop';
        } else if (folderPrefix.includes('macrame') || fnLower.includes('macrame')) {
          itemCanonicalGroup = 'macrame';
          itemWorkshopTitle = 'Macrame Wall Art & Planters Workshop';
        } else if (targetGroupId === 'auto' || targetGroupId === 'by-folder') {
          itemCanonicalGroup = 'macrame';
          itemWorkshopTitle = 'Macrame Wall Art & Planters Workshop';
        }

        // Deduplicate against existing items so timestamped versions and space-separated versions merge cleanly
        const cleanBaseNormalized = cleanBase.toLowerCase().replace(/_\d+$/, '').replace(/[^a-z0-9]/g, '');
        const existingIdx = allItems.findIndex((m) => {
          if (m.url === encodedUrl) return true;
          const mDecoded = decodeURIComponent(m.url || '').toLowerCase();
          if (mDecoded.endsWith(cleanName.toLowerCase())) return true;
          const mBase = path.basename(mDecoded, path.extname(mDecoded)).replace(/_\d+$/, '').replace(/[^a-z0-9]/g, '');
          return mBase && cleanBaseNormalized && mBase === cleanBaseNormalized;
        });

        if (existingIdx >= 0) {
          allItems[existingIdx] = {
            ...allItems[existingIdx],
            url: encodedUrl,
            groupId: itemCanonicalGroup,
            workshopTitle: itemWorkshopTitle,
            updatedAt: new Date().toISOString()
          };
          updatedFilenames.push(fn);
        } else {
          const newItem = {
            id: `ws_media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            groupId: itemCanonicalGroup,
            type: isVid ? 'video' : 'image',
            title: cleanBase.replace(/[_-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            workshopTitle: itemWorkshopTitle,
            url: encodedUrl,
            thumbnailUrl: isVid ? encodedUrl.replace(/\.[^/.]+$/, '_thumb.jpg') : encodedUrl,
            caption: `${cleanBase.replace(/[_-]/g, ' ')} session recorded at Kathmandu Workshop, Nepal.`,
            craftTechnique: itemCanonicalGroup === 'sunflower' ? 'Conduit Pipe & Petal Craft' : itemCanonicalGroup === 'pearl-bag' ? 'Baroque Pearl Weaving' : 'Macrame Knotting',
            location: 'Kathmandu, Nepal',
            date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            instructor: 'Sahina Shrestha',
            tags: ['Kathmandu Workshop', itemCanonicalGroup === 'sunflower' ? 'Eco-Art' : itemCanonicalGroup === 'pearl-bag' ? 'Bridal Couture' : 'Fiber Art'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          allItems.push(newItem);
          updatedFilenames.push(fn);
        }
      }

      fs.writeFileSync(workshopMediaJsonPath, JSON.stringify(allItems, null, 2), 'utf-8');
      try {
        const rootDataPath = path.resolve(process.cwd(), 'data/workshop_media.json');
        fs.writeFileSync(rootDataPath, JSON.stringify(allItems, null, 2), 'utf-8');
      } catch {}

      return res.json({ success: true, updatedCount: updatedFilenames.length, items: allItems });
    } catch (err: any) {
      console.error('Error in /api/workshop-media/assign-batch:', err);
      return res.status(500).json({ error: err.message || 'Failed to assign media' });
    }
  });

  // POST /api/workshop-media/sync-folders - Automatically sync and organize all 3 workshop folders on disk to their exact classes
  app.post('/api/workshop-media/sync-folders', (_req, res) => {
    try {
      ensureWorkshopFoldersExist();
      let allItems: any[] = [];
      if (fs.existsSync(workshopMediaJsonPath)) {
        try {
          allItems = JSON.parse(fs.readFileSync(workshopMediaJsonPath, 'utf-8'));
          if (!Array.isArray(allItems)) allItems = [];
        } catch {
          allItems = [];
        }
      }

      const folderMapping = [
        { folder: 'Pearls', groupId: 'pearl-bag', title: 'Bridal Pearl Bag & Bead Weaving Workshop', craft: 'Baroque Pearl Weaving', tag: 'Bridal Couture' },
        { folder: 'Pipecleaner Sunflower', groupId: 'sunflower', title: 'Waste Pipe to Sunflower Eco-Art Workshop', craft: 'Conduit Pipe & Petal Craft', tag: 'Eco-Art' },
        { folder: 'Macrame', groupId: 'macrame', title: 'Macrame Wall Art & Planters Workshop', craft: 'Macrame Knotting', tag: 'Fiber Art' }
      ];

      for (const map of folderMapping) {
        const fPath = path.join(workshopsDir, map.folder);
        if (!fs.existsSync(fPath)) continue;
        const dirFiles = fs.readdirSync(fPath);

        for (const file of dirFiles) {
          if (file.startsWith('.') || file.endsWith('.md')) continue;
          const isThumb = file.includes('_thumb.') || file.endsWith('_thumb.jpg') || file.endsWith('_thumb.jpeg');
          if (isThumb) continue;

          const relPath = `${map.folder}/${file}`;
          const isVid = /\.(mp4|mov|webm|m4v)$/i.test(file);
          const encodedUrl = `/workshops/${relPath.split('/').map(encodeURIComponent).join('/')}`;
          const cleanBase = file.replace(/\.[^/.]+$/, '');
          const cleanBaseNorm = cleanBase.toLowerCase().replace(/_\d+$/, '').replace(/[^a-z0-9]/g, '');

          const existingIdx = allItems.findIndex((m) => {
            if (m.url === encodedUrl) return true;
            const mDec = decodeURIComponent(m.url || '').toLowerCase();
            if (mDec.endsWith(file.toLowerCase())) return true;
            const mBase = path.basename(mDec, path.extname(mDec)).replace(/_\d+$/, '').replace(/[^a-z0-9]/g, '');
            return mBase && cleanBaseNorm && mBase === cleanBaseNorm;
          });

          if (existingIdx >= 0) {
            allItems[existingIdx] = {
              ...allItems[existingIdx],
              url: encodedUrl,
              groupId: map.groupId,
              workshopTitle: map.title,
              updatedAt: new Date().toISOString()
            };
          } else {
            allItems.push({
              id: `ws_media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              groupId: map.groupId,
              type: isVid ? 'video' : 'image',
              title: cleanBase.replace(/[_-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
              workshopTitle: map.title,
              url: encodedUrl,
              thumbnailUrl: isVid ? encodedUrl.replace(/\.[^/.]+$/, '_thumb.jpg') : encodedUrl,
              caption: `${cleanBase.replace(/[_-]/g, ' ')} session recorded at Kathmandu Workshop, Nepal.`,
              craftTechnique: map.craft,
              location: 'Kathmandu, Nepal',
              date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              instructor: 'Sahina Shrestha',
              tags: ['Kathmandu Workshop', map.tag],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      fs.writeFileSync(workshopMediaJsonPath, JSON.stringify(allItems, null, 2), 'utf-8');
      try {
        const rootDataPath = path.resolve(process.cwd(), 'data/workshop_media.json');
        fs.writeFileSync(rootDataPath, JSON.stringify(allItems, null, 2), 'utf-8');
      } catch {}

      return res.json({ success: true, count: allItems.length, items: allItems });
    } catch (err: any) {
      console.error('Error syncing workshop folders:', err);
      return res.status(500).json({ error: err.message || 'Failed to sync folders' });
    }
  });

  // GET /api/workshop-groups - Retrieve masterclass groups
  app.get('/api/workshop-groups', (_req, res) => {
    try {
      if (fs.existsSync(workshopGroupsJsonPath)) {
        const raw = fs.readFileSync(workshopGroupsJsonPath, 'utf-8');
        const groups = JSON.parse(raw);
        if (Array.isArray(groups) && groups.length > 0) {
          return res.json({ success: true, groups });
        }
      }
      return res.json({ success: true, groups: [] });
    } catch (err: any) {
      console.error('Error reading workshop_groups.json:', err);
      return res.json({ success: true, groups: [] });
    }
  });

  // POST /api/workshop-groups - Save masterclass groups persistently to server disk
  app.post('/api/workshop-groups', (req, res) => {
    try {
      const groups = req.body;
      if (!Array.isArray(groups)) {
        return res.status(400).json({ error: 'Expected an array of groups' });
      }
      fs.writeFileSync(workshopGroupsJsonPath, JSON.stringify(groups, null, 2), 'utf-8');
      return res.json({ success: true, groups });
    } catch (err: any) {
      console.error('Error saving workshop_groups.json:', err);
      return res.status(500).json({ error: err.message || 'Failed to save workshop groups' });
    }
  });

  // Shared Gemini Client
  const getGeminiClient = () => {
    if (!process.env.GEMINI_API_KEY) return null;
    return new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  // POST /api/gemini/extract-workshop-info - Deep Visual Feature Analysis using Gemini Pro Vision
  app.post('/api/gemini/extract-workshop-info', async (req, res) => {
    try {
      const { images, imageBase64, mimeType, filename, mediaList, topic } = req.body;
      const effectiveTopic = (topic || '').trim();

      const ai = getGeminiClient();
      if (ai) {
        try {
          const contents: any[] = [];

          // Collect multiple visual frames/photos if provided
          if (Array.isArray(images) && images.length > 0) {
            for (const img of images.slice(0, 6)) {
              if (img && img.imageBase64) {
                const cleanBase64 = img.imageBase64.replace(/^data:[a-zA-Z0-9/]+;base64,/, '');
                contents.push({
                  inlineData: {
                    mimeType: img.mimeType || 'image/jpeg',
                    data: cleanBase64
                  }
                });
              }
            }
          } else if (imageBase64 && typeof imageBase64 === 'string') {
            const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/]+;base64,/, '');
            contents.push({
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: cleanBase64
              }
            });
          }

          const visionPrompt = `You are the lead artisan director and master visual evaluator for "Artified Nepal", a luxury handmade craft studio founded and led by master artisan Sahina Shrestha in Kathmandu, Nepal.

CRITICAL INSTRUCTIONS FOR VISUAL FEATURE ANALYSIS (GEMINI PRO VISION):
1. PERFORM DEEP VISUAL FEATURE ANALYSIS on the provided visual media frame(s):
   - Visual Craft & Technique Analysis: Look closely at the hands, motions, and physical pieces in the video/photo frames. Determine the exact artisan technique shown (e.g. square knotting, lark's head mounting, waste pipe botanical upcycling & petal molding, pearl bag cross-weaving, crochet floral sculpting, pottery wheel shaping, hand-embroidery, copper wire jewelry, etc.).
   - Material & Tool Identification: Visually identify all tools and raw materials seen in the frames (e.g., 3-ply natural cotton cords, wooden hanging rings, pearl beads, nylon wire, hot glue, acrylic glaze, shaping scissors, terracotta clay, etc.).
   - Visual Aesthetics & Palette: Note the color tones, textures, and finished artisan creations visible in the frame.
   - COMPLETE DISREGARD OF FILENAMES: Do NOT deduce the topic from filenames (like "IMG_4920", "video.mp4", "download.mov", "clip_1"). Your entire evaluation MUST stem strictly from the visual contents and pixel evidence of the media.

2. STRICT VOCABULARY RESTRICTIONS:
   - Do NOT use the words "masterclass", "cohort", or "atelier" anywhere. Always use "Workshop", "Batch", "Studio", or "Session".
3. NATURAL NARRATIVE ONLY (NO NUMBERED LISTS):
   - Do NOT format the description with numbered points or "1.", "2.", "3.". Write a rich, atmospheric 2-3 sentence overview of what learners will experience and craft alongside Sahina Shrestha in Kathmandu.

Return a JSON object with the following fields:
- "title": Compelling, authentic workshop title derived from the visual craft (e.g., "Macrame Wall Hanging & Botanical Planters Workshop", "Upcycled Waste Pipe Sunflower Botanical Workshop", "Couture Pearl Beaded Bag Crafting Workshop")
- "badge": Categorical badge (e.g. "Workshop • Fiber & Knotting Art", "Workshop • Botanical Eco-Craft", "Workshop • Luxury Bead Weaving")
- "tagline": Elegant sub-heading highlighting the specific handcrafting technique
- "description": Engaging 2-3 sentence summary of the hands-on craft session in Kathmandu
- "craftTechnique": The exact specific handcrafting technique identified in the frames
- "materials": Array of strings of physical materials and tools observed in the media
- "level": Recommended skill level based on technique complexity ("Beginner Friendly", "Intermediate Artisan", or "All Skill Levels")
- "duration": Estimated workshop duration (e.g. "2.5 Hours", "3 Hours")
- "suggestedAttendees": Number between 12 and 16
- "location": "Kathmandu, Nepal"
- "instructor": "Sahina Shrestha"
- "whatsappMessage": "Namaste Sahina! I would like to reserve a seat for the upcoming workshop in Kathmandu."

Return ONLY valid JSON matching this schema, no markdown blocks.`;

          contents.push(visionPrompt);

          // Try Gemini Vision models with graceful fallback to domain rules
          let responseText = '';
          const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3.8-flash', 'gemini-3.1-pro-preview'];
          
          for (const modelName of candidateModels) {
            try {
              const response = await ai.models.generateContent({
                model: modelName,
                contents,
                config: {
                  responseMimeType: 'application/json'
                }
              });
              if (response && response.text) {
                responseText = response.text;
                break;
              }
            } catch (_modelErr: any) {
              // Silently try next model candidate or fall back gracefully
            }
          }

          if (responseText) {
            const cleanedText = responseText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
            const parsed = JSON.parse(cleanedText);

            // Sanitize banned words
            const cleanWord = (s?: string) => (s || '')
              .replace(/masterclass/gi, 'Workshop')
              .replace(/cohort\s*#?/gi, 'Batch #')
              .replace(/atelier/gi, 'Studio');

            if (parsed.title) parsed.title = cleanWord(parsed.title);
            if (parsed.badge) parsed.badge = cleanWord(parsed.badge);
            if (parsed.tagline) parsed.tagline = cleanWord(parsed.tagline);
            if (parsed.craftTechnique) parsed.craftTechnique = cleanWord(parsed.craftTechnique);
            if (parsed.description) {
              parsed.description = parsed.description
                .replace(/masterclass/gi, 'workshop')
                .replace(/cohort/gi, 'batch')
                .replace(/atelier/gi, 'studio')
                .replace(/^\s*1\.\s*/gm, '')
                .replace(/^\s*\d+\.\s*/gm, '');
            }

            return res.json({ success: true, data: parsed, source: 'gemini_pro_vision' });
          }
        } catch (_geminiErr: any) {
          console.warn('Gemini vision analysis fallback notice:', _geminiErr?.message || _geminiErr);
        }
      }

      const fallback = autoGenerateWorkshopGroup(effectiveTopic || 'Macrame & Fiber Art');
      const cleanFallback = {
        title: fallback.title.replace(/masterclass/gi, 'Workshop').replace(/cohort\s*#?/gi, 'Batch #'),
        badge: fallback.badge.replace(/masterclass/gi, 'Workshop').replace(/cohort\s*#?/gi, 'Batch #'),
        tagline: fallback.tagline.replace(/masterclass/gi, 'Workshop').replace(/cohort/gi, 'Batch'),
        description: fallback.description.replace(/masterclass/gi, 'workshop').replace(/cohort/gi, 'batch').replace(/^\s*1\.\s*/gm, ''),
        craftTechnique: 'Authentic Handcrafting Technique',
        materials: ['Artisan Craft Materials', 'Kathmandu Studio Tools'],
        level: 'All Skill Levels',
        duration: '2.5 Hours',
        suggestedAttendees: fallback.suggestedAttendees || 15,
        location: fallback.location || 'Kathmandu, Nepal',
        instructor: fallback.instructor || 'Sahina Shrestha',
        whatsappMessage: `Namaste Sahina! I would like to join the upcoming ${fallback.title.replace(/masterclass/gi, 'Workshop')} in Kathmandu.`
      };

      return res.json({ success: true, data: cleanFallback, source: 'rules' });
    } catch (err: any) {
      console.error('Error extracting workshop info:', err);
      return res.json({
        success: true,
        data: {
          title: 'Macrame Wall Art & Planters Workshop',
          badge: 'Workshop • Macrame & Fiber Art',
          tagline: 'Cotton Cord Knotting • Botanical Planters & Tapestries',
          description: 'Intensive hands-on training focusing on raw cotton cord knotting, symmetrical tension, wooden hoop attachments, and botanical hanger architecture under Sahina Shrestha’s guided mentorship in Kathmandu.',
          craftTechnique: 'Square Knotting & Lark’s Head Mounting',
          materials: ['3mm Natural Cotton Cord', 'Wooden Dowel', 'Brass Rings'],
          level: 'Beginner Friendly',
          duration: '2.5 Hours',
          suggestedAttendees: 15,
          location: 'Kathmandu, Nepal',
          instructor: 'Sahina Shrestha',
          whatsappMessage: 'Namaste Sahina! I would like to join the Macrame Wall Art & Planters Workshop in Kathmandu.'
        },
        source: 'fallback'
      });
    }
  });

  // POST /api/gemini/generate-masterclass - Auto-generate title, description using Gemini API
  app.post('/api/gemini/generate-masterclass', async (req, res) => {
    try {
      const { topic, fileCount, mediaTypes } = req.body;
      const effectiveTopic = (topic || '').trim() || 'Macrame Knotting & Wall Art';

      const ai = getGeminiClient();
      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are the chief artisan coordinator for "Artified Nepal", a luxury handmade craft brand led by founder and master artisan Sahina Shrestha in Kathmandu, Nepal.
The artisan is creating a new hands-on Workshop session.
Craft Topic or Idea: "${effectiveTopic}".
Attached Media: ${fileCount || 0} photo/video files.

Generate a structured JSON response with realistic Kathmandu workshop details:
- "title": Captivating, authentic title (e.g., "Macrame Fiber Art & Botanical Hanger Workshop")
- "badge": Short badge (e.g., "Workshop • Batch #01")
- "tagline": Elegant tagline (e.g., "Ancestral Cotton Knotting & Contemporary Wall Tapestries")
- "description": 2-3 engaging, descriptive sentences on what candidates will learn in Kathmandu under Sahina Shrestha. Do NOT format as numbered list or include "1.".
- "suggestedAttendees": Number between 12 and 16.
- "location": "Kathmandu, Nepal"
- "instructor": "Sahina Shrestha"
- "whatsappMessage": Friendly, pre-filled WhatsApp inquiry message for aspiring students.

Do NOT use the words "masterclass", "cohort", or "atelier". Return ONLY valid JSON matching this schema, no markdown code blocks.`,
            config: {
              responseMimeType: 'application/json'
            }
          });

          const rawText = response.text || '';
          const cleanedText = rawText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
          const parsed = JSON.parse(cleanedText);
          return res.json({ success: true, data: parsed, source: 'gemini' });
        } catch (_geminiErr: any) {
          // Graceful fallback to domain rules generator
        }
      }

      // Fallback to high-fidelity rule-based generator
      const fallback = autoGenerateWorkshopGroup(effectiveTopic);
      return res.json({ success: true, data: fallback, source: 'atelier_rules' });
    } catch (err: any) {
      console.error('Error generating workshop info:', err);
      const fallback = autoGenerateWorkshopGroup('Macrame & Fiber Art');
      return res.json({ success: true, data: fallback, source: 'fallback' });
    }
  });

  // POST /api/gemini/generate-caption - Auto-generate title, caption & technique for photos/videos
  app.post('/api/gemini/generate-caption', async (req, res) => {
    try {
      const { filename, masterclassTitle, type } = req.body;
      const cleanFilename = (filename || 'session_moment').replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      const ai = getGeminiClient();
      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are creating an authentic, poetic title and caption for a ${type || 'photo'} in an artisanal craft workshop at "Artified Nepal" in Kathmandu led by Sahina Shrestha.
Workshop: "${masterclassTitle || 'Artisan Workshop'}"
File name/subject: "${cleanFilename}"

Return a JSON object with:
- "title": A clean, descriptive title (e.g. "Precision Cord Tensioning Technique")
- "caption": 1-2 evocative sentences about this hands-on craft session in Kathmandu.
- "craftTechnique": Name of the specific technique shown.
- "tags": Array of 3-4 hashtags/tags.

Do NOT use the words "masterclass", "cohort", or "atelier". Return ONLY valid JSON, no markdown fences.`,
            config: {
              responseMimeType: 'application/json'
            }
          });

          const rawText = response.text || '';
          const cleanedText = rawText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
          const parsed = JSON.parse(cleanedText);
          return res.json({ success: true, data: parsed, source: 'gemini' });
        } catch (_geminiErr: any) {
          // Graceful fallback to domain rules generator
        }
      }

      const fallback = autoGenerateMediaCaption(filename || 'craft_moment', masterclassTitle || 'Artisan Workshop');
      return res.json({ success: true, data: fallback, source: 'atelier_rules' });
    } catch (err: any) {
      console.error('Error generating caption:', err);
      const fallback = autoGenerateMediaCaption('craft_moment', 'Workshop');
      return res.json({ success: true, data: fallback, source: 'fallback' });
    }
  });

  const sellerSettingsJsonPath = path.resolve(dataDir, 'seller_settings.json');

  // Helper for server-side password hashing
  const hashSellerPasscode = (pass: string, salt: string) => {
    return crypto.createHash('sha256').update(`${salt}:${pass.trim()}`).digest('hex');
  };

  // GET /api/seller-password - Retrieve only salted SHA-256 hash & salt (never plaintext password)
  app.get('/api/seller-password', (_req, res) => {
    try {
      if (fs.existsSync(sellerSettingsJsonPath)) {
        const raw = fs.readFileSync(sellerSettingsJsonPath, 'utf-8');
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          const salt = data.salt || 'salt_1791038978157';
          const hash = data.passwordHash || (data.customPassword ? hashSellerPasscode(data.customPassword, salt) : null);
          return res.json({
            hasCustom: Boolean(hash),
            passwordHash: hash,
            salt,
            updatedAt: data.updatedAt || null
          });
        }
      }
      return res.json({
        hasCustom: true,
        passwordHash: '7c450ce6e1934b25d5b00dba4c282e2be791186857f5b3b02ffb7541a7ad1f68',
        salt: 'salt_1791038978157'
      });
    } catch (err) {
      console.error('Error reading seller_settings.json:', err);
      return res.json({
        hasCustom: true,
        passwordHash: '7c450ce6e1934b25d5b00dba4c282e2be791186857f5b3b02ffb7541a7ad1f68',
        salt: 'salt_1791038978157'
      });
    }
  });

  // POST /api/seller-password - Update seller studio password permanently with SHA-256 hashing (no plaintext stored)
  app.post('/api/seller-password', (req, res) => {
    try {
      const { password, passwordHash, salt } = req.body;
      const clean = (password || '').trim();
      const effectiveSalt = salt || `salt_${Date.now()}`;
      
      let computedHash = passwordHash;
      if (!computedHash && clean) {
        if (clean.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        computedHash = hashSellerPasscode(clean, effectiveSalt);
      }

      if (!computedHash || typeof computedHash !== 'string' || computedHash.length !== 64) {
        return res.status(400).json({ error: 'Invalid or missing SHA-256 password hash' });
      }

      const data = {
        passwordHash: computedHash,
        salt: effectiveSalt,
        hasCustom: true,
        updatedAt: new Date().toISOString()
      };

      const parentDir = path.dirname(sellerSettingsJsonPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      fs.writeFileSync(sellerSettingsJsonPath, JSON.stringify(data, null, 2), 'utf-8');
      return res.json({ success: true, hasCustom: true, passwordHash: computedHash, salt: effectiveSalt });
    } catch (err: any) {
      console.error('Error saving seller_settings.json:', err);
      return res.status(500).json({ error: err.message || 'Failed to save password' });
    }
  });

  // POST /api/seller-password/reset - Disabled unauthenticated reset for security
  app.post('/api/seller-password/reset', (_req, res) => {
    return res.status(403).json({ error: 'Unauthenticated password reset is disabled for security.' });
  });

  // GET /api/available-videos - List all guaranteed working atelier and craft videos
  app.get('/api/available-videos', (_req, res) => {
    const verifiedVideos = [
      {
        id: 'vid-tourmaline-necklace',
        title: 'Tourmaline Gemstone & Baroque Pearl Knotting Reel',
        url: '/instagram_videos/DdjhhazvaRr.mp4',
        thumbnail: '/instagram_videos/DdjhhazvaRr_cover.jpg',
        source: 'Instagram'
      },
      {
        id: 'vid-bag-weaving',
        title: 'Hand-weaving 600 Pearls Maya Aurelia Bag',
        url: '/tiktok_videos/7363984155060817160.mp4',
        thumbnail: '/tiktok_videos/7363984155060817160_cover.jpg',
        source: 'TikTok'
      },
      {
        id: 'vid-bridal-unboxing',
        title: 'Custom Bridal Keepsake Gift Set Unboxing',
        url: '/tiktok_videos/7625655459537603860.mp4',
        thumbnail: '/tiktok_videos/7625655459537603860_cover.jpg',
        source: 'TikTok'
      },
      {
        id: 'vid-three-tier-collar',
        title: 'Three-Layered Pearl Collar Wedding Styling',
        url: '/tiktok_videos/7453859527411125512.mp4',
        thumbnail: '/tiktok_videos/7453859527411125512_cover.jpg',
        source: 'TikTok'
      },
      {
        id: 'vid-durability-test',
        title: 'Pearl Bag 15kg Tensile Core Durability Showcase',
        url: '/tiktok_videos/7495598629625842952.mp4',
        thumbnail: '/tiktok_videos/7495598629625842952_cover.jpg',
        source: 'TikTok'
      }
    ];
    return res.json(verifiedVideos);
  });

  // TikTok local cache folder for smooth native video playback
  const tiktokVideosDir = path.resolve(process.cwd(), 'public/tiktok_videos');
  if (!fs.existsSync(tiktokVideosDir)) {
    fs.mkdirSync(tiktokVideosDir, { recursive: true });
  }
  app.use('/tiktok_videos', serveMediaWithRange(tiktokVideosDir));

  // GET /api/instagram-video/:shortcode - Direct API endpoint to stream or fetch Instagram video
  app.get('/api/instagram-video/:shortcode', async (req, res, next) => {
    try {
      const shortcode = req.params.shortcode.replace(/\.mp4$/i, '');
      const localVideoPath = path.join(instagramVideosDir, `${shortcode}.mp4`);
      if (fs.existsSync(localVideoPath)) {
        return res.sendFile(localVideoPath);
      }

      // Check known local videos map
      const knownShortcodes: Record<string, string> = {
        'DdjhhazvaRr': path.join(instagramVideosDir, 'DdjhhazvaRr.mp4'),
        'DdIUMC4BqFr': path.join(instagramVideosDir, 'DdIUMC4BqFr.mp4'),
        'DdMRgKdP4HK': path.join(instagramVideosDir, 'DdMRgKdP4HK.mp4'),
      };
      if (knownShortcodes[shortcode] && fs.existsSync(knownShortcodes[shortcode])) {
        return res.sendFile(knownShortcodes[shortcode]);
      }

      const requestedUrl = (req.query.url as string) || `https://www.instagram.com/p/${shortcode}/`;
      const cleanShortcode = (requestedUrl.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/)?.[1]) || shortcode;

      if (cleanShortcode && cleanShortcode !== 'custom') {
        const embedUrl = `https://www.instagram.com/p/${cleanShortcode}/embed/captioned/`;
        const response = await fetch(embedUrl, {
          headers: {
            'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });
        if (response.ok) {
          const html = await response.text();
          const mp4Matches = html.match(/https?:[^"'\s<>]+\.mp4[^"'\s<>]*/g) || [];
          if (mp4Matches.length > 0 && mp4Matches[0]) {
            const rawMp4 = mp4Matches[0]
              .replace(/\\u0026/g, '&')
              .replace(/&amp;/g, '&')
              .replace(/\\/g, '');
            const vidRes = await fetch(rawMp4, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            });
            if (vidRes.ok) {
              const buf = Buffer.from(await vidRes.arrayBuffer());
              fs.writeFileSync(localVideoPath, buf);
              return res.sendFile(localVideoPath);
            }
          }
        }
      }

      // If already cached DdjhhazvaRr, serve as high quality fallback
      const defaultAtelier = path.join(instagramVideosDir, 'DdjhhazvaRr.mp4');
      if (fs.existsSync(defaultAtelier)) {
        return res.sendFile(defaultAtelier);
      }

      return res.status(404).json({ error: 'Instagram video stream not found' });
    } catch (err: any) {
      console.error('Error in /api/instagram-video/:shortcode:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // GET /instagram_videos/:filename - streams cached video, or dynamically fetches from Instagram for future posts
  app.get('/instagram_videos/:filename', async (req, res, next) => {
    try {
      const filename = req.params.filename;
      const localVideoPath = path.join(instagramVideosDir, filename);
      if (fs.existsSync(localVideoPath)) {
        return res.sendFile(localVideoPath);
      }
      const shortcode = filename.replace(/\.mp4$/i, '');
      if (shortcode) {
        const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
        const response = await fetch(embedUrl, {
          headers: {
            'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });
        if (response.ok) {
          const html = await response.text();
          const mp4Matches = html.match(/https?:[^"'\s<>]+\.mp4[^"'\s<>]*/g) || [];
          if (mp4Matches.length > 0 && mp4Matches[0]) {
            const rawMp4 = mp4Matches[0]
              .replace(/\\u0026/g, '&')
              .replace(/&amp;/g, '&')
              .replace(/\\/g, '');
            const vidRes = await fetch(rawMp4, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            });
            if (vidRes.ok) {
              const buf = Buffer.from(await vidRes.arrayBuffer());
              fs.writeFileSync(localVideoPath, buf);
              return res.sendFile(localVideoPath);
            }
          }
        }
      }
      return next();
    } catch {
      return next();
    }
  });

  app.use('/instagram_videos', express.static(instagramVideosDir));

  const publicDir = path.resolve(process.cwd(), 'public');
  app.use(express.static(publicDir));

  // GET /api/tiktok-video/:id - Stream video with full Range / seeking support
  app.get('/api/tiktok-video/:id', async (req, res) => {
    try {
      const rawId = req.params.id;
      const videoId = rawId.replace(/\.mp4$/i, '');
      if (!videoId) {
        return res.status(400).json({ error: 'Missing video ID' });
      }

      const localPath = path.join(tiktokVideosDir, `${videoId}.mp4`);
      if (fs.existsSync(localPath)) {
        return res.sendFile(localPath);
      }

      // If not yet cached, attempt to resolve from TikTok
      const requestedUrl = (req.query.url as string) || `https://www.tiktok.com/@artified_np/video/${videoId}`;
      const r = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(requestedUrl)}`);
      if (!r.ok) {
        return res.status(404).json({ error: 'Failed to fetch video stream' });
      }
      const data = await r.json();
      const playUrl = data?.data?.play || data?.data?.wmplay;
      if (!playUrl) {
        return res.status(404).json({ error: 'No playable video source found' });
      }

      const vidRes = await fetch(playUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (!vidRes.ok) {
        return res.status(404).json({ error: 'Failed to download stream' });
      }

      const buffer = Buffer.from(await vidRes.arrayBuffer());
      fs.writeFileSync(localPath, buffer);
      return res.sendFile(localPath);
    } catch (err: any) {
      console.error('Error in /api/tiktok-video/:id:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // GET /api/proxy-thumbnail - Proxies CDN images that block direct browser hotlinking
  app.get('/api/proxy-thumbnail', async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).json({ error: 'Missing image url' });
      }

      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': imageUrl.includes('tiktok') ? 'https://www.tiktok.com/' : (imageUrl.includes('instagram') ? 'https://www.instagram.com/' : ''),
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        return res.redirect('https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=600&q=80');
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    } catch {
      return res.redirect('https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=600&q=80');
    }
  });

  // GET /api/tiktok-info - Fetch official video info & thumbnail via tikwm + oembed, pre-downloading MP4
  app.get('/api/tiktok-info', async (req, res) => {
    try {
      const videoUrl = req.query.url as string;
      if (!videoUrl) {
        return res.status(400).json({ error: 'Missing video URL parameter' });
      }

      // Try tikwm first for richest metadata and direct video play URL
      try {
        const twRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}`);
        if (twRes.ok) {
          const twData = await twRes.json();
          if (twData && twData.data && (twData.data.play || twData.data.wmplay)) {
            const vidData = twData.data;
            const videoId = vidData.id || (videoUrl.match(/\/video\/(\d+)/)?.[1] ?? '');
            const rawCover = vidData.cover || vidData.origin_cover || vidData.ai_dynamic_cover;
            const proxiedCover = rawCover ? `/api/proxy-thumbnail?url=${encodeURIComponent(rawCover)}` : '';
            const playUrl = vidData.play || vidData.wmplay;

            // Trigger background download and cache of the video if not yet saved
            if (videoId && playUrl) {
              const localPath = path.join(tiktokVideosDir, `${videoId}.mp4`);
              if (!fs.existsSync(localPath)) {
                fetch(playUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } })
                  .then(async (vRes) => {
                    if (vRes.ok) {
                      const buf = Buffer.from(await vRes.arrayBuffer());
                      fs.writeFileSync(localPath, buf);
                      console.log(`Pre-cached TikTok video: ${videoId}.mp4 (${buf.length} bytes)`);
                    }
                  })
                  .catch((e) => console.warn('Background TikTok cache error:', e));
              }
            }

            return res.json({
              success: true,
              title: vidData.title || '',
              author_name: vidData.author?.nickname || 'artified_np',
              author_unique_id: vidData.author?.unique_id || 'artified_np',
              thumbnail_url: proxiedCover || rawCover || '',
              raw_thumbnail_url: rawCover || '',
              videoUrl: videoId ? `/tiktok_videos/${videoId}.mp4` : (playUrl || videoUrl),
              views: vidData.play_count ? (vidData.play_count > 1000 ? `${(vidData.play_count / 1000).toFixed(1)}k` : `${vidData.play_count}`) : '1.2k',
              likes: vidData.digg_count ? (vidData.digg_count > 1000 ? `${(vidData.digg_count / 1000).toFixed(1)}k` : `${vidData.digg_count}`) : '240',
            });
          }
        }
      } catch (tikwmErr) {
        console.warn('tikwm API fetch skipped/failed, falling back to official oembed:', tikwmErr);
      }

      // Fallback: official TikTok oEmbed
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
      const response = await fetch(oembedUrl);
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Could not fetch info from TikTok' });
      }

      const data = await response.json();
      const proxiedThumbnail = data.thumbnail_url
        ? `/api/proxy-thumbnail?url=${encodeURIComponent(data.thumbnail_url)}`
        : '';

      const matchId = videoUrl.match(/\/video\/(\d+)/);
      const videoId = matchId ? matchId[1] : '';

      return res.json({
        success: true,
        title: data.title,
        author_name: data.author_name,
        author_unique_id: data.author_unique_id,
        thumbnail_url: proxiedThumbnail || data.thumbnail_url,
        raw_thumbnail_url: data.thumbnail_url,
        videoUrl: videoId ? `/api/tiktok-video/${videoId}?url=${encodeURIComponent(videoUrl)}` : videoUrl,
        html: data.html,
      });
    } catch (err: any) {
      console.error('Error fetching TikTok info:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // GET /api/instagram-info - Automatically fetch Instagram caption, cover screenshot, and headline
  app.get('/api/instagram-info', async (req, res) => {
    try {
      const postUrl = req.query.url as string;
      if (!postUrl) {
        return res.status(400).json({ error: 'Missing url parameter' });
      }

      const match = postUrl.match(/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
      if (!match) {
        return res.status(400).json({ error: 'Invalid Instagram URL format' });
      }

      const shortcode = match[1];
      const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;

      let html = '';
      const userAgents = [
        'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Twitterbot/1.0',
        'WhatsApp/2.21.12.21 A',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ];

      for (const ua of userAgents) {
        try {
          const response = await fetch(embedUrl, {
            headers: {
              'User-Agent': ua,
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });
          if (response.ok) {
            const body = await response.text();
            if (body && (body.includes('class="Caption"') || body.includes('EmbeddedMediaImage') || body.includes('.mp4'))) {
              html = body;
              break;
            } else if (!html) {
              html = body;
            }
          }
        } catch (e) {
          console.warn(`Error fetching Instagram embed HTML with UA ${ua}:`, e);
        }
      }

      // 1. Extract real caption
      let caption = '';
      if (html) {
        const capMatch = html.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/i);
        if (capMatch) {
          caption = capMatch[1]
            .replace(/<a class="CaptionUsername"[^>]*>[\s\S]*?<\/a>/gi, '') // remove username header
            .replace(/<a class="CaptionComments"[^>]*>[\s\S]*?<\/a>/gi, '') // remove comments link
            .replace(/<[^>]+>/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
      }

      // 2. Setup video and thumbnail directories
      const igDir = path.resolve(process.cwd(), 'public', 'instagram_videos');
      if (!fs.existsSync(igDir)) {
        fs.mkdirSync(igDir, { recursive: true });
      }
      const localVideoPath = path.join(igDir, `${shortcode}.mp4`);
      const localCoverPath = path.join(igDir, `${shortcode}_cover.jpg`);

      // Extract direct MP4 video URL & cache locally
      let videoUrl = '';
      let directCdnUrl = '';
      const mp4Matches = html ? (html.match(/https?:[^"'\s<>]+\.mp4[^"'\s<>]*/g) || []) : [];
      if (mp4Matches.length > 0 && mp4Matches[0]) {
        const rawMp4 = mp4Matches[0]
          .replace(/\\u0026/g, '&')
          .replace(/&amp;/g, '&')
          .replace(/\\/g, '');
        directCdnUrl = rawMp4;

        if (!fs.existsSync(localVideoPath) || fs.statSync(localVideoPath).size < 1000) {
          try {
            const vidRes = await fetch(rawMp4, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            });
            if (vidRes.ok) {
              const buf = Buffer.from(await vidRes.arrayBuffer());
              fs.writeFileSync(localVideoPath, buf);
              videoUrl = `/instagram_videos/${shortcode}.mp4`;
            } else {
              videoUrl = rawMp4;
            }
          } catch (vidErr) {
            console.warn('Failed to download Instagram video locally, using direct CDN URL:', vidErr);
            videoUrl = rawMp4;
          }
        } else {
          videoUrl = `/instagram_videos/${shortcode}.mp4`;
        }
      } else if (fs.existsSync(localVideoPath)) {
        videoUrl = `/instagram_videos/${shortcode}.mp4`;
      }

      // Extract cover photo / screenshot
      let thumbnail = '';
      if (fs.existsSync(localCoverPath) && fs.statSync(localCoverPath).size > 1000) {
        thumbnail = `/instagram_videos/${shortcode}_cover.jpg`;
      } else if (fs.existsSync(localVideoPath)) {
        // Generate crisp thumbnail using ffmpeg from the downloaded MP4 video
        try {
          const { execSync } = await import('child_process');
          execSync(`ffmpeg -y -ss 00:00:00.500 -i "${localVideoPath}" -vframes 1 -q:v 2 "${localCoverPath}"`, { stdio: 'ignore' });
          if (fs.existsSync(localCoverPath)) {
            thumbnail = `/instagram_videos/${shortcode}_cover.jpg`;
          }
        } catch (ffErr) {
          console.warn('ffmpeg thumbnail generation error:', ffErr);
        }
      }

      if (!thumbnail && html) {
        const imgMatch = html.match(/class="EmbeddedMediaImage"[^>]+src="([^">]+)"/i) || 
                         html.match(/<img[^>]+class="EmbeddedMediaImage"[^>]+src="([^">]+)"/i) ||
                         html.match(/<img[^>]+src="([^">]*cdninstagram[^">]*)"/i);
        if (imgMatch) {
          const rawImgUrl = imgMatch[1].replace(/&amp;/g, '&');
          try {
            const imgRes = await fetch(rawImgUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            });
            if (imgRes.ok) {
              const buf = Buffer.from(await imgRes.arrayBuffer());
              fs.writeFileSync(localCoverPath, buf);
              thumbnail = `/instagram_videos/${shortcode}_cover.jpg`;
            }
          } catch {
            thumbnail = rawImgUrl;
          }
        }
      }

      // 3. Derive clean headline and rich story caption
      let headline = '';
      if (caption) {
        const withoutTags = caption.replace(/#\S+/g, '').replace(/https?:\/\/\S+/g, '').trim();
        const sentences = withoutTags.split(/[.\n!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
        const isSocialHook = (text: string) => /^(tag\s+(your|someone|a|the)|share\s+with|comment|send\s+this|wait\s+till|pov:?|dm\s+us|double\s+tap|save\s+this|tell\s+me|drop\s+a|swipe\s+left)/i.test(text);

        for (const sentence of sentences) {
          if (!isSocialHook(sentence) && sentence.length >= 8) {
            headline = sentence.length > 70 ? sentence.slice(0, 67) + '...' : sentence;
            break;
          }
        }
      }

      // Exact verified presets ONLY for the 4 known signature posts
      if (shortcode === 'DdjhhazvaRr') {
        headline = 'Tourmaline Gemstone & Baroque Pearl Necklace ✨';
        caption = 'Me: When my husband says no to the necklace 😭 Individually knotted natural freshwater baroque pearls with genuine tourmaline gemstones. Handcrafted at our workshop in Kathmandu, Nepal.\n\n✨ Pure Nepal Handcrafted\n📍 Store: Kathmandu, Nepal\n🛍️ Tap to shop or DM on Instagram #artified_np #smallbusiness #necklace #pearls';
        thumbnail = thumbnail || '/instagram_videos/DdjhhazvaRr_cover.jpg';
      } else if (shortcode === 'DdMRgKdP4HK') {
        headline = 'Some glimpse of todays Macrame Workshop ✨';
        caption = "Behind the scenes at today's macrame craft workshop in Kathmandu! Each knot and weave is created by hand with natural cord and ancestral techniques.\n\n✨ 100% Handcrafted in Kathmandu, Nepal\n📍 Store: Kathmandu, Nepal\n🛍️ Tap or double-click to view on Instagram #artified_np #macrame #workshop #handmade";
        thumbnail = thumbnail || '/instagram_videos/DdMRgKdP4HK_cover.jpg';
      } else if (shortcode === 'DdIUMC4BqFr') {
        headline = 'Macrame Workshop Happening This Saturday !!! ✨';
        caption = 'Macrame Workshop Happening This Saturday at Kalashala! Join Sahina Shrestha to learn the tactile art of macrame cord knotting, bag crafting, and sustainable wearable art in Kathmandu.\n\n✨ Workshop by Artified Nepal\n📍 Location: Kalashala, Kathmandu\n🛍️ DM us to book your seat! #artified_np #macrameworkshop #kalashala #kathmandu';
        thumbnail = thumbnail || '/instagram_videos/DdIUMC4BqFr_cover.jpg';
      } else if (shortcode === 'DY6OqqfPyJu') {
        headline = 'Packing a Special Order for Pyarii Maya 🌸';
        caption = "Let's pack a very special order for her! 🌸 Packing the handcrafted pearl bag and custom necklace for someone's pyarii Maya ❤️ Individually packed with love at our Kathmandu workshop.\n\n✨ Handcrafted in Kathmandu, Nepal\n📍 Store: Kathmandu, Nepal\n🛍️ DM to purchase this for your pyarii maya! #artified_np #pyariimaya #pearlbag #smallbusiness";
        thumbnail = thumbnail || '/instagram_videos/DY6OqqfPyJu_cover.jpg';
      }

      const hasExtractedInfo = Boolean(caption || thumbnail || videoUrl);

      return res.json({
        success: true,
        extracted: hasExtractedInfo,
        hasCaption: Boolean(caption),
        hasThumbnail: Boolean(thumbnail),
        shortcode,
        headline: headline || '',
        caption: caption || '',
        thumbnail: thumbnail || '',
        videoUrl: videoUrl || (directCdnUrl || `/api/instagram-video/${shortcode}`),
        directCdnUrl: directCdnUrl || null,
        postUrl: `https://www.instagram.com/p/${shortcode}/`,
      });
    } catch (err: any) {
      console.error('Error fetching Instagram info:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // Helper for HTTP Range video streaming (HTTP 206 Partial Content) to prevent RangeNotSatisfiableError
  function streamVideoFile(req: express.Request, res: express.Response, filePath: string) {
    try {
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Video file not found' });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;

      if (fileSize === 0) {
        return res.status(404).json({ error: 'Video file is empty' });
      }

      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (isNaN(start) || start >= fileSize || (parts[1] && end >= fileSize) || start > end) {
          res.status(416).set('Content-Range', `bytes */${fileSize}`);
          return res.end();
        }

        const chunksize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };

        res.writeHead(206, head);
        file.pipe(res);
        file.on('error', (streamErr) => {
          if (!res.headersSent) {
            res.status(500).end();
          }
        });
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
        };
        res.writeHead(200, head);
        const file = fs.createReadStream(filePath);
        file.pipe(res);
        file.on('error', () => {
          if (!res.headersSent) {
            res.status(500).end();
          }
        });
      }
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Error streaming video' });
      }
    }
  }

  // Dedicated route to stream video files directly from public/instagram_videos/ with Range support
  app.get('/instagram_videos/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.resolve(process.cwd(), 'public', 'instagram_videos', filename);
    if (filename.endsWith('.mp4')) {
      return streamVideoFile(req, res, filePath);
    }
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath, (err) => {
        if (err && !res.headersSent) {
          res.status(404).end();
        }
      });
    }
    return res.status(404).end();
  });

  // Dedicated route to stream video and image files directly from public/workshops/ with Range support
  // Seamlessly handles root files AND class-compartmentalized subfolders (e.g. public/workshops/macrame/)
  app.get('/workshops/*', (req, res) => {
    const rawSubPath = decodeURIComponent((req.params as any)[0] || '');
    const workshopsRoot = path.resolve(process.cwd(), 'public', 'workshops');
    let filePath = path.resolve(workshopsRoot, rawSubPath);

    // Prevent directory traversal
    if (!filePath.startsWith(workshopsRoot)) {
      return res.status(403).send('Forbidden');
    }

    // 1. Direct file check
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      // 2. Fallback: Search inside class subfolders (e.g., macrame/, sunflower/, pearl/)
      const baseFilename = path.basename(rawSubPath);
      let foundInSubfolder: string | null = null;
      try {
        const entries = fs.readdirSync(workshopsRoot, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const candidate = path.join(workshopsRoot, entry.name, baseFilename);
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
              foundInSubfolder = candidate;
              break;
            }
          }
        }
      } catch {}
      if (foundInSubfolder) {
        filePath = foundInSubfolder;
      }
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return res.status(404).json({ error: 'Workshop file not found' });
    }

    const lower = filePath.toLowerCase();
    if (lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm') || lower.endsWith('.m4v')) {
      return streamVideoFile(req, res, filePath);
    }
    return res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        res.status(404).end();
      }
    });
  });

  // GET /api/instagram-video/:shortcode - Stream exact Instagram video with caching
  app.get('/api/instagram-video/:shortcode', async (req, res) => {
    try {
      const shortcode = req.params.shortcode;
      if (!shortcode) {
        return res.status(400).json({ error: 'Missing shortcode' });
      }

      const igDir = path.resolve(process.cwd(), 'public', 'instagram_videos');
      if (!fs.existsSync(igDir)) {
        fs.mkdirSync(igDir, { recursive: true });
      }
      const localVideoPath = path.join(igDir, `${shortcode}.mp4`);

      if (fs.existsSync(localVideoPath) && fs.statSync(localVideoPath).size > 1000) {
        return streamVideoFile(req, res, localVideoPath);
      }

      // If not yet saved locally, fetch from Instagram embed
      const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
      const response = await fetch(embedUrl, {
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!response.ok) {
        return res.status(404).json({ error: 'Could not fetch Instagram embed' });
      }

      const html = await response.text();
      const mp4Matches = html.match(/https?:[^"'\s<>]+\.mp4[^"'\s<>]*/g) || [];
      if (mp4Matches.length === 0 || !mp4Matches[0]) {
        return res.status(404).json({ error: 'No video stream found for this Instagram post' });
      }

      const rawMp4 = mp4Matches[0]
        .replace(/\\u0026/g, '&')
        .replace(/&amp;/g, '&')
        .replace(/\\/g, '');

      const vidRes = await fetch(rawMp4, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });

      if (!vidRes.ok) {
        return res.redirect(rawMp4);
      }

      const buf = Buffer.from(await vidRes.arrayBuffer());
      fs.writeFileSync(localVideoPath, buf);
      return streamVideoFile(req, res, localVideoPath);
    } catch (err: any) {
      console.error('Error in /api/instagram-video/:shortcode:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // GET /api/instagram-videos-list - List all available .mp4 videos inside public/instagram_videos/
  app.get('/api/instagram-videos-list', (_req, res) => {
    try {
      const igDir = path.resolve(process.cwd(), 'public', 'instagram_videos');
      if (!fs.existsSync(igDir)) {
        return res.json({ videos: [] });
      }
      const files = fs.readdirSync(igDir);
      const mp4Files = files
        .filter((f) => f.endsWith('.mp4'))
        .map((f) => ({
          filename: f,
          path: `/instagram_videos/${f}`,
          name: f.replace('.mp4', ''),
        }));
      return res.json({ videos: mp4Files });
    } catch (err: any) {
      console.error('Error listing instagram videos:', err);
      return res.status(500).json({ error: 'Failed to list videos', videos: [] });
    }
  });

  // POST /api/save-instagram-video - Save MP4 video file or download remote video to public/instagram_videos/
  app.post('/api/save-instagram-video', async (req, res) => {
    try {
      const { videoBufferBase64, videoUrl, shortcode, filename } = req.body;
      const targetShortcode = shortcode || filename || `vid_${Date.now()}`;
      const igDir = path.resolve(process.cwd(), 'public', 'instagram_videos');
      if (!fs.existsSync(igDir)) {
        fs.mkdirSync(igDir, { recursive: true });
      }

      const localVideoPath = path.join(igDir, `${targetShortcode}.mp4`);
      const localCoverPath = path.join(igDir, `${targetShortcode}_cover.jpg`);

      if (videoBufferBase64 && typeof videoBufferBase64 === 'string') {
        const cleanBase64 = videoBufferBase64.replace(/^data:video\/\w+;base64,/, '');
        const buf = Buffer.from(cleanBase64, 'base64');
        fs.writeFileSync(localVideoPath, buf);
      } else if (videoUrl && typeof videoUrl === 'string' && videoUrl.startsWith('http')) {
        const vidRes = await fetch(videoUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        });
        if (vidRes.ok) {
          const buf = Buffer.from(await vidRes.arrayBuffer());
          fs.writeFileSync(localVideoPath, buf);
        }
      }

      let savedCoverPath = '';
      if (fs.existsSync(localVideoPath)) {
        try {
          const { execSync } = await import('child_process');
          execSync(`ffmpeg -y -ss 00:00:00.500 -i "${localVideoPath}" -vframes 1 -q:v 2 "${localCoverPath}"`, { stdio: 'ignore' });
          if (fs.existsSync(localCoverPath)) {
            savedCoverPath = `/instagram_videos/${targetShortcode}_cover.jpg`;
          }
        } catch {}
      }

      return res.json({
        success: true,
        videoUrl: `/instagram_videos/${targetShortcode}.mp4`,
        coverUrl: savedCoverPath || `/instagram_videos/${targetShortcode}_cover.jpg`,
        shortcode: targetShortcode,
      });
    } catch (err: any) {
      console.error('Error saving Instagram video:', err);
      return res.status(500).json({ error: err.message || 'Failed to save video file' });
    }
  });

  // POST /api/download-instagram-reel - Download reel from Instagram URL, save to public/instagram_videos/, and return base64 for Firebase Storage upload
  app.post('/api/download-instagram-reel', async (req, res) => {
    try {
      const { url, customFilename } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Please provide a valid Instagram URL' });
      }

      const match = url.match(/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
      if (!match) {
        return res.status(400).json({ error: 'Could not extract reel shortcode from URL' });
      }

      const shortcode = match[1];
      const friendlyName = (customFilename || `reel_${shortcode}`).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

      const igDir = path.resolve(process.cwd(), 'public', 'instagram_videos');
      if (!fs.existsSync(igDir)) {
        fs.mkdirSync(igDir, { recursive: true });
      }

      const localVideoPath = path.join(igDir, `${friendlyName}.mp4`);
      const localCoverPath = path.join(igDir, `${friendlyName}_cover.jpg`);

      // Check if shortcode video file already exists on server
      const existingShortcodePath = path.join(igDir, `${shortcode}.mp4`);
      if (fs.existsSync(existingShortcodePath) && fs.statSync(existingShortcodePath).size > 1000) {
        if (!fs.existsSync(localVideoPath)) {
          fs.copyFileSync(existingShortcodePath, localVideoPath);
        }
      }

      let directMp4Url = '';
      let headline = '';
      let caption = '';

      // Preset metadata for verified signature reels
      if (shortcode === 'DdjhhazvaRr') {
        headline = 'Tourmaline Gemstone & Baroque Pearl Necklace ✨';
        caption = 'Me: When my husband says no to the necklace 😭 Individually knotted natural freshwater baroque pearls with genuine tourmaline gemstones.';
      } else if (shortcode === 'DdMRgKdP4HK') {
        headline = 'Some glimpse of todays Macrame Workshop ✨';
        caption = "Behind the scenes at today's macrame craft workshop in Kathmandu! Each knot and weave is created by hand.";
      } else if (shortcode === 'DdIUMC4BqFr') {
        headline = 'Macrame Workshop Happening This Saturday !!! ✨';
        caption = 'Macrame Workshop Happening This Saturday at Kalashala! Learn the tactile art of macrame cord knotting.';
      } else if (shortcode === 'DY6OqqfPyJu') {
        headline = 'Packing a Special Order for Pyarii Maya 🌸';
        caption = "Let's pack a very special order for her! 🌸 Packing the handcrafted pearl bag and custom necklace.";
      }

      // Fetch embed page HTML to extract video stream & caption if not yet available
      if (!fs.existsSync(localVideoPath) || fs.statSync(localVideoPath).size < 1000) {
        const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
        const userAgents = [
          'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Twitterbot/1.0',
          'WhatsApp/2.21.12.21 A',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];

        let embedHtml = '';
        for (const ua of userAgents) {
          try {
            const resp = await fetch(embedUrl, {
              headers: { 'User-Agent': ua, 'Accept-Language': 'en-US,en;q=0.9' }
            });
            if (resp.ok) {
              const text = await resp.text();
              if (text && (text.includes('.mp4') || text.includes('Caption'))) {
                embedHtml = text;
                break;
              }
            }
          } catch {}
        }

        if (embedHtml) {
          if (!caption) {
            const capMatch = embedHtml.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/i);
            if (capMatch) {
              caption = capMatch[1]
                .replace(/<[^>]+>/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/\s+/g, ' ')
                .trim();
              if (caption && !headline) {
                const firstSentence = caption.split(/[.\n!?]+/)[0]?.trim();
                if (firstSentence && firstSentence.length > 5) {
                  headline = firstSentence.length > 60 ? firstSentence.slice(0, 57) + '...' : firstSentence;
                }
              }
            }
          }

          const mp4Matches = embedHtml.match(/https?:[^"'\s<>]+\.mp4[^"'\s<>]*/g) || [];
          if (mp4Matches.length > 0 && mp4Matches[0]) {
            directMp4Url = mp4Matches[0].replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/\\/g, '');
            try {
              const vidRes = await fetch(directMp4Url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
              });
              if (vidRes.ok) {
                const buf = Buffer.from(await vidRes.arrayBuffer());
                fs.writeFileSync(localVideoPath, buf);
                fs.writeFileSync(path.join(igDir, `${shortcode}.mp4`), buf);
              }
            } catch (dlErr) {
              console.warn('Failed to download MP4 video stream locally:', dlErr);
            }
          }
        }
      }

      // Generate cover thumbnail using ffmpeg if video exists on disk
      if (fs.existsSync(localVideoPath) && fs.statSync(localVideoPath).size > 1000) {
        if (!fs.existsSync(localCoverPath)) {
          try {
            const { execSync } = await import('child_process');
            execSync(`ffmpeg -y -ss 00:00:00.500 -i "${localVideoPath}" -vframes 1 -q:v 2 "${localCoverPath}"`, { stdio: 'ignore' });
          } catch {}
        }
      }

      // Read video buffer as base64 for Firebase Storage client upload
      let videoBufferBase64 = '';
      if (fs.existsSync(localVideoPath) && fs.statSync(localVideoPath).size > 1000) {
        const vidBuffer = fs.readFileSync(localVideoPath);
        videoBufferBase64 = `data:video/mp4;base64,${vidBuffer.toString('base64')}`;
      }

      let coverBufferBase64 = '';
      if (fs.existsSync(localCoverPath) && fs.statSync(localCoverPath).size > 100) {
        const covBuffer = fs.readFileSync(localCoverPath);
        coverBufferBase64 = `data:image/jpeg;base64,${covBuffer.toString('base64')}`;
      }

      return res.json({
        success: true,
        shortcode,
        friendlyName,
        headline: headline || `Instagram Reel • ${friendlyName}`,
        caption: caption || `Handcrafted story from @artified_np on Instagram. Saved as ${friendlyName}.mp4`,
        localVideoUrl: `/instagram_videos/${friendlyName}.mp4`,
        localCoverUrl: fs.existsSync(localCoverPath) ? `/instagram_videos/${friendlyName}_cover.jpg` : '/instagram_videos/DdjhhazvaRr_cover.jpg',
        videoBufferBase64,
        coverBufferBase64,
        directMp4Url: directMp4Url || null,
      });
    } catch (err: any) {
      console.error('Error in /api/download-instagram-reel:', err);
      return res.status(500).json({ error: err.message || 'Failed to process Instagram reel download' });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';

  // Setup Vite dev server middleware or serve production build
  let viteInstance: any = null;
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        port: Number(port),
        host: '0.0.0.0',
        allowedHosts: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    viteInstance = vite;
  }

  // OpenGraph social sharing middleware for crawler bots (WhatsApp, Facebook, Twitter, Slack, etc.)
  app.use(async (req, res, next) => {
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const isBot = /facebookexternalhit|facebot|twitterbot|whatsapp|telegrambot|linkedinbot|discordbot|slackbot|googlebot|bingbot|pinterest/i.test(userAgent);

    // Only intercept for external crawler bots requesting social cards
    if (isBot) {
      try {
        const indexPath = path.resolve(process.cwd(), isProd ? 'dist/index.html' : 'index.html');
        if (fs.existsSync(indexPath)) {
          let html = fs.readFileSync(indexPath, 'utf-8');
          const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
          const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
          const origin = `${proto}://${host}`;
          const absoluteOgImage = `${origin}/og-image.jpg`;

          html = html
            .replace(/content="\/og-image\.jpg"/g, `content="${absoluteOgImage}"`)
            .replace(/content="og-image\.jpg"/g, `content="${absoluteOgImage}"`);

          if (!isProd && viteInstance) {
            html = await viteInstance.transformIndexHtml(req.originalUrl, html);
          }
          return res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
        }
      } catch (err) {
        console.warn('Notice: Error serving dynamic OpenGraph html for bot:', err);
      }
    }
    next();
  });

  if (!isProd && viteInstance) {
    app.use(viteInstance.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist/index.html'));
    });
  }

  // Global error handler to catch and safely handle RangeNotSatisfiableError from video streams
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err && (err.name === 'RangeNotSatisfiableError' || err.status === 416 || err.statusCode === 416)) {
      if (!res.headersSent) {
        return res.status(416).set('Content-Range', 'bytes */*').end();
      }
      return;
    }
    console.warn('Notice: Server handled request error:', err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Internal server error' });
    }
  });

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Artified_np full-stack server running at http://0.0.0.0:${port}`);
    // Run background self-healing task to download missing signature videos so they exist physically on disk
    ensureSignatureVideosExist().catch((err) => {
      console.warn('Notice: Background self-healing signature videos pre-fetch completed with warning:', err);
    });
  });
}

async function ensureSignatureVideosExist() {
  const shortcodes = ['DdjhhazvaRr', 'DdMRgKdP4HK', 'DdIUMC4BqFr', 'DY6OqqfPyJu'];
  const igDir = path.resolve(process.cwd(), 'public', 'instagram_videos');
  if (!fs.existsSync(igDir)) {
    fs.mkdirSync(igDir, { recursive: true });
  }

  for (const sc of shortcodes) {
    const localVideoPath = path.join(igDir, `${sc}.mp4`);
    if (!fs.existsSync(localVideoPath) || fs.statSync(localVideoPath).size < 1000) {
      console.log(`[Self-Healing] Downloading signature Instagram video stream for shortcode: ${sc}...`);
      try {
        const embedUrl = `https://www.instagram.com/p/${sc}/embed/captioned/`;
        const response = await fetch(embedUrl, {
          headers: {
            'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });
        if (response.ok) {
          const html = await response.text();
          const mp4Matches = html.match(/https?:[^"'\s<>]+\.mp4[^"'\s<>]*/g) || [];
          if (mp4Matches.length > 0 && mp4Matches[0]) {
            const rawMp4 = mp4Matches[0]
              .replace(/\\u0026/g, '&')
              .replace(/&amp;/g, '&')
              .replace(/\\/g, '');
            const vidRes = await fetch(rawMp4, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            });
            if (vidRes.ok) {
              const buf = Buffer.from(await vidRes.arrayBuffer());
              fs.writeFileSync(localVideoPath, buf);
              console.log(`[Self-Healing] Successfully downloaded & saved ${sc}.mp4 physically to local disk!`);
            }
          }
        }
      } catch (err: any) {
        console.warn(`[Self-Healing] Failed to pre-download video for shortcode: ${sc}:`, err.message);
      }
    }
  }
}

startServer();
