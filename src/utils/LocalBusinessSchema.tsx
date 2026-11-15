import React, { useEffect, useMemo } from 'react';
import { Product } from '../types';
import { calculateReviewsCount, getProductAverageRating, getProductReviews } from './productStats';
import { getProductOgImageUrl } from './ogImageGenerator';

export const BASE_STORE_URL = 'https://www.artified.com.np';
export const LOCAL_BUSINESS_CITY = 'Kathmandu, Nepal';

export const KATHMANDU_BUSINESS_CONFIG = {
  id: `${BASE_STORE_URL}/#local-business`,
  name: 'Artified Nepal',
  alternateName: ['Artified_np', 'artified_np', 'Artified'],
  url: BASE_STORE_URL,
  telephone: '+9779767573721',
  priceRange: 'NPR 1,200 - NPR 4,500',
  founderName: 'Sahina Shrestha',
  logo: `${BASE_STORE_URL}/favicon-192x192.png`,
  image: `${BASE_STORE_URL}/og-image.jpg`,
  address: {
    streetAddress: 'Kathmandu, Nepal',
    addressLocality: 'Kathmandu',
    addressRegion: 'Bagmati',
    postalCode: '44600',
    addressCountry: 'NP',
  },
  geo: {
    latitude: 27.70076,
    longitude: 85.3082,
  },
  areaServed: [
    'Kathmandu',
    'Lalitpur',
    'Bhaktapur',
    'Kathmandu Valley',
    'Pokhara',
    'Chitwan',
    'Butwal',
    'Biratnagar',
    'Dharan',
    'Nepal',
  ],
  sameAs: [
    'https://www.instagram.com/artified_np/',
    'https://www.tiktok.com/@artified_np',
    'https://www.daraz.com.np/shop/0mx8ykcx',
  ],
} as const;

/**
 * Resolves clean absolute HTTPS image URLs for Schema.org (never returns an empty array).
 */
export function resolveSchemaProductImages(product: Product, origin = BASE_STORE_URL): string[] {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const httpImages = (product.images || [])
    .filter((img) => typeof img === 'string' && img.trim() && !img.startsWith('data:'))
    .map((img) => (img.startsWith('http://') || img.startsWith('https://') ? img : `${cleanOrigin}${img.startsWith('/') ? '' : '/'}${img}`));

  if (httpImages.length > 0) {
    return httpImages;
  }

  return [getProductOgImageUrl(product, cleanOrigin)];
}

/**
 * Generates location-targeted search keywords (e.g. "pearl necklaces in Kathmandu") for a product.
 */
export function getLocalProductKeywords(product: Product): string[] {
  const title = (product.title || '').trim();
  const baseKeywords = [
    `${title} Kathmandu`,
    `${title} Nepal`,
    'Artified Nepal',
    'handmade crafts Kathmandu Nepal',
  ];

  switch (product.category) {
    case 'pearl-necklaces':
      return [
        ...baseKeywords,
        'pearl necklaces in Kathmandu',
        'handmade pearl necklace Nepal',
        'pearl choker Kathmandu',
        'bridal pearl necklace Nepal',
      ];
    case 'pearl-bags':
      return [
        ...baseKeywords,
        'pearl bags in Kathmandu',
        'handmade pearl bag Nepal',
        'bridal pearl handbag Kathmandu',
      ];
    case 'macrame':
      return [
        ...baseKeywords,
        'macrame accessories Kathmandu',
        'handmade macrame Nepal',
      ];
    default:
      return [
        ...baseKeywords,
        'handmade accessories Kathmandu',
        'wearable art Nepal',
      ];
  }
}

/**
 * Generates SEO-friendly, location-tagged image alt text for product cards.
 */
export function getLocalProductAltText(product: Product): string {
  const catLabel =
    product.category === 'pearl-necklaces'
      ? 'Handmade Pearl Necklace'
      : product.category === 'pearl-bags'
      ? 'Handmade Pearl Bag'
      : product.category === 'macrame'
      ? 'Handwoven Macrame Creation'
      : 'Handcrafted Accessory';
  return `${product.title} — ${catLabel} in ${LOCAL_BUSINESS_CITY}`;
}

/**
 * Builds the core Schema.org LocalBusiness + JewelryStore JSON-LD node anchored in Kathmandu, Nepal.
 */
