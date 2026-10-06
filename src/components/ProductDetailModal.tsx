import React, { useState, useEffect } from 'react';
import { 
  X, 
  Star, 
  ShieldCheck, 
  HeartHandshake, 
  Truck, 
  ShoppingBag, 
  MessageCircle, 
  Clock, 
  Sparkles, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  ChevronRight,
  Heart,
  ZoomIn,
  Edit3,
  MessageSquare,
  Send,
  Instagram,
  Share2,
  Copy,
  Scale,
  Ruler,
  Bell
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { calculateTotalSold, isProductBestSeller, calculateReviewsCount, getProductReviews } from '../utils/productStats';
import { ProductReviewItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { RestockNotifyModal } from './RestockNotifyModal';
import { isProductWaitlisted } from '../utils/waitlistService';
import { submitProductReviewToFirestore, subscribeToProductReviews, FirestoreProductReview } from '../services/reviewService';
import { getRealProductImage, CAVIAR_PEARL_BAG_IMAGE } from '../utils/productImages';
import { applyProductSeo } from '../utils/productSeo';

export const ProductDetailModal: React.FC = () => {
  const { 
    quickViewProduct, 
    setQuickViewProduct, 
    addToCart, 
    quickBuy,
    toggleWishlist, 
    isWishlisted,
    isSellerMode,
    openProductEditor,
    bestsellerThreshold,
    addProductReview,
    products,
    selectedCategory,
    openReviewsManager,
    toggleCompareProduct,
    isProductCompared,
    openCompareModal
  } = useCart();

  const { language, t } = useLanguage();
  const isNe = language === 'ne';

  const modalFallback = quickViewProduct 
    ? getRealProductImage(quickViewProduct.title, quickViewProduct.images?.[0])
    : CAVIAR_PEARL_BAG_IMAGE;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedStyle, setSelectedStyle] = useState('Default Ivory / Classic');
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<'materials' | 'care' | 'delivery' | null>('materials');

  // Customer Review Submission State
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewLocation, setNewReviewLocation] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(4.8);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [firestoreReviews, setFirestoreReviews] = useState<FirestoreProductReview[]>([]);
  const [shareCopied, setShareCopied] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [waitlistRefreshKey, setWaitlistRefreshKey] = useState(0);

  // Subscribe to real-time reviews stored in Firestore for the active product
  useEffect(() => {
    if (!quickViewProduct?.id) {
      setFirestoreReviews([]);
      return;
    }

    const initial = getProductReviews(quickViewProduct);
    const unsubscribe = subscribeToProductReviews(
      quickViewProduct.id,
      (fetched) => {
        if (fetched && fetched.length > 0) {
          setFirestoreReviews(fetched);
        }
      },
      initial
    );

    return () => {
      unsubscribe();
    };
  }, [quickViewProduct?.id]);

  // Dynamic Google SEO, High-CTR Metadata & Schema.org Product structured data synchronization
  useEffect(() => {
    applyProductSeo(quickViewProduct);
    return () => {
      applyProductSeo(null);
    };
  }, [quickViewProduct]);

  const isOutOfStock = quickViewProduct ? (quickViewProduct.inStock === false || (typeof quickViewProduct.stockCount === 'number' && quickViewProduct.stockCount <= 0)) : false;
  const isWaitlisted = quickViewProduct ? isProductWaitlisted(quickViewProduct.id) : false;

  // Social Share Handlers
  const handleShareWhatsApp = () => {
    if (!quickViewProduct) return;
    const shareUrl = window.location.href;
    const text = `Look at this stunning handmade ${quickViewProduct.title} from Artified Nepal! ✨\nPrice: Rs. ${quickViewProduct.price.toLocaleString()}\nHandcrafted with pearls in Kathmandu, Nepal 🌸\nTake a look: ${shareUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShareInstagramStory = async () => {
    if (!quickViewProduct) return;
    const shareUrl = window.location.href;
    const shareTitle = `${quickViewProduct.title} | Artified Nepal`;
    const shareText = `Adoring this handmade ${quickViewProduct.title} by @artified_np ✨ Price: Rs. ${quickViewProduct.price.toLocaleString()} • Handcrafted in Kathmandu: ${shareUrl}`;

    // On mobile devices with native share support
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or fallback
      }
    }

    // Open Instagram Story helper card
    setShowStoryModal(true);
  };

  const handleCopyProductLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
  };

  // Hover-to-Zoom inspection state
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [zoomScale, setZoomScale] = useState(2.4);

  // Reset zoom whenever image changes
  useEffect(() => {
    setIsZoomed(false);
    setShowReviewForm(false);
    setReviewSubmitted(false);
  }, [activeImageIndex, quickViewProduct?.id]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));
    setZoomPosition({ x, y });
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsZoomed(true);
    handleMouseMove(e);
  };

  const handleMouseLeave = () => {
    setIsZoomed(false);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((touch.clientX - left) / width) * 100));
      const y = Math.max(0, Math.min(100, ((touch.clientY - top) / height) * 100));
      setZoomPosition({ x, y });
      setIsZoomed(true);
    }
  };

  const handleTouchEnd = () => {
    setIsZoomed(false);
  };

  const categoryProducts = React.useMemo(() => {
    let list = [...products];
    if (selectedCategory === 'pearl-bags') {
      list = list.filter((p) => p.category === 'pearl-bags');
    } else if (selectedCategory === 'pearl-necklaces') {
      list = list.filter((p) => p.category === 'pearl-necklaces');
    } else if (selectedCategory === 'macrame') {
      list = list.filter((p) => p.category === 'macrame');
    } else if (selectedCategory === 'accessories') {
      list = list.filter((p) => p.category === 'accessories');
    } else if (selectedCategory === 'new-arrivals') {
      list = list.filter((p) => p.isNewArrival);
    } else if (selectedCategory === 'best-sellers') {
      list = list.filter((p) => p.isBestSeller || isProductBestSeller(p, bestsellerThreshold));
    }
    return list.length > 0 ? list : products;
  }, [products, selectedCategory, bestsellerThreshold]);

  const currentProductIndex = React.useMemo(() => {
    if (!quickViewProduct) return -1;
    const idx = categoryProducts.findIndex((p) => p.id === quickViewProduct.id);
    return idx >= 0 ? idx : 0;
  }, [categoryProducts, quickViewProduct]);

  const handlePrevProduct = () => {
    if (categoryProducts.length <= 1) return;
    const newIdx = (currentProductIndex - 1 + categoryProducts.length) % categoryProducts.length;
    setQuickViewProduct(categoryProducts[newIdx]);
    setActiveImageIndex(0);
  };

  const handleNextProduct = () => {
    if (categoryProducts.length <= 1) return;
    const newIdx = (currentProductIndex + 1) % categoryProducts.length;
    setQuickViewProduct(categoryProducts[newIdx]);
    setActiveImageIndex(0);
  };

  // Keyboard navigation for Left/Right arrows
  useEffect(() => {
    if (!quickViewProduct) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevProduct();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextProduct();
      } else if (e.key === 'Escape') {
        setQuickViewProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickViewProduct, currentProductIndex, categoryProducts]);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;
  const wishlisted = isWishlisted(product.id);
  const totalSold = calculateTotalSold(product);
  const isBestSeller = isProductBestSeller(product, bestsellerThreshold);
  const fallbackReviews = getProductReviews(product);
  const reviewsList = firestoreReviews.length > 0 ? firestoreReviews : fallbackReviews;
  const dynamicReviewsCount = reviewsList.length;
  const rawRatingVal = reviewsList.length > 0
    ? (reviewsList.reduce((acc, r) => acc + (r.rating || 4.7), 0) / reviewsList.length)
    : (product.rating ? Number(product.rating) : 4.7);
  const averageRating = Math.min(4.8, Math.max(4.0, rawRatingVal)).toFixed(1);

  const handleAddToCart = () => {
    addToCart(product, quantity, '', selectedStyle);
    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
      setQuickViewProduct(null);
    }, 900);
  };

  const handleBuyNow = () => {
    quickBuy(product, quantity, '', selectedStyle);
    setQuickViewProduct(null);
  };

  const handleWhatsAppOrder = () => {
    const phone = '9779767573721';
    const text = `Namaste Artified_np! ✨ I would like to order / inquire about the *${product.title}* (Rs. ${product.price.toLocaleString()}). Delivery in Kathmandu Valley / Nepal.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim() || isSubmittingReview) return;

    setIsSubmittingReview(true);
    const newReview: ProductReviewItem = {
      id: `${product.id}-rev-${Date.now()}`,
      author: newReviewAuthor.trim(),
      location: newReviewLocation.trim() || 'Kathmandu, Nepal',
      rating: newReviewRating,
      date: 'Just now',
      verified: true,
      comment: newReviewComment.trim()
    };

    // Instant local state update
    addProductReview(product.id, newReview);
    setFirestoreReviews((prev) => [newReview as FirestoreProductReview, ...prev]);

    // Save directly to Firestore collection 'product_reviews'
    try {
      await submitProductReviewToFirestore(product.id, {
        author: newReviewAuthor.trim(),
        location: newReviewLocation.trim() || 'Kathmandu, Nepal',
        rating: newReviewRating,
        comment: newReviewComment.trim(),
        productTitle: product.title
      });
    } catch (err) {
      console.warn('Notice: Firestore review write notice:', err);
    } finally {
      setIsSubmittingReview(false);
      setReviewSubmitted(true);
      setTimeout(() => {
        setReviewSubmitted(false);
        setShowReviewForm(false);
        setNewReviewAuthor('');
        setNewReviewLocation('');
        setNewReviewComment('');
      }, 2200);
    }
  };

  const toggleAccordion = (key: 'materials' | 'care' | 'delivery') => {
    setActiveAccordion(activeAccordion === key ? null : key);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#1C1B1A]/60 backdrop-blur-xs transition-opacity"
        onClick={() => setQuickViewProduct(null)}
      />

      {/* Modal Dialog Container with Floating Side Navigation Arrows as in Image 1 */}
      <div className="relative w-full max-w-4xl my-auto z-10 flex items-center justify-center">
        {/* Previous Product Arrow (Left Side of Modal) */}
        {categoryProducts.length > 1 && (
          <button
            type="button"
            onClick={handlePrevProduct}
            className="absolute -left-5 sm:-left-8 md:-left-12 lg:-left-16 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white text-[#1C1B1A] border-2 border-[#1C1B1A] shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-115 hover:border-emerald-600 hover:text-emerald-600 hover:shadow-[0_0_28px_rgba(16,185,129,0.7),0_8px_20px_rgba(0,0,0,0.18)] active:scale-95 cursor-pointer focus:outline-none group"
            title="Previous piece (Left arrow key)"
            aria-label="Previous piece"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3] transition-colors" />
          </button>
        )}

        {/* Next Product Arrow (Right Side of Modal) */}
        {categoryProducts.length > 1 && (
          <button
            type="button"
            onClick={handleNextProduct}
            className="absolute -right-5 sm:-right-8 md:-right-12 lg:-right-16 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white text-emerald-700 border-2 border-emerald-700 shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-115 hover:border-emerald-500 hover:text-emerald-500 hover:shadow-[0_0_28px_rgba(16,185,129,0.7),0_8px_20px_rgba(0,0,0,0.18)] active:scale-95 cursor-pointer focus:outline-none group"
            title="Next piece (Right arrow key)"
            aria-label="Next piece"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3] transition-colors" />
          </button>
        )}

        {/* Modal Dialog Card */}
        <div className="bg-[#FAF8F5] w-full rounded-2xl shadow-2xl border border-[#E8DFD8] overflow-hidden flex flex-col max-h-[92vh]">
          {/* Top Header with Title, Counter, and Actions in ONE SINGLE LINE */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[#E8DFD8] bg-white sticky top-0 z-20 gap-2">
            {/* Left: Brand and Category Label */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase text-[#8C7A6B] truncate">
                Artified_np Handmade Piece
              </span>
              <span className="text-[#C5A880] shrink-0">•</span>
              <span className="text-xs text-[#736C65] font-medium capitalize truncate">
                {selectedCategory === 'all' ? product.category.replace('-', ' ') : selectedCategory.replace('-', ' ')}
              </span>
            </div>

            {/* Right Action buttons and Counter */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {categoryProducts.length > 1 && (
                <span className="text-xs sm:text-sm font-medium text-[#736C65] tabular-nums mr-1 sm:mr-1.5">
                  {currentProductIndex + 1}/{categoryProducts.length}
                </span>
              )}

              {isSellerMode && (
                <>
                  <button
                    type="button"
                    onClick={() => openReviewsManager(product.id)}
                    className="px-2.5 sm:px-3 py-1.5 rounded-full border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold flex items-center gap-1.5 hover:bg-amber-100 transition-colors shadow-xs cursor-pointer"
                    title="Edit customer reviews for this piece (Seller Studio)"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span className="hidden md:inline">Edit Reviews ({reviewsList.length})</span>
                    <span className="md:hidden">Reviews</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openProductEditor(product)}
                    className="px-2.5 sm:px-3 py-1.5 rounded-full border border-[#C5A880] bg-[#1C1B1A] text-[#D4AF37] text-xs font-semibold flex items-center gap-1.5 hover:bg-[#34312F] transition-colors shadow-xs cursor-pointer"
                    title="Edit this piece (Seller Only)"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span className="hidden sm:inline">Edit Piece</span>
                  </button>
                </>
              )}

              <button
                onClick={() => toggleWishlist(product.id)}
                className={`p-2 rounded-full border border-[#E8DFD8] transition-colors cursor-pointer ${
                  wishlisted ? 'bg-rose-50 text-rose-500 border-rose-200' : 'text-[#736C65] hover:text-[#1C1B1A]'
                }`}
                title={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <Heart className={`w-4 h-4 ${wishlisted ? 'fill-rose-500' : ''}`} />
              </button>
              <button
                onClick={() => setQuickViewProduct(null)}
                className="p-2 rounded-full border border-[#E8DFD8] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="overflow-y-auto p-4 sm:p-6 md:p-8 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              
              {/* Left: Gallery Column */}
              <div className="md:col-span-6 flex flex-col gap-3">
                {/* Atelier Inspection Bar */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#8C7A6B]">
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span className="font-serif italic text-xs text-[#1C1B1A]">Kathmandu Atelier Craft View</span>
                  </div>
                </div>

                {/* Main Feature View with Hover-to-Zoom */}
                <div 
                  className="relative aspect-[4/5] rounded-xl overflow-hidden bg-white border border-[#E8DFD8] shadow-xs select-none group cursor-crosshair"
                  onMouseEnter={handleMouseEnter}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={handleTouchMove}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <img
                    src={product.images[activeImageIndex]?.trim() || modalFallback}
                    alt={product.title}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = modalFallback;
                    }}
                    className="w-full h-full object-cover object-center pointer-events-none will-change-transform"
                    style={{
                      transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                      transform: isZoomed ? `scale(${zoomScale})` : 'scale(1)',
                      transition: isZoomed ? 'transform 0.05s ease-out' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />

                  {/* Hover-to-zoom craft inspection status badge */}
                  <div 
                    className={`absolute top-3 left-3 py-1 px-2.5 rounded-full text-[11px] font-medium transition-all duration-200 flex items-center gap-1.5 shadow-xs backdrop-blur-md pointer-events-none z-10 ${
                      isZoomed 
                        ? 'bg-[#1C1B1A]/90 text-[#FAF8F5] border border-[#C5A880]/50' 
                        : 'bg-white/95 text-[#5E5955] border border-[#E8DFD8] opacity-90 group-hover:opacity-100'
                    }`}
                  >
                    {isZoomed ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
                        <span>Inspecting Bead Details ({zoomScale}x)</span>
                      </>
                    ) : (
                      <>
                        <ZoomIn className="w-3.5 h-3.5 text-[#C5A880]" />
                        <span>Hover / Pan to Inspect Beads</span>
                      </>
                    )}
                  </div>

                  {/* Zoom Scale Selector Pills (2x, 2.5x, 3.2x) */}
                  <div 
                    className="absolute bottom-3 right-3 flex items-center bg-[#1C1B1A]/85 backdrop-blur-md rounded-full p-0.5 border border-white/10 shadow-sm z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {[2.0, 2.5, 3.2].map((scaleVal) => (
                      <button
                        key={scaleVal}
                        type="button"
                        onClick={() => setZoomScale(scaleVal)}
                        className={`px-2 py-0.5 text-[10px] rounded-full font-mono transition-colors ${
                          zoomScale === scaleVal
                            ? 'bg-[#C5A880] text-[#1C1B1A] font-bold shadow-2xs'
                            : 'text-[#FAF8F5]/80 hover:text-white'
                        }`}
                      >
                        {scaleVal}x
                      </button>
                    ))}
                  </div>

                  {/* Craft Lead Time Floating Tag */}
                  <div 
                    className={`absolute bottom-3 left-3 bg-[#1C1B1A]/85 backdrop-blur-md text-white text-[11px] py-1 px-3 rounded-full flex items-center gap-1.5 shadow-sm transition-opacity duration-200 pointer-events-none ${
                      isZoomed ? 'opacity-30' : 'opacity-100'
                    }`}
                  >
                    <Clock className="w-3 h-3 text-[#D4AF37]" />
                    <span>{product.leadTime}</span>
                  </div>
                </div>

              {/* Thumbnail Strip */}
              {product.images.length > 1 && (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1" role="tablist" aria-label="Product image thumbnails">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      aria-label={`View product image ${idx + 1} of ${product.images.length}`}
                      aria-selected={activeImageIndex === idx}
                      role="tab"
                      className={`relative w-16 h-20 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        activeImageIndex === idx
                          ? 'border-[#C5A880] ring-2 ring-[#C5A880]/30'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img 
                        src={img?.trim() || modalFallback} 
                        alt={`${product.title} view ${idx + 1}`}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = modalFallback;
                        }}
                        className="w-full h-full object-cover" 
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Trust Badges Trio */}
              <div className="grid grid-cols-3 gap-2 mt-2 pt-4 border-t border-[#E8DFD8]">
                <div className="bg-white p-2.5 rounded-lg border border-[#E8DFD8] text-center">
                  <HeartHandshake className="w-4 h-4 text-[#C5A880] mx-auto mb-1" />
                  <p className="text-[10px] font-semibold text-[#1C1B1A]">100% Handcrafted</p>
                  <p className="text-[9px] text-[#736C65]">Kathmandu, Nepal</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-[#E8DFD8] text-center">
                  <ShieldCheck className="w-4 h-4 text-[#C5A880] mx-auto mb-1" />
                  <p className="text-[10px] font-semibold text-[#1C1B1A]">Quality Inspected</p>
                  <p className="text-[9px] text-[#736C65]">High Tensile Wire</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-[#E8DFD8] text-center">
                  <Truck className="w-4 h-4 text-[#C5A880] mx-auto mb-1" />
                  <p className="text-[10px] font-semibold text-[#1C1B1A]">Easy Exchange</p>
                  <p className="text-[9px] text-[#736C65]">Within 24 Hours</p>
                </div>
              </div>
            </div>

            {/* Right: Product Details & Controls */}
            <div className="md:col-span-6 flex flex-col justify-between">
              <div>
                {/* Title & Star Rating */}
                <div className="flex items-center gap-1.5 text-xs text-[#736C65] mb-1.5 flex-wrap">
                  <div className="flex items-center text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                  <span className="font-semibold text-[#1C1B1A]">{averageRating}</span>
                  <span className="text-[#A69E96]">({dynamicReviewsCount} customer reviews)</span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                    {totalSold} sold
                  </span>
                  {isBestSeller && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-[#1C1B1A] text-[#E6C687] border border-[#C5A880]/40">
                      ★ Bestseller
                    </span>
                  )}
                </div>

                <h2 className="font-serif text-2xl sm:text-3xl text-[#1C1B1A] font-semibold leading-tight">
                  {product.title}
                </h2>
                <p className="text-xs text-[#736C65] mt-1 font-medium">
                  {product.subtitle}
                </p>

                {/* Price Display in NPR */}
                <div className="flex items-baseline gap-3 my-4 py-3 px-4 bg-white rounded-xl border border-[#E8DFD8]">
                  <span className="font-serif text-2xl sm:text-3xl font-semibold text-[#1C1B1A]">
                    Rs. {product.price.toLocaleString()}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-sm text-[#A69E96] line-through">
                      Rs. {product.originalPrice.toLocaleString()}
                    </span>
                  )}
                  {isOutOfStock ? (
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md ml-auto flex items-center gap-1">
                      <Bell className="w-3 h-3 text-rose-600" />
                      <span>Sold Out • Waitlist Open</span>
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-[#2E7D32] bg-emerald-50 px-2 py-0.5 rounded-md ml-auto">
                      In Stock ({product.stockCount || 1} available)
                    </span>
                  )}
                </div>

                {/* Clean Quantity Selector */}
                <div className="flex items-center justify-between p-2.5 sm:p-3 my-3 bg-white rounded-xl border border-[#E8DFD8]">
                  <span className="text-xs font-semibold text-[#1C1B1A] uppercase tracking-wider">
                    Quantity:
                  </span>
                  <div className="flex items-center border border-[#E8DFD8] rounded-lg bg-[#FAF8F5]">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-1.5 text-sm font-semibold text-[#5E5955] hover:text-[#1C1B1A] cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-3 py-1.5 text-xs font-bold text-[#1C1B1A] min-w-8 text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(10, quantity + 1))}
                      className="px-3 py-1.5 text-sm font-semibold text-[#5E5955] hover:text-[#1C1B1A] cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Primary Action Buttons: Add to Bag, Buy Now, and Order via WhatsApp - PLACED DIRECTLY ABOVE DETAIL DESCRIPTION */}
                {isOutOfStock ? (
                  <div className="space-y-3 mb-5">
                    {/* Out of stock alert banner */}
                    <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-300 flex items-start gap-2.5 text-xs text-amber-950">
                      <Bell className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold">This handcrafted creation is currently sold out</p>
                        <p className="text-[11px] text-amber-900 leading-relaxed">
                          Due to high customer demand, this handcrafted piece is in queue at our Kathmandu workshop. Join the waitlist to receive an email alert the moment it is restocked.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      {isWaitlisted ? (
                        <div className="flex-1 py-3.5 px-6 rounded-xl bg-emerald-50 border border-emerald-400 text-emerald-900 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xs">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>{isNe ? 'तपाईं पर्खाइ सूचीमा हुनुहुन्छ!' : "You're on the Restock Waitlist!"}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsNotifyModalOpen(true)}
                          className="flex-1 py-3.5 px-6 rounded-xl text-xs font-bold tracking-wider uppercase bg-[#1C1B1A] hover:bg-black text-[#D4AF37] transition-all duration-200 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                        >
                          <Bell className="w-4 h-4 text-[#D4AF37] animate-bounce" />
                          <span>{isNe ? 'स्टकमा आउँदा खबर गर्नुहोस्' : 'Notify Me When Restocked'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleWhatsAppOrder}
                        className="py-3.5 px-5 bg-white border border-[#25D366] text-[#075E54] hover:bg-[#25D366]/5 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                        title="Inquire about priority made-to-order production"
                      >
                        <MessageCircle className="w-4 h-4 text-[#25D366]" />
                        <span>{t('preOrderWhatsApp')}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 mb-5">
                    {/* Top Row: Add to Bag & Buy Now */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Add to Bag Button */}
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        className={`py-3.5 px-4 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                          addedSuccess
                            ? 'bg-[#2E7D32] text-white'
                            : 'bg-white text-[#1C1B1A] border-2 border-[#1C1B1A] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        {addedSuccess ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>{t('addedToBag')}</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-4 h-4 text-[#8C7A6B]" />
                            <span>{t('addToBag')}</span>
                          </>
                        )}
                      </button>

                      {/* Buy Now Button - Direct Checkout */}
                      <button
                        type="button"
                        onClick={handleBuyNow}
                        className="py-3.5 px-4 rounded-xl text-xs font-bold tracking-wider uppercase bg-[#1C1B1A] hover:bg-[#34312F] text-[#FAF8F5] transition-all duration-200 flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.98]"
                      >
                        <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                        <span>Buy Now • Rs. {(product.price * quantity).toLocaleString()}</span>
                      </button>
                    </div>

                    {/* Order via WhatsApp */}
                    <button
                      type="button"
                      onClick={handleWhatsAppOrder}
                      className="w-full py-3 px-4 bg-[#FAF8F5] hover:bg-[#F2ECE4] border border-[#25D366] text-[#075E54] rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <MessageCircle className="w-4 h-4 text-[#25D366]" />
                      <span>{t('orderOnWhatsApp')}</span>
                    </button>
                  </div>
                )}

                {/* Detailed Description - Directly under Add to Bag, Buy Now, and WhatsApp */}
                <div className="pt-3 border-t border-[#E8DFD8] mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C7A6B] mb-1.5">
                    {isNe ? 'विस्तृत विवरण' : 'Detailed Description'}
                  </h4>
                  <p className="text-xs sm:text-sm text-[#4A4541] leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* Minimalist Materials, Dimensions & Care Accordion */}
                <div className="border-t border-[#E8DFD8] divide-y divide-[#E8DFD8] mb-4">
                  {/* Materials & Dimensions */}
                  <div>
                    <button
                      onClick={() => toggleAccordion('materials')}
                      className="w-full py-2.5 flex items-center justify-between text-xs font-semibold text-[#1C1B1A] uppercase tracking-wider text-left cursor-pointer"
                    >
                      <span>Materials & Dimensions</span>
                      {activeAccordion === 'materials' ? (
                        <ChevronUp className="w-4 h-4 text-[#8C7A6B]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#8C7A6B]" />
                      )}
                    </button>
                    {activeAccordion === 'materials' && (
                      <div className="pb-3 text-xs text-[#5E5955] space-y-1.5 animate-in fade-in">
                        <p><strong className="text-[#1C1B1A]">Dimensions:</strong> {product.dimensions}</p>
                        {product.weight && <p><strong className="text-[#1C1B1A]">Weight:</strong> {product.weight}</p>}
                        <div>
                          <strong className="text-[#1C1B1A] block mb-1">Materials:</strong>
                          <ul className="list-disc pl-4 space-y-0.5 text-[#736C65]">
                            {product.materials.map((m, idx) => (
                              <li key={idx}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Care Guidelines */}
                  <div>
                    <button
                      onClick={() => toggleAccordion('care')}
                      className="w-full py-2.5 flex items-center justify-between text-xs font-semibold text-[#1C1B1A] uppercase tracking-wider text-left cursor-pointer"
                    >
                      <span>Care Guide</span>
                      {activeAccordion === 'care' ? (
                        <ChevronUp className="w-4 h-4 text-[#8C7A6B]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#8C7A6B]" />
                      )}
                    </button>
                    {activeAccordion === 'care' && (
                      <div className="pb-3 text-xs text-[#5E5955] space-y-1.5 animate-in fade-in">
                        <p className="text-[#5E5955] leading-relaxed">
                          Store in cotton or silk pouch.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Delivery & Payment in Nepal */}
                  <div>
                    <button
                      onClick={() => toggleAccordion('delivery')}
                      className="w-full py-2.5 flex items-center justify-between text-xs font-semibold text-[#1C1B1A] uppercase tracking-wider text-left cursor-pointer"
                    >
                      <span>Delivery in Nepal & Payment Modes</span>
                      {activeAccordion === 'delivery' ? (
                        <ChevronUp className="w-4 h-4 text-[#8C7A6B]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#8C7A6B]" />
                      )}
                    </button>
                    {activeAccordion === 'delivery' && (
                      <div className="pb-3 text-xs text-[#5E5955] space-y-1 animate-in fade-in">
                        <p>• <strong>Kathmandu Valley:</strong> Rs. 120 (1 to 2 days)</p>
                        <p>• <strong>Outside Valley:</strong> Rs. 250 to 300 (can increase) (3 to 7 days)</p>
                        <p>• <strong>Payment Methods:</strong> Cash on Delivery (COD), eSewa QR, Khalti QR, Mobile Banking.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Minimalist Secondary Utilities Row */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E8DFD8] text-[11px] text-[#736C65]">
                  <button
                    type="button"
                    onClick={handleCopyProductLink}
                    className="hover:text-[#1C1B1A] flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    {shareCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-[#C5A880]" />
                        <span>Share Piece</span>
                      </>
                    )}
                  </button>

                  <span className="text-[#D8CFCA]">•</span>

                  <button
                    type="button"
                    onClick={() => {
                      if (product) {
                        if (!isProductCompared(product.id)) {
                          toggleCompareProduct(product);
                        }
                        openCompareModal();
                      }
                    }}
                    className="hover:text-[#1C1B1A] flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <Scale className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span>Compare</span>
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* Customer Reviews & Ratings Section (placed at the bottom of the modal) */}
          <div className="mt-8 pt-6 border-t border-[#E8DFD8]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-xl sm:text-2xl text-[#1C1B1A] font-semibold">
                    Customer Reviews in Nepal
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FAF8F5] border border-[#E8DFD8] text-[#1C1B1A]">
                    {dynamicReviewsCount} Reviews
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#1C1B1A]">{averageRating} out of 5</span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-xs text-[#736C65]">{totalSold} verified pieces delivered from Kathmandu, Nepal</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {isSellerMode && (
                  <button
                    type="button"
                    onClick={() => openReviewsManager(product.id)}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    title="Open Seller Studio Review Manager for this piece"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                    <span>Manage Reviews</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-4 py-2 bg-[#1C1B1A] hover:bg-[#34312F] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>{showReviewForm ? 'Cancel Review' : 'Write a Review'}</span>
                </button>
              </div>
            </div>

            {/* Review Submission Form */}
            {showReviewForm && (
              <form onSubmit={handleSubmitReview} className="mb-6 p-4 sm:p-5 bg-white rounded-2xl border border-[#E8DFD8] shadow-xs space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-[#F0EBE5] pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C1B1A]">
                    Share Your Handcrafted Experience
                  </h4>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-[#736C65] mr-1">Your Rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReviewRating(star)}
                        className="p-0.5 focus:outline-none"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= newReviewRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-zinc-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newReviewAuthor}
                      onChange={(e) => setNewReviewAuthor(e.target.value)}
                      placeholder="e.g. Alisha Shrestha"
                      className="w-full text-xs p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-lg focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                      Location in Nepal
                    </label>
                    <input
                      type="text"
                      value={newReviewLocation}
                      onChange={(e) => setNewReviewLocation(e.target.value)}
                      placeholder="e.g. Kathmandu, Nepal / Pokhara"
                      className="w-full text-xs p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-lg focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    Your Review *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newReviewComment}
                    onChange={(e) => setNewReviewComment(e.target.value)}
                    placeholder="Tell us about the beading quality, pearl shine, and delivery experience..."
                    className="w-full text-xs p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-lg focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-[#8C7A6B]">
                    Verified buyer reviews help support local Nepali handcrafters.
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="px-4 py-2 bg-[#C5A880] hover:bg-[#b0936b] disabled:opacity-60 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {isSubmittingReview
                        ? 'Saving to Firestore...'
                        : reviewSubmitted
                        ? 'Review Published!'
                        : 'Submit Review'}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* Reviews Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {reviewsList.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 bg-white rounded-xl border border-[#E8DFD8] shadow-2xs hover:border-[#C5A880]/60 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1 text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= Math.round(rev.rating) ? 'fill-amber-400' : 'text-zinc-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-[#A69E96]">{rev.date}</span>
                    </div>

                    <p className="text-xs text-[#4A4541] leading-relaxed mb-3">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#F5F2ED] flex items-center justify-between text-[11px]">
                    <div>
                      <span className="font-semibold text-[#1C1B1A]">{rev.author}</span>
                      <span className="text-[10px] text-[#8C7A6B] block leading-none mt-0.5">{rev.location}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSellerMode && (
                        <button
                          type="button"
                          onClick={() => openReviewsManager(product.id)}
                          className="px-2 py-0.5 text-[10px] font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                          title="Edit review in Seller Studio"
                        >
                          <Edit3 className="w-2.5 h-2.5 text-amber-700" />
                          <span>Edit</span>
                        </button>
                      )}
                      {rev.verified && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                          <Check className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Verified Purchase</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Assurance Footnote */}
            <div className="mt-4 p-3 bg-white/70 rounded-xl border border-[#E8DFD8] flex items-center justify-between text-[11px] text-[#736C65] flex-wrap gap-2">
              <span>📍 Handcrafted & Dispatched from <strong>Kathmandu, Nepal</strong></span>
              <span>🔄 <strong>Easy Exchange within 24 hrs</strong> of delivery</span>
            </div>
          </div>
        </div>

      </div>
        </div>

      {/* Instagram Story Share Assistant Modal */}
      {showStoryModal && product && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowStoryModal(false)}
        >
          <div 
            className="relative w-full max-w-sm rounded-3xl bg-[#1C1B1A] border-2 border-[#D4AF37]/50 p-5 sm:p-6 text-white shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowStoryModal(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-[#E8DFD8] flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-bold uppercase tracking-wider">
              <Instagram className="w-4 h-4 text-[#E1306C]" />
              <span>Share to Instagram Story</span>
            </div>

            {/* Simulated Story Card Preview */}
            <div className="relative aspect-[9/12] w-full rounded-2xl overflow-hidden border border-[#D4AF37]/40 bg-gradient-to-b from-[#282420] via-[#1E1C1A] to-[#151413] flex flex-col justify-between p-4 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest text-[#D4AF37] uppercase bg-black/60 px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                  @artified_np
                </span>
                <span className="text-[9px] text-[#C5A880] font-semibold bg-white/10 px-2 py-0.5 rounded-full">
                  Kathmandu Atelier
                </span>
              </div>

              <div className="my-auto text-center py-2 space-y-1.5">
                <img
                  src={product.images[0] || modalFallback}
                  alt={product.title}
                  loading="lazy"
                  decoding="async"
                  className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl mx-auto shadow-md border border-[#E8DFD8]/20"
                />
                <h4 className="font-serif text-sm sm:text-base font-bold text-white leading-tight">
                  {product.title}
                </h4>
                <p className="text-xs font-mono text-[#D4AF37] font-black">
                  Rs. {product.price.toLocaleString()}
                </p>
                <span className="text-[9px] text-[#A69E96] block">
                  100% Handcrafted Pearls • Nepal
                </span>
              </div>

              <div className="text-center pt-2 border-t border-white/10">
                <span className="text-[9px] text-[#C5A880] tracking-wider uppercase block">
                  Tap link in Story to shop
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleCopyProductLink}
                className="w-full py-2.5 px-4 bg-[#D4AF37] hover:bg-[#c49f2c] text-[#1C1B1A] font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {shareCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-950" />
                    <span>Story Link & Caption Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Story Link & Caption</span>
                  </>
                )}
              </button>

              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Instagram className="w-4 h-4 text-white" />
                <span>Open Instagram App</span>
              </a>
            </div>

            <p className="text-[10px] text-[#8C847E] text-center leading-relaxed">
              Tag <strong>@artified_np</strong> in your story and our atelier will repost you on our official journal!
            </p>
          </div>
        </div>
      )}

      {/* Restock Waitlist Modal */}
      {product && (
        <RestockNotifyModal
          product={product}
          isOpen={isNotifyModalOpen}
          onClose={() => setIsNotifyModalOpen(false)}
          onSuccess={() => setWaitlistRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
};
