import { Product, DeliveryZone, Testimonial, TikTokReel, CraftStoryData, InstagramJournalItem } from '../types';
import { PRODUCT_REVIEWS_MAP, sanitizeReviewItem } from '../utils/productStats';
import SAVED_PRODUCTS from './products.json';
import SAVED_TIKTOK_REELS from './tiktok_reels.json';
import SAVED_INSTAGRAM_ITEMS from './instagram_journal.json';
import SAVED_CRAFT_STORY from './craft_story.json';

export const DEFAULT_INSTAGRAM_HANDLE = '@artified_np';
export const DEFAULT_INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/artified_np/';

export const DEFAULT_INSTAGRAM_ITEMS: InstagramJournalItem[] = (SAVED_INSTAGRAM_ITEMS as unknown as InstagramJournalItem[]);

export const DEFAULT_CRAFT_STORY: CraftStoryData = (SAVED_CRAFT_STORY as unknown as CraftStoryData);

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 'ktm_valley',
    name: 'Kathmandu Valley',
    area: 'Kathmandu, Lalitpur, Bhaktapur (Doorstep delivery)',
    fee: 120,
    estimatedDays: '1 to 2 days',
    description: 'Fast doorstep courier inside Kathmandu Valley (1 to 2 days)'
  },
  {
    id: 'outside_valley',
    name: 'Outside Valley',
    area: 'Pokhara, Chitwan, Butwal, Biratnagar, Dharan & all other districts across Nepal',
    fee: 250,
    estimatedDays: '3 to 7 days',
    description: 'NPR 250 to 300 (may increase depending on weight/location), 3 to 7 days'
  }
];

export const PRODUCTS: Product[] = (SAVED_PRODUCTS as unknown as Product[]).map((p) => ({
  ...p,
  customReviews: p.customReviews || PRODUCT_REVIEWS_MAP[p.id] || []
}));

export const CATALOG_BUILD_TIMESTAMP = '2026-10-26T12:00:00.000Z';
export const CATALOG_BUILD_VERSION = 'artified_v_2026_10_26_cache_bust';

/**
 * Reconciles candidate products (from localStorage, Firestore, or API) against the authoritative bundled PRODUCTS.
 * - Bundled products with their updated prices/names/images always take precedence over stale cached products.
 * - Stale localStorage candidate prices can NEVER overwrite official bundled prices for buyers.
 * - Custom reviews, verified sales counts, and custom products created by the artisan are preserved.
 */
