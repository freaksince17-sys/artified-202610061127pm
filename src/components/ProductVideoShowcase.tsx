import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause,
  Volume2, 
  VolumeX, 
  ShoppingBag, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Eye, 
  Check, 
  Video,
  ChevronDown,
  ChevronUp,
  Maximize2
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Product } from '../types';

interface VideoMapping {
  videoPath: string;
  posterPath: string;
  label: string;
  atelierNote: string;
}

const ATELIER_VIDEOS: Record<string, VideoMapping> = {
  tourmaline: {
    videoPath: '/instagram_videos/DdjhhazvaRr.mp4',
    posterPath: '/instagram_videos/DdjhhazvaRr_cover.jpg',
    label: 'DdjhhazvaRr.mp4',
    atelierNote: 'Tourmaline Gemstone & Baroque Pearl Knotting'
  },
  macrame: {
    videoPath: '/instagram_videos/DdMRgKdP4HK.mp4',
    posterPath: '/instagram_videos/DdMRgKdP4HK_cover.jpg',
    label: 'DdMRgKdP4HK.mp4',
    atelierNote: 'Macrame Workshop & Ancestral Weaving'
  },
  pearlBags: {
    videoPath: '/instagram_videos/DY6OqqfPyJu.mp4',
    posterPath: '/instagram_videos/DY6OqqfPyJu_cover.jpg',
    label: 'DY6OqqfPyJu.mp4',
    atelierNote: 'Pyarii Maya Handcrafted Pearl Clutches'
  },
  atelier: {
    videoPath: '/instagram_videos/DdIUMC4BqFr.mp4',
    posterPath: '/instagram_videos/DdIUMC4BqFr_cover.jpg',
    label: 'DdIUMC4BqFr.mp4',
    atelierNote: 'Kathmandu Artisan Studio Crafting'
  }
};

