import React, { useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart, findMatchingProductByUrlParam, getRequestedProductParamFromUrl } from '../context/CartContext';
import { applyProductSeo } from '../utils/productSeo';
import { selectBestProductImages } from '../data/products';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import { Product } from '../types';

/**
 * Dedicated metadata provider that fetches real-time product data from Firestore on page load
 * and injects product-specific OpenGraph (og:title, og:image, og:description), Twitter Card,
 * canonical URL, and JSON-LD structured data directly into document.head (without exposing price).
 */
export const ProductMetadataProvider: React.FC = () => {
  const { quickViewProduct, products } = useCart();
  const hadActiveProductRef = useRef<boolean>(Boolean(quickViewProduct));

  useEffect(() => {
    let isCancelled = false;
    const requestedParam = getRequestedProductParamFromUrl();
    const localTargetProduct =
      quickViewProduct || findMatchingProductByUrlParam(products, requestedParam);

    if (localTargetProduct) {
      hadActiveProductRef.current = true;
      applyProductSeo(localTargetProduct);
    } else if (!requestedParam && hadActiveProductRef.current) {
      hadActiveProductRef.current = false;
      applyProductSeo(null);
      return;
    }

    const targetId = localTargetProduct?.id || requestedParam;
    if (!targetId) return;

    // Fetch real-time product data from Firestore ('products' collection) on page load / product switch
    const fetchLiveProductMetadata = async () => {
      const docPath = `products/${targetId}`;
      try {
        const snap = await getDoc(doc(db, 'products', targetId));
        if (isCancelled || !snap.exists()) return;

        const cloudData = snap.data();
        if (!cloudData) return;

        const mergedProduct: Product = {
          ...(localTargetProduct || ({} as Product)),
          ...(cloudData as Partial<Product>),
          id: cloudData.id || snap.id || targetId,
          title: cloudData.title || localTargetProduct?.title || 'Artified Nepal Creation',
          subtitle: cloudData.subtitle || localTargetProduct?.subtitle || 'Handcrafted in Kathmandu, Nepal',
          description:
            cloudData.description ||
            localTargetProduct?.description ||
            cloudData.subtitle ||
            'Handcrafted creation by Artified Nepal in Kathmandu.',
          category: cloudData.category || localTargetProduct?.category || 'pearl-bags',
          price:
            typeof cloudData.price === 'number' && cloudData.price > 0
              ? cloudData.price
              : localTargetProduct?.price || 1500,
          images: selectBestProductImages(cloudData.images, localTargetProduct?.images, true),
        };

        hadActiveProductRef.current = true;
        applyProductSeo(mergedProduct);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('missing or insufficient permissions')) {
          try {
            handleFirestoreError(err, OperationType.GET, docPath);
          } catch {
            // Logged structured FirestoreErrorInfo to console
          }
        }
      }
    };

    fetchLiveProductMetadata();

    return () => {
      isCancelled = true;
    };
  }, [quickViewProduct, products]);

  return null;
};
