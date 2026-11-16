import { Product } from '../types';
import { getProductOgImageUrl, getProductShareUrl } from './ogImageGenerator';
import { buildProductWithLocalBusinessSchema, resolveSchemaProductImages } from './LocalBusinessSchema';

const DEFAULT_TITLE = 'Artified_np | Handcrafted Elegance & Wearable Art Nepal';
const DEFAULT_DESCRIPTION =
  'Handcrafted Elegance & Wearable Art. Handmade pearl bags, pearl necklaces, and macrame accessories in Nepal.';
const DEFAULT_CANONICAL = 'https://www.artified.com.np/';
const DEFAULT_IMAGE = 'https://www.artified.com.np/og-image.jpg';
const DEFAULT_IMAGE_ALT = 'Artified_np Logo - Art made with love';
const BASE_URL = 'https://www.artified.com.np';

export interface ProductSeoData {
  title: string;
  description: string;
  briefDetail: string;
  canonicalUrl: string;
  shareUrl: string;
  imageUrl: string;
  ogImageUrl: string;
  ogImageAlt: string;
  availability: string;
  schemaJsonLd: Record<string, any>;
}

/**
 * Builds a clean, human-friendly brief detail summary from the product's description and subtitle
 * for OpenGraph social preview cards (WhatsApp, Instagram, TikTok, Facebook, X) without showing the price.
 */
export function buildProductBriefDetail(
  product: Pick<Product, 'title' | 'subtitle' | 'description'>
): string {
  const rawDetail = String(product.description || product.subtitle || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!rawDetail) {
    return `Discover handmade ${product.title} at Artified Nepal. Handcrafted in Kathmandu with doorstep delivery across Nepal.`;
  }

  const maxDetailLen = 140;
  const excerpt =
    rawDetail.length > maxDetailLen
      ? `${rawDetail.slice(0, maxDetailLen - 3).replace(/\s+\S*$/, '').trim()}...`
      : rawDetail;

  return `${excerpt} • Handcrafted in Kathmandu, Nepal`;
}

/**
 * Builds SEO & OpenGraph metadata for an individual product without revealing the price in social previews
 */
export function buildProductSeoMetadata(product: Product): ProductSeoData {
  // 1. Page & OpenGraph Title: exact product name and brand (no price in shared preview)
  const title = `${product.title} | Artified Nepal`;

  // 2. Brief Detail Description for OpenGraph & Meta Description (no price in shared preview)
  const briefDetail = buildProductBriefDetail(product);
  const description = briefDetail;

  const activeOrigin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : BASE_URL;
  const shareUrl = getProductShareUrl(product, activeOrigin);
  const canonicalUrl = getProductShareUrl(product, BASE_URL);
  const ogImageUrl = getProductOgImageUrl(product, activeOrigin);
  const ogImageAlt = `${product.title} — ${product.subtitle || 'Handcrafted in Kathmandu, Nepal'}`;

  const resolvedImages = resolveSchemaProductImages(product, activeOrigin);
  const imageUrl = resolvedImages[0] || ogImageUrl || DEFAULT_IMAGE;

  const isAvailable =
    product.inStock !== false && (typeof product.stockCount !== 'number' || product.stockCount > 0);

  // Schema.org Product + Kathmandu LocalBusiness Structured Data
  const schemaJsonLd = buildProductWithLocalBusinessSchema(product, BASE_URL);

  return {
    title,
    description,
    briefDetail,
    canonicalUrl,
    shareUrl,
    imageUrl,
    ogImageUrl,
    ogImageAlt,
    availability: isAvailable ? 'in stock' : 'out of stock',
    schemaJsonLd,
  };
}

