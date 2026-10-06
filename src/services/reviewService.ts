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
}

/**
 * Submits a new rating and text review for a specific product and stores it in Firestore.
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

  const reviewDoc: FirestoreProductReview = {
    id: reviewId,
    productId,
    productTitle: reviewInput.productTitle || '',
    author: reviewInput.author.trim(),
    location: (reviewInput.location || 'Kathmandu, Nepal').trim(),
    rating: Math.max(1, Math.min(5, reviewInput.rating)),
    comment: reviewInput.comment.trim(),
    date: dateFormatted,
    verified: true,
    customerPhoto: reviewInput.customerPhoto,
    createdAt: now.toISOString()
  };

  try {
    const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
    await setDoc(docRef, reviewDoc);
  } catch (error) {
    console.warn('Notice: Firestore review write notice (saved with local recovery):', error);
  }

  // Also update local storage cache for instant offline view
  try {
    const localKey = `artified_reviews_${productId}`;
    const raw = localStorage.getItem(localKey);
    const existing: FirestoreProductReview[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(localKey, JSON.stringify([reviewDoc, ...existing]));
  } catch {}

  return reviewDoc;
}

/**
 * Subscribes to real-time reviews for a given product from Firestore.
 */
export function subscribeToProductReviews(
  productId: string,
  onReviews: (reviews: FirestoreProductReview[]) => void,
  fallbackReviews: ProductReviewItem[] = []
): () => void {
  const collectionRef = collection(db, REVIEWS_COLLECTION);
  
  // Real-time listener on all reviews for this product
  const unsubscribe = onSnapshot(
    collectionRef,
    (snapshot) => {
      const firestoreReviews: FirestoreProductReview[] = [];
      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data() as FirestoreProductReview;
        if (data.productId === productId) {
          firestoreReviews.push(data);
        }
      });

      // Sort by newest first
      firestoreReviews.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      // Merge with initial fallback / seed reviews ensuring uniqueness
      const existingIds = new Set(firestoreReviews.map((r) => r.id));
      const combined = [
        ...firestoreReviews,
        ...fallbackReviews
          .filter((fb) => !existingIds.has(fb.id))
          .map((fb) => ({ ...fb, productId }))
      ];

      onReviews(combined);

      // Cache locally
      try {
        localStorage.setItem(`artified_reviews_${productId}`, JSON.stringify(combined));
      } catch {}
    },
    (error) => {
      console.warn('Firestore reviews subscription notice:', error);
      // Fall back to local storage cache or provided fallbacks
      try {
        const raw = localStorage.getItem(`artified_reviews_${productId}`);
        if (raw) {
          onReviews(JSON.parse(raw));
          return;
        }
      } catch {}
      onReviews(fallbackReviews.map((fb) => ({ ...fb, productId })));
    }
  );

  return unsubscribe;
}

/**
 * Subscribes to all real-time reviews from Firestore.
 */
export function subscribeToAllProductReviews(
  onReviews: (reviews: FirestoreProductReview[]) => void
): () => void {
  const collectionRef = collection(db, REVIEWS_COLLECTION);

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

      firestoreReviews.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      onReviews(firestoreReviews);
    },
    (error) => {
      console.warn('Firestore all reviews listener notice:', error);
    }
  );

  return unsubscribe;
}
