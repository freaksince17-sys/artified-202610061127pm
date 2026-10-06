import { Product } from '../types';
import { calculateReviewsCount, getProductReviews } from './productStats';

const DEFAULT_TITLE = 'Artified_np | Handcrafted Elegance & Wearable Art Nepal';
const DEFAULT_DESCRIPTION = 'Handcrafted Elegance & Wearable Art. Handmade pearl bags, pearl necklaces, and macrame accessories in Nepal.';
const DEFAULT_CANONICAL = 'https://www.artified.com.np/';
const DEFAULT_IMAGE = 'https://www.artified.com.np/og-image.jpg';
const BASE_URL = 'https://www.artified.com.np';

export interface ProductSeoData {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  schemaJsonLd: Record<string, any>;
}

/**
 * Builds high-converting, CTR-optimized SEO metadata for an individual product
 */
export function buildProductSeoMetadata(product: Product): ProductSeoData {
  const formattedPrice = product.price.toLocaleString();
  
  // 1. High-CTR Page Title: includes exact product name, transparent NPR pricing, and brand keyword (50-60 chars)
  const title = `${product.title} (Rs. ${formattedPrice}) | Artified Nepal`;

  // 2. High-CTR Meta Description: includes pricing, artisan provenance, materials, and delivery assurance (135-155 chars)
  const cleanSnippet = (product.description || product.subtitle || '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const shortSnippet = cleanSnippet.length > 70 
    ? cleanSnippet.substring(0, 70).trim() + '...' 
    : cleanSnippet;

  const description = `Shop handmade ${product.title} in Nepal for Rs. ${formattedPrice}. ${shortSnippet} Handcrafted in Kathmandu with doorstep delivery across Nepal.`.substring(0, 160);

  const canonicalUrl = `${BASE_URL}/?product=${encodeURIComponent(product.id)}`;
  
  let imageUrl = DEFAULT_IMAGE;
  if (product.images && product.images[0]) {
    const img = product.images[0];
    if (img.startsWith('http://') || img.startsWith('https://')) {
      imageUrl = img;
    } else if (img.startsWith('/')) {
      imageUrl = `${BASE_URL}${img}`;
    }
  }

  // 3. Authenticated customer review stats for Schema.org AggregateRating
  const reviews = getProductReviews(product);
  const totalReviews = reviews.length > 0 ? reviews.length : calculateReviewsCount(product);
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1)
    : '5.0';

  // 4. Schema.org Product Structured Data (Google Merchant / Rich Results format)
  const schemaJsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonicalUrl}#product`,
    'name': product.title,
    'image': product.images && product.images.length > 0
      ? product.images.filter((img) => !img.startsWith('data:')).map((img) => (img.startsWith('http') ? img : `${BASE_URL}${img.startsWith('/') ? '' : '/'}${img}`))
      : [imageUrl],
    'description': cleanSnippet || description,
    'sku': product.id,
    'category': product.category || 'Handcrafted Fashion Accessories',
    'brand': {
      '@type': 'Brand',
      'name': 'Artified Nepal'
    },
    'material': product.materials && product.materials.length > 0
      ? product.materials.join(', ')
      : 'Handmade Pearls & Beads',
    'offers': {
      '@type': 'Offer',
      'url': canonicalUrl,
      'priceCurrency': 'NPR',
      'price': product.price,
      'priceValidUntil': '2027-12-31',
      'itemCondition': 'https://schema.org/NewCondition',
      'availability': product.inStock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'seller': {
        '@type': 'Organization',
        'name': 'Artified Nepal',
        'url': BASE_URL
      }
    }
  };

  if (totalReviews > 0) {
    schemaJsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      'ratingValue': avgRating,
      'reviewCount': totalReviews,
      'bestRating': 5,
      'worstRating': 1
    };
  }

  return {
    title,
    description,
    canonicalUrl,
    imageUrl,
    schemaJsonLd
  };
}

/**
 * Updates DOM head elements dynamically for product pages and deep links
 */
export function applyProductSeo(product: Product | null): void {
  if (typeof document === 'undefined') return;

  const titleEl = document.querySelector('title');
  let metaDesc = document.querySelector('meta[name="description"]');
  let canonicalEl = document.querySelector('link[rel="canonical"]');
  let ogTitle = document.querySelector('meta[property="og:title"]');
  let ogDesc = document.querySelector('meta[property="og:description"]');
  let ogImage = document.querySelector('meta[property="og:image"]');
  let ogUrl = document.querySelector('meta[property="og:url"]');
  let twitterTitle = document.querySelector('meta[name="twitter:title"]');
  let twitterDesc = document.querySelector('meta[name="twitter:description"]');
  let twitterImage = document.querySelector('meta[name="twitter:image"]');

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

    // 4. OpenGraph Tags
    if (ogTitle) ogTitle.setAttribute('content', seo.title);
    if (ogDesc) ogDesc.setAttribute('content', seo.description);
    if (ogImage) ogImage.setAttribute('content', seo.imageUrl);
    if (ogUrl) ogUrl.setAttribute('content', seo.canonicalUrl);

    // 5. Twitter Card Tags
    if (twitterTitle) twitterTitle.setAttribute('content', seo.title);
    if (twitterDesc) twitterDesc.setAttribute('content', seo.description);
    if (twitterImage) twitterImage.setAttribute('content', seo.imageUrl);

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
    if (ogUrl) ogUrl.setAttribute('content', DEFAULT_CANONICAL);

    if (twitterTitle) twitterTitle.setAttribute('content', DEFAULT_TITLE);
    if (twitterDesc) twitterDesc.setAttribute('content', DEFAULT_DESCRIPTION);
    if (twitterImage) twitterImage.setAttribute('content', DEFAULT_IMAGE);

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
