import SAVED_PRODUCTS from '../data/products.json';

/**
 * Returns the authentic handcrafted photo from products.json (or seller-updated catalog in localStorage).
 * Prevents broken ibb.co links or generic Unsplash placeholders from ever displaying.
 */
export function getRealProductImage(titleOrId?: string, currentImage?: string): string {
  const query = (titleOrId || '').toLowerCase().trim();

  // Gather product catalog (prefer any seller-updated products in localStorage, then SAVED_PRODUCTS)
  let catalog: any[] = Array.isArray(SAVED_PRODUCTS) ? (SAVED_PRODUCTS as any[]) : [];
  if (typeof window !== 'undefined') {
    try {
      const localRaw = localStorage.getItem('artified_products');
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          catalog = [...parsed, ...catalog];
        }
      }
    } catch {}
  }

  // 1. Always look up by exact title or ID in the product catalog first
  if (query) {
    const exactMatch = catalog.find((p) => {
      if (!p || !p.images || !p.images[0]) return false;
      const pTitle = (p.title || '').toLowerCase().trim();
      const pId = (p.id || '').toLowerCase().trim();
      return pTitle === query || pId === query;
    });
    if (exactMatch?.images?.[0] && !exactMatch.images[0].includes('ibb.co')) {
      return exactMatch.images[0];
    }

    // 2. Partial / keyword match in catalog
    const partialMatch = catalog.find((p) => {
      if (!p || !p.images || !p.images[0] || p.images[0].includes('ibb.co')) return false;
      const pTitle = (p.title || '').toLowerCase().trim();
      if (query.includes('caviar') && pTitle.includes('caviar')) return true;
      if (query === 'pearl beaded bag' && pTitle === 'pearl beaded bag') return true;
      if (query.includes('red pearl') && pTitle.includes('red pearl')) return true;
      if (query.includes('round') && pTitle.includes('round')) return true;
      if (query.includes('choker') && pTitle.includes('choker')) return true;
      if (pTitle.includes(query) || query.includes(pTitle)) return true;
      return false;
    });
    if (partialMatch?.images?.[0]) {
      return partialMatch.images[0];
    }
  }

  // 3. If currentImage is a valid data URI or working URL (and NOT broken ibb.co or unsplash placeholder), use it
  if (
    currentImage &&
    !currentImage.includes('ibb.co') &&
    !currentImage.includes('unsplash.com') &&
    !currentImage.includes('placeholder') &&
    !currentImage.includes('via.placeholder')
  ) {
    return currentImage;
  }

  // 4. Fallback to the signature Caviar Pearl Bag handcrafted image (Product 0)
  return (SAVED_PRODUCTS as any[])[0]?.images?.[0] || '';
}

export const CAVIAR_PEARL_BAG_IMAGE = (SAVED_PRODUCTS as any[])[0]?.images?.[0] || '';
export const CHOKER_PEARL_IMAGE = (SAVED_PRODUCTS as any[])[1]?.images?.[0] || '';
export const PEARL_BEADED_BAG_IMAGE = (SAVED_PRODUCTS as any[])[2]?.images?.[0] || '';
export const ROUND_PEARL_BAG_IMAGE = (SAVED_PRODUCTS as any[])[29]?.images?.[0] || '';
