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

export const CATALOG_BUILD_TIMESTAMP = '2026-10-30T10:30:00.000Z';
export const CATALOG_BUILD_VERSION = 'artified_v_2026_10_30_reset_reviews_v3';

const GENERIC_FALLBACK_SUBSTRINGS = [
  'photo-1566150905458-1bf1fc113f0d',
  'photo-1599643478518-a784e5dc4c8f',
  'photo-1544816155-12df9643f363',
  'photo-1611085583191-a3b181a88401',
  'photo-1590874103328-eac38a683ce7'
];

export function isGenericFallbackImage(url?: string): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('/uploads/')) return true;
  return GENERIC_FALLBACK_SUBSTRINGS.some((sub) => trimmed.includes(sub));
}

export function selectBestProductImages(
  candidateImages?: string[],
  bundledImages?: string[],
  isCandidateNewer?: boolean
): string[] {
  const validCandidate = (candidateImages || []).filter(
    (img) => typeof img === 'string' && img.trim() !== '' && !isGenericFallbackImage(img)
  );
  const validBundled = (bundledImages || []).filter(
    (img) => typeof img === 'string' && img.trim() !== '' && !isGenericFallbackImage(img)
  );

  // 1. Always prefer self-contained data:image/ base64 uploads so creations never 404 before GitHub deployment
  const candidateHasDataUri = validCandidate.some((img) => img.startsWith('data:image/'));
  const bundledHasDataUri = validBundled.some((img) => img.startsWith('data:image/'));

  if (candidateHasDataUri && (!bundledHasDataUri || isCandidateNewer)) {
    return validCandidate;
  }
  if (bundledHasDataUri && !candidateHasDataUri) {
    return validBundled;
  }

  // 2. If candidate was updated more recently by the seller and has valid non-fallback images, honor it
  if (isCandidateNewer && validCandidate.length > 0) {
    return validCandidate;
  }

  // 3. Otherwise prefer valid non-fallback bundled images, then valid candidate images
  if (validBundled.length > 0) return validBundled;
  if (validCandidate.length > 0) return validCandidate;

  return (bundledImages && bundledImages.length > 0) ? bundledImages : (candidateImages || []);
}

/**
 * Reconciles candidate products (from localStorage, Firestore, or API) against the authoritative bundled PRODUCTS.
 * - Bundled products with their updated prices/names/images always take precedence over stale cached products.
 * - Self-contained data:image/ photos and newly uploaded creation photos are strictly protected from reverting to placeholders.
 * - Custom reviews, deletion tombstones, verified sales counts, and custom products created by the artisan are preserved.
 */
