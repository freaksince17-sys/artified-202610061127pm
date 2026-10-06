import React, { useEffect, useState } from 'react';
import { ShoppingBag, CheckCircle2, X, ArrowRight, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

export const AddToCartToast: React.FC = () => {
  const { lastAddedItem, clearLastAddedItem, setIsCartOpen, cartCount } = useCart();
  const { language } = useLanguage();
  const isNe = language === 'ne';

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (lastAddedItem) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          clearLastAddedItem();
        }, 300);
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [lastAddedItem, clearLastAddedItem]);

  if (!lastAddedItem || !isVisible) return null;

  const { product, quantity, color } = lastAddedItem;
  const image = (product.images && product.images[0]) || '/og-image.jpg';

  return (
    <div 
      role="status" 
      aria-live="polite"
      className="fixed top-20 sm:top-24 right-3 sm:right-6 z-[120] max-w-sm w-[calc(100vw-1.5rem)] sm:w-auto animate-slide-down pointer-events-auto"
    >
      <div className="bg-[#1C1B1A]/95 text-white backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-[#D4AF37]/40 shadow-2xl flex items-center gap-3 transition-all">
        
        {/* Product Thumbnail with Animated Checkmark */}
        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#34312F] bg-black">
          <img 
            src={image} 
            alt={product.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 drop-shadow-sm animate-scale-bounce" />
          </div>
        </div>

        {/* Content Info */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1 text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-2.5 h-2.5" />
            <span>{isNe ? 'झोलामा थपियो' : 'Added to Bag'}</span>
            {quantity > 1 && (
              <span className="bg-[#D4AF37]/20 text-[#D4AF37] px-1 rounded text-[9px]">
                x{quantity}
              </span>
            )}
          </div>
          
          <h4 className="text-xs font-semibold text-white truncate mt-0.5">
            {product.title}
          </h4>

          <div className="flex items-center gap-2 text-[11px] text-[#A69E96] mt-0.5">
            <span className="text-white font-medium">
              NPR {(product.price * quantity).toLocaleString()}
            </span>
            {color && (
              <>
                <span>•</span>
                <span className="truncate">{color}</span>
              </>
            )}
          </div>
        </div>

        {/* View Bag Action Button */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsVisible(false);
              clearLastAddedItem();
              setIsCartOpen(true);
            }}
            className="py-1.5 px-3 rounded-xl bg-[#D4AF37] hover:bg-[#c29f2e] text-[#1C1B1A] text-xs font-bold tracking-wider uppercase transition-transform active:scale-95 flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <span>{isNe ? 'हेर्नुहोस्' : 'View Bag'}</span>
            <span className="text-[10px] opacity-80">({cartCount})</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          {/* Close X */}
          <button
            type="button"
            onClick={() => {
              setIsVisible(false);
              clearLastAddedItem();
            }}
            className="p-1 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
