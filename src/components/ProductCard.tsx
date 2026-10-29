import React, { useState, useEffect } from 'react';
import { Heart, Eye, Star, Edit3, Scale, Bell } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { calculateTotalSold, isProductBestSeller, calculateReviewsCount, getDisplayOriginalPrice, calculateDiscountPercent, getProductReviews, getProductAverageRating } from '../utils/productStats';
import { RestockNotifyModal } from './RestockNotifyModal';
import { isProductWaitlisted } from '../utils/waitlistService';

interface ProductCardProps {
  product: Product;
  isSelected?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, isSelected = false }) => {
  const { 
    toggleWishlist, 
    isWishlisted, 
    setQuickViewProduct,
    isSellerMode,
    openProductEditor,
    toggleProductNewArrival,
    productImageFit,
    bestsellerThreshold,
    toggleCompareProduct,
    isProductCompared
  } = useCart();
  const [isHovered, setIsHovered] = useState(false);
  const { language, t } = useLanguage();
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);

  const isOutOfStock = product.inStock === false || (typeof product.stockCount === 'number' && product.stockCount <= 0);
  const [isWaitlisted, setIsWaitlisted] = useState(() => isProductWaitlisted(product.id));

  useEffect(() => {
    setIsWaitlisted(isProductWaitlisted(product.id));
    const handleWaitlistUpdate = () => {
      setIsWaitlisted(isProductWaitlisted(product.id));
    };
    window.addEventListener('artified_waitlist_updated', handleWaitlistUpdate);
    return () => window.removeEventListener('artified_waitlist_updated', handleWaitlistUpdate);
  }, [product.id]);

  const totalSold = calculateTotalSold(product);
  const isBestSeller = isProductBestSeller(product, bestsellerThreshold);
  
  const productReviews = React.useMemo(() => getProductReviews(product), [product]);
  const dynamicReviewsCount = productReviews.length > 0 ? productReviews.length : calculateReviewsCount(product);
  const averageRatingVal = React.useMemo(() => getProductAverageRating(product), [product, productReviews]);
  const averageRatingStr = averageRatingVal.toFixed(1);

  const wishlisted = isWishlisted(product.id);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickViewProduct(product);
  };

  const fallbackByCategory: Record<string, string> = {
    'pearl-bags': 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=900&q=80',
    'pearl-necklaces': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80',
    'macrame': 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=80',
    'accessories': 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?auto=format&fit=crop&w=900&q=80',
    'custom-beaded': 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=80',
  };

  const defaultFallback = fallbackByCategory[product.category] || 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=900&q=80';

  const rawPrimary = (product.images && product.images[0] && product.images[0].trim() && !product.images[0].startsWith('/uploads/')) 
    ? product.images[0].trim() 
    : defaultFallback;

  const rawSecondary = (product.images && product.images[1] && product.images[1].trim() && !product.images[1].startsWith('/uploads/')) 
    ? product.images[1].trim() 
    : rawPrimary;

  const [currentImg, setCurrentImg] = useState(rawPrimary);
  const [currentSecImg, setCurrentSecImg] = useState(rawSecondary);

  useEffect(() => {
    setCurrentImg(rawPrimary);
    setCurrentSecImg(rawSecondary);
  }, [rawPrimary, rawSecondary]);

  const displayOriginalPrice = getDisplayOriginalPrice(product);
  const discountPercent = calculateDiscountPercent(product);

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={() => setQuickViewProduct(product)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col bg-white dark:bg-[#161514] rounded-lg overflow-hidden border-[1.5px] border-[#C4B5A3] dark:border-[#2D2B28] hover:border-[#1C1B1A] dark:hover:border-[#D4AF37] transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer z-0"
    >
      {/* Image Container with secondary flip - Compact height with strict 1:1 Square photo frame so 10 products fit on screen at once */}
      <div className="relative h-[110px] sm:h-[120px] w-full bg-[#EFE8DF] dark:bg-[#1C1A18] border-b border-[#DDD2C4] dark:border-[#262422] overflow-hidden flex items-center justify-center">
        {/* Badges - positioned strictly in front of product photo */}
        <div className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 z-30 flex flex-col gap-1 items-start pointer-events-none">
          {isOutOfStock && !isSellerMode && (
            <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold tracking-wider uppercase bg-[#1C1B1A]/95 text-amber-300 border border-amber-400/50 shadow-xs flex items-center gap-0.5">
              <Bell className="w-2.5 h-2.5 text-amber-300 animate-pulse" />
              <span>Sold Out</span>
            </span>
          )}
          {isBestSeller && !isOutOfStock && (
            <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold tracking-wider uppercase bg-[#1C1B1A]/95 text-[#E6C687] border border-[#C5A880]/40 shadow-xs flex items-center gap-0.5">
              <span>★</span> Bestseller
            </span>
          )}
          {product.isNewArrival && !isBestSeller && !isOutOfStock && !isSellerMode && (
            <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold tracking-wider uppercase bg-[#C5A880] text-white shadow-xs flex items-center gap-0.5">
              <span>✦</span> New
            </span>
          )}

          {/* Seller Mode Quick Controls */}
          {isSellerMode && (
            <div className="flex items-center gap-1 pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleProductNewArrival(product.id);
                }}
                className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold tracking-wider uppercase shadow-xs flex items-center gap-0.5 transition-all cursor-pointer ${
                  product.isNewArrival 
                    ? 'bg-[#C5A880] text-white hover:bg-[#A3865E]' 
                    : 'bg-white/95 text-[#736C65] border border-gray-300 hover:border-[#C5A880] hover:text-[#C5A880]'
                }`}
                title={product.isNewArrival ? "Click to unselect New Arrival" : "Click to select as New Arrival"}
              >
                <span>✦</span>
                <span>{product.isNewArrival ? 'New' : '+ New'}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openProductEditor(product);
                }}
                className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold tracking-wider uppercase bg-[#1C1B1A] text-[#D4AF37] border border-[#C5A880] shadow-sm flex items-center gap-0.5 hover:bg-[#34312F] transition-all cursor-pointer"
                title="Edit piece"
              >
                <Edit3 className="w-2.5 h-2.5 text-[#D4AF37]" />
                <span>Edit</span>
              </button>
            </div>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleWishlistClick}
          className={`absolute top-1 right-1 sm:top-1.5 sm:right-1.5 z-30 w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-colors duration-150 cursor-pointer ${
            wishlisted
              ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-500 shadow-2xs'
              : 'bg-white/95 dark:bg-[#23211F]/95 text-[#736C65] dark:text-[#A8A096] hover:text-[#1C1B1A] dark:hover:text-white hover:bg-white dark:hover:bg-[#2A2724] shadow-2xs'
          }`}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`w-3 h-3 ${wishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {/* Compare Button - Sleek, Unobtrusive (Shown on hover) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleCompareProduct(product);
          }}
          className={`absolute top-7 sm:top-8 right-1 sm:right-1.5 z-30 w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-opacity duration-150 cursor-pointer ${
            isProductCompared(product.id)
              ? 'bg-[#1C1B1A] text-[#D4AF37] border border-[#D4AF37] opacity-100 shadow-xs'
              : 'bg-white/95 dark:bg-[#23211F]/95 text-[#736C65] dark:text-[#A8A096] hover:text-[#1C1B1A] dark:hover:text-white hover:bg-white dark:hover:bg-[#2A2724] opacity-0 group-hover:opacity-100 shadow-2xs'
          }`}
          title={isProductCompared(product.id) ? "Remove from comparison" : "Compare side-by-side"}
          aria-label="Compare product"
        >
          <Scale className="w-3 h-3" />
        </button>

        {/* Strict 1:1 Square Inner Photo Frame so 1:1 square uploads are never stretched */}
        <div className="relative h-full aspect-square mx-auto overflow-hidden">
          <img
            src={currentImg}
            alt={product.title}
            loading="lazy"
            decoding="async"
            onError={() => {
              if (currentImg !== defaultFallback) {
                setCurrentImg(defaultFallback);
              }
            }}
            className={`relative z-0 w-full h-full transition-opacity duration-200 ${
              productImageFit === 'contain'
                ? 'object-contain object-center p-0.5'
                : 'object-cover object-center'
            } ${
              isHovered && currentSecImg !== currentImg
                ? 'opacity-0'
                : 'opacity-100'
            }`}
          />
          {currentSecImg && currentSecImg !== currentImg && (
            <img
              src={currentSecImg}
              alt={`${product.title} alternate view`}
              loading="lazy"
              decoding="async"
              onError={() => setCurrentSecImg(currentImg)}
              className={`absolute inset-0 z-0 w-full h-full transition-opacity duration-200 ${
                productImageFit === 'contain'
                  ? 'object-contain object-center p-0.5'
                  : 'object-cover object-center'
              } ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}
        </div>
      </div>

      {/* Product Details - Ultra-compact layout so 2 rows (10 products) fit in viewport */}
      <div className="p-1.5 flex-1 flex flex-col justify-between bg-white dark:bg-[#161514]">
        <div>
          {/* Title - Single concise line on desktop to keep card height uniform for 10-product view */}
          <h3 className="text-[11px] sm:text-xs font-semibold text-[#111111] dark:text-[#F5F2EB] leading-tight group-hover:text-[#7A5216] dark:group-hover:text-[#D4AF37] transition-colors line-clamp-1" title={product.title}>
            {product.title}
          </h3>

          {/* Rating stars & review count row */}
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex items-center text-amber-600 dark:text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-2.5 h-2.5 ${star <= Math.round(averageRatingVal) ? 'fill-current' : 'text-zinc-300 dark:text-zinc-600'}`}
                />
              ))}
            </div>
            <span className="text-[9px] sm:text-[10px] font-extrabold text-[#111111] dark:text-[#E8E2D9]">
              {averageRatingStr}
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-[#433E39] dark:text-[#A8A096]">
              ({dynamicReviewsCount})
            </span>
          </div>
        </div>

        {/* Pricing & Status block - Clean, uncongested, concise layout */}
        <div className="mt-1 pt-1 border-t border-[#D8CCBE] dark:border-[#262422]">
          <div className="flex items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1.5 min-w-0 truncate">
              <span className="text-xs sm:text-[13px] font-extrabold text-[#0D0C0B] dark:text-[#FAF8F5] tracking-tight leading-none">
                NPR {Number(product.price || 0).toLocaleString()}
              </span>
              {displayOriginalPrice > (product.price || 0) && (
                <span className="text-[9px] sm:text-[10px] font-medium text-[#5A524C] dark:text-[#8C847E] line-through leading-none">
                  NPR {Number(displayOriginalPrice || 0).toLocaleString()}
                </span>
              )}
            </div>
            {isOutOfStock && (
              <span className="text-[8px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1 py-0.5 rounded border border-amber-300 dark:border-amber-800 shrink-0">
                Sold Out
              </span>
            )}
          </div>

          {/* Discount & Sold count row */}
          <div className="flex items-center justify-between gap-1 mt-0.5 text-[9px] sm:text-[10px] leading-tight">
            {discountPercent > 0 ? (
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                {discountPercent}% {t('offPercent')}
              </span>
            ) : null}
            <span className="text-[#36312D] dark:text-[#B8B0A6] font-bold ml-auto">
              {language === 'ne' ? `${t('soldCount')}: ${totalSold}` : `Sold: ${totalSold}`}
            </span>
          </div>
        </div>
      </div>

      {/* Restock Notification Modal for Card - Lazy mounted only when open */}
      {isNotifyModalOpen && (
        <RestockNotifyModal
          product={product}
          isOpen={isNotifyModalOpen}
          onClose={() => setIsNotifyModalOpen(false)}
          onSuccess={() => setIsWaitlisted(true)}
        />
      )}
    </div>
  );
});
