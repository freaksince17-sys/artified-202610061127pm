import { Product } from '../types';
import { getProductOgImageUrl, getProductShareUrl } from './ogImageGenerator';
import { buildProductWithLocalBusinessSchema, resolveSchemaProductImages } from './LocalBusinessSchema';

const DEFAULT_TITLE = 'Artified_np | Handcrafted Elegance & Wearable Art Nepal';
const DEFAULT_DESCRIPTION = 'Handcrafted Elegance & Wearable Art. Handmade pearl bags, pearl necklaces, and macrame accessories in Nepal.';
const DEFAULT_CANONICAL = 'https://www.artified.com.np/';
const DEFAULT_IMAGE = 'https://www.artified.com.np/og-image.jpg';
const DEFAULT_IMAGE_ALT = 'Artified_np Logo - Art made with love';
const BASE_URL = 'https://www.artified.com.np';

export interface ProductSeoData {
  title: string;
  description: string;
  canonicalUrl: string;
  shareUrl: string;
  imageUrl: string;
  ogImageUrl: string;
  ogImageAlt: string;
  schemaJsonLd: Record<string, any>;
}

/**
 * Builds high-converting, CTR-optimized SEO metadata for an individual product
 */
export function buildProductSeoMetadata(product: Product): ProductSeoData {
  const formattedPrice = product.price.toLocaleString();
  
  // 1. High-CTR Page Title: includes exact product name, transparent NPR pricing, and brand keyword (50-60 chars)
  const title = `${product.title} (NPR ${formattedPrice}) | Artified Nepal`;

  // 2. High-CTR Meta Description: includes pricing, artisan provenance, materials, and delivery assurance (135-155 chars)
  const cleanSnippet = (product.description || product.subtitle || '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const shortSnippet = cleanSnippet.length > 70 
    ? cleanSnippet.substring(0, 70).trim() + '...' 
    : cleanSnippet;

  const rawDescription = `Shop handmade ${product.title} in Nepal for NPR ${formattedPrice}. ${shortSnippet} Handcrafted in Kathmandu with doorstep delivery across Nepal.`;
  const description = rawDescription.length > 160
    ? rawDescription.slice(0, 157).replace(/\s+\S*$/, '') + '...'
    : rawDescription;

  const canonicalUrl = `${BASE_URL}/?product=${encodeURIComponent(product.id)}`;
  const activeOrigin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : BASE_URL;
  const shareUrl = getProductShareUrl(product, activeOrigin);
  const ogImageUrl = getProductOgImageUrl(product, activeOrigin);
  const ogImageAlt = `${product.title} — Buy Now at Artified Nepal`;
  
  const resolvedImages = resolveSchemaProductImages(product, BASE_URL);
  const imageUrl = resolvedImages[0] || DEFAULT_IMAGE;

  // Schema.org Product + Kathmandu LocalBusiness Structured Data (Google Rich Results format)
  const schemaJsonLd = buildProductWithLocalBusinessSchema(product, BASE_URL);

  return {
    title,
    description,
    canonicalUrl,
    shareUrl,
    imageUrl,
    ogImageUrl,
    ogImageAlt,
    schemaJsonLd
  };
}

/**
 * Updates DOM head elements dynamically for product pages and deep links
 */
export function applyProductSeo(product: Product | null): void {
  if (typeof document === 'undefined') return;

  let metaDesc = document.querySelector('meta[name="description"]');
  let canonicalEl = document.querySelector('link[rel="canonical"]');
  let ogTitle = document.querySelector('meta[property="og:title"]');
  let ogDesc = document.querySelector('meta[property="og:description"]');
  let ogImage = document.querySelector('meta[property="og:image"]');
  let ogImageSecure = document.querySelector('meta[property="og:image:secure_url"]');
  let ogImageAlt = document.querySelector('meta[property="og:image:alt"]');
  let ogUrl = document.querySelector('meta[property="og:url"]');
  let twitterTitle = document.querySelector('meta[name="twitter:title"]');
  let twitterDesc = document.querySelector('meta[name="twitter:description"]');
  let twitterImage = document.querySelector('meta[name="twitter:image"]');
  let twitterImageAlt = document.querySelector('meta[name="twitter:image:alt"]');

  // Existing dynamic JSON-LD element
  let jsonLdEl = document.getElementById('product-seo-jsonld') as HTMLScriptElement | null;

  if (product) {
    const seo = buildProductSeoMetadata(product);

    // 1. Document Title
    document.title = seo.title;

    // 2. Meta Description
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', seo.description);

    // 3. Canonical Tag
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', seo.canonicalUrl);

    // 4. OpenGraph Tags (using auto-generated product OG card containing title + Buy Now CTA)
    if (ogTitle) ogTitle.setAttribute('content', seo.title);
    if (ogDesc) ogDesc.setAttribute('content', seo.description);
    if (ogImage) ogImage.setAttribute('content', seo.ogImageUrl);
    if (ogImageSecure) ogImageSecure.setAttribute('content', seo.ogImageUrl);
    if (ogImageAlt) ogImageAlt.setAttribute('content', seo.ogImageAlt);
    if (ogUrl) ogUrl.setAttribute('content', seo.canonicalUrl);

    // 5. Twitter Card Tags
    if (twitterTitle) twitterTitle.setAttribute('content', seo.title);
    if (twitterDesc) twitterDesc.setAttribute('content', seo.description);
    if (twitterImage) twitterImage.setAttribute('content', seo.ogImageUrl);
    if (twitterImageAlt) twitterImageAlt.setAttribute('content', seo.ogImageAlt);

    // 6. Schema.org Product JSON-LD Injection
    if (!jsonLdEl) {
      jsonLdEl = document.createElement('script');
      jsonLdEl.id = 'product-seo-jsonld';
      jsonLdEl.type = 'application/ld+json';
      document.head.appendChild(jsonLdEl);
    }
    jsonLdEl.textContent = JSON.stringify(seo.schemaJsonLd, null, 2);

    // 7. Update browser URL without reloading page
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('product', product.id);
      window.history.replaceState({ productId: product.id }, seo.title, url.toString());
    } catch {}
  } else {
    // Restore default storefront SEO
    document.title = DEFAULT_TITLE;

    if (metaDesc) metaDesc.setAttribute('content', DEFAULT_DESCRIPTION);
    if (canonicalEl) canonicalEl.setAttribute('href', DEFAULT_CANONICAL);

    if (ogTitle) ogTitle.setAttribute('content', DEFAULT_TITLE);
    if (ogDesc) ogDesc.setAttribute('content', DEFAULT_DESCRIPTION);
    if (ogImage) ogImage.setAttribute('content', DEFAULT_IMAGE);
    if (ogImageSecure) ogImageSecure.setAttribute('content', DEFAULT_IMAGE);
    if (ogImageAlt) ogImageAlt.setAttribute('content', DEFAULT_IMAGE_ALT);
    if (ogUrl) ogUrl.setAttribute('content', DEFAULT_CANONICAL);

    if (twitterTitle) twitterTitle.setAttribute('content', DEFAULT_TITLE);
    if (twitterDesc) twitterDesc.setAttribute('content', DEFAULT_DESCRIPTION);
    if (twitterImage) twitterImage.setAttribute('content', DEFAULT_IMAGE);
    if (twitterImageAlt) twitterImageAlt.setAttribute('content', DEFAULT_IMAGE_ALT);

    // Remove product JSON-LD
    if (jsonLdEl && jsonLdEl.parentNode) {
      jsonLdEl.parentNode.removeChild(jsonLdEl);
    }

    // Clean up product query from browser URL without reloading
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('product') || url.searchParams.has('p')) {
        url.searchParams.delete('product');
        url.searchParams.delete('p');
        window.history.replaceState({}, DEFAULT_TITLE, url.toString());
      }
    } catch {}
  }
}
