import { Product } from '../types';
import { getProductUrlSlug } from './ogImageGenerator';

export interface SitemapCategory {
  id: string;
  path: string;
  label: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: number;
}

export const SITEMAP_STATIC_ROUTES: SitemapCategory[] = [
  { id: 'home', path: '/', label: 'Storefront Homepage', changefreq: 'daily', priority: 1.0 },
  { id: 'pearl-bags', path: '/pearl-bags', label: 'Handcrafted Pearl Bags Nepal', changefreq: 'daily', priority: 0.9 },
  { id: 'pearl-necklaces', path: '/pearl-necklaces', label: 'Handcrafted Pearl Necklaces & Capes Nepal', changefreq: 'daily', priority: 0.9 },
  { id: 'macrame', path: '/macrame', label: 'Sustainable Macrame Accessories Nepal', changefreq: 'daily', priority: 0.9 },
  { id: 'workshops', path: '/workshops', label: 'Artisan Beading & Macrame Workshops Kathmandu', changefreq: 'weekly', priority: 0.9 },
];

/**
 * Escapes XML special characters for valid XML output
 */
function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Resolves a full absolute URL for an image (handles base64 or relative images safely for Googlebot)
 */
function resolveProductImageUrl(
  img: string | undefined,
  productSlug: string,
  baseUrl = 'https://www.artified.com.np'
): string {
  if (!img || img.startsWith('data:')) {
    return `${baseUrl}/og/products/${productSlug}.jpg`;
  }
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  if (img.startsWith('/')) return `${baseUrl}${img}`;
  return `${baseUrl}/${img}`;
}

/**
 * Generates an XML Sitemap adhering to Google Webmaster & Google Image Sitemap standards
 */
export function generateSitemapXml(
  products: Product[],
  baseUrl = 'https://www.artified.com.np'
): string {
  const today = new Date().toISOString().split('T')[0];

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    '',
    '  <!-- 1. Primary Clean URLs & Category Landing Pages -->',
  ];

  // Static clean canonical routes
  for (const route of SITEMAP_STATIC_ROUTES) {
    const loc = route.path === '/' ? `${baseUrl}/` : `${baseUrl}${route.path}`;
    lines.push('  <url>');
    lines.push(`    <loc>${loc}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push(`    <changefreq>${route.changefreq}</changefreq>`);
    lines.push(`    <priority>${route.priority.toFixed(1)}</priority>`);
    lines.push('  </url>');
  }

  lines.push('');
  lines.push('  <!-- 2. Individual Handcrafted Products (Canonical URLs + Google Image Metadata) -->');

  // Individual products
  for (const product of products) {
    const slug = getProductUrlSlug(product);
    const productUrl = `${baseUrl}/product/${slug}/`;
    const productTitle = escapeXml(product.title);
    const productDesc = escapeXml(
      product.description || product.subtitle || 'Handcrafted pearl and macrame creation in Kathmandu, Nepal'
    );
    const primaryImgUrl = resolveProductImageUrl(product.images?.[0], slug, baseUrl);

    lines.push('  <url>');
    lines.push(`    <loc>${productUrl}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push('    <changefreq>weekly</changefreq>');
    lines.push('    <priority>0.8</priority>');
    lines.push('    <image:image>');
    lines.push(`      <image:loc>${escapeXml(primaryImgUrl)}</image:loc>`);
    lines.push(`      <image:title>${productTitle}</image:title>`);
    lines.push(`      <image:caption>${productDesc}</image:caption>`);
    lines.push('    </image:image>');

    // Additional images if available
    if (product.images && product.images.length > 1) {
      for (let i = 1; i < Math.min(product.images.length, 3); i++) {
        const extraImg = product.images[i];
        if (extraImg && !extraImg.startsWith('data:')) {
          lines.push('    <image:image>');
          lines.push(`      <image:loc>${escapeXml(resolveProductImageUrl(extraImg, slug, baseUrl))}</image:loc>`);
          lines.push(`      <image:title>${productTitle} - Angle ${i + 1}</image:title>`);
          lines.push('    </image:image>');
        }
      }
    }

    lines.push('  </url>');
  }

  lines.push('</urlset>');
  lines.push('');

  return lines.join('\n');
}

