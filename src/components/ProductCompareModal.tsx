import React from 'react';
import { 
  X, 
  Check, 
  ShoppingBag, 
  MessageCircle, 
  Star, 
  Sparkles, 
  Trash2, 
  ArrowRight, 
  Scale, 
  Eye, 
  ShieldCheck, 
  Clock, 
  Truck,
  Plus
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { calculateTotalSold, calculateReviewsCount, isProductBestSeller } from '../utils/productStats';
import { Product } from '../types';
import { getRealProductImage, CAVIAR_PEARL_BAG_IMAGE } from '../utils/productImages';

export const ProductCompareModal: React.FC = () => {
  const { 
    compareProducts, 
    isCompareOpen, 
    setIsCompareOpen, 
    toggleCompareProduct, 
    clearCompare, 
    addToCart, 
    setQuickViewProduct,
    products,
    bestsellerThreshold
  } = useCart();

  if (!isCompareOpen) return null;

  const productA = compareProducts[0];
  const productB = compareProducts[1];

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
  };

  const handleWhatsAppOrder = (product: Product) => {
    const phone = '9779767573721';
    const text = encodeURIComponent(
      `Namaste Artified Nepal! ✨ I am interested in ordering the handmade ${product.title} (Rs. ${product.price.toLocaleString()}). Could you please confirm availability and valley delivery? Dhanyabad!`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  // Suggested alternative pieces if only 1 item is chosen
  const suggestedAlternatives = productA 
    ? products.filter((p) => p.id !== productA.id && p.category === productA.category).slice(0, 3)
    : products.slice(0, 3);

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-5 md:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#1C1B1A]/70 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCompareOpen(false)}
      />

      {/* Main Comparison Modal */}
      <div 
        className="relative bg-[#FAF8F5] w-full max-w-4xl rounded-3xl shadow-2xl border-2 border-[#D4AF37]/40 overflow-hidden z-10 flex flex-col max-h-[92vh] text-[#1C1B1A]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1C1B1A] text-white p-4 sm:p-5 flex items-center justify-between border-b border-[#34312F] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 id="compare-modal-title" className="font-serif text-base sm:text-lg font-semibold tracking-wide flex items-center gap-2">
                <span>Side-by-Side Creation Comparison</span>
                <span className="text-[10px] bg-[#D4AF37] text-[#1C1B1A] font-bold px-2 py-0.5 rounded-full uppercase">
                  {compareProducts.length} of 2 pieces
                </span>
              </h2>
              <p className="text-[11px] text-[#A69E96]">
                Compare pricing, materials, dimensions, and craftsmanship details
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {compareProducts.length > 0 && (
              <button
                type="button"
                onClick={clearCompare}
                className="text-[11px] text-[#A69E96] hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
              >
                Clear Both
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCompareOpen(false)}
              className="p-1.5 text-[#A69E96] hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {compareProducts.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-14 h-14 rounded-full bg-white border border-[#E8DFD8] flex items-center justify-center mx-auto text-[#C5A880]">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-medium text-[#1C1B1A]">
                No items selected for comparison
              </h3>
              <p className="text-xs text-[#736C65] max-w-sm mx-auto leading-relaxed">
                Click the "Compare" button on any two pieces in our catalog to inspect them side-by-side.
              </p>
              <button
                type="button"
                onClick={() => setIsCompareOpen(false)}
                className="px-5 py-2.5 bg-[#1C1B1A] text-white text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-black transition-colors"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Product Cards Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                
                {/* Column A */}
                {productA && (
                  <ComparisonColumn 
                    product={productA} 
                    onRemove={() => toggleCompareProduct(productA)}
                    onAddToCart={() => handleAddToCart(productA)}
                    onWhatsAppOrder={() => handleWhatsAppOrder(productA)}
                    onQuickView={() => {
                      setIsCompareOpen(false);
                      setQuickViewProduct(productA);
                    }}
                    bestsellerThreshold={bestsellerThreshold}
                  />
                )}

                {/* Column B */}
                {productB ? (
                  <ComparisonColumn 
                    product={productB} 
                    onRemove={() => toggleCompareProduct(productB)}
                    onAddToCart={() => handleAddToCart(productB)}
                    onWhatsAppOrder={() => handleWhatsAppOrder(productB)}
                    onQuickView={() => {
                      setIsCompareOpen(false);
                      setQuickViewProduct(productB);
                    }}
                    bestsellerThreshold={bestsellerThreshold}
                  />
                ) : (
                  /* Empty Slot - Prompt to select piece B */
                  <div className="rounded-2xl border-2 border-dashed border-[#D4AF37]/50 bg-white/70 p-6 flex flex-col justify-between text-center space-y-4">
                    <div className="my-auto space-y-2 py-6">
                      <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#E8DFD8] flex items-center justify-center mx-auto text-[#C5A880]">
                        <Plus className="w-6 h-6" />
                      </div>
                      <h4 className="font-serif text-base font-semibold text-[#1C1B1A]">
                        Select Second Piece to Compare
                      </h4>
                      <p className="text-xs text-[#736C65] max-w-xs mx-auto leading-relaxed">
                        Choose another pearl bag or choker from below or return to the shop to see a complete breakdown.
                      </p>
                    </div>

                    {/* Suggestions */}
                    {suggestedAlternatives.length > 0 && (
                      <div className="pt-4 border-t border-[#E8DFD8] space-y-2 text-left">
                        <span className="text-[10px] uppercase font-bold text-[#8C7A6B] tracking-wider block">
                          Suggested to compare:
                        </span>
                        <div className="space-y-1.5">
                          {suggestedAlternatives.map((alt) => (
                            <div 
                              key={alt.id}
                              className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E8DFD8] hover:border-[#C5A880] transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={getRealProductImage(alt.title, alt.images[0])}
                                  alt={alt.title}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = CAVIAR_PEARL_BAG_IMAGE;
                                  }}
                                  className="w-10 h-10 object-cover rounded-lg shrink-0 border border-[#E8DFD8]"
                                />
                                <div className="truncate text-xs">
                                  <p className="font-semibold text-[#1C1B1A] truncate">{alt.title}</p>
                                  <p className="text-[11px] text-[#736C65]">Rs. {alt.price.toLocaleString()}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleCompareProduct(alt)}
                                className="px-2.5 py-1 bg-[#1C1B1A] hover:bg-[#34312F] text-white text-[11px] font-semibold rounded-lg shrink-0 cursor-pointer"
                              >
                                + Compare
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Price Difference & Summary Callout (If both products selected) */}
              {productA && productB && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/70 via-white to-amber-50/70 border border-[#D4AF37]/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <p className="text-[#3C3835]">
                      <strong>Price Comparison:</strong>{' '}
                      {productA.price === productB.price ? (
                        <span>Both pieces are priced identically at <strong>Rs. {productA.price.toLocaleString()}</strong>.</span>
                      ) : productA.price < productB.price ? (
                        <span>
                          <strong>{productA.title}</strong> is <strong>Rs. {(productB.price - productA.price).toLocaleString()}</strong> less than {productB.title}.
                        </span>
                      ) : (
                        <span>
                          <strong>{productB.title}</strong> is <strong>Rs. {(productA.price - productB.price).toLocaleString()}</strong> less than {productA.title}.
                        </span>
                      )}
                    </p>
                  </div>

                  <span className="text-[10px] text-[#736C65] shrink-0">
                    Both eligible for 24-hr exchange in Nepal
                  </span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#E8DFD8] flex items-center justify-between text-xs">
          <span className="text-[#736C65] text-[11px]">
            Kathmandu Workshop • Handcrafted in Kathmandu, Nepal
          </span>
          <button
            type="button"
            onClick={() => setIsCompareOpen(false)}
            className="px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#E8DFD8] text-[#1C1B1A] font-semibold transition-colors cursor-pointer"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};

interface ComparisonColumnProps {
  product: Product;
  onRemove: () => void;
  onAddToCart: () => void;
  onWhatsAppOrder: () => void;
  onQuickView: () => void;
  bestsellerThreshold: number;
}

const ComparisonColumn: React.FC<ComparisonColumnProps> = ({
  product,
  onRemove,
  onAddToCart,
  onWhatsAppOrder,
  onQuickView,
  bestsellerThreshold
}) => {
  const isBestSeller = isProductBestSeller(product, bestsellerThreshold);
  const reviewsCount = calculateReviewsCount(product);
  const totalSold = calculateTotalSold(product);

  const fallback = CAVIAR_PEARL_BAG_IMAGE;

  return (
    <div className="bg-white rounded-2xl border border-[#E8DFD8] p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Top Product Hero */}
        <div className="relative">
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#FAF8F5] border border-[#E8DFD8]">
            <img
              src={getRealProductImage(product.title, product.images[0])}
              alt={product.title}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = CAVIAR_PEARL_BAG_IMAGE;
              }}
              className="w-full h-full object-cover"
            />
            {isBestSeller && (
              <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#1C1B1A] text-[#D4AF37] border border-[#D4AF37]/40 shadow-xs">
                ★ Bestseller
              </span>
            )}
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/90 hover:bg-white text-[#736C65] hover:text-rose-600 transition-colors shadow-xs cursor-pointer"
              title="Remove from comparison"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick View Button */}
          <button
            type="button"
            onClick={onQuickView}
            className="w-full mt-2 py-1.5 px-3 rounded-lg bg-[#FAF8F5] hover:bg-[#E8DFD8] text-[11px] font-semibold text-[#1C1B1A] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>View Full Details</span>
          </button>
        </div>

        {/* Title, Category & Price */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#8C7A6B] tracking-wider block">
            {product.category.replace('-', ' ')}
          </span>
          <h3 className="font-serif text-base sm:text-lg font-bold text-[#1C1B1A] leading-snug">
            {product.title}
          </h3>
          <p className="text-xs text-[#736C65] line-clamp-1">{product.subtitle}</p>

          <div className="flex items-baseline gap-2 pt-1">
            <span className="font-mono text-lg font-bold text-[#1C1B1A]">
              Rs. {product.price.toLocaleString()}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-[#A69E96] line-through">
                Rs. {product.originalPrice.toLocaleString()}
              </span>
            )}
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold ml-auto">
              In Stock (Nepal)
            </span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 text-xs text-[#736C65] pt-0.5">
            <div className="flex items-center text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-amber-400" />
              ))}
            </div>
            <span className="font-bold text-[#1C1B1A]">{product.rating}</span>
            <span className="text-[11px]">({reviewsCount} reviews • {totalSold} sold)</span>
          </div>
        </div>

        {/* Detailed Attribute Breakdown Table */}
        <div className="border-t border-[#F0EBE5] pt-3 divide-y divide-[#F0EBE5] text-xs">
          {/* Materials */}
          <div className="py-2 space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#8C7A6B] block">
              Materials & Beads:
            </span>
            <ul className="space-y-0.5 text-[#3C3835]">
              {product.materials.map((m, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-[#C5A880] mt-0.5">•</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Dimensions */}
          <div className="py-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#8C7A6B]">
              Dimensions:
            </span>
            <span className="font-medium text-[#1C1B1A] text-right">
              {product.dimensions || 'Standard Luxury Sizing'}
            </span>
          </div>

          {/* Weight */}
          {product.weight && (
            <div className="py-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-[#8C7A6B]">
                Weight:
              </span>
              <span className="font-medium text-[#1C1B1A]">
                {product.weight}
              </span>
            </div>
          )}

          {/* Handcrafting Time */}
          <div className="py-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#8C7A6B]">
              Handcraft Time:
            </span>
            <span className="font-medium text-[#1C1B1A] flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#C5A880]" />
              <span>{product.leadTime || '1–2 business days'}</span>
            </span>
          </div>

          {/* Delivery & Exchange */}
          <div className="py-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#8C7A6B]">
              Valley Delivery:
            </span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <Truck className="w-3 h-3 text-emerald-600" />
              <span>1–2 business days</span>
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-3 border-t border-[#F0EBE5]">
        <button
          type="button"
          onClick={onAddToCart}
          className="w-full py-2.5 px-4 bg-[#1C1B1A] hover:bg-black active:scale-[0.99] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
          <span>Add to Bag (Rs. {product.price.toLocaleString()})</span>
        </button>

        <button
          type="button"
          onClick={onWhatsAppOrder}
          className="w-full py-2 px-4 bg-white border border-[#25D366] text-[#075E54] hover:bg-emerald-50 active:scale-[0.99] text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
          <span>Order via WhatsApp</span>
        </button>
      </div>
    </div>
  );
};
