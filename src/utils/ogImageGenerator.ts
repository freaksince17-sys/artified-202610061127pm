import { Product } from '../types';

export const DEFAULT_STORE_ORIGIN = 'https://www.artified.com.np';

function escapeXmlText(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getCategoryDisplayLabel(category?: string): string {
  switch (category) {
    case 'pearl-bags':
      return 'HANDMADE PEARL BAGS • NEPAL';
    case 'pearl-necklaces':
      return 'PEARL NECKLACES & CAPES • NEPAL';
    case 'macrame':
      return 'HANDWOVEN MACRAME • NEPAL';
    case 'accessories':
      return 'ARTISAN ACCESSORIES • NEPAL';
    default:
      return 'HANDCRAFTED WEARABLE ART • NEPAL';
  }
}

function wrapTextIntoLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['Artified Nepal Creation'];

  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        if (lines.length === maxLines) {
          const last = lines[maxLines - 1];
          lines[maxLines - 1] = last.length > maxCharsPerLine - 3
            ? `${last.slice(0, maxCharsPerLine - 3).trim()}...`
            : `${last}...`;
          return lines;
        }
      }
      currentLine = word.length > maxCharsPerLine ? `${word.slice(0, maxCharsPerLine - 1)}…` : word;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Returns the canonical relative path for a product's generated 1200x630 OpenGraph image.
 */
export function getProductOgImagePath(productId: string): string {
  return `/og/products/${encodeURIComponent(productId)}.jpg`;
}

/**
 * Resolves the absolute OpenGraph image URL for a product so Instagram, TikTok,
 * WhatsApp, and search crawlers always render a tailored preview card with the
 * product name and Buy Now CTA.
 */
export function getProductOgImageUrl(
  product: Pick<Product, 'id'>,
  origin?: string
): string {
  const resolvedOrigin = (
    origin ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : DEFAULT_STORE_ORIGIN)
  ).replace(/\/+$/, '');

  return `${resolvedOrigin}${getProductOgImagePath(product.id)}`;
}

/**
 * Resolves a product share URL for social sharing (Instagram Stories, TikTok bio, WhatsApp).
 */
export function getProductShareUrl(
  product: Pick<Product, 'id'>,
  origin?: string
): string {
  const resolvedOrigin = (
    origin ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : DEFAULT_STORE_ORIGIN)
  ).replace(/\/+$/, '');

  const encodedId = encodeURIComponent(product.id);
  return `${resolvedOrigin}/product/${encodedId}/?product=${encodedId}`;
}

/**
 * Builds a deterministic 1200x630 SVG OpenGraph social preview card for a product,
 * featuring the product photograph, Artified Nepal branding, exact product name,
 * transparent NPR pricing, and a prominent "Buy Now" call-to-action button.
 *
 * Works both in headless Node.js build scripts (rasterized with sharp to .jpg)
 * and as a zero-dependency vector fallback in the browser.
 */
