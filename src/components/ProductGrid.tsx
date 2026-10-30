import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  ChevronRight,
  SearchX, 
  Sparkles,
  ShoppingBag,
  Star,
  Search
} from 'lucide-react';
import { ProductCard } from './ProductCard';
import { useCart } from '../context/CartContext';
import { isProductBestSeller, calculateDiscountPercent, calculateTotalSold } from '../utils/productStats';
import { GlobalSearchBar } from './GlobalSearchBar';

import { SortOption } from '../types';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'newest', label: 'New Arrivals' },
  { id: 'featured', label: 'Best Seller' },
  { id: 'rating-desc', label: 'Product Rating' },
  { id: 'discount-desc', label: '% Discount' },
  { id: 'price-asc', label: 'Price (low to high)' },
  { id: 'price-desc', label: 'Price (high to low)' },
  { id: 'name-asc', label: 'Name A-Z' },
  { id: 'name-desc', label: 'Name Z-A' },
];

export const ProductGrid: React.FC = () => {
  const { 
    selectedCategory, 
    setSelectedCategory, 
    searchQuery, 
    setSearchQuery,
    products,
    productImageFit,
    setProductImageFit,
    bestsellerThreshold,
    quickViewProduct,
    setQuickViewProduct,
    isSellerMode,
    openReviewsManager,
    sortBy,
    setSortBy,
    filteredProducts
  } = useCart();

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories = [
    { id: 'all', label: 'All Creations' },
    { id: 'pearl-bags', label: 'Pearl Bags' },
    { id: 'pearl-necklaces', label: 'Pearl Necklaces' },
    { id: 'macrame', label: 'Macrame' },
    { id: 'accessories', label: 'Accessories' },
    { id: 'new-arrivals', label: 'New Arrivals', isSpecial: true },
    { id: 'best-sellers', label: 'Best Sellers', isSpecial: true },
  ];

  const currentSortLabel = SORT_OPTIONS.find((opt) => opt.id === sortBy)?.label || 'New Arrivals';
  const currentCategoryLabel = 
    categories.find((cat) => cat.id === selectedCategory)?.label || 'All Creations';

  return (
    <section id="shop-section" className="pt-0 sm:pt-1 pb-4 sm:pb-6 px-2 sm:px-3 lg:px-4 max-w-[1440px] mx-auto">
      {/* Category Dropdown (All Creations), Centered Search Bar, & Custom Sort Bar */}
      <div className="relative z-40 py-2 px-2.5 mb-3 bg-[#EFE9E0] dark:bg-[#181715] border border-[#C8B9A6] dark:border-[#2E2C29] rounded-xl shadow-xs flex items-center justify-between gap-1.5 sm:gap-2 w-full flex-wrap sm:flex-nowrap">
        {/* Left: Category Dropdown */}
        <div ref={categoryDropdownRef} className="relative z-[60] shrink-0 order-1">
          <button
            type="button"
            onClick={() => {
              setIsCategoryOpen(!isCategoryOpen);
              setIsSortOpen(false);
            }}
            className="flex items-center justify-between gap-1.5 bg-white dark:bg-[#22201E] border-2 border-[#9E8C78] dark:border-[#3E3A35] rounded-lg px-3 py-1.5 text-xs text-[#111111] dark:text-[#F5F2EB] min-w-[115px] sm:min-w-[150px] shadow-xs hover:border-[#1C1B1A] dark:hover:border-[#D4AF37] focus:outline-none transition-colors cursor-pointer"
          >
            <span className="font-bold flex items-center gap-1.5 truncate">
              {selectedCategory === 'new-arrivals' && <Sparkles className="w-3.5 h-3.5 text-[#9A6F28] dark:text-[#C5A880] fill-[#C5A880] shrink-0" />}
              {selectedCategory === 'best-sellers' && <Star className="w-3.5 h-3.5 text-[#B8860B] dark:text-[#D4AF37] fill-[#D4AF37] shrink-0" />}
              <span>{currentCategoryLabel}</span>
            </span>
            {isCategoryOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-[#111111] dark:text-[#F5F2EB] shrink-0 stroke-[2.5]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[#111111] dark:text-[#F5F2EB] shrink-0 stroke-[2.5]" />
            )}
          </button>

          {isCategoryOpen && (
            <div className="absolute left-0 mt-1.5 w-full min-w-[205px] bg-white dark:bg-[#1E1D1B] border-2 border-[#8C7A6B] dark:border-[#3E3A35] rounded-xl shadow-2xl py-1.5 z-[100] animate-fade-in">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const isDividerBefore = cat.id === 'new-arrivals';
                return (
                  <React.Fragment key={cat.id}>
                    {isDividerBefore && (
                      <div className="my-1 border-t border-[#D5C7B8] dark:border-[#33302C]">
                        <span className="block px-3 pt-1.5 pb-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#5C534B] dark:text-[#A69E96]">
                          Featured Collections
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setIsCategoryOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#1C1B1A] text-white dark:bg-[#D4AF37] dark:text-[#1C1B1A] font-bold'
                          : cat.isSpecial
                          ? 'text-[#7A5216] dark:text-[#E6CA9E] hover:bg-[#F5ECE0] dark:hover:bg-[#2A2724] font-bold'
                          : 'text-[#111111] dark:text-[#E5E0D8] hover:bg-[#F2ECE4] dark:hover:bg-[#2A2724] font-semibold'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {cat.id === 'new-arrivals' && <Sparkles className="w-3 h-3 text-[#C5A880] fill-[#C5A880]" />}
                        {cat.id === 'best-sellers' && <Star className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37]" />}
                        <span>{cat.label}</span>
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-extrabold">✓</span>
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 min-w-[120px] sm:min-w-[180px] max-w-md mx-1 order-3 sm:order-2">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-[#2C2825] dark:text-[#A69E96] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.2]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search creations..."
              className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold bg-white dark:bg-[#22201E] border-2 border-[#9E8C78] dark:border-[#3E3A35] rounded-lg text-[#111111] dark:text-[#F5F2EB] placeholder:text-[#57504A] dark:placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1C1B1A] dark:focus:border-[#D4AF37] shadow-xs transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#111111] dark:text-[#F5F2EB] hover:text-rose-600 font-extrabold p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: Custom Sort Dropdown */}
        <div ref={sortDropdownRef} className="relative shrink-0 z-[60] order-2 sm:order-3">
          <button
            type="button"
            onClick={() => {
              setIsSortOpen(!isSortOpen);
              setIsCategoryOpen(false);
            }}
            className="flex items-center justify-between gap-1.5 bg-white dark:bg-[#22201E] border-2 border-[#9E8C78] dark:border-[#3E3A35] rounded-lg px-3 py-1.5 text-xs text-[#111111] dark:text-[#F5F2EB] min-w-[110px] sm:min-w-[140px] shadow-xs hover:border-[#1C1B1A] dark:hover:border-[#D4AF37] focus:outline-none transition-colors cursor-pointer"
          >
            <span className="font-bold">{currentSortLabel}</span>
            {isSortOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-[#111111] dark:text-[#F5F2EB] shrink-0 stroke-[2.5]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[#111111] dark:text-[#F5F2EB] shrink-0 stroke-[2.5]" />
            )}
          </button>

          {isSortOpen && (
            <div className="absolute right-0 mt-1.5 w-full min-w-[190px] bg-white dark:bg-[#1E1D1B] border-2 border-[#8C7A6B] dark:border-[#3E3A35] rounded-xl shadow-2xl py-1.5 z-[100] animate-fade-in">
              {SORT_OPTIONS.map((option) => {
                const isSelected = sortBy === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setSortBy(option.id);
                      setIsSortOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors block cursor-pointer ${
                      isSelected
                        ? 'bg-[#1C1B1A] text-white dark:bg-[#D4AF37] dark:text-[#1C1B1A] font-bold'
                        : 'text-[#111111] dark:text-[#E5E0D8] hover:bg-[#F2ECE4] dark:hover:bg-[#2A2724] font-semibold'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active Search Filter Badge */}
      {searchQuery && (
        <div className="mb-6 flex items-center justify-between bg-white border border-[#E8DFD8] p-3 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#736C65]">Filtered by:</span>
            <span className="font-semibold text-[#1C1B1A]">"{searchQuery}"</span>
            <span className="text-[#8C7A6B]">({filteredProducts.length} pieces found)</span>
          </div>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-[#C5A880] hover:text-[#1C1B1A] font-semibold underline"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Product Grid - 5 columns on desktop/tablet, compact spacing so 10 products (2 rows of 5) are visible at once */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 sm:gap-2 relative z-0 isolate">
          {filteredProducts.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-[#E8DFD8] max-w-lg mx-auto">
          <SearchX className="w-12 h-12 text-[#C5A880] mx-auto mb-4" />
          <h3 className="font-serif text-xl text-[#1C1B1A] font-medium mb-1">
            No handcrafted pieces matched
          </h3>
          <p className="text-xs text-[#736C65] mb-6">
            We couldn't find any products matching your selection. Feel free to message our store in Kathmandu, Nepal on WhatsApp or explore our full collection.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 bg-[#FAF8F5] border border-[#E8DFD8] text-xs font-semibold uppercase tracking-wider text-[#1C1B1A] rounded-full hover:bg-white"
            >
              Reset Filters
            </button>
            <a
              href="https://wa.me/9779767573721?text=Namaste!%20I%20am%20looking%20for%20a%20handcrafted%20piece%20from%20Kathmandu,%20Kathmandu."
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-[#1C1B1A] text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-[#34312F] inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Ask Kathmandu Store</span>
            </a>
          </div>
        </div>
      )}
    </section>
  );
};
