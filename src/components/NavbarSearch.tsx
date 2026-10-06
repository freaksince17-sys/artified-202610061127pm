import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  X, 
  ShoppingBag, 
  Eye, 
  Sparkles, 
  ArrowRight, 
  Check, 
  SlidersHorizontal,
  Flame,
  Tag
} from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { getRealProductImage, CAVIAR_PEARL_BAG_IMAGE } from '../utils/productImages';

interface NavbarSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NavbarSearch: React.FC<NavbarSearchProps> = ({ isOpen, onClose }) => {
  const { 
    searchQuery, 
    setSearchQuery, 
    setSelectedCategory, 
    setQuickViewProduct, 
    addToCart,
    products
  } = useCart();

  const [searchCategory, setSearchCategory] = useState<string>('all');
  const [addedItemIds, setAddedItemIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Real-time filtering algorithm across full catalog
  const filteredResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const queryTokens = query.split(/\s+/).filter(Boolean);

    return products.filter((product) => {
      // 1. Category Filter Check
      if (searchCategory !== 'all') {
        if (searchCategory === 'pearl-bags' && product.category !== 'pearl-bags') return false;
        if (searchCategory === 'pearl-necklaces' && product.category !== 'pearl-necklaces') return false;
        if (searchCategory === 'macrame' && product.category !== 'macrame') return false;
        if (searchCategory === 'accessories' && product.category !== 'accessories') return false;
        if (searchCategory === 'under-4000' && product.price >= 4000) return false;
      }

      // 2. Text Query Search Check
      if (queryTokens.length === 0) {
        return true;
      }

      const searchableFields = [
        product.title.toLowerCase(),
        product.subtitle.toLowerCase(),
        product.category.toLowerCase(),
        product.description.toLowerCase(),
        ...product.tags.map((t) => t.toLowerCase()),
        ...product.materials.map((m) => m.toLowerCase()),
        product.category === 'pearl-bags' ? 'pearl bag purse clutch handbag' : '',
        product.category === 'pearl-necklaces' ? 'necklace choker jewelry collar' : '',
        product.category === 'macrame' ? 'macrame cotton bohemian boho knot' : '',
        product.category === 'accessories' ? 'accessories keychain strap charm wristlet lanyard accessory' : ''
      ].join(' ');

      // Every token must match somewhere in the product metadata
      return queryTokens.every((token) => searchableFields.includes(token));
    });
  }, [products, searchQuery, searchCategory]);

  const handleAddDirect = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
    setAddedItemIds((prev) => [...prev, product.id]);
    setTimeout(() => {
      setAddedItemIds((prev) => prev.filter((id) => id !== product.id));
    }, 2000);
  };

  const handleViewProduct = (product: Product) => {
    onClose();
    setQuickViewProduct(product);
  };

  const handleApplyToCatalog = () => {
    if (searchCategory !== 'all' && searchCategory !== 'under-4000') {
      setSelectedCategory(searchCategory);
    } else {
      setSelectedCategory('all');
    }
    onClose();
    const el = document.getElementById('shop-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePopularSearchClick = (term: string, cat = 'all') => {
    setSearchQuery(term);
    setSearchCategory(cat);
  };

  if (!isOpen) return null;

  const popularSearches = [
    { label: 'Pearl Bags', query: 'pearl bag', cat: 'pearl-bags' },
    { label: 'Freshwater Baroque Choker', query: 'baroque choker', cat: 'pearl-necklaces' },
    { label: 'Bohemian Macrame', query: 'macrame', cat: 'macrame' },
    { label: 'Handcrafted Accessories', query: 'accessories', cat: 'accessories' },
    { label: 'Bridal Pieces', query: 'bridal', cat: 'all' },
    { label: 'Under Rs. 4,000', query: '', cat: 'under-4000' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col justify-start bg-black/50 backdrop-blur-xs animate-fade-in">
      {/* Click outside to close backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Search Panel */}
      <div className="relative w-full max-w-4xl mx-auto bg-[#FAF8F5] shadow-2xl border-b border-[#E8DFD8] rounded-b-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col">
        
        {/* Search Input Bar */}
        <div className="p-4 sm:p-6 bg-white border-b border-[#E8DFD8]">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 flex items-center">
              <Search className="w-5 h-5 text-[#C5A880] absolute left-4 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyToCatalog();
                  }
                }}
                placeholder="Search by product name, pearl type, macrame, or category..."
                aria-label="Search by product name, pearl type, macrame, or category"
                className="w-full pl-12 pr-10 py-3.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-sm text-[#1C1B1A] placeholder-[#9E9791] focus:outline-none focus:border-[#C5A880] focus:bg-white transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search input"
                  className="absolute right-3 p-1 rounded-full text-[#8C847E] hover:text-[#1C1B1A] hover:bg-[#E8DFD8] transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close search modal"
              className="p-3 text-[#5E5955] hover:text-[#1C1B1A] hover:bg-[#FAF8F5] rounded-xl transition-colors border border-[#E8DFD8] text-xs font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Close</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-[#FAF8F5] border border-[#D8CFCA] rounded text-[#8C7A6B]">
                ESC
              </kbd>
            </button>
          </div>

          {/* Real-time Category Filter Pills */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 text-xs no-scrollbar" role="group" aria-label="Category filters">
            <span className="text-[11px] font-semibold text-[#8C7A6B] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C5A880]" />
              Filter:
            </span>

            {[
              { id: 'all', label: 'All Catalog' },
              { id: 'pearl-bags', label: 'Pearl Bags' },
              { id: 'pearl-necklaces', label: 'Pearl Necklaces' },
              { id: 'macrame', label: 'Macrame' },
              { id: 'accessories', label: 'Accessories' },
              { id: 'under-4000', label: 'Under Rs. 4,000' },
            ].map((cat) => {
              const isActive = searchCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSearchCategory(cat.id)}
                  aria-label={`Filter by ${cat.label}`}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#1C1B1A] text-white shadow-xs'
                      : 'bg-[#FAF8F5] text-[#5E5955] border border-[#E8DFD8] hover:border-[#C5A880] hover:text-[#1C1B1A]'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results / Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          
          {/* Active Result Status Header */}
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E8DFD8]">
            <p className="text-xs text-[#736C65]">
              {searchQuery.trim() || searchCategory !== 'all' ? (
                <>
                  Found <strong className="text-[#1C1B1A] font-semibold">{filteredResults.length}</strong> handcrafted {filteredResults.length === 1 ? 'piece' : 'pieces'}
                  {searchQuery && <span> for &ldquo;{searchQuery}&rdquo;</span>}
                </>
              ) : (
                <span className="flex items-center gap-1.5 font-medium text-[#1C1B1A]">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  Popular Suggestions & Entire Handcrafted Catalog
                </span>
              )}
            </p>

            {filteredResults.length > 0 && (
              <button
                type="button"
                onClick={handleApplyToCatalog}
                className="text-xs font-semibold text-[#8C7A6B] hover:text-[#1C1B1A] flex items-center gap-1 transition-colors uppercase tracking-wider"
              >
                <span>View in Shop</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C5A880]" />
              </button>
            )}
          </div>

          {/* If No Results Found */}
          {filteredResults.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-white border border-[#E8DFD8] flex items-center justify-center mx-auto text-[#C5A880]">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="font-serif text-lg font-medium text-[#1C1B1A]">
                No creations found matching &ldquo;{searchQuery}&rdquo;
              </h4>
              <p className="text-xs text-[#736C65] max-w-md mx-auto leading-relaxed">
                We handcraft each piece in Nepal. Try searching with different keywords like &ldquo;pearl&rdquo;, &ldquo;bag&rdquo;, &ldquo;choker&rdquo;, or &ldquo;macrame&rdquo;.
              </p>

              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchCategory('all');
                  }}
                  className="px-4 py-2 bg-white border border-[#E8DFD8] rounded-full text-xs font-medium text-[#1C1B1A] hover:border-[#C5A880]"
                >
                  Reset Search Filter
                </button>
                <a
                  href="https://wa.me/9779767573721?text=Namaste!%20I%20am%20looking%20for%20a%20specific%20handcrafted%20pearl%20piece%20from%20Kathmandu,%20Kathmandu."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#1C1B1A] text-white rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#34312F] transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Ask on WhatsApp</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Product Match Rows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredResults.map((product) => {
                  const isAdded = addedItemIds.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      onClick={() => handleViewProduct(product)}
                      className="group p-3 bg-white hover:bg-[#FAF8F5] border border-[#E8DFD8] hover:border-[#C5A880] rounded-xl flex gap-3 cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-sm"
                    >
                      {/* Product Thumbnail */}
                      <div className="w-20 h-24 rounded-lg overflow-hidden bg-[#FAF8F5] shrink-0 border border-[#F0EBE5] relative">
                        <img
                          src={getRealProductImage(product.title, product.images[0])}
                          alt={product.title}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = CAVIAR_PEARL_BAG_IMAGE;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {product.isBestSeller && (
                          <span className="absolute top-1 left-1 bg-[#1C1B1A] text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Best
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 flex flex-col justify-between overflow-hidden">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#FAF8F5] text-[#8C7A6B] border border-[#E8DFD8] font-medium">
                              {product.category.replace('-', ' ')}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-medium">
                              • In Stock
                            </span>
                          </div>

                          <h5 className="font-serif text-xs sm:text-sm font-semibold text-[#1C1B1A] leading-snug line-clamp-1 group-hover:text-[#C5A880] transition-colors">
                            {product.title}
                          </h5>

                          <p className="text-[11px] text-[#736C65] line-clamp-1 mt-0.5">
                            {product.subtitle}
                          </p>
                        </div>

                        {/* Price & Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#F0EBE5]">
                          <div>
                            <span className="text-xs font-bold text-[#1C1B1A]">
                              Rs. {product.price.toLocaleString()}
                            </span>
                            {product.originalPrice && (
                              <span className="text-[10px] text-[#9E9791] line-through ml-1.5">
                                Rs. {product.originalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewProduct(product);
                              }}
                              aria-label={`Quick view details for ${product.title}`}
                              className="p-1.5 rounded-lg border border-[#E8DFD8] text-[#5E5955] hover:text-[#1C1B1A] hover:bg-white transition-colors cursor-pointer"
                              title="Quick View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleAddDirect(product, e)}
                              aria-label={`Add ${product.title} to shopping bag`}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                                isAdded
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[#1C1B1A] text-white hover:bg-[#34312F]'
                              }`}
                              title="Add to Bag"
                            >
                              {isAdded ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span className="text-[10px]">Added</span>
                                </>
                              ) : (
                                <>
                                  <ShoppingBag className="w-3 h-3 text-[#C5A880]" />
                                  <span className="text-[10px]">Add</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Search Suggestions Footer */}
              {!searchQuery && (
                <div className="pt-4 border-t border-[#E8DFD8]">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8C7A6B] mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#C5A880]" />
                    Trending Searches in Nepal
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePopularSearchClick(item.query, item.cat)}
                        className="px-3 py-1 bg-white hover:bg-[#FAF8F5] border border-[#E8DFD8] hover:border-[#C5A880] rounded-full text-xs text-[#5E5955] hover:text-[#1C1B1A] transition-colors"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer with Catalog Action */}
        <div className="p-4 bg-white border-t border-[#E8DFD8] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="text-[#736C65] text-center sm:text-left">
            🚚 Free delivery across Kathmandu Valley on orders over Rs. 3,500
          </p>

          <button
            type="button"
            onClick={handleApplyToCatalog}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#1C1B1A] text-white font-semibold uppercase tracking-wider text-xs rounded-xl hover:bg-[#34312F] transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <span>Explore All in Gallery ({filteredResults.length})</span>
            <ArrowRight className="w-4 h-4 text-[#C5A880]" />
          </button>
        </div>

      </div>
    </div>
  );
};