export function buildProductOgSvgMarkup(
  product: Pick<Product, 'id' | 'title' | 'price' | 'originalPrice' | 'category' | 'subtitle' | 'inStock' | 'stockCount'>,
  options?: {
    embeddedImageDataUri?: string;
    ctaLabel?: string;
    domainLabel?: string;
  }
): string {
  const ctaLabel = escapeXmlText(options?.ctaLabel || 'Buy Now');
  const domainLabel = escapeXmlText(options?.domainLabel || 'artified.com.np');
  const categoryLabel = escapeXmlText(getCategoryDisplayLabel(product.category));

  const titleLines = wrapTextIntoLines(product.title, 22, 3);
  const titleFontSize = titleLines.length >= 3 ? 40 : titleLines.some((l) => l.length > 18) ? 44 : 50;
  const lineHeight = Math.round(titleFontSize * 1.16);
  const titleStartY = titleLines.length === 1 ? 236 : titleLines.length === 2 ? 214 : 196;

  const titleTextElements = titleLines
    .map(
      (line, idx) =>
        `<text x="618" y="${titleStartY + idx * lineHeight}" font-family="'DejaVu Serif', 'Liberation Serif', Georgia, serif" font-size="${titleFontSize}" font-weight="700" fill="#1C1B1A">${escapeXmlText(line)}</text>`
    )
    .join('\n    ');

  const subtitleY = titleStartY + titleLines.length * lineHeight + 22;
  const cleanSubtitle = wrapTextIntoLines(
    product.subtitle || 'Handcrafted in Kathmandu • Fast Delivery Across Nepal',
    46,
    1
  )[0];

  const priceText = `NPR ${Number(product.price || 0).toLocaleString('en-US')}`;
  const hasDiscount =
    typeof product.originalPrice === 'number' && product.originalPrice > (product.price || 0);
  const originalPriceText = hasDiscount
    ? `NPR ${Number(product.originalPrice).toLocaleString('en-US')}`
    : '';

  const isOutOfStock =
    product.inStock === false ||
    (typeof product.stockCount === 'number' && product.stockCount <= 0);
  const availabilityText = isOutOfStock ? 'MADE TO ORDER • KATHMANDU' : 'IN STOCK • READY TO SHIP';

  const imageBlock = options?.embeddedImageDataUri
    ? `<image href="${escapeXmlText(options.embeddedImageDataUri)}" x="54" y="54" width="510" height="522" preserveAspectRatio="xMidYMid slice" clip-path="url(#productPhotoClip)" />`
    : `<rect x="54" y="54" width="510" height="522" rx="24" fill="#EFE9E0" />
       <circle cx="309" cy="275" r="78" fill="none" stroke="#C5A880" stroke-width="2.5" stroke-dasharray="6 6" />
       <text x="309" y="286" text-anchor="middle" font-family="'DejaVu Serif', Georgia, serif" font-size="38" font-weight="700" fill="#1C1B1A">ARTIFIED_NP</text>
       <text x="309" y="324" text-anchor="middle" font-family="'DejaVu Sans', sans-serif" font-size="16" font-weight="600" letter-spacing="3" fill="#7A5216">HANDCRAFTED IN NEPAL</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="creamBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FAF8F5" />
      <stop offset="100%" stop-color="#EFE7DC" />
    </linearGradient>
    <linearGradient id="goldBtn" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1C1B1A" />
      <stop offset="100%" stop-color="#2E2A26" />
    </linearGradient>
    <clipPath id="productPhotoClip">
      <rect x="54" y="54" width="510" height="522" rx="24" />
    </clipPath>
  </defs>

  <!-- Outer Editorial Canvas -->
  <rect width="1200" height="630" fill="url(#creamBg)" />
  <rect x="18" y="18" width="1164" height="594" rx="28" fill="none" stroke="#D4B88C" stroke-width="2" />
  <rect x="26" y="26" width="1148" height="578" rx="22" fill="none" stroke="#1C1B1A" stroke-opacity="0.1" stroke-width="1" />

  <!-- Left Product Photograph Frame -->
  <rect x="50" y="50" width="518" height="530" rx="26" fill="#FFFFFF" stroke="#C5A880" stroke-width="2" />
  ${imageBlock}
  <rect x="72" y="514" width="276" height="38" rx="19" fill="#1C1B1A" fill-opacity="0.9" />
  <text x="210" y="538" text-anchor="middle" font-family="'DejaVu Sans', sans-serif" font-size="13" font-weight="700" letter-spacing="1.5" fill="#D4AF37">${availabilityText}</text>

  <!-- Right Product Details & Call-To-Action -->
  <text x="618" y="96" font-family="'DejaVu Sans', sans-serif" font-size="15" font-weight="700" letter-spacing="3" fill="#8C6730">${categoryLabel}</text>
  <line x1="618" y1="116" x2="1128" y2="116" stroke="#D8CBB8" stroke-width="1.5" />

  ${titleTextElements}

  <text x="618" y="${subtitleY}" font-family="'DejaVu Sans', sans-serif" font-size="19" font-weight="500" fill="#5C534B">${escapeXmlText(cleanSubtitle)}</text>

  <!-- Price Row -->
  <text x="618" y="422" font-family="'DejaVu Sans', sans-serif" font-size="34" font-weight="700" fill="#1C1B1A">${escapeXmlText(priceText)}</text>
  ${
    originalPriceText
      ? `<text x="855" y="420" font-family="'DejaVu Sans', sans-serif" font-size="22" text-decoration="line-through" fill="#8C847E">${escapeXmlText(originalPriceText)}</text>`
      : ''
  }

  <!-- Prominent Buy Now Call-To-Action Button -->
  <rect x="618" y="464" width="320" height="72" rx="16" fill="url(#goldBtn)" stroke="#D4AF37" stroke-width="2.5" />
  <text x="778" y="509" text-anchor="middle" font-family="'DejaVu Sans', sans-serif" font-size="25" font-weight="700" letter-spacing="1" fill="#F5D98B">${ctaLabel}  →</text>

  <!-- Brand Signature Footer -->
  <text x="618" y="574" font-family="'DejaVu Sans', sans-serif" font-size="15" font-weight="700" letter-spacing="1" fill="#5C534B">@artified_np  •  ${domainLabel}</text>
</svg>`;
}

function loadBrowserImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined' || !src) {
      resolve(null);
      return;
    }
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('/')) {
      img.crossOrigin = 'anonymous';
    }
    const timer = window.setTimeout(() => resolve(null), 4000);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Generates a high-resolution 1200x630 OpenGraph JPEG data URL directly in the browser
 * containing the product's image, title, NPR price, and a bold "Buy Now" CTA button
 * tailored for Instagram Stories, TikTok, and link preview cards.
 */
