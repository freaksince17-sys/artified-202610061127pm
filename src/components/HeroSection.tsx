import React, { useState, useEffect } from 'react';
import { 
  ArrowDownRight, 
  Sparkles, 
  ShieldCheck, 
  HeartHandshake, 
  Truck, 
  Minimize2, 
  Maximize2, 
  X, 
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getRealProductImage, CAVIAR_PEARL_BAG_IMAGE } from '../utils/productImages';

type HeroDisplayMode = 'compact' | 'full' | 'collapsed' | 'hidden';

export const HeroSection: React.FC = () => {
  const { products, setQuickViewProduct, isSellerMode } = useCart();
  const featuredProduct = products.find(p => p.id === 'maya-aurelia-pearl-bag') || products[0];

  // Load initial mode preference from localStorage, default to 'compact' to save space
  const [displayMode, setDisplayMode] = useState<HeroDisplayMode>(() => {
    try {
      const saved = localStorage.getItem('artified_hero_display_mode') as HeroDisplayMode;
      if (saved && ['compact', 'full', 'collapsed', 'hidden'].includes(saved)) {
        return saved;
      }
    } catch {
      // Ignore
    }
    return 'compact';
  });

  const handleSetMode = (mode: HeroDisplayMode) => {
    setDisplayMode(mode);
    try {
      localStorage.setItem('artified_hero_display_mode', mode);
    } catch {
      // Ignore
    }
  };

  const scrollToShop = () => {
    const el = document.getElementById('shop-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. STATE: Hidden (Deleted / Dismissed from page)
  if (displayMode === 'hidden') {
    return (
      <div className="bg-[#FAF8F5] border-b border-[#E8DFD8]/60 py-1.5 px-4 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <span className="text-[11px] text-[#A69E96]">Hero section is currently hidden</span>
          <button
            type="button"
            onClick={() => handleSetMode('compact')}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#8C7A6B] hover:text-[#1C1B1A] px-2.5 py-0.5 rounded-full hover:bg-white transition-colors border border-[#E8DFD8]"
            title="Restore Hero Section"
          >
            <RotateCcw className="w-3 h-3 text-[#C5A880]" />
            <span>Restore Hero Banner</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. STATE: Collapsed (Minimized to a slim 1-line welcome ribbon)
  if (displayMode === 'collapsed') {
    return (
      <aside aria-label="Welcome banner" className="bg-[#FAF8F5] border-b border-[#E8DFD8] py-2 px-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2 text-[#736C65] truncate">
            <span className="w-2 h-2 rounded-full bg-[#C5A880] animate-pulse shrink-0" />
            <span className="font-semibold text-[#1C1B1A]">Artified_np</span>
            <span className="hidden sm:inline text-[#C5A880]">•</span>
            <span className="truncate hidden sm:inline">Handcrafted Pearl Evening Bags & Wearable Art • Kathmandu, Nepal</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={scrollToShop}
              className="text-[11px] font-semibold text-[#1C1B1A] hover:underline"
            >
              Shop Pieces ↓
            </button>

            <button
              type="button"
              onClick={() => handleSetMode('compact')}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#736C65] hover:text-[#1C1B1A] bg-white px-2.5 py-1 rounded-full border border-[#E8DFD8] shadow-xs"
              title="Expand Hero Banner"
            >
              <Maximize2 className="w-3 h-3 text-[#C5A880]" />
              <span>Expand</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetMode('hidden')}
              className="p-1 text-[#A69E96] hover:text-[#1C1B1A]"
              title="Hide section completely"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  const isFull = displayMode === 'full';

  // 3. STATE: Compact (Default Minimized Mode) or Full Mode
  return (
    <section className={`relative overflow-hidden bg-[#FAF8F5] border-b border-[#E8DFD8]/70 transition-all ${
      isFull ? 'pt-5 pb-10 md:py-12' : 'py-3 sm:py-4 md:py-5'
    }`}>
      {/* Decorative ambient background accents */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#F4EFEB] rounded-full filter blur-3xl opacity-50 pointer-events-none -z-0"></div>
      <div className="absolute bottom-0 left-10 w-64 h-64 bg-[#E8DFD8]/40 rounded-full filter blur-3xl opacity-60 pointer-events-none -z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Space-Saving Controls Bar */}
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#E8DFD8]/50">
          <div className="inline-flex items-center gap-2 bg-white/80 border border-[#E8DFD8] rounded-full px-3 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A880] animate-pulse"></span>
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#736C65]">
              Handmade Beaded Collection • Nepal
            </span>
          </div>

          {/* Quick Space Controls: Compact / Full / Minimize / Delete */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => handleSetMode(isFull ? 'compact' : 'full')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-white border border-[#E8DFD8] text-[#736C65] hover:text-[#1C1B1A] hover:bg-[#FAF8F5] transition-all shadow-2xs"
              title={isFull ? 'Switch to Compact (Saves space)' : 'Switch to Full size'}
            >
              <SlidersHorizontal className="w-3 h-3 text-[#C5A880]" />
              <span>{isFull ? 'Make Compact' : 'Full Size'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetMode('collapsed')}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-white border border-[#E8DFD8] text-[#736C65] hover:text-[#1C1B1A] hover:bg-[#FAF8F5] transition-all shadow-2xs"
              title="Minimize to thin bar"
            >
              <Minimize2 className="w-3 h-3" />
              <span className="hidden sm:inline">Minimize</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetMode('hidden')}
              className="p-1 rounded-md text-[#A69E96] hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete / Hide section"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-12 items-center ${
          isFull ? 'gap-8 lg:gap-12' : 'gap-6 lg:gap-8'
        }`}>
          
          {/* Left Column: Editorial Headline & Actions */}
          <div className={`${isFull ? 'lg:col-span-7' : 'lg:col-span-7'} flex flex-col justify-center text-left`}>
            {/* Editorial Main Title */}
            <h1 className={`font-serif text-[#1C1B1A] tracking-tight ${
              isFull 
                ? 'text-4xl sm:text-5xl md:text-6xl leading-[1.12] mb-5' 
                : 'text-2xl sm:text-3xl md:text-4xl leading-[1.15] mb-2.5'
            }`}>
              Intricately Handcrafted.{' '}
              <span className="italic font-light text-[#8C7A6B]">Timelessly</span> Yours.
            </h1>

            {/* Subtitle */}
            <p className={`text-[#5E5955] leading-relaxed font-normal ${
              isFull 
                ? 'text-sm sm:text-base max-w-xl mb-7' 
                : 'text-xs sm:text-sm max-w-lg mb-4 line-clamp-2 sm:line-clamp-3'
            }`}>
              Elevate everyday moments and festive celebrations with wearable art. Each pearl evening bag, baroque necklace, and macrame accessory is meticulously woven bead-by-bead by skilled local women makers in Nepal.
            </p>

            {/* Call To Actions */}
            <div className={`flex flex-wrap items-center gap-2.5 sm:gap-3 ${isFull ? 'mb-8' : 'mb-5'}`}>
              <button
                type="button"
                onClick={scrollToShop}
                className={`group relative inline-flex items-center justify-center gap-1.5 bg-[#1C1B1A] text-[#FAF8F5] text-xs font-semibold tracking-wider uppercase rounded-full hover:bg-[#34312F] transition-all duration-300 shadow-md hover:shadow-lg ${
                  isFull ? 'px-6 py-3 text-xs' : 'px-4 py-2 text-[11px]'
                }`}
              >
                <span>Explore Collection</span>
                <ArrowDownRight className="w-3.5 h-3.5 text-[#C5A880] group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('shop-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`inline-flex items-center justify-center gap-1.5 bg-white border border-[#C5A880] text-[#1C1B1A] text-xs font-semibold tracking-wider uppercase rounded-full hover:bg-[#FAF8F5] hover:border-[#1C1B1A] transition-all duration-300 shadow-2xs ${
                  isFull ? 'px-6 py-3 text-xs' : 'px-4 py-2 text-[11px]'
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#C5A880]" />
                <span>Kathmandu, Nepal</span>
              </button>
            </div>

            {/* Key Trust Pillars */}
            <div className={`grid grid-cols-3 gap-2 border-t border-[#E8DFD8] ${isFull ? 'pt-5' : 'pt-3'}`}>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="p-1.5 rounded-full bg-white border border-[#E8DFD8] text-[#C5A880] shrink-0">
                  <HeartHandshake className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <h4 className="text-[11px] font-semibold text-[#1C1B1A] leading-tight truncate">Kathmandu Store</h4>
                  <p className="text-[9px] text-[#736C65] truncate hidden sm:block">Kathmandu, Nepal</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="p-1.5 rounded-full bg-white border border-[#E8DFD8] text-emerald-600 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <h4 className="text-[11px] font-semibold text-emerald-700 leading-tight truncate">Easy 24-Hr Exchange</h4>
                  <p className="text-[9px] text-[#736C65] truncate hidden sm:block">Hassle-free policy</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="p-1.5 rounded-full bg-white border border-[#E8DFD8] text-[#C5A880] shrink-0">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <h4 className="text-[11px] font-semibold text-[#1C1B1A] leading-tight truncate">Nepal Delivery</h4>
                  <p className="text-[9px] text-[#736C65] truncate hidden sm:block">COD + eSewa / Khalti</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Editorial Showcase */}
          <div className={`${isFull ? 'lg:col-span-5' : 'lg:col-span-5'} relative mt-3 lg:mt-0`}>
            <div className="relative mx-auto max-w-sm lg:max-w-none">
              
              {/* Feature Image Container */}
              <div 
                onClick={() => featuredProduct && setQuickViewProduct(featuredProduct)}
                className={`relative rounded-xl sm:rounded-2xl overflow-hidden shadow-md border border-[#E8DFD8] bg-[#F4EFEB] cursor-pointer group ${
                  isFull ? 'aspect-[4/5]' : 'aspect-[16/10] sm:aspect-[4/3] max-h-52 sm:max-h-60'
                }`}
                role="button"
                tabIndex={0}
                aria-label={`View ${featuredProduct?.title || 'Featured Piece'}`}
              >
                <img
                  src={getRealProductImage(featuredProduct?.title, featuredProduct?.images[0])}
                  alt={featuredProduct?.title || "Artified_np Signature Handcrafted Pearl Evening Bag"}
                  className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500"
                />

                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1B1A]/75 via-black/20 to-transparent pointer-events-none" />

                {/* Overlaid Label on Image */}
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 text-white">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[9px] tracking-wider uppercase mb-1 border border-white/30">
                    <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />
                    <span>Signature Collection</span>
                  </div>
                  <h3 className="font-serif text-sm sm:text-base text-white font-medium group-hover:text-[#F3E8DB] transition-colors truncate">
                    {featuredProduct?.title || "Pearl Beaded Handbag"}
                  </h3>
                  <p className="text-[11px] text-white/90">
                    NPR Rs. {featuredProduct?.price ? featuredProduct.price.toLocaleString() : '2,499'} • In Stock
                  </p>
                </div>
              </div>

              {/* Floating Mini Badges (Only in Full mode or sleek minimal in Compact mode) */}
              {isFull ? (
                <>
                  <div className="absolute -top-3 -right-3 sm:-right-4 bg-white/95 backdrop-blur-md border border-[#E8DFD8] rounded-xl p-2.5 shadow-md flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#FAF8F5] shrink-0">
                      <img 
                        src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=150&q=80" 
                        alt="Baroque choker"
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div>
                      <div className="text-[9px] text-[#C5A880] font-semibold uppercase tracking-wider">
                        ★ 4.9 Rating
                      </div>
                      <p className="text-[11px] font-semibold text-[#1C1B1A]">TikTok Viral In Nepal</p>
                    </div>
                  </div>

                  <div className="absolute -bottom-3 -left-3 sm:-left-4 bg-white/95 backdrop-blur-md border border-[#E8DFD8] rounded-xl px-3 py-1.5 shadow-md flex items-center gap-2">
                    <span className="text-base">🇳🇵</span>
                    <div>
                      <p className="text-[11px] font-semibold text-[#1C1B1A]">Locally Made in Nepal</p>
                      <p className="text-[9px] text-[#736C65]">Cash on Delivery Available</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-2 flex items-center justify-between text-[10px] text-[#736C65] px-1">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <span>🇳🇵</span> Made in Nepal
                  </span>
                  <span className="text-[#C5A880] font-medium">
                    ★ 4.9 Viral Collection
                  </span>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