function setOrCreateMeta(
  attrName: 'name' | 'property',
  attrValue: string,
  content: string
): void {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(attrName: 'name' | 'property', attrValue: string): void {
  if (typeof document === 'undefined') return;
  const el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

/**
 * Updates DOM head elements dynamically for product pages and deep links
 */
export function applyProductSeo(product: Product | null): void {
  if (typeof document === 'undefined') return;

  let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  let jsonLdEl = document.getElementById('product-seo-jsonld') as HTMLScriptElement | null;

  // Ensure price meta tags are never present in head so social link unfurling never displays price before opening
  removeMeta('property', 'product:price:amount');
  removeMeta('property', 'product:price:currency');

  if (product) {
    const seo = buildProductSeoMetadata(product);

    // 1. Document Title
    document.title = seo.title;

    // 2. Meta Description (with product brief details, no price)
    setOrCreateMeta('name', 'description', seo.description);

    // 3. Canonical Tag
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', seo.canonicalUrl);

    // 4. OpenGraph Tags (with product photo card, title, and brief description — no price)
    setOrCreateMeta('property', 'og:type', 'product');
    setOrCreateMeta('property', 'og:title', seo.title);
    setOrCreateMeta('property', 'og:description', seo.description);
    setOrCreateMeta('property', 'og:image', seo.ogImageUrl);
    setOrCreateMeta('property', 'og:image:secure_url', seo.ogImageUrl);
    setOrCreateMeta('property', 'og:image:alt', seo.ogImageAlt);
    setOrCreateMeta('property', 'og:url', seo.shareUrl);
    setOrCreateMeta('property', 'product:availability', seo.availability);

    // 5. Twitter Card Tags
    setOrCreateMeta('name', 'twitter:title', seo.title);
    setOrCreateMeta('name', 'twitter:description', seo.description);
    setOrCreateMeta('name', 'twitter:image', seo.ogImageUrl);
    setOrCreateMeta('name', 'twitter:image:alt', seo.ogImageAlt);

    // 6. Schema.org Product JSON-LD Injection
    if (!jsonLdEl) {
      jsonLdEl = document.createElement('script');
      jsonLdEl.id = 'product-seo-jsonld';
      jsonLdEl.type = 'application/ld+json';
      document.head.appendChild(jsonLdEl);
    }
    jsonLdEl.textContent = JSON.stringify(seo.schemaJsonLd, null, 2);

    // 7. Update browser URL to include both the pre-rendered /product/<id>/ path AND ?product=<id> query
    try {
      const encodedId = encodeURIComponent(product.id);
      const nextUrl = `/product/${encodedId}/?product=${encodedId}`;
      const currentFull = window.location.pathname + window.location.search;
      if (currentFull !== nextUrl) {
        window.history.replaceState({ productId: product.id }, seo.title, nextUrl);
      }
    } catch {}
  } else {
    // Restore default storefront SEO
    document.title = DEFAULT_TITLE;

    setOrCreateMeta('name', 'description', DEFAULT_DESCRIPTION);
    if (canonicalEl) canonicalEl.setAttribute('href', DEFAULT_CANONICAL);

    setOrCreateMeta('property', 'og:type', 'website');
    setOrCreateMeta('property', 'og:title', DEFAULT_TITLE);
    setOrCreateMeta('property', 'og:description', DEFAULT_DESCRIPTION);
    setOrCreateMeta('property', 'og:image', DEFAULT_IMAGE);
    setOrCreateMeta('property', 'og:image:secure_url', DEFAULT_IMAGE);
    setOrCreateMeta('property', 'og:image:alt', DEFAULT_IMAGE_ALT);
    setOrCreateMeta('property', 'og:url', DEFAULT_CANONICAL);

    setOrCreateMeta('name', 'twitter:title', DEFAULT_TITLE);
    setOrCreateMeta('name', 'twitter:description', DEFAULT_DESCRIPTION);
    setOrCreateMeta('name', 'twitter:image', DEFAULT_IMAGE);
    setOrCreateMeta('name', 'twitter:image:alt', DEFAULT_IMAGE_ALT);

    // Remove product JSON-LD
    if (jsonLdEl && jsonLdEl.parentNode) {
      jsonLdEl.parentNode.removeChild(jsonLdEl);
    }

    // Clean up product query or dedicated product path from browser URL without reloading
    try {
      const url = new URL(window.location.href);
      let changed = false;
      if (url.searchParams.has('product') || url.searchParams.has('p')) {
        url.searchParams.delete('product');
        url.searchParams.delete('p');
        changed = true;
      }
      if (/^\/product\/[^/]+\/?$/i.test(url.pathname)) {
        url.pathname = '/';
        changed = true;
      }
      if (changed) {
        window.history.replaceState({}, DEFAULT_TITLE, url.toString());
      }
    } catch {}
  }
}
