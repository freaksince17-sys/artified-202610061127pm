import SAVED_PRODUCTS from '../data/products.json';

/**
 * Explicit alias map from order item title variations to canonical product IDs in products.json
 */
const TITLE_VARIATION_TO_PRODUCT_ID: Array<{ match: string; productId: string }> = [
  { match: 'beaded pearl layer necklace', productId: 'art-1790323549756-24tl6' },
  { match: 'macrame plant hanger', productId: 'art-1790323202380-nw0zi' },
  { match: 'marble bead', productId: 'art-1790321559072-ym8ui' },
  { match: 'three layer pearl necklace with earrings', productId: 'tara-micro-pearl-clutch' },
  { match: 'pearl beaded keyring set of 4', productId: 'art-1790334939460-sj7ss' },
  { match: 'silk scrunchies set of 4', productId: 'art-1790339748217-gx4df' },
  { match: 'caviar pearl bag', productId: 'apsara-layered-pearl-collar' },
  { match: 'red pearl beaded bag', productId: 'maya-aurelia-pearl-bag' },
  { match: 'pearl beaded bag', productId: 'lalitpur-bloom-pearl-tote' },
  { match: 'pearl whisper minimalist choker', productId: 'art-1790340220660-1ix2y' },
  { match: 'pearl beaded adjustable choker', productId: 'chandra-baroque-pearl-choker' }
];

/**
 * Returns the authentic handcrafted photo from products.json (or seller-updated catalog in localStorage).
 * Prevents broken ibb.co links, generic Unsplash placeholders, or wrong fallback photos on orders.
 */
export function getRealProductImage(
  titleOrId?: string,
  currentImage?: string,
  explicitProductId?: string
): string {
  const query = (titleOrId || '').toLowerCase().trim();
  const cleanExplicitId = (explicitProductId || '').toLowerCase().trim();

  // Gather product catalog (prefer any seller-updated products in localStorage, then SAVED_PRODUCTS)
  let catalog: any[] = Array.isArray(SAVED_PRODUCTS) ? (SAVED_PRODUCTS as any[]) : [];
  if (typeof window !== 'undefined') {
    try {
      const localRaw =
        localStorage.getItem('artified_products_v3') ||
        localStorage.getItem('artified_products_custom') ||
        localStorage.getItem('artified_products');
      if (localRaw && localRaw.length < 800000) {
        const parsed = JSON.parse(localRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          catalog = [...parsed, ...catalog];
        }
      }
    } catch {}
  }

  const isValidCatalogImage = (img?: string) =>
    Boolean(img && typeof img === 'string' && !img.includes('ibb.co') && img.trim() !== '');

  // 0. If explicitProductId is provided, look up by exact product ID first
  if (cleanExplicitId) {
    const byId = catalog.find(
      (p) => p && (p.id || '').toLowerCase().trim() === cleanExplicitId && isValidCatalogImage(p.images?.[0])
    );
    if (byId?.images?.[0]) {
      return byId.images[0];
    }
  }

  // 1. Always look up by exact title or ID in the product catalog
  if (query) {
    const exactMatch = catalog.find((p) => {
      if (!p || !isValidCatalogImage(p.images?.[0])) return false;
      const pTitle = (p.title || '').toLowerCase().trim();
      const pId = (p.id || '').toLowerCase().trim();
      return pTitle === query || pId === query;
    });
    if (exactMatch?.images?.[0]) {
      return exactMatch.images[0];
    }

    // 2. Check known order item title variations (e.g. "Beaded Pearl Layer Necklace With Earring Set",
    //    "Handmade Macrame Plant Hanger (flower pot not included)", "Marble Beaded Hand Bag")
    for (const alias of TITLE_VARIATION_TO_PRODUCT_ID) {
      if (query.includes(alias.match)) {
        const aliasProd = catalog.find(
          (p) => p && (p.id || '').toLowerCase().trim() === alias.productId && isValidCatalogImage(p.images?.[0])
        );
        if (aliasProd?.images?.[0]) {
          return aliasProd.images[0];
        }
      }
    }

    // 3. Partial / substring match in catalog
    const partialMatch = catalog.find((p) => {
      if (!p || !isValidCatalogImage(p.images?.[0])) return false;
      const pTitle = (p.title || '').toLowerCase().trim();
      if (!pTitle) return false;
      return pTitle.includes(query) || query.includes(pTitle);
    });
    if (partialMatch?.images?.[0]) {
      return partialMatch.images[0];
    }

    // 4. Token overlap scoring for titles with minor word variations
    const cleanTokens = query
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !['with', 'and', 'the', 'for', 'without', 'not', 'set'].includes(w));

    if (cleanTokens.length > 0) {
      let bestProd: any = null;
      let bestScore = 0;

      for (const p of catalog) {
        if (!p || !isValidCatalogImage(p.images?.[0])) continue;
        const pTitle = (p.title || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
        let matches = 0;
        for (const tok of cleanTokens) {
          const stem = tok.endsWith('ed') && tok.length > 4 ? tok.slice(0, -2) : tok.endsWith('s') && tok.length > 3 ? tok.slice(0, -1) : tok;
          if (pTitle.includes(tok) || pTitle.includes(stem)) {
            matches++;
          }
        }
        const score = matches / cleanTokens.length;
        if (score > bestScore && score >= 0.6) {
          bestScore = score;
          bestProd = p;
        }
      }

      if (bestProd?.images?.[0]) {
        return bestProd.images[0];
      }
    }
  }

  // 5. If currentImage is a valid data URI or working URL (and NOT broken ibb.co or unsplash placeholder), use it
  if (
    currentImage &&
    !currentImage.includes('ibb.co') &&
    !currentImage.includes('unsplash.com') &&
    !currentImage.includes('placeholder') &&
    !currentImage.includes('via.placeholder')
  ) {
    return currentImage;
  }

  // 6. Fallback to the signature Caviar Pearl Bag handcrafted image (Product 0)
  return (SAVED_PRODUCTS as any[])[0]?.images?.[0] || '';
}

export const CAVIAR_PEARL_BAG_IMAGE = (SAVED_PRODUCTS as any[])[0]?.images?.[0] || '';
export const CHOKER_PEARL_IMAGE = (SAVED_PRODUCTS as any[])[1]?.images?.[0] || '';
export const PEARL_BEADED_BAG_IMAGE = (SAVED_PRODUCTS as any[])[2]?.images?.[0] || '';
export const ROUND_PEARL_BAG_IMAGE = (SAVED_PRODUCTS as any[])[29]?.images?.[0] || '';
