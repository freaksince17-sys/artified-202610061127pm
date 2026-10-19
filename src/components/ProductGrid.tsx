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
  { id: 'featured', label: 'Sort by' },
  { id: 'rating-desc', label: 'Product Rating' },
  { id: 'discount-desc', label: '% Discount' },
  { id: 'newest', label: 'Newest' },
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

  const currentSortLabel = SORT_OPTIONS.find((opt) => opt.id === sortBy)?.label || 'Sort by';
  const currentCategoryLabel = 
    categories.find((cat) => cat.id === selectedCategory)?.label || 'All Creations';

  return (
    <section id="shop-section" className="pt-0 sm:pt-1 pb-4 sm:pb-6 px-2 sm:px-3 lg:px-4 max-w-[1440px] mx-auto">
      {/* Category Dropdown (All Creations), Centered Search Bar, & Custom Sort Bar */}
      <div className="relative z-40 py-1.5 px-2 mb-2 flex items-center justify-between gap-1.5 sm:gap-2 w-full flex-wrap sm:flex-nowrap">
        {/* Left: Category Dropdown */}
        <div ref={categoryDropdownRef} className="relative z-[60] shrink-0 order-1">
          <button
            type="button"
            onClick={() => {
              setIsCategoryOpen(!isCategoryOpen);
              setIsSortOpen(false);
            }}
            className="flex items-center justify-between gap-1.5 bg-white border border-[#D1D5DB] rounded-lg px-2.5 py-1 text-xs text-[#111827] min-w-[110px] sm:min-w-[145px] shadow-2xs hover:border-[#9CA3AF] focus:outline-none transition-colors cursor-pointer"
          >
            <span className="font-normal flex items-center gap-1.5 truncate">
              {selectedCategory === 'new-arrivals' && <Sparkles className="w-3 h-3 text-[#C5A880] fill-[#C5A880] shrink-0" />}
              {selectedCategory === 'best-sellers' && <Star className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37] shrink-0" />}
              <span>{currentCategoryLabel}</span>
            </span>
            {isCategoryOpen ? (
              <ChevronUp className="w-3 h-3 text-[#374151] shrink-0" />
            ) : (
              <ChevronDown className="w-3 h-3 text-[#374151] shrink-0" />
            )}
          </button>

          {isCategoryOpen && (
            <div className="absolute left-0 mt-1 w-full min-w-[200px] bg-white border border-[#D1D5DB] rounded-xl shadow-2xl py-1 z-[100] animate-fade-in">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const isDividerBefore = cat.id === 'new-arrivals';
                return (
                  <React.Fragment key={cat.id}>
                    {isDividerBefore && (
                      <div className="my-1 border-t border-[#E5E7EB]">
                        <span className="block px-3 pt-1 pb-0.5 text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">
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
                          ? 'bg-[#E5E5E5] text-[#111827] font-semibold'
                          : cat.isSpecial
                          ? 'text-[#8A6224] hover:bg-[#FAF3E8] font-medium'
                          : 'text-[#374151] hover:bg-[#F3F4F6]'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {cat.id === 'new-arrivals' && <Sparkles className="w-3 h-3 text-[#C5A880] fill-[#C5A880]" />}
                        {cat.id === 'best-sellers' && <Star className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37]" />}
                        <span>{cat.label}</span>
                      </span>
                      {isSelected && (
                        <span className="text-[10px] text-[#111827] font-bold">✓</span>
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
            <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search creations..."
              className="w-full pl-8 pr-7 py-1 text-xs bg-white border border-[#D1D5DB] rounded-lg text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#4B5563] shadow-2xs transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#6B7280] hover:text-[#111827] font-bold p-0.5 cursor-pointer"
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
            className="flex items-center justify-between gap-1.5 bg-white border border-[#D1D5DB] rounded-lg px-2.5 py-1 text-xs text-[#111827] min-w-[105px] sm:min-w-[135px] shadow-2xs hover:border-[#9CA3AF] focus:outline-none transition-colors cursor-pointer"
          >
            <span className="font-normal">{currentSortLabel}</span>
            {isSortOpen ? (
              <ChevronUp className="w-3 h-3 text-[#374151] shrink-0" />
            ) : (
              <ChevronDown className="w-3 h-3 text-[#374151] shrink-0" />
            )}
          </button>

          {isSortOpen && (
            <div className="absolute right-0 mt-1 w-full min-w-[185px] bg-white border border-[#D1D5DB] rounded-md shadow-2xl py-1 z-[100] animate-fade-in">
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
                    className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm transition-colors block ${
                      isSelected
                        ? 'bg-[#E5E5E5] text-[#111827] font-medium'
                        : 'text-[#374151] hover:bg-[#F3F4F6]'
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

      {/* Product Grid - 5 columns on desktop, concise spacing */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2 lg:gap-2.5 relative z-0 isolate">
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
