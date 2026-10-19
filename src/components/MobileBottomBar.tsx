import React from 'react';
import { 
  ShoppingBag, 
  Sparkles, 
  Truck, 
  Video, 
  Instagram, 
  Award,
  ClipboardCheck
} from 'lucide-react';
import { useCart } from '../context/CartContext';

export const MobileBottomBar: React.FC = () => {
  const { 
    setActiveNavTab,
    setSelectedCategory,
    openTracker,
    isSellerMode
  } = useCart();

  const handleCreations = () => {
    setActiveNavTab('home');
    setSelectedCategory('all');
    const el = document.getElementById('shop-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCreator = () => {
    setActiveNavTab('artisan');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTikTok = () => {
    setActiveNavTab('tiktok');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInstagram = () => {
    setActiveNavTab('journal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWorkshop = () => {
    setActiveNavTab('workshops');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTrack = () => {
    openTracker();
  };

  const handleOrderProgress = () => {
    setActiveNavTab('orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-[#FAF8F5]/95 dark:bg-[#141312]/95 backdrop-blur-md border-t border-[#E8DFD8] dark:border-[#2D2B28] lg:hidden shadow-[0_-4px_20px_rgba(28,27,26,0.06)] px-1 py-1.5 transition-colors duration-200 overflow-x-auto no-scrollbar">
      <div className="flex items-center justify-around max-w-lg mx-auto min-w-max gap-1">
        
        {/* 1. Creations */}
        <button
          type="button"
          onClick={handleCreations}
          className="flex flex-col items-center justify-center px-2 min-h-[44px] text-[#5E5955] dark:text-[#A8A096] hover:text-[#1C1B1A] dark:hover:text-white cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4 text-[#1C1B1A] dark:text-[#F5F2EB]" />
          <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">Creations</span>
        </button>

        {/* 2. Creator */}
        <button
          type="button"
          onClick={handleCreator}
          className="flex flex-col items-center justify-center px-2 min-h-[44px] text-[#5E5955] dark:text-[#A8A096] hover:text-[#D4AF37] cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">Creator</span>
        </button>

        {/* 3. Workshops */}
        <button
          type="button"
          onClick={handleWorkshop}
          className="flex flex-col items-center justify-center px-2 min-h-[44px] text-[#5E5955] dark:text-[#A8A096] hover:text-[#C5A880] cursor-pointer"
        >
          <Award className="w-4 h-4 text-[#C5A880]" />
          <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">Workshops</span>
        </button>

        {/* 4. Track Order */}
        <button
          type="button"
          onClick={handleTrack}
          className="flex flex-col items-center justify-center px-2 min-h-[44px] text-[#5E5955] dark:text-[#A8A096] hover:text-[#D4AF37] cursor-pointer"
        >
          <Truck className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5 whitespace-nowrap">Track Order</span>
        </button>

        {/* 5. TikTok */}
        <button
          type="button"
          onClick={handleTikTok}
          className="flex flex-col items-center justify-center px-2 min-h-[44px] text-[#5E5955] dark:text-[#A8A096] hover:text-black dark:hover:text-white cursor-pointer"
        >
          <Video className="w-4 h-4 text-[#010101] dark:text-[#F5F2EB]" />
          <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">TikTok</span>
        </button>

        {/* 6. Instagram */}
        <button
          type="button"
          onClick={handleInstagram}
          className="flex flex-col items-center justify-center px-2 min-h-[44px] text-[#5E5955] dark:text-[#A8A096] hover:text-[#E1306C] cursor-pointer"
        >
          <Instagram className="w-4 h-4 text-[#E1306C]" />
          <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">Instagram</span>
        </button>

        {/* 7. Order Progress (Seller) - Positioned at the rightest part */}
        {isSellerMode && (
          <button
            type="button"
            onClick={handleOrderProgress}
            className="flex flex-col items-center justify-center px-2 min-h-[44px] text-[#D4AF37] cursor-pointer hover:opacity-90"
            title="Seller Studio: Manage Order Progress"
          >
            <ClipboardCheck className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5 text-[#D4AF37] whitespace-nowrap">
              Order Progress
            </span>
          </button>
        )}

      </div>
    </div>
  );
};
