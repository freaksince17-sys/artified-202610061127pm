import React, { useEffect, useRef } from 'react';
import { useCart, findMatchingProductByUrlParam, getRequestedProductParamFromUrl } from '../context/CartContext';
import { applyProductSeo } from '../utils/productSeo';

/**
 * Dedicated metadata provider that synchronizes product-specific OpenGraph, Twitter Card,
 * canonical URL, and JSON-LD structured data in document.head whenever a product link is
 * opened via URL parameter (?product=<id> or /product/<id>/) or selected in the storefront.
 */
export const ProductMetadataProvider: React.FC = () => {
  const { quickViewProduct, products } = useCart();
  const hadActiveProductRef = useRef<boolean>(Boolean(quickViewProduct));

  useEffect(() => {
    const targetProduct =
      quickViewProduct ||
      findMatchingProductByUrlParam(products, getRequestedProductParamFromUrl());

    if (targetProduct) {
      hadActiveProductRef.current = true;
      applyProductSeo(targetProduct);
    } else if (hadActiveProductRef.current) {
      hadActiveProductRef.current = false;
      applyProductSeo(null);
    }
  }, [quickViewProduct, products]);

  return null;
};
