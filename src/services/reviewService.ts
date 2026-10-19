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
 * Flexible matching helper for product IDs, titles, and slugs
 */
export function isMatchForProduct(data: FirestoreProductReview, productId: string, targetId: string): boolean {
  if (!data) return false;
  const pId = String(data.productId || '').trim().toLowerCase();
  const target = String(productId || targetId || '').trim().toLowerCase();
  const titleSlug = data.productTitle ? data.productTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') : '';
  const targetSlug = target.replace(/[^a-z0-9]/g, '-');

  if (pId === target || pId === targetSlug || data.productId === productId) return true;
  if (titleSlug && (titleSlug === target || titleSlug === targetSlug || targetSlug.includes(titleSlug) || titleSlug.includes(targetSlug))) return true;

  const normPid = pId.replace(/[^a-z0-9]/g, '');
  const normTarget = target.replace(/[^a-z0-9]/g, '');
  if (normPid && normTarget && (normPid === normTarget || normPid.includes(normTarget) || normTarget.includes(normPid))) return true;

  if ((target.includes('pearl') || target.includes('bag') || target.includes('tote')) &&
      (pId.includes('pearl') || pId.includes('bag') || pId.includes('tote') || titleSlug.includes('pearl'))) {
    return true;
  }
  return false;
}

/**
 * Submits a new rating and text review for a specific product and stores it in Firestore & Server DB.
 */
export async function submitProductReviewToFirestore(
  productId: string,
  reviewInput: {
    author: string;
    location?: string;
    rating: number;
    comment: string;
    productTitle?: string;
    customerPhoto?: string;
  }
): Promise<FirestoreProductReview> {
  const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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
    rating: Math.max(1, Math.min(5, reviewInput.rating)),
    comment: reviewInput.comment.trim(),
    date: dateFormatted,
    verified: true,
    customerPhoto: reviewInput.customerPhoto,
    createdAt: now.toISOString(),
    timestamp: Date.now()
  };

  // 1. Write to Cloud Firestore
  try {
    const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
    await setDoc(docRef, reviewDoc);
  } catch (error) {
    console.warn('Notice: Firestore review write notice:', error);
  }

  // 2. Dual-write to persistent Server Express database (/api/reviews) for multi-browser & Incognito sync
  try {
    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewDoc)
    });
  } catch (apiErr) {
    console.warn('Notice: Server API review sync notice:', apiErr);
  }

  // 3. Update local storage cache for instant offline view
  try {
    const localKey = `artified_reviews_${cleanProductId}`;
    const raw = localStorage.getItem(localKey);
    const existing: FirestoreProductReview[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(localKey, JSON.stringify([reviewDoc, ...existing.filter(e => e.id !== reviewDoc.id)]));
  } catch {}

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
        const serverList = await res.json();
        if (Array.isArray(serverList)) {
          return serverList.filter((r: FirestoreProductReview) => isMatchForProduct(r, productId, targetId));
        }
      }
    } catch {}
    return [];
  };

  const processAndEmit = async (firestoreReviews: FirestoreProductReview[]) => {
    const serverReviews = await fetchServerReviews();

    const map = new Map<string, FirestoreProductReview>();
    // Combine Firestore real-time reviews and server database reviews
    firestoreReviews.forEach((r) => map.set(r.id, r));
    serverReviews.forEach((r) => {
      if (!map.has(r.id)) map.set(r.id, r);
    });
    fallbackReviews.forEach((fb) => {
      if (!map.has(fb.id)) {
        map.set(fb.id, { ...fb, productId });
      }
    });

    const combined = Array.from(map.values());
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
    const map = new Map<string, FirestoreProductReview>();

    firestoreReviews.forEach((r) => map.set(r.id, r));
    serverReviews.forEach((r) => {
      if (!map.has(r.id)) map.set(r.id, r);
    });

    const combined = Array.from(map.values());
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
