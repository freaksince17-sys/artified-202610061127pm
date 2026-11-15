import { useEffect, useRef } from 'react';
import { Product } from '../types';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: any[]) => void;
  }
}

export function getGaMeasurementId(): string {
  try {
    const envId = (import.meta as any)?.env?.VITE_GA_MEASUREMENT_ID;
    if (typeof envId === 'string' && /^G-[A-Z0-9]+$/i.test(envId.trim())) {
      return envId.trim();
    }
    if (typeof document !== 'undefined') {
      const meta = document.querySelector('meta[name="ga-measurement-id"]');
      const metaVal = meta?.getAttribute('content')?.trim() || '';
      if (/^G-[A-Z0-9]+$/i.test(metaVal) && !metaVal.includes('VITE_')) {
        return metaVal;
      }
    }
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('artified_ga_measurement_id')?.trim() || '';
      if (/^G-[A-Z0-9]+$/i.test(saved)) {
        return saved;
      }
    }
  } catch {}
  return '';
}

export function isGa4Configured(): boolean {
  return Boolean(getGaMeasurementId());
}

function dispatchGtag(command: string, ...args: any[]): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag === 'function') {
    window.gtag(command, ...args);
  } else {
    window.dataLayer.push([command, ...args]);
  }
}

export interface PageViewPayload {
  pagePath?: string;
  pageTitle?: string;
  category?: string;
  navTab?: string;
}

/**
 * Tracks a virtual SPA page view in Google Analytics 4 (GA4).
 */
export function trackPageView(payload: PageViewPayload = {}): void {
  if (typeof window === 'undefined') return;
  const pagePath = payload.pagePath || window.location.pathname + window.location.search;
  const pageTitle = payload.pageTitle || (typeof document !== 'undefined' ? document.title : 'Artified Nepal');

  dispatchGtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle,
    page_location: window.location.href,
    content_group: payload.category || payload.navTab || 'storefront',
    atelier_location: 'Kathmandu, Nepal',
  });
}

/**
 * Tracks a product card click (GA4 `select_item` ecommerce event).
 */
export function trackProductClick(
  product: Product,
  options?: { listName?: string; index?: number }
): void {
  if (!product || !product.id) return;
  dispatchGtag('event', 'select_item', {
    item_list_id: options?.listName || product.category || 'all',
    item_list_name: options?.listName || product.category || 'Artified Catalog',
    items: [
      {
        item_id: product.id,
        item_name: product.title,
        item_brand: 'Artified Nepal',
        item_category: product.category || 'handcrafted',
        price: Number(product.price || 0),
        currency: 'NPR',
        index: options?.index,
        location_id: 'Kathmandu, Nepal',
      },
    ],
  });
}

/**
 * Tracks a product detail inspection (GA4 `view_item` ecommerce event).
 */
export function trackProductView(product: Product): void {
  if (!product || !product.id) return;
  dispatchGtag('event', 'view_item', {
    currency: 'NPR',
    value: Number(product.price || 0),
    items: [
      {
        item_id: product.id,
        item_name: product.title,
        item_brand: 'Artified Nepal',
        item_category: product.category || 'handcrafted',
        price: Number(product.price || 0),
        currency: 'NPR',
        location_id: 'Kathmandu, Nepal',
      },
    ],
  });
}

export interface UseGoogleAnalyticsOptions {
  activeNavTab: string;
  selectedCategory: string;
  quickViewProduct: Product | null;
}

/**
 * Custom React hook to automatically track SPA route/category page views and
 * product views/clicks in Google Analytics 4 (GA4).
 */
export function useGoogleAnalytics({
  activeNavTab,
  selectedCategory,
  quickViewProduct,
}: UseGoogleAnalyticsOptions): {
  trackPageView: typeof trackPageView;
  trackProductClick: typeof trackProductClick;
  trackProductView: typeof trackProductView;
} {
  const lastTrackedPathRef = useRef<string>('');
  const lastTrackedProductIdRef = useRef<string>('');

  // Track virtual page views whenever navigation tab or category collection changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const resolvedPath =
      activeNavTab === 'workshops'
        ? '/workshops'
        : activeNavTab === 'home' && selectedCategory && selectedCategory !== 'all'
        ? `/${selectedCategory}`
        : activeNavTab === 'home'
        ? '/'
        : `/${activeNavTab}`;

    const dedupeKey = `${resolvedPath}|${activeNavTab}|${selectedCategory}`;
    if (lastTrackedPathRef.current === dedupeKey) return;
    lastTrackedPathRef.current = dedupeKey;

    trackPageView({
      pagePath: resolvedPath,
      pageTitle: document.title,
      category: selectedCategory,
      navTab: activeNavTab,
    });
  }, [activeNavTab, selectedCategory]);

  // Track product view_item events when Quick View modal opens or navigates between pieces
  useEffect(() => {
    if (!quickViewProduct || !quickViewProduct.id) {
      lastTrackedProductIdRef.current = '';
      return;
    }
    if (lastTrackedProductIdRef.current === quickViewProduct.id) return;
    lastTrackedProductIdRef.current = quickViewProduct.id;

    trackProductView(quickViewProduct);
  }, [quickViewProduct]);

  return {
    trackPageView,
    trackProductClick,
    trackProductView,
  };
}

export default useGoogleAnalytics;