export function buildLocalBusinessNode(origin = BASE_STORE_URL): Record<string, any> {
  const cleanOrigin = origin.replace(/\/+$/, '');

  return {
    '@type': ['LocalBusiness', 'JewelryStore', 'OnlineStore'],
    '@id': KATHMANDU_BUSINESS_CONFIG.id,
    name: KATHMANDU_BUSINESS_CONFIG.name,
    alternateName: [...KATHMANDU_BUSINESS_CONFIG.alternateName],
    url: cleanOrigin,
    logo: `${cleanOrigin}/favicon-192x192.png`,
    image: `${cleanOrigin}/og-image.jpg`,
    description:
      'Handcrafted pearl bags, pearl necklaces, baroque chokers, pearl capes, and sustainable macrame accessories lovingly handmade in Kathmandu, Nepal by founder Sahina Shrestha.',
    telephone: KATHMANDU_BUSINESS_CONFIG.telephone,
    priceRange: KATHMANDU_BUSINESS_CONFIG.priceRange,
    currenciesAccepted: 'NPR',
    paymentAccepted: 'Cash on Delivery, eSewa QR, Fonepay',
    address: {
      '@type': 'PostalAddress',
      streetAddress: KATHMANDU_BUSINESS_CONFIG.address.streetAddress,
      addressLocality: KATHMANDU_BUSINESS_CONFIG.address.addressLocality,
      addressRegion: KATHMANDU_BUSINESS_CONFIG.address.addressRegion,
      postalCode: KATHMANDU_BUSINESS_CONFIG.address.postalCode,
      addressCountry: KATHMANDU_BUSINESS_CONFIG.address.addressCountry,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: KATHMANDU_BUSINESS_CONFIG.geo.latitude,
      longitude: KATHMANDU_BUSINESS_CONFIG.geo.longitude,
    },
    areaServed: KATHMANDU_BUSINESS_CONFIG.areaServed.map((place) => ({
      '@type': place === 'Nepal' ? 'Country' : 'City',
      name: place,
    })),
    founder: {
      '@type': 'Person',
      name: KATHMANDU_BUSINESS_CONFIG.founderName,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ],
        opens: '09:00',
        closes: '20:00',
      },
    ],
    sameAs: [...KATHMANDU_BUSINESS_CONFIG.sameAs],
  };
}

/**
 * Builds a complete Schema.org Product + LocalBusiness structured data object for a single product,
 * embedding Kathmandu, Nepal location signals, areaServed, and delivery details.
 */
export function buildProductWithLocalBusinessSchema(
  product: Product,
  origin = BASE_STORE_URL
): Record<string, any> {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const productUrl = `${cleanOrigin}/?product=${encodeURIComponent(product.id)}`;
  const images = resolveSchemaProductImages(product, cleanOrigin);
  const reviews = getProductReviews(product);
  const totalReviews = reviews.length > 0 ? reviews.length : calculateReviewsCount(product);
  const avgRating = getProductAverageRating(product).toFixed(1);
  const cleanDesc = (product.description || product.subtitle || `${product.title} handcrafted in Kathmandu, Nepal.`)
    .replace(/\s+/g, ' ')
    .trim();

  const isOutOfStock =
    product.inStock === false ||
    (typeof product.stockCount === 'number' && product.stockCount <= 0);

  const productNode: Record<string, any> = {
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: product.title,
    image: images,
    description: `${cleanDesc} Handcrafted in Kathmandu, Nepal with doorstep delivery across Kathmandu Valley and nationwide.`,
    category: product.category || 'Handcrafted Jewelry & Bags',
    keywords: getLocalProductKeywords(product).join(', '),
    countryOfOrigin: {
      '@type': 'Country',
      name: 'Nepal',
    },
    brand: {
      '@type': 'Brand',
      name: KATHMANDU_BUSINESS_CONFIG.name,
    },
    material:
      product.materials && product.materials.length > 0
        ? product.materials.join(', ')
        : 'Handmade Pearls & Beads',
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'NPR',
      price: Number(product.price || 0),
      priceValidUntil: '2027-12-31',
      itemCondition: 'https://schema.org/NewCondition',
      availability: isOutOfStock
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      availableAtOrFrom: {
        '@type': 'Place',
        name: 'Artified Nepal Atelier — Kathmandu, Nepal',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Kathmandu',
          addressRegion: 'Bagmati',
          postalCode: '44600',
          addressCountry: 'NP',
        },
      },
      areaServed: KATHMANDU_BUSINESS_CONFIG.areaServed.map((place) => ({
        '@type': place === 'Nepal' ? 'Country' : 'City',
        name: place,
      })),
      shippingDetails: [
        {
          '@type': 'OfferShippingDetails',
          shippingRate: {
            '@type': 'MonetaryAmount',
            value: 120,
            currency: 'NPR',
          },
          shippingDestination: {
            '@type': 'DefinedRegion',
            addressCountry: 'NP',
            addressRegion: 'Bagmati',
          },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: {
              '@type': 'QuantitativeValue',
              minValue: 1,
              maxValue: 3,
              unitCode: 'DAY',
            },
            transitTime: {
              '@type': 'QuantitativeValue',
              minValue: 1,
              maxValue: 2,
              unitCode: 'DAY',
            },
          },
        },
      ],
      seller: {
        '@id': KATHMANDU_BUSINESS_CONFIG.id,
        '@type': 'LocalBusiness',
        name: KATHMANDU_BUSINESS_CONFIG.name,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Kathmandu',
          addressRegion: 'Bagmati',
          addressCountry: 'NP',
        },
      },
    },
  };

  if (totalReviews > 0) {
    productNode.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgRating,
      reviewCount: totalReviews,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (reviews.length > 0) {
    productNode.review = reviews.slice(0, 3).map((r) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: r.author || 'Verified Customer',
      },
      datePublished: r.date || '2026-10-28',
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating || 5,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: r.comment || '',
    }));
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [buildLocalBusinessNode(cleanOrigin), productNode],
  };
}