export const ProductVideoShowcase: React.FC = () => {
  const { products, setQuickViewProduct, addToCart, quickViewProduct } = useCart();

  // Selected product index to showcase with its auto-playing video background
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // If a product is opened in quick view, keep showcase aligned
  useEffect(() => {
    if (quickViewProduct) {
      const idx = products.findIndex((p) => p.id === quickViewProduct.id);
      if (idx !== -1) {
        setSelectedIndex(idx);
      }
    }
  }, [quickViewProduct, products]);

  const currentProduct: Product | undefined = products[selectedIndex] || products[0];

  // Map product to its specific dynamic video file in public/instagram_videos/
  const getVideoForProduct = (prod?: Product): VideoMapping => {
    if (!prod) {
      return ATELIER_VIDEOS.tourmaline;
    }

    const t = (prod.title + ' ' + prod.category + ' ' + (prod.subtitle || '') + ' ' + (prod.tags || []).join(' ')).toLowerCase();

    // 1. Tourmaline, baroque pearl necklaces or chokers
    if (t.includes('tourmaline') || t.includes('choker') || t.includes('gemstone') || t.includes('necklace') || t.includes('pendant')) {
      return ATELIER_VIDEOS.tourmaline;
    }

    // 2. Macrame bags, wristlets, plant hangers or workshops
    if (t.includes('macrame') || t.includes('knotted') || t.includes('woven') || t.includes('cord')) {
      return ATELIER_VIDEOS.macrame;
    }

    // 3. Custom orders, Pyarii Maya, evening pearl clutches, handbags
    if (t.includes('pyarii') || t.includes('maya') || t.includes('caviar') || t.includes('bag') || t.includes('clutch') || t.includes('tote')) {
      return ATELIER_VIDEOS.pearlBags;
    }

    // Default signature video fallback
    return ATELIER_VIDEOS.atelier;
  };

  const { videoPath, posterPath, label, atelierNote } = getVideoForProduct(currentProduct);

  // Restart video playback smoothly on product switch or video change
  useEffect(() => {
    setVideoLoaded(false);
    if (videoRef.current) {
      videoRef.current.load();
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay with sound might be blocked, retry muted
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              videoRef.current.play().catch(() => setIsPlaying(false));
            }
          });
      }
    }
  }, [videoPath]);

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev - 1 + products.length) % products.length);
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev + 1) % products.length);
  };

  const handleAdd = () => {
    if (currentProduct) {
      addToCart(currentProduct);
      setAddedAnimation(true);
      setTimeout(() => setAddedAnimation(false), 2000);
    }
  };

  if (!currentProduct) return null;

  return (
    <section className="relative w-full overflow-hidden bg-[#0A0A09] text-white border-b border-[#2C2926] transition-all duration-300">
      {/* If collapsed, show a sleek teaser bar */}
      {isCollapsed ? (
        <div className="w-full max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-serif text-[#D4AF37] font-medium">Kathmandu Atelier Video Showcase</span>
            <span className="text-white/60 hidden sm:inline">• {currentProduct.title} ({label})</span>
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[#D4AF37] text-xs font-medium cursor-pointer transition-colors"
          >
            <span>Open Showcase Reel</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative min-h-[380px] sm:min-h-[440px] md:min-h-[480px] flex flex-col justify-between">
          {/* Auto-playing Background Video from public/instagram_videos/ */}
          <div className="absolute inset-0 z-0 overflow-hidden bg-black">
            <video
              ref={videoRef}
              key={videoPath}
              src={videoPath}
              poster={posterPath}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              preload="metadata"
              onCanPlay={() => setVideoLoaded(true)}
              className={`w-full h-full object-cover object-center transition-opacity duration-700 filter brightness-95 contrast-105 ${
                videoLoaded ? 'opacity-85' : 'opacity-65'
              }`}
            />

            {/* Sophisticated Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/35 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-black/75 pointer-events-none" />
          </div>

          {/* Top Bar: Reel File Label, Sound & Play Controls, and Collapse */}
          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-3.5 sm:pt-4 flex items-center justify-between gap-2">
            {/* Reel Badge */}
            <div className="flex items-center gap-2 bg-black/65 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-[11px] font-medium text-white/90 shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="flex items-center gap-1.5 truncate">
                <Video className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span className="font-semibold text-[#D4AF37]">Live Atelier:</span>
                <span className="text-white/90 font-mono text-[10px] hidden xs:inline">{label}</span>
                <span className="text-white/60 hidden md:inline">({atelierNote})</span>
              </div>
            </div>

            {/* Top Actions: Play/Pause, Sound, Collapse */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={togglePlayPause}
                className="p-1.5 sm:p-2 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white/90 border border-white/20 hover:border-white/50 transition-all cursor-pointer shadow-lg"
                title={isPlaying ? 'Pause video' : 'Play video'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/80" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4AF37]" />}
              </button>

              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 sm:p-2 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white/90 border border-white/20 hover:border-white/50 transition-all cursor-pointer shadow-lg"
                title={isMuted ? 'Unmute video audio' : 'Mute video audio'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/70" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4AF37]" />}
              </button>

              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 sm:p-2 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white/70 hover:text-white border border-white/20 hover:border-white/50 transition-all cursor-pointer shadow-lg"
                title="Minimize video showcase"
              >
                <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Center Content: Product Showcase Details */}
          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            
            {/* Left: Product Headline & Details */}
            <div className="max-w-xl space-y-2 sm:space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37] text-black text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  {currentProduct.category.replace('-', ' ')}
                </span>
                <span className="text-[11px] text-white/85 flex items-center gap-1 font-medium bg-black/40 px-2 py-0.5 rounded-md border border-white/10">
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                  Handmade in Kathmandu, Nepal
                </span>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight drop-shadow-md">
                {currentProduct.title}
              </h2>

              <p className="text-xs sm:text-sm text-white/85 line-clamp-2 max-w-lg font-light leading-relaxed drop-shadow-sm">
                {currentProduct.description || currentProduct.subtitle}
              </p>

              <div className="flex items-baseline gap-3 pt-1">
                <span className="text-xl sm:text-2xl font-serif font-bold text-[#D4AF37] drop-shadow-sm">
                  NPR {currentProduct.price.toLocaleString()}
                </span>
                {currentProduct.originalPrice && currentProduct.originalPrice > currentProduct.price && (
                  <span className="text-xs text-white/50 line-through">
                    NPR {currentProduct.originalPrice.toLocaleString()}
                  </span>
                )}
                {currentProduct.materials && currentProduct.materials.length > 0 && (
                  <span className="text-xs text-white/70 truncate hidden sm:inline">
                    • {currentProduct.materials.slice(0, 2).join(' & ')}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Quick Action Buttons & Product Switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setQuickViewProduct(currentProduct)}
                className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Quick View</span>
              </button>

              <button
                type="button"
                onClick={handleAdd}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                  addedAnimation
                    ? 'bg-emerald-600 text-white border border-emerald-500 scale-95'
                    : 'bg-[#D4AF37] hover:bg-[#c29f2e] text-[#1C1B1A] border border-[#e8c85c]'
                }`}
              >
                {addedAnimation ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Bag!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Bag</span>
                  </>
                )}
              </button>

              {/* Navigation Arrows */}
              <div className="flex items-center justify-center gap-1.5 shrink-0 pt-2 sm:pt-0">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-2 rounded-xl bg-black/50 hover:bg-black/80 border border-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                  aria-label="Previous product video"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-white/60 px-1">
                  {selectedIndex + 1}/{products.length}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-2 rounded-xl bg-black/50 hover:bg-black/80 border border-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                  aria-label="Next product video"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Thumbnail Strip: Click any product to dynamically switch background video */}
          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pb-3 pt-1 border-t border-white/10 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 py-1">
              <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider shrink-0 mr-1 hidden sm:inline">
                Showcase Reel:
              </span>
              {products.slice(0, 10).map((prod, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 cursor-pointer border ${
                      isSelected
                        ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-bold shadow-md'
                        : 'bg-black/50 hover:bg-black/80 text-white/80 border-white/15 hover:border-white/40'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full overflow-hidden shrink-0 border border-white/30">
                      <img src={prod.images?.[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="max-w-[120px] truncate">{prod.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
