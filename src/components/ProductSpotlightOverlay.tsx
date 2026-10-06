import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  X, 
  Award, 
  ShieldCheck, 
  Play, 
  Pause,
  Compass,
  Info
} from 'lucide-react';
import { ArtisanalSpotlightPoint, Product } from '../types';
import { getProductSpotlightPoints } from '../data/spotlightData';

interface ProductSpotlightOverlayProps {
  product: Product;
  isActive: boolean;
  onToggleActive: () => void;
}

export const SpotlightTriggerButton: React.FC<{
  isActive: boolean;
  onToggle: () => void;
  className?: string;
  variant?: 'pill' | 'bar';
}> = ({ isActive, onToggle, className = '', variant = 'pill' }) => {
  if (variant === 'bar') {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border shadow-xs ${
          isActive
            ? 'bg-gradient-to-r from-[#1C1B1A] via-[#2B2826] to-[#1C1B1A] text-[#D4AF37] border-[#D4AF37]/80 ring-2 ring-[#D4AF37]/30 shadow-md'
            : 'bg-[#FAF8F5] hover:bg-[#F4EFEA] text-[#1C1B1A] border-[#D4AF37]/40 hover:border-[#D4AF37]'
        } ${className}`}
        title="Explore unique artisanal details via interactive guided tour"
      >
        <Sparkles className={`w-4 h-4 ${isActive ? 'text-[#D4AF37] animate-spin' : 'text-[#C5A880]'}`} style={{ animationDuration: '6s' }} />
        <span>{isActive ? 'Spotlight Active • Click to Exit' : '✨ Launch Guided Spotlight Tour (Clasp, Pearls & Knotting)'}</span>
        {isActive && (
          <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping ml-1" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border ${
        isActive 
          ? 'bg-gradient-to-r from-[#1C1B1A] to-[#2B2826] text-[#D4AF37] border-[#D4AF37]/70 ring-2 ring-[#D4AF37]/30 shadow-md' 
          : 'bg-white/95 backdrop-blur-md text-[#5E5955] border-[#E8DFD8] hover:text-[#1C1B1A] hover:border-[#C5A880] hover:bg-white'
      } ${className}`}
      title="Explore unique artisanal details via interactive guided tour"
    >
      <Sparkles className={`w-3.5 h-3.5 ${isActive ? 'text-[#D4AF37] animate-spin' : 'text-[#C5A880]'}`} style={{ animationDuration: '6s' }} />
      <span>{isActive ? 'Spotlight Active' : '✨ Guided Spotlight Tour'}</span>
      {isActive && (
        <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping ml-0.5" />
      )}
    </button>
  );
};