export function reconcileProductCatalog(candidateProducts?: Product[] | null, bundled: Product[] = PRODUCTS): Product[] {
  const map = new Map<string, Product>();

  // 1. Initialize with authoritative bundled products (keep original reference initially)
  for (const item of bundled) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  const deletedRevIds = new Set<string>();
  try {
    const globDeletedRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('artified_deleted_review_ids') : null;
    if (globDeletedRaw) {
      const globList = JSON.parse(globDeletedRaw);
      if (Array.isArray(globList)) globList.forEach((id: string) => deletedRevIds.add(String(id).trim()));
    }
  } catch {}

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

        const candidateTime = candidate.updatedAt ? new Date(candidate.updatedAt).getTime() : 0;
        const bundledTime = bundledItem.updatedAt ? new Date(bundledItem.updatedAt).getTime() : 0;
        const isCandidateNewer = candidateTime > bundledTime;

        const isRoyalCape =
          candidate.id === 'art-1793343690587-202g7' ||
          Boolean(candidate.title && candidate.title.toLowerCase().includes('royal layered drape pearl cape'));
        const isClassicCape =
          candidate.id === 'art-1793354171215-n8r5d' ||
          Boolean(candidate.title && candidate.title.toLowerCase().includes('classic woven collar pearl cape'));

        // First collect any deletion tombstones across sources so deleted reviews never resurrect
        const tombstoneReviews: any[] = [];
        const seenTombstoneIds = new Set<string>();
        const collectTombstones = (r: any) => {
          if (!r || !r.isDeleted) return;
          const cleanId = r.id ? String(r.id).trim() : '';
          if (cleanId) deletedRevIds.add(cleanId);
          if (r.author) deletedRevIds.add(`${candidate.id}::${String(r.author).trim().toLowerCase()}`);
          if (cleanId && !seenTombstoneIds.has(cleanId)) {
            seenTombstoneIds.add(cleanId);
            tombstoneReviews.push(r);
          }
        };

        (bundledItem.customReviews || []).forEach(collectTombstones);
        (candidate.customReviews || []).forEach(collectTombstones);

        const seenRevIds = new Set<string>();
        const seenRevSigs = new Set<string>();
        const visibleMergedReviews: any[] = [];

        const addMerged = (r: any) => {
          if (!r || !r.id || !r.author || !r.comment || r.isDeleted) return;
          const cleanId = String(r.id).trim();
          const authorLower = String(r.author).trim().toLowerCase();
          if (deletedRevIds.has(cleanId) || deletedRevIds.has(`${candidate.id}::${authorLower}`)) return;
          if (
            isRoyalCape &&
            (authorLower.includes('kashish') ||
              authorLower.includes('jenisha') ||
              cleanId === 'art-1793343690587-202g7-rev-1' ||
              cleanId === 'art-1793343690587-202g7-rev-3')
          ) {
            return;
          }
          if (
            isClassicCape &&
            (authorLower.includes('smarika') || cleanId === 'art-1793354171215-n8r5d-rev-1')
          ) {
            return;
          }
          const sig = `${authorLower}_${String(r.comment).trim().toLowerCase()}`;
          if (!seenRevIds.has(cleanId) && !seenRevSigs.has(sig)) {
            seenRevIds.add(cleanId);
            seenRevSigs.add(sig);
            visibleMergedReviews.push(r);
          }
        };

        if (isCandidateNewer) {
          (candidate.customReviews || []).forEach(addMerged);
          (bundledItem.customReviews || []).forEach(addMerged);
        } else {
          (bundledItem.customReviews || []).forEach(addMerged);
          (candidate.customReviews || []).forEach(addMerged);
        }

        const mergedReviews = [...visibleMergedReviews, ...tombstoneReviews];

        const mergedOnlineSales = Math.max(
          candidate.onlineSalesCount || 0,
          bundledItem.onlineSalesCount || 0
        );
        const mergedSoldCount =
          candidate.soldCount !== undefined
            ? candidate.soldCount
            : (bundledItem.soldCount !== undefined ? bundledItem.soldCount : 0);
        const mergedTotalSold = mergedSoldCount + mergedOnlineSales;

        const nextStockCount = typeof candidate.stockCount === 'number'
          ? Math.max(0, candidate.stockCount)
          : (typeof bundledItem.stockCount === 'number' ? bundledItem.stockCount : 8);
        const nextInventoryCount = typeof candidate.inventoryCount === 'number'
          ? Math.max(0, candidate.inventoryCount)
          : (bundledItem.inventoryCount ?? nextStockCount);
        const nextInStock = typeof candidate.inStock === 'boolean'
          ? (candidate.inStock && nextStockCount > 0)
          : (nextStockCount > 0 && bundledItem.inStock !== false);

        const resolvedImages = selectBestProductImages(candidate.images, bundledItem.images, isCandidateNewer);

        const nextReviewsCount = visibleMergedReviews.length;

        const nextProd: Product = {
          ...bundledItem,
          price: isCandidateNewer && typeof candidate.price === 'number' && candidate.price > 0 ? candidate.price : bundledItem.price,
          originalPrice: isCandidateNewer && typeof candidate.originalPrice === 'number' ? candidate.originalPrice : bundledItem.originalPrice,
          title: isCandidateNewer && candidate.title ? candidate.title : bundledItem.title,
          subtitle: (isCandidateNewer && candidate.subtitle) ? candidate.subtitle : (bundledItem.subtitle || candidate.subtitle),
          description: (isCandidateNewer && candidate.description) ? candidate.description : (bundledItem.description || candidate.description),
          category: (isCandidateNewer && candidate.category) ? candidate.category : bundledItem.category,
          images: resolvedImages,
          materials: Array.isArray(candidate.materials) ? candidate.materials : (bundledItem.materials || []),
          leadTime: candidate.leadTime || bundledItem.leadTime,
          manufacturingTime: candidate.manufacturingTime || bundledItem.manufacturingTime,
          stockCount: nextStockCount,
          inventoryCount: nextInventoryCount,
          inStock: nextInStock,
          isNewArrival: typeof candidate.isNewArrival === 'boolean' && isCandidateNewer ? candidate.isNewArrival : bundledItem.isNewArrival,
          isBestSeller: bundledItem.isBestSeller || (mergedTotalSold >= 50),
          reviewsCount: nextReviewsCount,
          customReviews: mergedReviews,
          soldCount: mergedSoldCount,
          onlineSalesCount: mergedOnlineSales,
          totalSold: mergedTotalSold,
          updatedAt: isCandidateNewer ? candidate.updatedAt : (bundledItem.updatedAt || CATALOG_BUILD_TIMESTAMP),
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
          nextProd.leadTime === bundledItem.leadTime &&
          nextProd.manufacturingTime === bundledItem.manufacturingTime &&
          (nextProd.materials?.length || 0) === (bundledItem.materials?.length || 0) &&
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
