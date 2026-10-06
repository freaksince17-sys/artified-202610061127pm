import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, 
  X, 
  ChevronDown, 
  ShoppingBag, 
  Eye, 
  Sparkles, 
  Check, 
  Tag, 
  ArrowRight,
  Filter
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Product } from '../types';
import { getRealProductImage, CAVIAR_PEARL_BAG_IMAGE } from '../utils/productImages';

export const SEARCH_CATEGORIES = [
  { id: 'all', label: 'All Items' },
  { id: 'pearl-bags', label: 'Pearl Bags' },
  { id: 'pearl-necklaces', label: 'Necklaces' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'macrame', label: 'Macrame' }
];

export const POPULAR_SEARCH_TERMS = [
  'Red Pearl Bag',
  'Caviar Bag',
  'Adjustable Choker',
  'Necklace with Earrings',
  'Rose Necklace',
  'Keyring Set',
  'Bracelets'
];

interface GlobalSearchBarProps {
  className?: string;
  isMobileCompact?: boolean;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({ 
  className = '', 
  isMobileCompact = false 
}) => {
  const { 
    products, 
    searchQuery, 
    setSearchQuery, 
    setSelectedCategory,
    setQuickViewProduct,
    addToCart,
    setActiveNavTab
  } = useCart();

  const [inputVal, setInputVal] = useState(searchQuery || '');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal input value with global search query when updated elsewhere
  useEffect(() => {
    setInputVal(searchQuery);
  }, [searchQuery]);

  // Shortcut key '/' to focus search input from anywhere
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products by input query and optional category filter
  const searchResults = useMemo(() => {
    const query = inputVal.trim().toLowerCase();
    const queryTokens = query.split(/\s+/).filter(Boolean);

    return products.filter((product) => {
      if (activeCategory !== 'all' && product.category !== activeCategory) {
        return false;
      }

      // If no search query, show all in category
      if (queryTokens.length === 0) {
        return true;
      }

      const searchableText = [
        product.title,
        product.subtitle || '',
        product.description,
        product.category,
        product.materials.join(' '),
        (product.tags || []).join(' ')
      ].join(' ').toLowerCase();

      return queryTokens.every((token) => searchableText.includes(token));
    });
  }, [products, inputVal, activeCategory]);

  const selectedCategoryLabel = SEARCH_CATEGORIES.find((c) => c.id === activeCategory)?.label || 'All';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
    setSearchQuery(val);
    setIsOpen(true);
  };

  const handleClear = () => {
    setInputVal('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleSelectProduct = (product: Product) => {
    setQuickViewProduct(product);
    setIsOpen(false);
  };

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
    setAddedItemIds((prev) => [...prev, product.id]);
    setTimeout(() => {
      setAddedItemIds((prev) => prev.filter((id) => id !== product.id));
    }, 2000);
  };

  const handleViewAllInCatalog = () => {
    setSearchQuery(inputVal);
    setActiveNavTab('home');
    setIsOpen(false);
    
    // Smooth scroll down to catalog
    setTimeout(() => {
      const el = document.getElementById('shop-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 400, behavior: 'smooth' });
      }
    }, 150);
  };

  const handlePopularTermClick = (term: string) => {
    setInputVal(term);
    setSearchQuery(term);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Global Search Bar Input Box */}
      <div 
        className={`flex items-center w-full bg-white/95 rounded-full border transition-all shadow-2xs ${
          isOpen 
            ? 'border-[#C5A880] ring-2 ring-[#C5A880]/20 shadow-md' 
            : 'border-[#E8DFD8] hover:border-[#C5A880]/80'
        }`}
      >
        {/* Search Icon */}
        <div className="pl-3.5 pr-2 text-[#C5A880] shrink-0 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>