export function reconcileProductCatalog(candidateProducts?: Product[] | null, bundled: Product[] = PRODUCTS): Product[] {
  const map = new Map<string, Product>();

  // 1. Initialize with authoritative bundled products (keep original reference initially)
  for (const item of bundled) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  // Parse custom reviews dictionary once outside the loop
  let storedReviewsDict: Record<string, any[]> = {};
  try {
    const dictRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('artified_custom_reviews_v1') : null;
    if (dictRaw) {
      storedReviewsDict = JSON.parse(dictRaw) || {};
    }
  } catch {}

  const buildTimestampMs = new Date(CATALOG_BUILD_TIMESTAMP).getTime();

  // 2. Process candidate products
  if (Array.isArray(candidateProducts) && candidateProducts.length > 0) {
    for (const candidate of candidateProducts) {
      if (!candidate || !candidate.id) continue;

      if (!map.has(candidate.id)) {
        // Only add a non-bundled custom product if it is a complete product with a valid price and category
        if (
          typeof candidate.price === 'number' &&
          !isNaN(candidate.price) &&
          candidate.price > 0 &&
          candidate.title &&
          candidate.category
        ) {
          map.set(candidate.id, candidate);
        }
      } else {
        const bundledItem = map.get(candidate.id)!;

        const extraReviews = Array.isArray(storedReviewsDict[candidate.id]) ? storedReviewsDict[candidate.id] : [];

        const seenRevIds = new Set<string>();
        const seenRevSigs = new Set<string>();
        const mergedReviews: any[] = [];

        const addMerged = (r: any) => {
          if (!r || !r.id || !r.author || !r.comment || r.isDeleted) return;
          const cleanId = String(r.id).trim();
          const sig = `${String(r.author).trim().toLowerCase()}_${String(r.comment).trim().toLowerCase()}`;
          if (!seenRevIds.has(cleanId) && !seenRevSigs.has(sig)) {
            seenRevIds.add(cleanId);
            seenRevSigs.add(sig);
            mergedReviews.push(r);
          }
        };

        extraReviews.forEach(addMerged);
        (bundledItem.customReviews || []).forEach(addMerged);
        (candidate.customReviews || []).forEach(addMerged);

        const mergedOnlineSales = Math.max(
          candidate.onlineSalesCount || 0,
          bundledItem.onlineSalesCount || 0
        );
        const mergedSoldCount =
          candidate.soldCount !== undefined && candidate.soldCount > (bundledItem.soldCount || 0)
            ? candidate.soldCount
            : bundledItem.soldCount;
        const mergedTotalSold = Math.max(
          candidate.totalSold || 0,
          bundledItem.totalSold || 0,
          (mergedSoldCount !== undefined ? mergedSoldCount : 54) + mergedOnlineSales
        );

        const nextStockCount = typeof candidate.stockCount === 'number'
          ? Math.max(0, candidate.stockCount)
          : (typeof bundledItem.stockCount === 'number' ? bundledItem.stockCount : 8);
        const nextInventoryCount = typeof candidate.inventoryCount === 'number'
          ? Math.max(0, candidate.inventoryCount)
          : (bundledItem.inventoryCount ?? nextStockCount);
        const nextInStock = typeof candidate.inStock === 'boolean'
          ? (candidate.inStock && nextStockCount > 0)
          : (nextStockCount > 0 && bundledItem.inStock !== false);

        // Authoritative bundled properties (price, originalPrice, title, description, category, images)
        // are ALWAYS protected so updates deployed in code/git immediately take effect for all buyers.
        const nextProd: Product = {
          ...bundledItem,
          price: bundledItem.price,
          originalPrice: bundledItem.originalPrice,
          title: bundledItem.title,
          subtitle: bundledItem.subtitle || candidate.subtitle,
          description: bundledItem.description || candidate.description,
          category: bundledItem.category,
          images: (bundledItem.images && bundledItem.images.length > 0) ? bundledItem.images : (candidate.images || []),
          stockCount: nextStockCount,
          inventoryCount: nextInventoryCount,
          inStock: nextInStock,
          isNewArrival: bundledItem.isNewArrival,
          isBestSeller: bundledItem.isBestSeller || (mergedTotalSold >= 50),
          customReviews: mergedReviews,
          soldCount: mergedSoldCount,
          onlineSalesCount: mergedOnlineSales,
          totalSold: mergedTotalSold,
          updatedAt: bundledItem.updatedAt || CATALOG_BUILD_TIMESTAMP,
          ...(candidate.rating !== undefined ? { rating: candidate.rating } : {})
        };

        // Preserve exact object reference if nothing meaningful changed to prevent unnecessary React re-renders
        const isUnchanged =
          nextProd.price === bundledItem.price &&
          nextProd.originalPrice === bundledItem.originalPrice &&
          nextProd.title === bundledItem.title &&
          nextProd.subtitle === bundledItem.subtitle &&
          nextProd.inStock === bundledItem.inStock &&
          nextProd.stockCount === bundledItem.stockCount &&
          nextProd.inventoryCount === bundledItem.inventoryCount &&
          nextProd.isNewArrival === bundledItem.isNewArrival &&
          nextProd.isBestSeller === bundledItem.isBestSeller &&
          nextProd.soldCount === bundledItem.soldCount &&
          nextProd.onlineSalesCount === bundledItem.onlineSalesCount &&
          nextProd.totalSold === bundledItem.totalSold &&
          nextProd.updatedAt === bundledItem.updatedAt &&
          (nextProd.images?.length || 0) === (bundledItem.images?.length || 0) &&
          (nextProd.images?.[0] || '') === (bundledItem.images?.[0] || '') &&
          mergedReviews.length === (bundledItem.customReviews?.length || 0);

        map.set(candidate.id, isUnchanged ? bundledItem : nextProd);
      }
    }
  }

  const result = Array.from(map.values());
  if (
    result.length === bundled.length &&
    result.every((item, idx) => item === bundled[idx])
  ) {
    return bundled;
  }
  return result;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    author: 'Aayushi Khadgi',
    location: 'Kathmandu, Nepal',
    rating: 4.8,
    comment: 'Honestly online order garda thha thiyena kasto aawcha bhanera, tara yo Red Pearl Beaded Bag surprisingly heavy ra well made cha! Red pearls le light ma dherai ramro shine dincha. Mobile, handkerchief ra lipstick atyo. Delivery rider le call garera lyaeko thiyo. Marriage ma sabai le sodhe kata bata kineko bhanera!',
    productName: 'Red Pearl Beaded Bag',
    date: '2 weeks ago',
    verifiedPurchase: true
  },
  {
    id: 't2',
    author: 'Prerana Shahi',
    location: 'Kathmandu, Nepal',
    rating: 4.7,
    comment: 'Instagram reel dekhera order gareko thie. Mero neck sanai cha so normal chokers loose huncha, tara yesma adjustable chain bhako le majale fit bhayo. Black saree snga college farewell ma lagawda pearls smooth lagyo, skin bilkul chokiyena. Dherai man poryo yo price ma!',
    productName: 'Pearl Beaded Adjustable Choker',
    date: '1 month ago',
    verifiedPurchase: true
  },
  {
    id: 't3',
    author: 'Bhawana Gurung',
    location: 'Kathmandu, Nepal',
    rating: 4.6,
    comment: 'Party ko lagi round pearl bag order gareko thie. Solid box ma bubble wrap ra soft dust pouch bhitra lyaeko thiyo. Yo round shape ekdam unique ra sturdy cha. Solid beads le garda haat ma heavy feel huncha, look chai 100% royal lagyo!',
    productName: 'Round Pearl Bag',
    date: '3 weeks ago',
    verifiedPurchase: true
  }
];

