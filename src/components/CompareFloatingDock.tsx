import React from 'react';
import { Scale, X, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getRealProductImage, CAVIAR_PEARL_BAG_IMAGE } from '../utils/productImages';

export const CompareFloatingDock: React.FC = () => {
  const { 
    compareProducts, 
    toggleCompareProduct, 
    clearCompare, 
    openCompareModal,
    isCompareOpen 
  } = useCart();

  if (compareProducts.length === 0 || isCompareOpen) return null;

  return (
    <aside 
      aria-label="Product Comparison Bar"
      className="fixed bottom-20 lg:bottom-5 left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-lg bg-[#1C1B1A]/95 text-white backdrop-blur-md rounded-2xl border-2 border-[#D4AF37]/50 shadow-[0_12px_40px_rgba(0,0,0,0.5)] p-2.5 sm:p-3 animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Thumbnails of selected pieces */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            {compareProducts.map((p) => (
              <div 
                key={p.id} 
                className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden border border-[#D4AF37] group shrink-0"
              >
                <img
                  src={getRealProductImage(p.title, p.images[0])}
                  alt={p.title}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = CAVIAR_PEARL_BAG_IMAGE;
                  }}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCompareProduct(p);
                  }}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                  title="Remove from compare"
                >
                  <X className="w-3.5 h-3.5 text-rose-400" />
                </button>
              </div>
            ))}

            {/* Empty second slot placeholder if only 1 item */}
            {compareProducts.length === 1 && (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 border-dashed border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] text-[10px] shrink-0">
                <span>+1</span>
              </div>
            )}
          </div>

          <div className="truncate text-left text-xs">
            <span className="font-bold text-white block truncate leading-tight">
              {compareProducts.length === 1 
                ? 'Select 1 more to compare' 
                : '2 pieces ready to compare'}
            </span>
            <span className="text-[10px] text-[#A69E96] block truncate">
              {compareProducts.map((p) => p.title).join(' vs ')}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={clearCompare}
            className="p-1.5 text-[#A69E96] hover:text-white rounded-lg hover:bg-white/10 transition-colors text-[10px] uppercase font-bold"
            title="Clear all"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={openCompareModal}
            className="py-2 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#C5A880] to-[#D4AF37] hover:brightness-105 active:scale-[0.98] text-[#1C1B1A] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5 shrink-0" />
            <span>Compare ({compareProducts.length})</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>
    </aside>
  );
};