        {/* Search Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={
            isMobileCompact 
              ? "Search 33+ handcrafted bags, pearls..." 
              : "Search by product name, choker style, pearl color..."
          }
          className="flex-1 bg-transparent py-1.5 sm:py-2 text-xs sm:text-sm text-[#1C1B1A] placeholder-[#8C847E] focus:outline-none min-w-0 pr-2"
        />

        {/* Clear Button */}
        {inputVal && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 text-[#8C847E] hover:text-[#1C1B1A] transition-colors rounded-full mr-1 cursor-pointer"
            aria-label="Clear search input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Desktop Keyboard Shortcut Badge */}
        {!isMobileCompact && !inputVal && (
          <div className="hidden lg:flex items-center pr-3 pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono text-[#8C7A6B] bg-[#FAF8F5] border border-[#E8DFD8] rounded shadow-2xs">
              /
            </kbd>
          </div>
        )}
      </div>

      {/* Floating Auto-suggest Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl border border-[#E8DFD8] shadow-2xl overflow-hidden z-50 animate-in fade-in duration-150 text-left max-h-[80vh] flex flex-col">
          
          {/* Dropdown Header Bar */}
          <div className="p-3 sm:px-4 bg-[#FAF8F5] border-b border-[#E8DFD8] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1C1B1A]">
                {searchResults.length} {searchResults.length === 1 ? 'Product Found' : 'Products Found'}
              </span>
              {activeCategory !== 'all' && (
                <span className="text-[10px] bg-white border border-[#E8DFD8] text-[#8C7A6B] font-semibold px-2 py-0.5 rounded-full">
                  in {selectedCategoryLabel}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#8C847E] hover:text-[#1C1B1A] p-1 rounded-lg text-xs cursor-pointer"
              title="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Category Filter Pills */}
          <div className="px-3 py-2 bg-white border-b border-[#F0EBE5] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {SEARCH_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  inputRef.current?.focus();
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-[#1C1B1A] text-white shadow-2xs'
                    : 'bg-[#FAF8F5] text-[#5E5955] hover:bg-[#F0EBE5] border border-[#E8DFD8]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Results Scrollable List */}
          <div className="overflow-y-auto divide-y divide-[#F0EBE5] max-h-96">
            {searchResults.length > 0 ? (
              searchResults.map((product) => {
                const isAdded = addedItemIds.includes(product.id);
                const displayImg = getRealProductImage(product.title, product.images?.[0]);

                return (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="p-3 sm:px-4 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    {/* Left: Thumbnail & Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-[#FAF8F5] border border-[#E8DFD8] overflow-hidden shrink-0 flex items-center justify-center">
                        <img 
                          src={displayImg} 
                          alt={product.title} 
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = CAVIAR_PEARL_BAG_IMAGE;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-[#1C1B1A] group-hover:text-[#C5A880] transition-colors truncate">
                          {product.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono font-bold text-[#1C1B1A]">
                            Rs. {product.price.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-[#8C7A6B] bg-[#FAF8F5] px-1.5 py-0.2 rounded border border-[#E8DFD8] uppercase tracking-wider">
                            {product.category.replace('-', ' ')}
                          </span>
                          {product.isBestSeller && (
                            <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1 rounded font-bold">
                              Bestseller
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectProduct(product);
                        }}
                        className="p-1.5 text-[#736C65] hover:text-[#1C1B1A] hover:bg-white rounded-lg border border-transparent hover:border-[#E8DFD8] transition-colors cursor-pointer"
                        title="Quick View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleAddToCart(product, e)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                          isAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#1C1B1A] text-white hover:bg-black'
                        }`}
                        title="Add to Shopping Bag"
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span className="text-[11px]">Added</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-3 h-3 text-[#D4AF37]" />
                            <span className="text-[11px] hidden sm:inline">Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Empty state */
              <div className="py-10 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#E8DFD8] flex items-center justify-center mx-auto text-[#C5A880]">
                  <Search className="w-5 h-5" />
                </div>
                <h5 className="font-serif text-sm font-semibold text-[#1C1B1A]">
                  No handcrafted pieces found
                </h5>
                <p className="text-xs text-[#736C65] max-w-sm mx-auto">
                  We couldn't find items matching &ldquo;{inputVal}&rdquo;. Try another term or choose from popular collections below:
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                  {POPULAR_SEARCH_TERMS.slice(0, 4).map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handlePopularTermClick(term)}
                      className="px-2.5 py-1 bg-[#FAF8F5] hover:bg-white border border-[#E8DFD8] text-[#1C1B1A] rounded-full text-xs transition-colors cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar: View All in Catalog Link */}
          {searchResults.length > 0 && (
            <div className="p-3 bg-[#FAF8F5] border-t border-[#E8DFD8] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-[#736C65]">
                Press <strong>Enter</strong> to explore full catalog
              </span>
              <button
                type="button"
                onClick={handleViewAllInCatalog}
                className="text-xs font-bold text-[#1C1B1A] hover:text-[#C5A880] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>View All In Store ({searchResults.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
