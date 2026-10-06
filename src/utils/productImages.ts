import SAVED_PRODUCTS from '../data/products.json';

/**
 * Returns the authentic handcrafted photo from products.json
 * Prevents generic Unsplash placeholders from ever displaying.
 */
export function getRealProductImage(titleOrId?: string, currentImage?: string): string {
  // If currentImage is valid and NOT an unsplash generic placeholder or external mock, use it
  if (
    currentImage &&
    !currentImage.includes('unsplash.com') &&
    !currentImage.includes('placeholder') &&
    !currentImage.includes('via.placeholder')
  ) {
    return currentImage;
  }

  const query = (titleOrId || '').toLowerCase().trim();

  // Find direct match in SAVED_PRODUCTS
  const matched = (SAVED_PRODUCTS as any[]).find((p) => {
    if (!p) return false;
    const pTitle = (p.title || '').toLowerCase();
    const pId = (p.id || '').toLowerCase();
    if (query && (pTitle === query || pId === query)) return true;
    if (query.includes('caviar') && pTitle.includes('caviar')) return true;
    if (query.includes('choker') && pTitle.includes('choker')) return true;
    if (query.includes('round') && pTitle.includes('round')) return true;
    if (query.includes('red pearl') && (pTitle.includes('red') || pTitle.includes('pearl'))) return true;
    if (query && (pTitle.includes(query) || query.includes(pTitle))) return true;
    return false;
  });

  if (matched && matched.images && matched.images[0]) {
    return matched.images[0];
  }

  // Default to the signature Caviar Pearl Bag handcrafted image (Product 0)
  return (SAVED_PRODUCTS as any[])[0]?.images?.[0] || '';
}

export const CAVIAR_PEARL_BAG_IMAGE = (SAVED_PRODUCTS as any[])[0]?.images?.[0] || '';
export const CHOKER_PEARL_IMAGE = (SAVED_PRODUCTS as any[])[1]?.images?.[0] || '';
export const PEARL_BEADED_BAG_IMAGE = (SAVED_PRODUCTS as any[])[2]?.images?.[0] || '';
export const ROUND_PEARL_BAG_IMAGE = (SAVED_PRODUCTS as any[])[29]?.images?.[0] || '';
