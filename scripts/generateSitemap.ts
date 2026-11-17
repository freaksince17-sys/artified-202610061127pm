import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../src/firebase.ts';
import { generateSitemapXml } from '../src/utils/sitemapGenerator.ts';
import { Product } from '../src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncFirestoreProductsToRepo(rootDir: string, currentProducts: Product[]): Promise<Product[]> {
  try {
    const snap = await Promise.race([
      getDocs(collection(db, 'products')),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);

    if (!snap || snap.empty) {
      return currentProducts;
    }

    const cloudProdMap = new Map<string, any>();
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const pid = d?.id || docSnap.id;
      if (pid) cloudProdMap.set(pid, { ...d, id: pid });
    });

    const publicProductsDir = path.resolve(rootDir, 'public/products');
    if (!fs.existsSync(publicProductsDir)) {
      fs.mkdirSync(publicProductsDir, { recursive: true });
    }

    const saveStaticBase64Copies = (images: string[], productId: string): string[] => {
      return (images || []).map((imgUrl, idx) => {
        if (typeof imgUrl === 'string' && imgUrl.startsWith('data:image/')) {
          try {
            const base64Part = imgUrl.replace(/^data:image\/[\w+]+;base64,/, '');
            const buf = Buffer.from(base64Part, 'base64');
            const safeId = String(productId || 'item').replace(/[^a-zA-Z0-9_-]/g, '_');
            fs.writeFileSync(path.join(publicProductsDir, `${safeId}_${idx}.jpg`), buf);
          } catch {}
        }
        return imgUrl;
      });
    };

    const seenIds = new Set<string>();
    const updatedExisting = currentProducts.map((p) => {
      if (p?.id) seenIds.add(p.id);
      const cloud = cloudProdMap.get(p.id);
      if (!cloud) return p;
      const cloudHasDataImg =
        Array.isArray(cloud.images) &&
        cloud.images.some((img: any) => typeof img === 'string' && img.startsWith('data:image/'));
      if (cloudHasDataImg) {
        saveStaticBase64Copies(cloud.images, p.id);
      }
      return {
        ...p,
        title: cloud.title || p.title,
        subtitle: cloud.subtitle || p.subtitle,
        description: cloud.description || p.description,
        category: cloud.category || p.category,
        price: typeof cloud.price === 'number' && cloud.price > 0 ? cloud.price : p.price,
        originalPrice: typeof cloud.originalPrice === 'number' ? cloud.originalPrice : p.originalPrice,
        ...(cloudHasDataImg ? { images: cloud.images } : {}),
        stockCount: typeof cloud.stockCount === 'number' ? cloud.stockCount : p.stockCount,
        inventoryCount: typeof cloud.inventoryCount === 'number' ? cloud.inventoryCount : p.inventoryCount,
        inStock: typeof cloud.inStock === 'boolean' ? cloud.inStock : p.inStock,
        isNewArrival: typeof cloud.isNewArrival === 'boolean' ? cloud.isNewArrival : Boolean(p.isNewArrival),
        isBestSeller: typeof cloud.isBestSeller === 'boolean' ? cloud.isBestSeller : Boolean(p.isBestSeller),
        soldCount: typeof cloud.soldCount === 'number' ? cloud.soldCount : p.soldCount,
        onlineSalesCount: typeof cloud.onlineSalesCount === 'number' ? cloud.onlineSalesCount : p.onlineSalesCount,
        totalSold: typeof cloud.totalSold === 'number' ? cloud.totalSold : p.totalSold,
        updatedAt: cloud.updatedAt || p.updatedAt,
      };
    });

    const newCloudProducts: Product[] = [];
    cloudProdMap.forEach((cloud, pid) => {
      if (
        !seenIds.has(pid) &&
        cloud &&
        cloud.title &&
        typeof cloud.price === 'number' &&
        cloud.price > 0 &&
        cloud.category
      ) {
        seenIds.add(pid);
        const cleanImages = saveStaticBase64Copies(
          Array.isArray(cloud.images) ? cloud.images : [],
          pid
        );
        const { sku, ...restCloud } = cloud;
        newCloudProducts.push({
          ...restCloud,
          id: pid,
          images: cleanImages,
        } as Product);
      }
    });

    if (newCloudProducts.length > 0) {
      console.log(`☁️  [Firestore Sync] Merged ${newCloudProducts.length} newly created product(s) from Firestore: ${newCloudProducts.map((p) => p.title).join(', ')}`);
    }

    const merged = [...newCloudProducts, ...updatedExisting];
    const serialized = JSON.stringify(merged, null, 2);
    fs.writeFileSync(path.resolve(rootDir, 'src/data/products.json'), serialized, 'utf-8');
    fs.writeFileSync(path.resolve(rootDir, 'public/products.json'), serialized, 'utf-8');
    return merged;
  } catch (err) {
    console.warn('Notice: Could not reach Firestore during sitemap build, using local products.json:', err);
    return currentProducts;
  }
}

async function run() {
  console.log('✨ [Sitemap Generator] Starting Google-compliant sitemap generation...');

  const rootDir = path.resolve(__dirname, '..');
  const productsJsonPath = path.resolve(rootDir, 'src/data/products.json');
  const sitemapOutputPath = path.resolve(rootDir, 'public/sitemap.xml');

  if (!fs.existsSync(productsJsonPath)) {
    console.error('❌ Could not find products.json at:', productsJsonPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(productsJsonPath, 'utf-8');
  const initialProducts: Product[] = JSON.parse(raw);
  const products = await syncFirestoreProductsToRepo(rootDir, initialProducts);

  const xml = generateSitemapXml(products, 'https://www.artified.com.np');

  fs.writeFileSync(sitemapOutputPath, xml, 'utf-8');

  // Also write to dist/sitemap.xml if dist directory exists
  const distSitemapPath = path.resolve(rootDir, 'dist/sitemap.xml');
  if (fs.existsSync(path.resolve(rootDir, 'dist'))) {
    fs.writeFileSync(distSitemapPath, xml, 'utf-8');
  }

  // Also ensure public/products.json is synced for static hosting
  const publicProductsPath = path.resolve(rootDir, 'public/products.json');
  fs.writeFileSync(publicProductsPath, JSON.stringify(products, null, 2), 'utf-8');

  console.log(`✅ [Sitemap Generator] Successfully generated ${sitemapOutputPath}!`);
  console.log(`📊 Indexed:`);
  console.log(`   - 1 Storefront Homepage (/)`);
  console.log(`   - 4 Clean Static Landing Pages (/pearl-bags, /pearl-necklaces, /macrame, /workshops)`);
  console.log(`   - ${products.length} Individual Handcrafted Products (/product/<name>/) with Google Image metadata`);
  console.log(`   - Total Clean URLs: ${1 + 4 + products.length}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Error generating sitemap:', err);
  process.exit(1);
});
