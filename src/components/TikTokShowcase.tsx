import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Play, 
  Pause,
  Share2, 
  X, 
  Sparkles, 
  ExternalLink, 
  Edit3, 
  Video, 
  Plus, 
  Trash2,
  Eye,
  Heart,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { TikTokReel } from '../types';
import { useCart } from '../context/CartContext';
import { useVideoController } from '../hooks/useVideoController';

export interface TikTokShowcaseProps {
  embedded?: boolean;
  hideHeader?: boolean;
}

export const KNOWN_LOCAL_COVERS: Record<string, string> = {
  '7363984155060817160': '/tiktok_videos/7363984155060817160_cover.jpg',
  '7625655459537603860': '/tiktok_videos/7625655459537603860_cover.jpg',
  '7495598629625842952': '/tiktok_videos/7495598629625842952_cover.jpg',
  '7453859527411125512': '/tiktok_videos/7453859527411125512_cover.jpg',
};

export const getReelCoverImage = (reel?: TikTokReel | null, index = 0): string => {
  if (!reel) return '/tiktok_videos/7363984155060817160_cover.jpg';

  const vidId = reel.videoUrl?.match(/\/video\/(\d+)/)?.[1] || reel.id.replace(/[^0-9]/g, '');
  if (vidId && KNOWN_LOCAL_COVERS[vidId]) {
    return KNOWN_LOCAL_COVERS[vidId];
  }

  const thumb = reel.thumbnail?.trim();
  if (
    thumb &&
    !thumb.includes('/api/proxy-thumbnail') &&
    !thumb.includes('tiktokcdn') &&
    !thumb.includes('photo-1584917865442-de89df76afd3')
  ) {
    return thumb;
  }

  for (const [id, cover] of Object.entries(KNOWN_LOCAL_COVERS)) {
    if (reel.videoUrl?.includes(id) || reel.id?.includes(id) || thumb?.includes(id)) {
      return cover;
    }
  }

  const distinctFallbacks = [
    '/tiktok_videos/7363984155060817160_cover.jpg',
    '/tiktok_videos/7625655459537603860_cover.jpg',
    '/tiktok_videos/7495598629625842952_cover.jpg',
    '/tiktok_videos/7453859527411125512_cover.jpg',
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80'
  ];
  return distinctFallbacks[index % distinctFallbacks.length];
};

interface TikTokReelCardProps {
  reel: TikTokReel;
  index: number;
  isSellerMode: boolean;
  isConfirmingDelete: boolean;
  isMuted: boolean;
  onOpenReel: (reel: TikTokReel) => void;
  onOpenEditor: (reel: TikTokReel) => void;
  onDeleteReel: (id: string) => Promise<void>;
  onSetConfirmDeleteId: (id: string | null) => void;
  getPlayableVideoUrl: (reel: TikTokReel) => string | null;
}

