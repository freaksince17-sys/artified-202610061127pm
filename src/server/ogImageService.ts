import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { PRODUCTS, selectBestProductImages } from '../data/products.ts';
import { buildProductOgSvgMarkup } from '../utils/ogImageGenerator.ts';
import { Product } from '../types.ts';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const OG_TMP_DIR = path.resolve(os.tmpdir(), 'artified-og-preview-cache');

function sanitizeFileSlug(id: string): string {
  return String(id || 'product')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 96);
}

/**
 * Resolves a product by ID or title slug from runtime disk catalog, bundled PRODUCTS,
 * and live Cloud Firestore ('products' collection).
 */
export async function resolveProductForOgPreview(
  rawIdentifier: string,
  runtimeProductsJsonPath?: string
): Promise<Product | null> {
  const cleanId = decodeURIComponent(rawIdentifier || '')
    .replace(/\.(?:jpg|jpeg|png|webp)$/i, '')
    .trim();
  if (!cleanId) return null;

  let productList: Product[] = PRODUCTS;
  if (runtimeProductsJsonPath && fs.existsSync(runtimeProductsJsonPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(runtimeProductsJsonPath, 'utf-8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        productList = parsed;
      }
    } catch {}
  }

  const slugify = (val: string) =>
    String(val || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const targetSlug = slugify(cleanId);

  let localProduct =
    productList.find((p) => p.id === cleanId) ||
    productList.find((p) => String(p.id).toLowerCase() === cleanId.toLowerCase()) ||
    productList.find((p) => targetSlug && slugify(p.title) === targetSlug) ||
    null;

  // Attempt to enrich with real-time Firestore product document (fast 2.5s timeout so crawlers never hang)
  try {
    const targetDocId = localProduct?.id || cleanId;
    const snap = await Promise.race([
      getDoc(doc(db, 'products', targetDocId)),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);

    if (snap && snap.exists()) {
      const cloudData = snap.data();
      if (cloudData) {
        localProduct = {
          ...(localProduct || ({} as Product)),
          ...(cloudData as Partial<Product>),
          id: cloudData.id || snap.id || targetDocId,
          title: cloudData.title || localProduct?.title || 'Artified Nepal Creation',
          subtitle: cloudData.subtitle || localProduct?.subtitle || 'Handcrafted in Kathmandu, Nepal',
          description:
            cloudData.description ||
            localProduct?.description ||
            cloudData.subtitle ||
            'Individually handcrafted in Kathmandu, Nepal.',
          category: cloudData.category || localProduct?.category || 'pearl-bags',
          price:
            typeof cloudData.price === 'number' && cloudData.price > 0
              ? cloudData.price
              : localProduct?.price || 1500,
          images: selectBestProductImages(cloudData.images, localProduct?.images, true),
        };
      }
    }
  } catch {
    // Fallback to localProduct if Firestore is unreachable
  }

  return localProduct;
}

/**
 * Dynamically generates a temporary 1200x630 OpenGraph JPEG file on disk (in os.tmpdir())
 * using 'sharp', overlaying the product photo, title, brief details, and CTA button.
 * By default, price is omitted from the shared preview image per user preference.
 */
export async function generateTemporaryProductOgImageFile(
  product: Product,
  options?: {
    publicDir?: string;
    showPrice?: boolean;
    ttlMs?: number;
  }
): Promise<{ filePath: string; buffer: Buffer }> {
  if (!fs.existsSync(OG_TMP_DIR)) {
    fs.mkdirSync(OG_TMP_DIR, { recursive: true });
  }

  const showPrice = options?.showPrice === true;
  const ttlMs = options?.ttlMs ?? 10 * 60 * 1000; // 10-minute temporary file cache
  const publicDir = options?.publicDir || path.resolve(process.cwd(), 'public');
  const fileName = `${sanitizeFileSlug(product.id)}_${showPrice ? 'priced' : 'noprice'}_v2.jpg`;
  const tempFilePath = path.join(OG_TMP_DIR, fileName);

  // Serve cached temporary OG file if fresh
  if (fs.existsSync(tempFilePath)) {
    try {
      const stat = fs.statSync(tempFilePath);
      if (Date.now() - stat.mtimeMs < ttlMs && stat.size > 1024) {
        return {
          filePath: tempFilePath,
          buffer: fs.readFileSync(tempFilePath),
        };
      }
    } catch {}
  }

  let embeddedImageDataUri: string | undefined;
  const primaryImg = Array.isArray(product.images) ? product.images[0] : '';

  if (primaryImg) {
    try {
      if (primaryImg.startsWith('data:image/')) {
        const base64Part = primaryImg.split(',')[1];
        if (base64Part) {
          const resized = await sharp(Buffer.from(base64Part, 'base64'))
            .resize(520, 520, { fit: 'cover' })
            .jpeg({ quality: 84 })
            .toBuffer();
          embeddedImageDataUri = `data:image/jpeg;base64,${resized.toString('base64')}`;
        }
      } else if (primaryImg.startsWith('/')) {
        const localPhotoPath = path.resolve(publicDir, primaryImg.replace(/^\/+/, ''));
        if (fs.existsSync(localPhotoPath)) {
          const resized = await sharp(localPhotoPath)
            .resize(520, 520, { fit: 'cover' })
            .jpeg({ quality: 84 })
            .toBuffer();
          embeddedImageDataUri = `data:image/jpeg;base64,${resized.toString('base64')}`;
        }
      } else if (primaryImg.startsWith('http://') || primaryImg.startsWith('https://')) {
        const res = await fetch(primaryImg);
        if (res.ok) {
          const arrBuf = await res.arrayBuffer();
          const resized = await sharp(Buffer.from(arrBuf))
            .resize(520, 520, { fit: 'cover' })
            .jpeg({ quality: 84 })
            .toBuffer();
          embeddedImageDataUri = `data:image/jpeg;base64,${resized.toString('base64')}`;
        }
      }
    } catch {}
  }

  const svg = buildProductOgSvgMarkup(product, {
    embeddedImageDataUri,
    showPrice,
  });

  const jpegBuffer: Buffer = await sharp(Buffer.from(svg))
    .resize(1200, 630)
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  try {
    fs.writeFileSync(tempFilePath, jpegBuffer);
  } catch {}

  return {
    filePath: tempFilePath,
    buffer: jpegBuffer,
  };
}