export const ProductSpotlightOverlay: React.FC<ProductSpotlightOverlayProps> = ({
  product,
  isActive,
  onToggleActive
}) => {
  const points = getProductSpotlightPoints(product);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  // Auto-play cycling through spotlight points
  useEffect(() => {
    if (!isActive || !isAutoPlaying || points.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % points.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isActive, isAutoPlaying, points.length]);

  if (!isActive || !points || points.length === 0) return null;

  const currentPoint = points[hoveredIndex !== null ? hoveredIndex : activeIndex] || points[0];

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % points.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + points.length) % points.length);
  };

  return (
    <div className="absolute inset-0 pointer-events-auto z-30 overflow-hidden">
      {/* Subtle Dark Vignette Backdrop to make Gold Highlights Pop */}
      <div className="absolute inset-0 bg-[#1C1B1A]/40 backdrop-blur-[1px] pointer-events-none transition-opacity duration-300" />

      {/* Top Floating Indicator Banner */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-35">
        <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-[#1C1B1A]/90 text-[#D4AF37] border border-[#D4AF37]/50 text-[10px] sm:text-[11px] font-semibold shadow-md backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
          <span>Artisanal Spotlight Tour ({activeIndex + 1}/{points.length})</span>
        </div>

        <button
          type="button"
          onClick={onToggleActive}
          className="py-1 px-2.5 rounded-full bg-[#1C1B1A]/90 hover:bg-black text-white/90 hover:text-white border border-white/20 text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 shadow-md cursor-pointer transition-colors"
          title="Exit spotlight view"
        >
          <span>Exit Tour</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Interactive Hotspot Pins */}
      {points.map((point, idx) => {
        const isSelected = activeIndex === idx;
        const isHovered = hoveredIndex === idx;
        const isHighlighted = isSelected || isHovered;

        return (
          <div
            key={point.id}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-35"
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex(idx);
              setIsAutoPlaying(false);
            }}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Pulsing Beacon Rings */}
            <div className="relative flex items-center justify-center">
              <span
                className={`absolute w-10 h-10 rounded-full transition-all duration-300 ${
                  isHighlighted
                    ? 'bg-[#D4AF37]/50 animate-ping'
                    : 'bg-white/35 animate-pulse'
                }`}
              />
              <span
                className={`absolute w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                  isHighlighted
                    ? 'border-[#D4AF37] scale-125'
                    : 'border-white/70'
                }`}
              />

              {/* Core Pin Button */}
              <div
                className={`relative w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-xl transition-all duration-300 ${
                  isHighlighted
                    ? 'bg-gradient-to-br from-[#E6C687] via-[#D4AF37] to-[#8C6D23] text-[#1C1B1A] scale-125 ring-2 ring-white shadow-amber-900/50'
                    : 'bg-[#1C1B1A]/95 text-white border-2 border-[#D4AF37] hover:scale-110'
                }`}
              >
                <span>{idx + 1}</span>
              </div>
            </div>

            {/* Floating Micro-Pill Tag */}
            <div
              className={`absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase whitespace-nowrap backdrop-blur-md shadow-lg transition-all duration-200 pointer-events-none ${
                isHighlighted
                  ? 'bg-[#1C1B1A] text-[#D4AF37] border border-[#D4AF37] opacity-100 scale-100'
                  : 'bg-white/90 text-[#1C1B1A] border border-[#E8DFD8] opacity-80 group-hover:opacity-100'
              }`}
            >
              {point.tag}
            </div>
          </div>
        );
      })}

      {/* Active Detail Tooltip Card (Positioned floating at bottom of photo) */}
      <div 
        className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-4 z-40 animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#1C1B1A]/95 text-white p-3.5 sm:p-4 rounded-2xl border-2 border-[#D4AF37] shadow-2xl backdrop-blur-md space-y-2">
          
          {/* Header with Tag & Highlight Spec */}
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center gap-1 shrink-0">
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                <span>Spotlight #{activeIndex + 1}: {currentPoint.tag}</span>
              </span>

              {currentPoint.specHighlight && (
                <span className="text-[10px] text-amber-200/90 font-mono font-medium truncate hidden sm:inline">
                  • {currentPoint.specHighlight}
                </span>
              )}
            </div>

            {/* Step indicator */}
            <span className="text-[11px] font-mono text-[#D4AF37] font-bold shrink-0">
              {activeIndex + 1} of {points.length}
            </span>
          </div>

          {/* Title & Description */}
          <div>
            <h4 className="font-serif text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>{currentPoint.title}</span>
            </h4>
            <p className="text-[11px] sm:text-xs text-[#E8DFD8] mt-1 leading-relaxed">
              {currentPoint.description}
            </p>
          </div>

          {/* Navigation Controls inside Tooltip */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Previous artisanal feature"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Next artisanal feature"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isAutoPlaying 
                    ? 'bg-[#D4AF37] text-[#1C1B1A] font-bold' 
                    : 'bg-white/10 hover:bg-white/20 text-white/80'
                }`}
                title={isAutoPlaying ? "Pause Auto-Tour" : "Start Auto-Tour"}
              >
                {isAutoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isAutoPlaying ? 'Tour Playing (4s)' : 'Auto Tour'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onToggleActive}
              className="text-[11px] font-semibold text-[#D4AF37] hover:underline cursor-pointer flex items-center gap-1 px-1 py-0.5"
            >
              <span>Close</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
