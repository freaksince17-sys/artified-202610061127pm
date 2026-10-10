import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, 
  Instagram, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight,
  ArrowLeft,
  MoveHorizontal
} from 'lucide-react';
import { TikTokShowcase } from './TikTokShowcase';
import { InstagramShowcase } from './InstagramShowcase';
import { useCart } from '../context/CartContext';

export const SocialShowcase: React.FC = () => {
  const { activeSocialTab, setActiveSocialTab, reels } = useCart();
  
  // Drag and swipe states
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Sync hash links if someone visits with #tiktok-section or #instagram-section
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === '#instagram-section' || hash === '#visual-journal') {
        setActiveSocialTab('journal');
      } else if (hash === '#tiktok-section') {
        setActiveSocialTab('tiktok');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [setActiveSocialTab]);

  // Touch Swipe Handlers (Mobile / Tablets)
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // If dragged right-to-left by > 50px, switch to Journal
    if (dragOffset < -50 && activeSocialTab === 'tiktok') {
      setActiveSocialTab('journal');
    }
    // If dragged left-to-right by > 50px, switch to TikTok
    else if (dragOffset > 50 && activeSocialTab === 'journal') {
      setActiveSocialTab('tiktok');
    }
    setDragOffset(0);
  };

  // Mouse Drag Handlers (Desktop click & drag left/right)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag when clicking background or headers, not on buttons or links
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }
    setIsDragging(true);
    setStartX(e.clientX);
    setDragOffset(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - startX;
    setDragOffset(diff);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragOffset < -60 && activeSocialTab === 'tiktok') {
      setActiveSocialTab('journal');
    } else if (dragOffset > 60 && activeSocialTab === 'journal') {
      setActiveSocialTab('tiktok');
    }
    setDragOffset(0);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragOffset(0);
    }
  };

  const slideToTab = (tab: 'tiktok' | 'journal') => {
    setActiveSocialTab(tab);
    setDragOffset(0);
  };

  const toggleTab = () => {
    slideToTab(activeSocialTab === 'tiktok' ? 'journal' : 'tiktok');
  };

  // Compute slide track transform percentage
  const baseTranslate = activeSocialTab === 'tiktok' ? 0 : -50;

  return (
    <section 
      id="social-showcase" 
      aria-label="Social Media Showcase"
      className="py-14 sm:py-20 bg-[#FAF8F5] border-t border-[#E8DFD8] relative overflow-hidden select-none"
    >
      {/* Ambient background glows */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#F4EDE5]/70 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-[#FAF4ED]/70 rounded-full blur-3xl pointer-events-none -z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Navigation Header & Interactive Screen Swipe Selector */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-6 border-b border-[#E8DFD8]">
          
          <div>
            <div className="inline-flex items-center gap-2 text-[#C5A880] text-xs uppercase tracking-[0.25em] font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>KATHMANDU CRAFT WORKSHOP • NEPAL</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#1C1B1A] font-semibold tracking-tight">
              Seen in Motion & The Visual Journal
            </h2>
            <p className="text-xs sm:text-sm text-[#5E5955] mt-1.5 max-w-xl leading-relaxed">
              Slide or swipe between our viral TikTok craft reels and the curated Instagram visual chronicle.
            </p>
          </div>

          {/* Interactive Tab Switcher & Directional Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            
            {/* Segmented Tab Pill Selector */}
            <div className="inline-flex items-center p-1 bg-white border border-[#E8DFD8] rounded-full shadow-2xs">
              
              {/* Tab 1: As Seen on TikTok */}
              <button
                type="button"
                onClick={() => slideToTab('tiktok')}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeSocialTab === 'tiktok'
                    ? 'bg-[#1C1B1A] text-white shadow-sm'
                    : 'text-[#5E5955] hover:text-[#1C1B1A] hover:bg-[#FAF8F5]'
                }`}
              >
                <Video className={`w-3.5 h-3.5 ${activeSocialTab === 'tiktok' ? 'text-[#D4AF37]' : 'text-[#736C65]'}`} />
                <span>As Seen on TikTok</span>
                {reels.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeSocialTab === 'tiktok' ? 'bg-[#3E3A36] text-[#D4AF37]' : 'bg-[#F0EBE5] text-[#736C65]'
                  }`}>
                    {reels.length}
                  </span>
                )}
              </button>

              {/* Tab 2: The Visual Journal */}
              <button
                type="button"
                onClick={() => slideToTab('journal')}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeSocialTab === 'journal'
                    ? 'bg-[#1C1B1A] text-white shadow-sm'
                    : 'text-[#5E5955] hover:text-[#1C1B1A] hover:bg-[#FAF8F5]'
                }`}
              >
                <Instagram className={`w-3.5 h-3.5 ${activeSocialTab === 'journal' ? 'text-[#E1306C]' : 'text-[#736C65]'}`} />
                <span>The Visual Journal</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeSocialTab === 'journal' ? 'bg-[#3E3A36] text-[#fcb045]' : 'bg-[#F0EBE5] text-[#736C65]'
                }`}>
                  @artified_np
                </span>
              </button>

            </div>

            {/* Click to Swipe Screen Left / Right Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTab}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-[#E8DFD8] text-xs font-medium text-[#5E5955] hover:text-[#1C1B1A] hover:border-[#C5A880] transition-colors shadow-2xs cursor-pointer group"
                title={activeSocialTab === 'tiktok' ? 'Click to swipe right to The Visual Journal' : 'Click to swipe left to TikTok Reels'}
              >
                {activeSocialTab === 'tiktok' ? (
                  <>
                    <span>Swipe to Journal</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#C5A880] group-hover:translate-x-0.5 transition-transform" />
                  </>
                ) : (
                  <>
                    <ArrowLeft className="w-3.5 h-3.5 text-[#C5A880] group-hover:-translate-x-0.5 transition-transform" />
                    <span>Swipe to TikTok</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

        {/* Visual Swipe Helper Banner */}
        <div className="flex items-center justify-between py-2 px-4 mb-4 bg-white/70 backdrop-blur-xs rounded-xl border border-[#E8DFD8]/80 text-xs text-[#736C65]">
          <div className="flex items-center gap-2">
            <MoveHorizontal className="w-4 h-4 text-[#C5A880]" />
            <span className="hidden sm:inline">
              Swipe or click left / right to transition between TikTok craft videos and The Visual Journal.
            </span>
            <span className="sm:hidden">
              Swipe left / right to switch gallery.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => slideToTab('tiktok')}
              className={`text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                activeSocialTab === 'tiktok' ? 'text-[#1C1B1A] underline decoration-[#C5A880] underline-offset-4' : 'text-[#A69E96] hover:text-[#1C1B1A]'
              }`}
            >
              TikTok
            </button>
            <span className="text-[#D1D5DB]">•</span>
            <button
              type="button"
              onClick={() => slideToTab('journal')}
              className={`text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                activeSocialTab === 'journal' ? 'text-[#1C1B1A] underline decoration-[#E1306C] underline-offset-4' : 'text-[#A69E96] hover:text-[#1C1B1A]'
              }`}
            >
              The Visual Journal
            </button>
          </div>
        </div>

      </div>

      {/* CAROUSEL TRACK (Tab switching via buttons, touch swipe disabled for mobile stability) */}
      <div 
        ref={sliderRef}
        className="w-full overflow-hidden relative cursor-default"
      >
        <div 
          className="flex w-[200%] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
          style={{ 
            transform: `translateX(${baseTranslate}%)` 
          }}
        >
          {/* Screen 1: As Seen on TikTok */}
          <div className="w-1/2 shrink-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <TikTokShowcase embedded={true} />
            </div>
          </div>

          {/* Screen 2: The Visual Journal (Renamed from Shop Instagram) */}
          <div className="w-1/2 shrink-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <InstagramShowcase embedded={true} />
            </div>
          </div>
        </div>

        {/* Floating Lateral Swipe Edge Buttons (Click to slide left/right) */}
        {activeSocialTab === 'tiktok' && (
          <button
            type="button"
            onClick={() => slideToTab('journal')}
            className="hidden lg:flex items-center gap-2 absolute right-6 top-1/2 -translate-y-1/2 z-20 px-4 py-3 bg-[#1C1B1A]/90 hover:bg-[#1C1B1A] text-white rounded-full shadow-2xl backdrop-blur-md border border-white/20 transition-all hover:scale-105 cursor-pointer group"
            title="Swipe right to The Visual Journal"
          >
            <span className="text-xs font-semibold tracking-wide">The Visual Journal</span>
            <ChevronRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-1 transition-transform" />
          </button>
        )}

        {activeSocialTab === 'journal' && (
          <button
            type="button"
            onClick={() => slideToTab('tiktok')}
            className="hidden lg:flex items-center gap-2 absolute left-6 top-1/2 -translate-y-1/2 z-20 px-4 py-3 bg-[#1C1B1A]/90 hover:bg-[#1C1B1A] text-white rounded-full shadow-2xl backdrop-blur-md border border-white/20 transition-all hover:scale-105 cursor-pointer group"
            title="Swipe left to As Seen on TikTok"
          >
            <ChevronLeft className="w-4 h-4 text-[#D4AF37] group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-semibold tracking-wide">TikTok Reels</span>
          </button>
        )}

      </div>
    </section>
  );
};
