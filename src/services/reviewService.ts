import { db } from '../firebase';
import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  getDocs 
} from 'firebase/firestore';
import {
  safeSetDoc as setDoc,
  safeDeleteDoc as deleteDoc,
  safeOnSnapshot as onSnapshot
} from '../utils/safeFirestore';
import { ProductReviewItem, Product } from '../types';
import { sanitizeReviewItem } from '../utils/productStats';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';

const REVIEWS_COLLECTION = 'product_reviews';

export interface FirestoreProductReview extends ProductReviewItem {
  productId: string;
  productTitle?: string;
  createdAt?: string;
  customerPhoto?: string;
  timestamp?: number;
}

/**
 * Precise matching helper for product IDs, titles, and slugs
 */
export function isMatchForProduct(data: FirestoreProductReview, productId: string, targetId: string): boolean {
  if (!data) return false;
  const pId = String(data.productId || '').trim().toLowerCase();
  const target = String(productId || targetId || '').trim().toLowerCase();
  if (!pId && !data.productTitle) return false;

  // 1. Direct exact ID match
  if (pId === target || data.productId === productId) return true;

  // 2. Normalized ID match (ignoring dashes or casing differences)
  const normPid = pId.replace(/[^a-z0-9]/g, '');
  const normTarget = target.replace(/[^a-z0-9]/g, '');
  if (normPid && normTarget && normPid === normTarget) return true;

  // 3. Title slug exact match
  const titleSlug = data.productTitle ? data.productTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') : '';
  const targetSlug = target.replace(/[^a-z0-9]/g, '-');
  if (titleSlug && (titleSlug === target || titleSlug === targetSlug)) return true;

  return false;
}

/**
 * Submits a new rating and text review for a specific product and stores it in Firestore & Server DB.
 */
export async function submitProductReviewToFirestore(
  productId: string,
  reviewInput: {
    id?: string;
    author: string;
    location?: string;
    rating: number;
    comment: string;
    productTitle?: string;
    customerPhoto?: string;
  }
): Promise<FirestoreProductReview> {
  const reviewId = reviewInput.id || `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const cleanProductId = String(productId || '').trim();
  const cleanTitle = (reviewInput.productTitle || '').trim();

  const reviewDoc: FirestoreProductReview = {
    id: reviewId,
    productId: cleanProductId,
    productTitle: cleanTitle,
    author: reviewInput.author.trim(),
    location: (reviewInput.location || 'Kathmandu, Nepal').trim(),
    rating: Math.max(4.5, Math.min(5, reviewInput.rating)),
    comment: reviewInput.comment.trim(),
    date: dateFormatted,
    verified: true,
    customerPhoto: reviewInput.customerPhoto,
    createdAt: now.toISOString(),
    timestamp: Date.now()
  };

  // 1. Dual-write to persistent Server Express database (/api/reviews) immediately (fast & quota-independent)
  const serverWritePromise = fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reviewDoc)
  }).catch((apiErr) => {
    console.warn('Notice: Server API review sync notice:', apiErr);
  });

  // 2. Write to Cloud Firestore
  const firestoreWritePromise = (async () => {
    try {
      const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
      await setDoc(docRef, reviewDoc);
    } catch (error) {
      console.warn('Notice: Firestore review write notice:', error);
    }
  })();

  // 3. Update local storage cache for instant offline and multi-tab view
  try {
    const localKey = `artified_reviews_${cleanProductId}`;
    const raw = localStorage.getItem(localKey);
    const existing: FirestoreProductReview[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter(e => e.id !== reviewDoc.id && `${e.author}_${e.comment}` !== `${reviewDoc.author}_${reviewDoc.comment}`);
    localStorage.setItem(localKey, JSON.stringify([reviewDoc, ...filtered]));

    // Also save in persistent global custom reviews dictionary
    const dictRaw = localStorage.getItem('artified_custom_reviews_v1');
    const dict = dictRaw ? JSON.parse(dictRaw) : {};
    const currentProdReviews = dict[cleanProductId] || [];
    const cleanCurrent = currentProdReviews.filter((r: any) => r.id !== reviewDoc.id && `${r.author}_${r.comment}` !== `${reviewDoc.author}_${reviewDoc.comment}`);
    dict[cleanProductId] = [reviewDoc, ...cleanCurrent];
    localStorage.setItem('artified_custom_reviews_v1', JSON.stringify(dict));
  } catch {}

  // Await both writes in parallel
  await Promise.allSettled([serverWritePromise, firestoreWritePromise]);

  return reviewDoc;
}

/**
 * Subscribes to real-time reviews for a given product from Firestore & Server API.
 */
export function subscribeToProductReviews(
  productId: string,
  onReviews: (reviews: FirestoreProductReview[]) => void,
  fallbackReviews: ProductReviewItem[] = []
): () => void {
  const collectionRef = collection(db, REVIEWS_COLLECTION);
  const targetId = String(productId || '').trim().toLowerCase();

  const fetchServerReviews = async (): Promise<FirestoreProductReview[]> => {
    try {
      const res = await fetch(`/api/reviews?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().startsWith('[')) {
          const serverList = JSON.parse(text);
          if (Array.isArray(serverList)) {
            return serverList.filter((r: FirestoreProductReview) => isMatchForProduct(r, productId, targetId));
          }
        }
      }
    } catch {}
    return [];
  };

  const processAndEmit = async (firestoreReviews: FirestoreProductReview[]) => {
    const serverReviews = await fetchServerReviews();

    const seenIds = new Set<string>();
    const seenSignatures = new Set<string>();
    const combined: FirestoreProductReview[] = [];

    const addReview = (r: FirestoreProductReview) => {
      if (!r || !r.id || !r.author || !r.comment) return;
      if ((r as any).isDeleted) return;
      const cleanId = String(r.id).trim();
      const sig = `${r.author.trim().toLowerCase()}_${r.comment.trim().toLowerCase()}`;
      if (!seenIds.has(cleanId) && !seenSignatures.has(sig)) {
        seenIds.add(cleanId);
        seenSignatures.add(sig);
        combined.push(r);
      }
    };

    // 1. Fresh Firestore reviews
    firestoreReviews.forEach(addReview);
    // 2. Persistent Server database reviews
    serverReviews.forEach(addReview);

    // 3. Persistent LocalStorage cached reviews for this product
    try {
      const localRaw = localStorage.getItem(`artified_reviews_${productId}`);
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        if (Array.isArray(parsed)) parsed.forEach(addReview);
      }
      const customStoreRaw = localStorage.getItem('artified_custom_reviews_v1');
      if (customStoreRaw) {
        const parsedDict = JSON.parse(customStoreRaw);
        const prodCustom = parsedDict[productId];
        if (Array.isArray(prodCustom)) {
          prodCustom.forEach((c: any) => addReview({ ...c, productId } as FirestoreProductReview));
        }
      }
    } catch {}

    // 4. Fallback reviews (product custom reviews + curated base)
    fallbackReviews.forEach((fb) => addReview({ ...fb, productId } as FirestoreProductReview));

    // Sort newest first
    combined.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.timestamp || 0);
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.timestamp || 0);
      return timeB - timeA;
    });

    onReviews(combined);

    try {
      localStorage.setItem(`artified_reviews_${productId}`, JSON.stringify(combined));
    } catch {}
  };

  // Real-time listener on all reviews for this product
  const unsubscribe = onSnapshot(
    collectionRef,
    (snapshot) => {
      const firestoreReviews: FirestoreProductReview[] = [];
      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data() as FirestoreProductReview;
        if (data && isMatchForProduct(data, productId, targetId)) {
          firestoreReviews.push(data);
        }
      });
      processAndEmit(firestoreReviews);
    },
    async (error) => {
      console.warn('Firestore reviews subscription notice:', error);
      processAndEmit([]);
    }
  );

  return unsubscribe;
}