export const TIKTOK_REELS: TikTokReel[] = (SAVED_TIKTOK_REELS as unknown as TikTokReel[]);

export const FAQS = [
  {
    q: 'How long does delivery take inside and outside Kathmandu Valley?',
    a: 'Kathmandu Valley: NPR 120 (1 to 2 days doorstep delivery). Outside Valley: NPR 250 to 300 (can increase depending on location/weight, 3 to 7 days delivery via courier).'
  },
  {
    q: 'How do I pay with eSewa QR or Cash on Delivery (COD)?',
    a: 'We offer Cash on Delivery (COD) within Kathmandu Valley and major cities. For eSewa QR, you can scan our official QR code during checkout and upload your payment screenshot for instant verification.'
  },
  {
    q: 'Where is your store located and can I pick up in person?',
    a: 'Our store is located in Kathmandu, Nepal. You can visit us in Kathmandu to pick up your handcrafted pieces or order online for fast home delivery across Nepal with Cash on Delivery (COD).'
  },
  {
    q: 'How durable are the pearl bags? Will the beads break?',
    a: 'Our bags are crafted using commercial-grade reinforced transparent nylon monofilament with a tensile strength exceeding 15kg. The beads will not shatter under everyday use, and each anchor point is cross-tied four times for long-lasting structural durability.'
  },
  {
    q: 'What is your exchange and inspection policy?',
    a: 'We offer easy exchange within 24 hrs of delivery if there is any issue or if you need an adjustment. Simply contact our Kathmandu, Nepal team on WhatsApp with your Order ID for immediate support.'
  }
];