const TikTokReelCard: React.FC<TikTokReelCardProps> = ({
  reel,
  index,
  isSellerMode,
  isConfirmingDelete,
  isMuted,
  onOpenReel,
  onOpenEditor,
  onDeleteReel,
  onSetConfirmDeleteId,
  getPlayableVideoUrl
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { videoRef, play, pause } = useVideoController({ 
    autoPlay: false, 
    muted: isMuted, 
    loop: true, 
    playsInline: true 
  });

  const playableUrl = getPlayableVideoUrl(reel);
  const coverUrl = getReelCoverImage(reel, index);

  const handleMouseEnter = () => {
    setIsHovered(true);
    play();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    pause();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      onClick={() => onOpenReel(reel)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-black cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 select-none"
      title="Hover to play video • Click to open"
    >
      {/* 1. High quality cover thumbnail (always authentic local or dedicated cover) */}
      <img
        src={coverUrl}
        alt={reel.title}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          const fallback = getReelCoverImage(reel, index);
          if (target.src !== fallback && !target.src.endsWith(fallback)) {
            target.src = fallback;
          }
        }}
        className={`w-full h-full object-cover transition-transform duration-500 ${
          isHovered && playableUrl ? 'opacity-0 scale-105' : 'opacity-100 group-hover:scale-105'
        }`}
      />

      {/* 2. Hover Video Preview: Starts ONLY when hovered */}
      {playableUrl && (
        <video
          ref={videoRef}
          src={playableUrl}
          muted={isMuted}
          loop
          playsInline
          preload="auto"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* 3. Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none" />

      {/* 4. Metric Badges (Views, Likes & Hover to Play) */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 flex-wrap pointer-events-none">
        {reel.showViews && reel.views && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-[10px] font-medium text-white/90 border border-white/15 shadow-xs">
            <Eye className="w-2.5 h-2.5 text-[#D4AF37]" />
            <span>{reel.views}</span>
          </span>
        )}
        {reel.showLikes && reel.likes && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-[10px] font-medium text-white/90 border border-white/15 shadow-xs">
            <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-400/40" />
            <span>{reel.likes}</span>
          </span>
        )}
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-md text-[10px] font-medium transition-all shadow-xs border ${
          isHovered
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 animate-pulse'
            : 'bg-black/65 text-[#D4AF37] border-white/15'
        }`}>
          <Play className={`w-2.5 h-2.5 ${isHovered ? 'fill-emerald-300 text-emerald-300' : 'fill-[#D4AF37] text-[#D4AF37]'}`} />
          <span>{isHovered ? 'Playing' : 'Hover to Play'}</span>
        </div>
      </div>

      {/* Center Play Button Overlay */}
      {!isHovered && (
        <div className="absolute inset-0 flex items-center justify-center z-15 pointer-events-none">
          <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
          </div>
        </div>
      )}

      {/* 5. Seller Quick Controls (Edit & Delete) */}
      {isSellerMode && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {isConfirmingDelete ? (
            <div className="bg-black/90 backdrop-blur-md p-1.5 rounded-lg border border-rose-500 flex items-center gap-1 text-[10px]">
              <button
                type="button"
                onClick={async () => {
                  await onDeleteReel(reel.id);
                  onSetConfirmDeleteId(null);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-0.5 rounded"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => onSetConfirmDeleteId(null)}
                className="text-white/70 hover:text-white px-1 py-0.5"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEditor(reel);
                }}
                className="p-1.5 rounded-full bg-black/75 hover:bg-black text-[#D4AF37] border border-[#D4AF37]/50 shadow-md transition-transform hover:scale-110"
                title="Edit Reel"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetConfirmDeleteId(reel.id);
                }}
                className="p-1.5 rounded-full bg-black/75 hover:bg-rose-950/80 text-rose-300 border border-rose-500/40 shadow-md transition-transform hover:scale-110"
                title="Delete Reel"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* 6. Bottom Details */}
      <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
        <p className="text-xs font-extrabold text-[#FFD700] tracking-wider mb-0.5 drop-shadow-md">
          {reel.handle || '@artified_np'}
        </p>
        <p className="text-xs sm:text-sm font-bold leading-snug line-clamp-2 text-white drop-shadow-md">
          {reel.title}
        </p>
        
        {/* Featured Product Pill - Only if a product is linked */}
        {reel.featuredProductId && reel.featuredProductName && (
          <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between gap-2 pointer-events-auto">
            <span className="text-xs font-bold text-white/90 truncate pr-1 drop-shadow-sm">
              🛍️ {reel.featuredProductName}
            </span>
            <span className="text-xs font-extrabold text-[#FFD700] hover:text-white bg-black/80 px-2.5 py-1 rounded-full border border-[#FFD700]/60 uppercase tracking-wider shrink-0 transition-colors shadow-md">
              View
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const TikTokShowcase: React.FC<TikTokShowcaseProps> = ({ embedded = false, hideHeader = false }) => {
  const { 
    setQuickViewProduct, 
    products, 
    reels, 
    isSellerMode, 
    openTikTokEditor,
    deleteReel 
  } = useCart();
  
  const [activeReel, setActiveReel] = useState<TikTokReel | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [confirmDeleteCardId, setConfirmDeleteCardId] = useState<string | null>(null);
  const [hoveredReelId, setHoveredReelId] = useState<string | null>(null);

  // Mute and Playback controls for opened reel modal
  const [isMuted, setIsMuted] = useState(true);
  const [embedReloadKey, setEmbedReloadKey] = useState(0);
  const [videoLoadError, setVideoLoadError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Helper to extract TikTok Video ID from a URL
  const getTikTokVideoId = (url?: string): string | null => {
    if (!url) return null;
    const match = url.match(/\/video\/(\d+)/) || url.match(/\/v\/(\d+)/);
    return match ? match[1] : null;
  };

  const isDirectVideo = (url?: string): boolean => {
    if (!url) return false;
    return url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('blob:');
  };

  const KNOWN_LOCAL_REELS: Record<string, string> = {
    '7363984155060817160': '/tiktok_videos/7363984155060817160.mp4',
    '7495598629625842952': '/tiktok_videos/7495598629625842952.mp4',
    '7625655459537603860': '/tiktok_videos/7625655459537603860.mp4',
    '7453859527411125512': '/tiktok_videos/7453859527411125512.mp4',
  };

  // Resolves to either direct MP4/stream or cached TikTok video endpoint
  const getPlayableVideoUrl = (reel?: TikTokReel | null): string | null => {
    if (!reel) return null;
    if (reel.videoUrl && isDirectVideo(reel.videoUrl)) return reel.videoUrl;
    const ttId = getTikTokVideoId(reel.videoUrl);
    if (ttId) {
      if (KNOWN_LOCAL_REELS[ttId]) return KNOWN_LOCAL_REELS[ttId];
      return `/api/tiktok-video/${ttId}?url=${encodeURIComponent(reel.videoUrl!)}`;
    }
    return '/tiktok_videos/7363984155060817160.mp4';
  };

  // Reset state when active reel changes
  useEffect(() => {
    setVideoLoadError(false);
    setIsPlaying(true);
    setVideoProgress(0);
  }, [activeReel]);

  // Synchronize audio mute and playback for opened reel modal
  useEffect(() => {
    if (activeReel && videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        // If browser blocked unmuted autoplay, mute and retry seamlessly
        if (!isMuted) {
          setIsMuted(true);
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        }
      });
    }
  }, [activeReel, isMuted, embedReloadKey]);

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const prog = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setVideoProgress(prog);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current || !videoRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pos * videoRef.current.duration;
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      setEmbedReloadKey((k) => k + 1);
    }
  };

  const handleOpenProduct = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setActiveReel(null);
      setQuickViewProduct(prod);
    }
  };

  // Carousel navigation
  const currentIndex = activeReel ? reels.findIndex((r) => r.id === activeReel.id) : -1;

  const handleNextReel = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (reels.length <= 1) return;
    const nextIdx = (currentIndex + 1) % reels.length;
    setActiveReel(reels[nextIdx]);
  };

  const handlePrevReel = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (reels.length <= 1) return;
    const prevIdx = (currentIndex - 1 + reels.length) % reels.length;
    setActiveReel(reels[prevIdx]);
  };

  return (
    <section 
      id="tiktok-section" 
      className={`${embedded ? 'pt-1 pb-3' : 'pt-1 pb-4 sm:pt-1.5 sm:pb-6 bg-[#0A0A0B] text-white border-t border-b border-[#222225]'}`}
    >
      <div className={embedded ? 'w-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}>
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5 sm:mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] tracking-[0.2em] font-bold uppercase text-[#00F2FE] mb-2">
              <Sparkles className="w-3 h-3 text-[#FE2C55]" />
              <span>TikTok Community • @artified_np</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-white font-semibold">
              Follow on TikTok
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-lg">
              Watch real customer unboxings, slow-motion pearl bag shine tests, and wedding styling guides straight from our store in Kathmandu, Nepal.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            {/* Hover to Play Indicator & Mute Audio Browsing Control */}
            <div className="inline-flex items-center bg-[#18181B] border border-white/10 rounded-full p-1 shadow-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-300 font-medium">
                <Play className="w-3 h-3 text-[#00F2FE] fill-[#00F2FE]" />
                <span>Hover to Play</span>
              </span>

              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  !isMuted 
                    ? 'bg-[#FE2C55] text-white' 
                    : 'text-neutral-400 hover:text-white'
                }`}
                title={isMuted ? "Turn Sound On" : "Mute Sound"}
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-white animate-pulse" />
                    <span>Sound On</span>
                  </>
                )}
              </button>
            </div>

            {isSellerMode && (
              <button
                type="button"
                onClick={() => openTikTokEditor(null)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#D4AF37] text-[#1C1B1A] text-xs font-bold tracking-wider uppercase hover:bg-[#c29f2e] transition-all shadow-xs"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Manage TikTok Videos ({reels.length})</span>
              </button>
            )}

            <a
              href="https://tiktok.com/@artified_np"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1C1B1A] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#34312F] transition-all shadow-xs"
            >
              <span>Follow @artified_np</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#C5A880]" />
            </a>
          </div>
        </div>

        {/* Reels Grid */}
        {reels.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-[#D5C7BC] max-w-xl mx-auto shadow-xs">
            <Video className="w-10 h-10 text-[#D4AF37] mx-auto mb-3" />
            <h3 className="font-serif text-lg font-semibold text-[#1C1B1A]">No TikTok Videos Linked Yet</h3>
            <p className="text-xs text-[#736C65] mt-1.5 max-w-md mx-auto">
              Share your viral clips from @artified_np! Link your first video to showcase handcrafted pearls, unboxings, and bridal stylings.
            </p>
            {isSellerMode && (
              <button
                type="button"
                onClick={() => openTikTokEditor(null)}
                className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#1C1B1A] text-white rounded-full text-xs font-semibold hover:bg-[#34312F] shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Add TikTok Video Link</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {reels.map((reel, index) => (
              <TikTokReelCard
                key={reel.id}
                reel={reel}
                index={index}
                isSellerMode={isSellerMode}
                isConfirmingDelete={confirmDeleteCardId === reel.id}
                isMuted={isMuted}
                onOpenReel={(r) => setActiveReel(r)}
                onOpenEditor={(r) => openTikTokEditor(r)}
                onDeleteReel={deleteReel}
                onSetConfirmDeleteId={setConfirmDeleteCardId}
                getPlayableVideoUrl={getPlayableVideoUrl}
              />
            ))}
          </div>
        )}

        {/* Bottom CTA Card - Direct Link to TikTok Page */}
        <div className="mt-10 bg-[#141416] rounded-3xl p-6 sm:p-8 border border-white/10 text-center shadow-lg max-w-3xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-white/10 border border-white/15 flex items-center justify-center mx-auto text-white">
            <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.46 6.3 6.3 0 0 0 1.94-4.45V8.82a8.28 8.28 0 0 0 4.83 1.55V6.92a4.85 4.85 0 0 1-1-.23z"/>
            </svg>
          </div>

          <h3 className="font-serif text-xl sm:text-2xl text-white font-semibold">
            Follow @artified_np on TikTok
          </h3>

          <p className="text-xs sm:text-sm text-neutral-300 max-w-md mx-auto leading-relaxed">
            Stay updated with daily store clips, fresh product drops, customer reviews, and handcrafted pearl creations directly from Kathmandu, Nepal.
          </p>

          <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
            {isSellerMode && (
              <button
                type="button"
                onClick={() => openTikTokEditor(null)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D4AF37] text-[#1C1B1A] text-xs font-bold tracking-wider uppercase hover:bg-[#c29f2e] shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Manage TikTok Videos</span>
              </button>
            )}

            <a
              href="https://tiktok.com/@artified_np"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#FE2C55] text-white text-xs font-bold tracking-wider uppercase hover:bg-[#e0264b] shadow-sm transition-all group"
            >
              <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.46 6.3 6.3 0 0 0 1.94-4.45V8.82a8.28 8.28 0 0 0 4.83 1.55V6.92a4.85 4.85 0 0 1-1-.23z"/>
              </svg>
              <span>Visit Official TikTok Page</span>
              <ExternalLink className="w-4 h-4 text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>

      </div>

      {/* Video Reel Modal with Auto-Play & Mute Controls (Portaled to document.body to avoid CSS transform bugs) */}
      {activeReel && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          
          {/* Previous Reel Navigation Arrow */}
          {reels.length > 1 && (
            <button
              type="button"
              onClick={handlePrevReel}
              className="hidden md:flex absolute left-4 lg:left-8 z-30 p-3 rounded-full bg-black/60 hover:bg-black text-white border border-white/20 transition-all hover:scale-110 shadow-xl"
              title="Previous Video"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next Reel Navigation Arrow */}
          {reels.length > 1 && (
            <button
              type="button"
              onClick={handleNextReel}
              className="hidden md:flex absolute right-4 lg:right-8 z-30 p-3 rounded-full bg-black/60 hover:bg-black text-white border border-white/20 transition-all hover:scale-110 shadow-xl"
              title="Next Video"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div className="relative w-full max-w-sm sm:max-w-md aspect-[9/16] max-h-[90vh] bg-[#1C1B1A] rounded-2xl overflow-hidden shadow-2xl border border-white/20 flex flex-col justify-between">
            {/* Top-right Floating Close Button */}
            <button
              type="button"
              onClick={() => setActiveReel(null)}
              className="absolute top-3 right-3 z-40 p-2 rounded-full bg-black/80 hover:bg-black text-white hover:text-[#D4AF37] border border-white/30 hover:border-[#D4AF37] backdrop-blur-md shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center"
              title="Close (ESC)"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Real Video or Embed or Thumbnail */}
            {(() => {
              const playableUrl = getPlayableVideoUrl(activeReel);
              const canPlayNative = Boolean(playableUrl && !videoLoadError);

              if (canPlayNative) {
                return (
                  <>
                    {/* Native HTML5 Video Player */}
                    <div className="relative w-full h-full cursor-pointer bg-black" onClick={togglePlayPause}>
                      <video
                        ref={videoRef}
                        key={playableUrl}
                        src={playableUrl!}
                        poster={getReelCoverImage(activeReel)}
                        autoPlay
                        muted={isMuted}
                        loop={reels.length <= 1}
                        playsInline
                        onTimeUpdate={handleTimeUpdate}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => {
                          if (reels.length > 1) {
                            handleNextReel();
                          }
                        }}
                        onError={() => {
                          console.warn('Native video playback failed, falling back to embed');
                          setVideoLoadError(true);
                        }}
                        className="w-full h-full object-cover"
                      />

                      {/* Gradients to keep overlays readable */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/70 pointer-events-none" />
                    </div>

                    {/* Top Bar Floating Controls */}
                    <div className="absolute top-0 inset-x-0 z-30 p-3 sm:p-4 flex items-center justify-between text-white pointer-events-none">
                      <div className="flex items-center gap-1.5 pointer-events-auto">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-semibold border border-white/20 shadow-md">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          <span>{activeReel.handle || '@artified_np'}</span>
                        </span>

                        {/* Audio Sound Toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMuted(!isMuted);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-md border transition-all text-xs font-medium shadow-md ${
                            !isMuted 
                              ? 'bg-[#D4AF37] text-[#1C1B1A] border-[#D4AF37]' 
                              : 'bg-black/75 text-white hover:bg-black border-white/20'
                          }`}
                          title={isMuted ? "Tap to Unmute Audio" : "Tap to Mute Audio"}
                        >
                          {isMuted ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                              <span className="text-[10px]">Unmute</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 text-[#1C1B1A] animate-pulse" />
                              <span className="text-[10px] font-bold">Sound</span>
                            </>
                          )}
                        </button>

                        {/* Replay */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReplay();
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/75 hover:bg-black text-white/90 hover:text-white border border-white/20 backdrop-blur-md text-[10px] shadow-md transition-all"
                          title="Replay from start"
                        >
                          <RotateCcw className="w-3 h-3 text-[#D4AF37]" />
                          <span>Replay</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 pointer-events-auto">
                        {/* Direct TikTok Watch Link */}
                        {activeReel.videoUrl && (
                          <a
                            href={activeReel.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1C1B1A]/85 hover:bg-black text-[#D4AF37] border border-[#D4AF37]/50 backdrop-blur-md text-[10px] font-medium shadow-md transition-all"
                            title="Watch full video on TikTok app / web"
                          >
                            <span>Open TikTok</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        {isSellerMode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const toEdit = activeReel;
                              setActiveReel(null);
                              openTikTokEditor(toEdit);
                            }}
                            className="p-1.5 rounded-full bg-black/75 text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-black backdrop-blur-md shadow-md"
                            title="Edit Reel"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveReel(null);
                          }}
                          className="p-1.5 rounded-full bg-black/75 text-white hover:bg-black border border-white/20 backdrop-blur-md shadow-md"
                          title="Close"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Right Side Social & Playback Icons */}
                    <div className="absolute right-3 top-20 z-30 flex flex-col items-center gap-3 text-white text-xs pointer-events-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const link = activeReel.videoUrl || 'https://tiktok.com/@artified_np';
                          navigator.clipboard.writeText(link);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="flex flex-col items-center"
                        title="Share link"
                      >
                        <div className="w-9 h-9 rounded-full bg-black/65 backdrop-blur-md flex items-center justify-center border border-white/30 hover:scale-110 transition-transform">
                          <Share2 className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[9px] mt-0.5">{copiedLink ? 'Copied!' : 'Share'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlayPause();
                        }}
                        className={`p-2 rounded-full backdrop-blur-md border transition-all ${
                          isPlaying 
                            ? 'bg-black/65 text-[#D4AF37] border-[#D4AF37]/50' 
                            : 'bg-black/65 text-white/60 border-white/20'
                        }`}
                        title={isPlaying ? "Pause video" : "Play video"}
                      >
                        {isPlaying ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                      </button>
                    </div>

                    {/* Bottom Area: Scrubber, Caption, Mobile Navigation, Product Pill */}
                    <div className="absolute bottom-0 inset-x-0 z-30 p-3 sm:p-4 text-white space-y-2 pointer-events-none">
                      
                      {/* Interactive Seeking Timeline */}
                      <div 
                        onClick={handleSeek}
                        className="pointer-events-auto w-full h-1.5 bg-white/25 hover:h-2.5 rounded-full overflow-hidden cursor-pointer transition-all duration-150"
                        title="Click to seek"
                      >
                        <div 
                          className="h-full bg-gradient-to-r from-[#D4AF37] to-amber-200 rounded-full transition-all duration-75"
                          style={{ width: `${videoProgress}%` }}
                        />
                      </div>

                      {/* Video Caption */}
                      <div className="pointer-events-auto">
                        <p className="text-xs font-semibold leading-snug line-clamp-2 text-shadow-sm">
                          {activeReel.videoCaption || activeReel.title}
                        </p>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-[#D4AF37]">
                          <span className="truncate">♫ Artified Nepal Original Audio • Handcrafted</span>
                          {activeReel.likes && (
                            <span className="text-white/90 text-[10px] flex items-center gap-1 shrink-0 ml-2">
                              <Heart className="w-3 h-3 fill-rose-400 text-rose-400" />
                              {activeReel.likes}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mobile Prev / Next Controls */}
                      {reels.length > 1 && (
                        <div className="pointer-events-auto flex items-center justify-between py-1 px-2 rounded-lg bg-black/75 backdrop-blur-md text-xs text-white/80 border border-white/10 md:hidden">
                          <button
                            type="button"
                            onClick={handlePrevReel}
                            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 text-white text-[11px]"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Previous</span>
                          </button>
                          <span className="text-[10px] text-white/60">
                            {currentIndex + 1} of {reels.length}
                          </span>
                          <button
                            type="button"
                            onClick={handleNextReel}
                            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 text-white text-[11px]"
                          >
                            <span>Next</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Linked Product Pill if attached */}
                      {activeReel.featuredProductId && activeReel.featuredProductName && (
                        <div className="pointer-events-auto bg-white/95 backdrop-blur-md text-[#1C1B1A] p-2 sm:p-2.5 rounded-xl flex items-center justify-between shadow-2xl border border-white/40">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#FAF8F5] shrink-0 border border-[#E8DFD8]">
                              <img 
                                src={getReelCoverImage(activeReel)} 
                                alt="" 
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover" 
                              />
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold truncate">{activeReel.featuredProductName}</p>
                              <p className="text-[10px] text-[#8C7A6B]">Featured in this clip</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenProduct(activeReel.featuredProductId!)}
                            className="px-3 py-1.5 bg-[#1C1B1A] text-white text-[11px] font-semibold tracking-wider uppercase rounded-lg shrink-0 ml-2 hover:bg-[#34312F] shadow-xs"
                          >
                            Shop
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                );
              }

              if (getTikTokVideoId(activeReel.videoUrl)) {
                return (
                  <>
                    {/* TikTok Native Embed Fallback */}
                    <div className="absolute inset-0 w-full h-full bg-black z-0">
                      <iframe
                        key={`${activeReel.id}-${embedReloadKey}`}
                        src={`https://www.tiktok.com/embed/v2/${getTikTokVideoId(activeReel.videoUrl)}`}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        title={activeReel.title}
                      />
                    </div>

                    <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 pointer-events-auto">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-semibold border border-white/20 shadow-md">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <span>TikTok</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              setVideoLoadError(false);
                              setEmbedReloadKey((k) => k + 1);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/75 hover:bg-black text-white/90 hover:text-white border border-white/20 backdrop-blur-md text-[10px] shadow-md transition-all"
                            title="Reload / Replay video"
                          >
                            <RotateCcw className="w-3 h-3 text-[#D4AF37]" />
                            <span>Replay</span>
                          </button>

                          <a
                            href={activeReel.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1C1B1A]/85 hover:bg-black text-[#D4AF37] border border-[#D4AF37]/50 backdrop-blur-md text-[10px] font-medium shadow-md transition-all"
                            title="Watch full video on TikTok app / web"
                          >
                            <span>Open TikTok</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <div className="flex items-center gap-1.5 pointer-events-auto">
                          <button
                            type="button"
                            onClick={() => setActiveReel(null)}
                            className="p-1.5 rounded-full bg-black/75 text-white hover:bg-black border border-white/20 backdrop-blur-md shadow-md"
                            title="Close"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 pointer-events-none">
                        {activeReel.featuredProductId && activeReel.featuredProductName && (
                          <div className="pointer-events-auto bg-white/95 backdrop-blur-md text-[#1C1B1A] p-2.5 rounded-xl flex items-center justify-between shadow-2xl border border-white/40 max-w-sm mx-auto">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#FAF8F5] shrink-0 border border-[#E8DFD8]">
                                <img 
                                  src={getReelCoverImage(activeReel)} 
                                  alt="" 
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-bold truncate">{activeReel.featuredProductName}</p>
                                <p className="text-[10px] text-[#8C7A6B]">Featured in this clip</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenProduct(activeReel.featuredProductId!)}
                              className="px-3 py-1.5 bg-[#1C1B1A] text-white text-[11px] font-semibold tracking-wider uppercase rounded-lg shrink-0 ml-2 hover:bg-[#34312F] shadow-xs"
                            >
                              Shop
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              }

              return (
                <>
                  <img
                    src={getReelCoverImage(activeReel)}
                    alt={activeReel.title}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60 pointer-events-none" />

                  <div className="relative z-20 p-4 flex items-center justify-between text-white bg-gradient-to-b from-black/80 to-transparent">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-xs font-bold tracking-wider">{activeReel.handle}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveReel(null)}
                        className="p-1.5 rounded-full bg-black/60 text-white hover:bg-black border border-white/20"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="relative z-20 p-4 text-white space-y-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent">
                    <p className="text-xs font-semibold leading-relaxed">{activeReel.videoCaption || activeReel.title}</p>
                    {activeReel.featuredProductId && activeReel.featuredProductName && (
                      <div className="bg-white text-[#1C1B1A] p-2.5 rounded-xl flex items-center justify-between shadow-lg">
                        <div className="truncate">
                          <p className="text-xs font-bold truncate">{activeReel.featuredProductName}</p>
                          <p className="text-[10px] text-[#8C7A6B]">Tap to view product</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenProduct(activeReel.featuredProductId!)}
                          className="px-3.5 py-1.5 bg-[#1C1B1A] text-white text-[11px] font-semibold uppercase rounded-lg ml-2"
                        >
                          Shop
                        </button>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

          </div>
        </div>,
        document.body
      )}
    </section>
  );
};