/**
 * Subscribes to all real-time reviews from Firestore & Server API.
 */
export function subscribeToAllProductReviews(
  onReviews: (reviews: FirestoreProductReview[]) => void
): () => void {
  const collectionRef = collection(db, REVIEWS_COLLECTION);

  const fetchServerAllReviews = async (): Promise<FirestoreProductReview[]> => {
    try {
      const res = await fetch(`/api/reviews?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const serverList = await res.json();
        if (Array.isArray(serverList)) return serverList;
      }
    } catch {}
    return [];
  };

  const processAndEmitAll = async (firestoreReviews: FirestoreProductReview[]) => {
    const serverReviews = await fetchServerAllReviews();
    const seenIds = new Set<string>();
    const seenSignatures = new Set<string>();
    const combined: FirestoreProductReview[] = [];

    const addReview = (r: FirestoreProductReview) => {
      if (!r || !r.id || !r.author || !r.comment) return;
      if ((r as any).isDeleted) return;
      const cleanId = String(r.id).trim();
      const sig = `${r.author.trim().toLowerCase()}_${r.comment.trim().toLowerCase()}`;
      if (!seenIds.has(cleanId) && !seenSignatures.has(sig)) {
        seenIds.add(cleanId);
        seenSignatures.add(sig);
        combined.push(r);
      }
    };

    firestoreReviews.forEach(addReview);
    serverReviews.forEach(addReview);

    combined.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.timestamp || 0);
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.timestamp || 0);
      return timeB - timeA;
    });

    onReviews(combined);
  };

  const unsubscribe = onSnapshot(
    collectionRef,
    (snapshot) => {
      const firestoreReviews: FirestoreProductReview[] = [];
      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data() as FirestoreProductReview;
        if (data && data.author && data.comment) {
          firestoreReviews.push(data);
        }
      });
      processAndEmitAll(firestoreReviews);
    },
    (error) => {
      console.warn('Firestore all reviews listener notice:', error);
      processAndEmitAll([]);
    }
  );

  return unsubscribe;
}

/**
 * Deletes a product review from Firestore product_reviews collection and server database.
 */
export async function deleteProductReviewFromFirestore(reviewId: string): Promise<void> {
  if (!reviewId) return;
  try {
    const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Notice: Firestore review delete notice:', err);
  }

  try {
    await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
  } catch {}

  try {
    const dictRaw = localStorage.getItem('artified_custom_reviews_v1');
    if (dictRaw) {
      const dict = JSON.parse(dictRaw);
      for (const pId of Object.keys(dict)) {
        dict[pId] = (dict[pId] || []).filter((r: any) => r.id !== reviewId);
      }
      localStorage.setItem('artified_custom_reviews_v1', JSON.stringify(dict));
    }
  } catch {}
}