export async function generateProductOgImageDataUrl(
  product: Product,
  options?: { ctaLabel?: string; domainLabel?: string }
): Promise<string> {
  const ctaLabel = options?.ctaLabel || 'Buy Now';
  const domainLabel = options?.domainLabel || 'artified.com.np';

  if (typeof document === 'undefined') {
    const svg = buildProductOgSvgMarkup(product, { ctaLabel, domainLabel });
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const svg = buildProductOgSvgMarkup(product, { ctaLabel, domainLabel });
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  // 1. Cream editorial gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
  bgGrad.addColorStop(0, '#FAF8F5');
  bgGrad.addColorStop(1, '#EFE7DC');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 630);

  // Outer gold frame
  ctx.strokeStyle = '#D4B88C';
  ctx.lineWidth = 2;
  drawRoundedRectPath(ctx, 18, 18, 1164, 594, 28);
  ctx.stroke();

  // 2. Left product image panel
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#C5A880';
  ctx.lineWidth = 2;
  drawRoundedRectPath(ctx, 50, 50, 518, 530, 26);
  ctx.fill();
  ctx.stroke();

  const primaryImageSrc = product.images?.[0] || '/og-image.jpg';
  const img = await loadBrowserImage(primaryImageSrc);

  ctx.save();
  drawRoundedRectPath(ctx, 54, 54, 510, 522, 24);
  ctx.clip();

  if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
    const targetW = 510;
    const targetH = 522;
    const scale = Math.max(targetW / img.naturalWidth, targetH / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const offsetX = 54 + (targetW - drawW) / 2;
    const offsetY = 54 + (targetH - drawH) / 2;
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
  } else {
    ctx.fillStyle = '#EFE9E0';
    ctx.fillRect(54, 54, 510, 522);
    ctx.fillStyle = '#1C1B1A';
    ctx.font = 'bold 36px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('ARTIFIED_NP', 309, 295);
  }
  ctx.restore();

  // Status badge on photo
  const isOutOfStock =
    product.inStock === false ||
    (typeof product.stockCount === 'number' && product.stockCount <= 0);
  ctx.fillStyle = 'rgba(28, 27, 26, 0.9)';
  drawRoundedRectPath(ctx, 72, 514, 276, 38, 19);
  ctx.fill();
  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    isOutOfStock ? 'MADE TO ORDER • NEPAL' : 'IN STOCK • READY TO SHIP',
    210,
    538
  );

  // 3. Right column copy & Buy Now CTA
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8C6730';
  ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(getCategoryDisplayLabel(product.category), 618, 96);

  ctx.strokeStyle = '#D8CBB8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(618, 116);
  ctx.lineTo(1128, 116);
  ctx.stroke();

  // Wrapped product title
  const titleLines = wrapTextIntoLines(product.title, 22, 3);
  const titleFontSize = titleLines.length >= 3 ? 40 : titleLines.some((l) => l.length > 18) ? 44 : 50;
  const lineHeight = Math.round(titleFontSize * 1.16);
  const titleStartY = titleLines.length === 1 ? 236 : titleLines.length === 2 ? 214 : 196;

  ctx.fillStyle = '#1C1B1A';
  ctx.font = `bold ${titleFontSize}px Georgia, "Playfair Display", serif`;
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, 618, titleStartY + idx * lineHeight);
  });

  // Subtitle / Delivery line
  const subtitleY = titleStartY + titleLines.length * lineHeight + 24;
  ctx.fillStyle = '#5C534B';
  ctx.font = '500 19px "Plus Jakarta Sans", sans-serif';
  const subtitleLine = wrapTextIntoLines(
    product.subtitle || 'Handcrafted in Kathmandu • Fast Delivery Across Nepal',
    46,
    1
  )[0];
  ctx.fillText(subtitleLine, 618, subtitleY);

  // Price
  ctx.fillStyle = '#1C1B1A';
  ctx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`NPR ${Number(product.price || 0).toLocaleString('en-US')}`, 618, 422);

  // Buy Now CTA button
  const btnGrad = ctx.createLinearGradient(618, 464, 938, 536);
  btnGrad.addColorStop(0, '#1C1B1A');
  btnGrad.addColorStop(1, '#2E2A26');
  ctx.fillStyle = btnGrad;
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 2.5;
  drawRoundedRectPath(ctx, 618, 464, 320, 72, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#F5D98B';
  ctx.font = 'bold 25px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${ctaLabel}  →`, 778, 509);

  // Footer signature
  ctx.textAlign = 'left';
  ctx.fillStyle = '#5C534B';
  ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`@artified_np  •  ${domainLabel}`, 618, 574);

  try {
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    const svg = buildProductOgSvgMarkup(product, { ctaLabel, domainLabel });
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
}

/**
 * Generates a downloadable/shareable Blob for a product's 1200x630 OpenGraph preview card.
 */
export async function generateProductOgImageBlob(product: Product): Promise<Blob | null> {
  const dataUrl = await generateProductOgImageDataUrl(product);
  try {
    const res = await fetch(dataUrl);
    return await res.blob();
  } catch {
    return null;
  }
}

/**
 * Generates a File object suitable for `navigator.share({ files })` on Instagram / TikTok / mobile share sheets.
 */
export async function generateProductOgImageFile(product: Product): Promise<File | null> {
  const blob = await generateProductOgImageBlob(product);
  if (!blob || typeof File === 'undefined') return null;
  const safeSlug = product.id.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
  const ext = blob.type.includes('svg') ? 'svg' : 'jpg';
  return new File([blob], `artified-${safeSlug}-buy-now.${ext}`, {
    type: blob.type || 'image/jpeg'
  });
}