/**
 * Builds a catalog-level LocalBusiness + OfferCatalog Schema.org graph for product grids/collections.
 */
export function buildCatalogLocalBusinessSchema(
  products: Product[],
  category?: string,
  origin = BASE_STORE_URL
): Record<string, any> {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const localBusiness = buildLocalBusinessNode(cleanOrigin);
  const featuredItems = products.slice(0, 12);

  const catalogName =
    category === 'pearl-necklaces'
      ? 'Handmade Pearl Necklaces & Capes in Kathmandu, Nepal'
      : category === 'pearl-bags'
      ? 'Handmade Pearl Bags in Kathmandu, Nepal'
      : category === 'macrame'
      ? 'Handwoven Macrame Creations in Kathmandu, Nepal'
      : 'Artified Nepal Handcrafted Pearl Bags & Necklaces in Kathmandu, Nepal';

  localBusiness.hasOfferCatalog = {
    '@type': 'OfferCatalog',
    name: catalogName,
    itemListElement: featuredItems.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Product',
        name: item.title,
        url: `${cleanOrigin}/?product=${encodeURIComponent(item.id)}`,
        image: resolveSchemaProductImages(item, cleanOrigin)[0],
        description: `${item.subtitle || item.title} — Handcrafted in Kathmandu, Nepal.`,
        keywords: getLocalProductKeywords(item).join(', '),
        offers: {
          '@type': 'Offer',
          priceCurrency: 'NPR',
          price: Number(item.price || 0),
          availability:
            item.inStock === false || (typeof item.stockCount === 'number' && item.stockCount <= 0)
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
          availableAtOrFrom: {
            '@type': 'Place',
            name: 'Kathmandu, Nepal',
          },
        },
      },
    })),
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [localBusiness],
  };
}

/**
 * Injects or updates a JSON-LD <script> element in document.head safely.
 */
export function injectLocalBusinessSchemaToHead(
  schemaPayload: Record<string, any>,
  scriptId = 'artified-local-business-jsonld'
): void {
  if (typeof document === 'undefined' || !document.head) return;
  let el = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = scriptId;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(schemaPayload);
}

/**
 * Removes an injected JSON-LD <script> element from document.head on cleanup.
 */
export function removeLocalBusinessSchemaFromHead(
  scriptId = 'artified-local-business-jsonld'
): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(scriptId);
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

export interface LocalBusinessSchemaProps {
  product?: Product | null;
  products?: Product[];
  category?: string;
  scriptId?: string;
  renderInline?: boolean;
}

/**
 * React utility component that automatically injects Kathmandu, Nepal LocalBusiness
 * structured data into product components (and document.head) for improved local search visibility.
 */
export const LocalBusinessSchema: React.FC<LocalBusinessSchemaProps> = ({
  product,
  products,
  category,
  scriptId = 'artified-local-business-jsonld',
  renderInline = false,
}) => {
  const schemaObject = useMemo(() => {
    const activeOrigin = BASE_STORE_URL;
    if (product) {
      return buildProductWithLocalBusinessSchema(product, activeOrigin);
    }
    if (products && products.length > 0) {
      return buildCatalogLocalBusinessSchema(products, category, activeOrigin);
    }
    return {
      '@context': 'https://schema.org',
      ...buildLocalBusinessNode(activeOrigin),
    };
  }, [product, products, category]);

  const serializedSchema = useMemo(() => JSON.stringify(schemaObject), [schemaObject]);

  useEffect(() => {
    injectLocalBusinessSchemaToHead(schemaObject, scriptId);
    return () => {
      removeLocalBusinessSchemaFromHead(scriptId);
    };
  }, [schemaObject, scriptId]);

  if (!renderInline) {
    return null;
  }

  return (
    <script
      type="application/ld+json"
      data-schema-scope={product ? `product:${product.id}` : 'catalog'}
      dangerouslySetInnerHTML={{ __html: serializedSchema }}
    />
  );
};

export default LocalBusinessSchema;
