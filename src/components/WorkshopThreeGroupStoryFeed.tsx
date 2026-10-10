import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Sparkles, 
  Video, 
  Camera, 
  MapPin, 
  Calendar, 
  Users, 
  Award, 
  MessageCircle, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Layers,
  LayoutGrid,
  RefreshCw,
  AlertTriangle,
  RotateCw,
  Repeat,
  CheckSquare,
  Square,
  Activity
} from 'lucide-react';
import { WorkshopGroup, WorkshopMediaItem } from '../types';
import { useCart } from '../context/CartContext';
import { deleteWorkshopMediaItem, batchDeleteWorkshopMediaItems } from '../data/workshops';
import { refetchWorkshopMediaFromStorage } from '../utils/workshopDiagnostics';
import { getWorkshopEmbeddedFallback } from '../data/workshopEmbeddedFallbacks';
import { isVideoMedia } from '../services/firebaseWorkshopStorageService';
import { useInView } from '../utils/useInView';
import { getCacheBustedUrl } from '../utils/cacheBuster';

interface WorkshopThreeGroupStoryFeedProps {
  groups: WorkshopGroup[];
  onOpenLightbox: (allItems: WorkshopMediaItem[], initialIndex: number) => void;
  onOpenUploadModal?: (groupKey?: string) => void;
  onEditItem?: (item: WorkshopMediaItem) => void;
  onDeleteItem?: (item: WorkshopMediaItem) => void;
  onReplaceItem?: (item: WorkshopMediaItem) => void;
  onBatchDelete?: (itemIds: string[]) => void;
  onEditGroup?: (group: WorkshopGroup) => void;
  onDeleteGroup?: (group: WorkshopGroup) => void;
}

/**
 * Auto-plays video on hover with muted looping preview
 */
const WorkshopVideoHoverThumbnail: React.FC<{
  videoUrl: string;
  posterUrl?: string;
  alt: string;
  updatedAt?: string;
  onLoaded?: () => void;
}> = ({ videoUrl, posterUrl, alt, updatedAt, onLoaded }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isHoveredPlaying, setIsHoveredPlaying] = useState(false);

  const cleanVidUrl = getCacheBustedUrl(videoUrl, updatedAt);
  const cleanPosterUrl = getCacheBustedUrl(posterUrl, updatedAt);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsHoveredPlaying(true))
          .catch(() => setIsHoveredPlaying(false));
      }
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsHoveredPlaying(false);
    }
  };

  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden bg-black"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={cleanVidUrl}
        poster={cleanPosterUrl}
        muted
        playsInline
        loop
        preload="metadata"
        onLoadedData={() => onLoaded && onLoaded()}
        onCanPlay={() => onLoaded && onLoaded()}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {isHoveredPlaying && (
        <span className="absolute top-2 left-2 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#25D366] text-white shadow-xs animate-pulse">
          <span>Playing</span>
        </span>
      )}
    </div>
  );
};

/**
 * Storytelling Media Player Viewport for a Workshop Cohort
 * Includes Next/Prev slide navigation, play/pause video player, sound toggle, reload media fallback, and thumbnail strip.
 */
const CohortStorytellingPlayer: React.FC<{
  group: WorkshopGroup;
  activeIndex: number;
  onSelectIndex: (idx: number) => void;
  onOpenLightbox: (items: WorkshopMediaItem[], index: number) => void;
  onEditItem?: (item: WorkshopMediaItem) => void;
  onDeleteItem?: (item: WorkshopMediaItem) => void;
  onReplaceItem?: (item: WorkshopMediaItem) => void;
  isSelectionMode?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  isInView?: boolean;
}> = ({ 
  group, 
  activeIndex, 
  onSelectIndex, 
  onOpenLightbox, 
  onEditItem, 
  onDeleteItem,
  onReplaceItem,
  isSelectionMode,
  selectedIds = [],
  onToggleSelect,
  isInView
}) => {
  const { isSellerMode } = useCart();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isReloading, setIsReloading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);

  const items = group.items;
  const currentItem = items[activeIndex] || items[0];
  const isVideo = currentItem ? (currentItem.type === 'video' || isVideoMedia(currentItem.url || '', currentItem.title)) : false;
  const isSelected = currentItem ? selectedIds.includes(currentItem.id) : false;

  useEffect(() => {
    setMediaError(null);
    setDeleteConfirm(false);
    setIsReloading(false);
    setIsMediaLoaded(false);
    if (currentItem) {
      if (!isVideo) {
        const embedded = getWorkshopEmbeddedFallback(currentItem.url) || getWorkshopEmbeddedFallback(currentItem.thumbnailUrl);
        setCurrentUrl(embedded || currentItem.url);
      } else {
        // Video: use the item's url directly
        setCurrentUrl(currentItem.url);
      }

      // If currentItem.url is a transient blob: URL that might have expired across sessions, attempt auto-revival
      if (currentItem.url && currentItem.url.startsWith('blob:')) {
        refetchWorkshopMediaFromStorage(currentItem).then((fresh) => {
          if (fresh && fresh !== currentItem.url) {
            setCurrentUrl(fresh);
          }
        }).catch(() => {});
      }
    }
    if (isVideo && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = isMuted;
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setMediaError(null);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    } else {
      setIsPlaying(false);
    }
  }, [activeIndex, isVideo, currentItem?.id, currentItem?.url]);

  if (!currentItem) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[320px] sm:min-h-[380px] bg-[#181716] dark:bg-[#121110] p-6 rounded-2xl sm:rounded-3xl border border-[#E8DFD8]/80 dark:border-[#2E2C29] text-center text-white">
        <div className="w-14 h-14 rounded-2xl bg-[#C5A880]/20 flex items-center justify-center text-[#C5A880] mb-4">
          <Sparkles className="w-7 h-7" />
        </div>
        <span className="inline-block px-3 py-1 rounded-full bg-[#C5A880]/25 text-[#E6CA9E] text-xs font-bold uppercase tracking-wider mb-2">
          Upcoming Workshop Batch
        </span>
        <h4 className="font-serif text-lg font-bold text-white mb-2">
          {group.title}
        </h4>
        <p className="text-xs text-white/70 max-w-sm mb-4 leading-relaxed">
          {group.description || 'Hands-on artisan training workshop led by Sahina Shrestha in Kathmandu. Open for new candidates.'}
        </p>
        <span className="text-[11px] text-[#C5A880] font-mono">
          📅 {group.date || 'Starting Soon'} • 📍 {group.location || 'Kathmandu Workshop'}
        </span>
      </div>
    );
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newIdx = (activeIndex - 1 + items.length) % items.length;
    onSelectIndex(newIdx);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newIdx = (activeIndex + 1) % items.length;
    onSelectIndex(newIdx);
  };

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isVideo || !videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        setMediaError(null);
      }).catch((err) => {
        console.warn('Playback error:', err);
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleReloadMedia = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsReloading(true);
    setMediaError(null);
    try {
      const fresh = await refetchWorkshopMediaFromStorage(currentItem);
      setCurrentUrl(fresh);
      if (videoRef.current) {
        videoRef.current.load();
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    } catch (err: any) {
      setMediaError(err?.message || 'Failed to reload media from storage.');
    } finally {
      setIsReloading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await deleteWorkshopMediaItem(currentItem.id);
      if (onDeleteItem) {
        onDeleteItem(currentItem);
      }
      setDeleteConfirm(false);
      onSelectIndex(0);
    } catch (err) {
      console.error('Failed to delete media:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const displayMediaUrl = getCacheBustedUrl(currentUrl || currentItem.url, currentItem.updatedAt);
  const displayThumbUrl = getCacheBustedUrl(currentItem.thumbnailUrl || currentUrl || currentItem.url, currentItem.updatedAt);

  return (
    <div className="flex flex-col w-full bg-[#181716] dark:bg-[#121110] p-1.5 sm:p-2 rounded-2xl border border-white/10 shadow-xs">
      
      {/* Main Active Media Display Viewport - Strict 1:1 Aspect Ratio with Lazy-Load Shimmer */}
      <div 
        className="relative w-full aspect-square rounded-xl overflow-hidden bg-black group cursor-pointer select-none shadow-md"
        onClick={() => {
          if (isSelectionMode && onToggleSelect) {
            onToggleSelect(currentItem.id);
          } else if (!mediaError) {
            onOpenLightbox(items, activeIndex);
          }
        }}
      >
        {/* Selection Checkbox Overlay */}
        {isSelectionMode && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect && onToggleSelect(currentItem.id);
            }}
            className="absolute top-3 left-3 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/90 backdrop-blur-md border border-white/30 text-white cursor-pointer shadow-lg hover:scale-105 transition-transform"
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-[#C5A880] fill-[#C5A880]/20" />
            ) : (
              <Square className="w-5 h-5 text-white/70" />
            )}
            <span className="text-xs font-bold">{isSelected ? 'Selected' : 'Select'}</span>
          </div>
        )}

        {/* Placeholder shimmer effect while waiting for lazy-load observer to trigger */}
        {!isInView ? (
          <div className="absolute inset-0 w-full h-full aspect-square bg-[#1A1817] flex items-center justify-center overflow-hidden select-none">
            {/* Dark background base */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1C1A18] via-[#141312] to-[#1C1A18]" />

            {/* Glowing placeholder shimmer sweep */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />

            {/* Skeleton visual elements */}
            <div className="relative z-10 flex flex-col items-center gap-2.5 text-white/40">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                {isVideo ? (
                  <Video className="w-6 h-6 text-[#C5A880]/70" />
                ) : (
                  <Camera className="w-6 h-6 text-[#C5A880]/70" />
                )}
              </div>
              <div className="h-2 w-28 rounded-full bg-white/10 overflow-hidden relative">
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>

            {/* 1:1 Lazy-Load Indicator Badge */}
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-xs text-[10px] font-mono text-[#E6CA9E] border border-white/10">
              <Sparkles className="w-3 h-3 text-[#C5A880] animate-spin" />
              <span>Loading 1:1 Craft Media...</span>
            </div>
          </div>
        ) : mediaError ? (
          /* Error Fallback Card with Reload Media Button */
          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center text-white max-w-md mx-auto z-10 animate-fade-in">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 mb-3 border border-amber-500/30">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h4 className="font-serif text-base font-bold text-white mb-1">
              Media Stream Notice
            </h4>
            <p className="text-xs text-white/70 mb-4 leading-relaxed">
              {mediaError || 'The video or photo could not be played. Re-fetch from Firebase Storage or replace with a fresh file.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleReloadMedia}
                disabled={isReloading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C5A880] hover:bg-[#b8986c] text-[#1C1B1A] text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
                <span>{isReloading ? 'Re-fetching...' : '🔄 Reload Media'}</span>
              </button>

              {isSellerMode && onReplaceItem && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReplaceItem(currentItem);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-semibold cursor-pointer"
                >
                  <Repeat className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Replace File</span>
                </button>
              )}
            </div>
          </div>
        ) : isVideo ? (
          <div className="absolute inset-0 w-full h-full overflow-hidden bg-black">
            {/* Shimmer skeleton while video buffer initializes */}
            {!isMediaLoaded && (
              <div className="absolute inset-0 bg-[#1A1817] flex items-center justify-center overflow-hidden z-10 pointer-events-none transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1C1A18] via-[#141312] to-[#1C1A18]" />
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                <div className="relative z-10 flex flex-col items-center gap-2 text-white/40">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Video className="w-5 h-5 text-[#C5A880]/60" />
                  </div>
                </div>
              </div>
            )}
            <video
              ref={videoRef}
              src={displayMediaUrl}
              poster={getWorkshopEmbeddedFallback(displayThumbUrl) || displayThumbUrl || undefined}
              playsInline
              loop
              autoPlay
              muted={isMuted}
              preload="metadata"
              onLoadedData={() => setIsMediaLoaded(true)}
              onCanPlay={() => setIsMediaLoaded(true)}
              onPlay={() => {
                setIsPlaying(true);
                setMediaError(null);
                setIsMediaLoaded(true);
              }}
              onPause={() => setIsPlaying(false)}
              onError={async () => {
                // Attempt auto-revival from storage before presenting error
                try {
                  const recovered = await refetchWorkshopMediaFromStorage(currentItem);
                  if (recovered && recovered !== currentUrl && recovered !== currentItem.url) {
                    setCurrentUrl(recovered);
                    return;
                  }
                } catch {}
                setMediaError('Video could not be streamed. Please check network connection or reload media.');
              }}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* Center Play/Pause Overlay Button */}
            <button
              type="button"
              onClick={handleTogglePlay}
              className={`absolute inset-0 m-auto w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/65 backdrop-blur-md text-white flex items-center justify-center border border-white/30 transition-all duration-300 cursor-pointer ${
                isPlaying ? 'opacity-0 group-hover:opacity-90 scale-95' : 'opacity-100 scale-100 group-hover:scale-110 group-hover:bg-[#C5A880] group-hover:text-[#1C1B1A]'
              }`}
              title={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>

            {/* Bottom Left Live Recording Tag */}
            <div className="absolute bottom-3 left-3 right-14 flex items-center justify-between pointer-events-none z-20">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-black/75 backdrop-blur-md text-white/95 border border-white/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Kathmandu Workshop Recording</span>
              </span>
            </div>

            {/* Video Sound Toggle Button */}
            <button
              type="button"
              onClick={handleToggleMute}
              className="absolute bottom-3 right-3 z-30 p-2 rounded-full bg-black/80 hover:bg-black text-white border border-white/20 transition-all cursor-pointer shadow-md"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-white/80" /> : <Volume2 className="w-4 h-4 text-[#E6CA9E]" />}
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full overflow-hidden bg-black">
            {/* Shimmer skeleton while image loads */}
            {!isMediaLoaded && (
              <div className="absolute inset-0 bg-[#1A1817] flex items-center justify-center overflow-hidden z-10 pointer-events-none transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1C1A18] via-[#141312] to-[#1C1A18]" />
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                <div className="relative z-10 flex flex-col items-center gap-2 text-white/40">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-[#C5A880]/60" />
                  </div>
                </div>
              </div>
            )}
            <img
              src={displayMediaUrl || displayThumbUrl}
              alt={currentItem.title}
              onLoad={() => setIsMediaLoaded(true)}
              onError={async () => {
                const fallback = getWorkshopEmbeddedFallback(currentUrl || currentItem.url || currentItem.thumbnailUrl);
                if (fallback && currentUrl !== fallback) {
                  setCurrentUrl(fallback);
                  setMediaError(null);
                  return;
                }
                try {
                  const recovered = await refetchWorkshopMediaFromStorage(currentItem);
                  if (recovered && recovered !== currentUrl) {
                    setCurrentUrl(recovered);
                    return;
                  }
                } catch {}
                setMediaError('Photo failed to load from URL.');
              }}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Top Badges Bar: Media Type Pill + Slide Counter + Full HD Badge */}
        {!isSelectionMode && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/80 backdrop-blur-md text-white border border-white/20">
                {isVideo ? (
                  <>
                    <Video className="w-3 h-3 text-[#E6CA9E]" />
                    <span>Training Video</span>
                    {currentItem.duration && <span className="opacity-80 font-mono ml-0.5">({currentItem.duration})</span>}
                  </>
                ) : (
                  <>
                    <Camera className="w-3 h-3 text-[#E6CA9E]" />
                    <span>Workshop Photo</span>
                  </>
                )}
              </span>

              <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-mono font-bold bg-[#C5A880] text-[#1C1B1A]">
                {activeIndex + 1} / {items.length}
              </span>
            </div>

            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-black/70 backdrop-blur-xs text-white border border-white/15">
              <Maximize2 className="w-3 h-3 text-[#E6CA9E]" />
              <span>Full HD</span>
            </span>
          </div>
        )}

        {/* Left / Right Arrow Navigation */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all transform hover:scale-110 cursor-pointer shadow-lg"
              title="Previous"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all transform hover:scale-110 cursor-pointer shadow-lg"
              title="Next"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        {/* Seller Inline Controls: Replace, Edit, Delete */}
        {isSellerMode && !isSelectionMode && (
          <div className="absolute top-3 right-20 z-30 flex items-center gap-1">
            {/* Quick Reload Media Button */}
            <button
              type="button"
              onClick={handleReloadMedia}
              disabled={isReloading}
              className="p-1.5 rounded-lg bg-black/80 hover:bg-black text-white border border-white/20 transition-colors cursor-pointer shadow-xs"
              title="Reload / Refresh media from Firebase Storage"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isReloading ? 'animate-spin' : ''}`} />
            </button>

            {/* Replace Button */}
            {onReplaceItem && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReplaceItem(currentItem);
                }}
                className="p-1.5 rounded-lg bg-black/80 hover:bg-black text-white border border-white/20 transition-colors cursor-pointer shadow-xs"
                title="Replace with new photo or video"
              >
                <Repeat className="w-3.5 h-3.5 text-[#E6CA9E]" />
              </button>
            )}

            {/* Edit Button */}
            {onEditItem && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditItem(currentItem);
                }}
                className="p-1.5 rounded-lg bg-black/80 hover:bg-black text-white border border-white/20 transition-colors cursor-pointer shadow-xs"
                title="Edit caption & story details"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#C5A880]" />
              </button>
            )}

            {/* Delete Button with inline confirmation */}
            {deleteConfirm ? (
              <div className="flex items-center gap-1 bg-black/90 p-0.5 rounded-lg border border-red-500/60 shadow-lg">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-md cursor-pointer"
                >
                  {isDeleting ? '...' : 'Del'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(false);
                  }}
                  className="px-1.5 py-1 bg-white/20 text-white text-[10px] rounded-md cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm(true);
                }}
                className="p-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/60 transition-colors cursor-pointer shadow-xs"
                title="Remove this photo/video"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Interactive Thumbnail Selector Strip */}
      <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none max-w-full">
          {items.map((item, idx) => {
            const isThumbActive = idx === activeIndex;
            const isThumbVideo = item.type === 'video' || isVideoMedia(item.url, item.title);
            const isThumbSelected = selectedIds.includes(item.id);
            const rawThumbSrc = getWorkshopEmbeddedFallback(item.thumbnailUrl || item.url) || item.thumbnailUrl || item.url || '';
            const cleanThumbSrc = getCacheBustedUrl(rawThumbSrc, item.updatedAt);

            return (
              <button
                key={item.id || `thumb_${idx}`}
                type="button"
                onClick={() => onSelectIndex(idx)}
                className={`relative shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-md overflow-hidden border transition-all cursor-pointer ${
                  isThumbActive
                    ? 'border-[#C5A880] scale-105 shadow-xs ring-1.5 ring-[#C5A880]/60'
                    : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/50'
                }`}
                title={`${isThumbVideo ? 'Video' : 'Photo'} ${idx + 1}: ${item.title}`}
              >
                <img
                  src={cleanThumbSrc}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                {isThumbSelected && (
                  <span className="absolute inset-0 bg-[#C5A880]/50 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white fill-[#1C1B1A]" />
                  </span>
                )}
                <span className="absolute bottom-0.5 right-0.5 p-0.5 rounded-full bg-black/85 text-white">
                  {isThumbVideo ? (
                    <Video className="w-2.5 h-2.5 text-[#E6CA9E]" />
                  ) : (
                    <Camera className="w-2.5 h-2.5 text-[#E6CA9E]" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <span className="text-[10px] text-white/50 font-mono shrink-0 hidden sm:inline">
          {items.length} items
        </span>
      </div>
    </div>
  );
};

/**
 * Lazy-loaded Workshop Grid Media Card with 1:1 Aspect Ratio and Placeholder Shimmer Effect
 */
const WorkshopGridMediaCard: React.FC<{
  item: WorkshopMediaItem;
  itemIdx: number;
  isSelected: boolean;
  isSelectionMode: boolean;
  toggleSelectId: (id: string) => void;
  onOpenLightbox: (items: WorkshopMediaItem[], index: number) => void;
  allItems: WorkshopMediaItem[];
}> = ({ item, itemIdx, isSelected, isSelectionMode, toggleSelectId, onOpenLightbox, allItems }) => {
  const { containerRef, isInView } = useInView({ rootMargin: '150px 0px' });
  const [isLoaded, setIsLoaded] = useState(false);
  const isVid = item.type === 'video' || isVideoMedia(item.url, item.title);
  const gridImgSrc = getCacheBustedUrl(
    getWorkshopEmbeddedFallback(item.thumbnailUrl || item.url) || item.thumbnailUrl || item.url,
    item.updatedAt
  );

  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl overflow-hidden bg-black/5 dark:bg-black/40 border border-[#E8DFD8] dark:border-white/10 group flex flex-col ${
        isSelected ? 'ring-2 ring-[#C5A880]' : ''
      }`}
    >
      {/* 1:1 Square Viewport */}
      <div
        className="relative aspect-square w-full overflow-hidden bg-black cursor-pointer"
        onClick={() => {
          if (isSelectionMode) {
            toggleSelectId(item.id);
          } else {
            onOpenLightbox(allItems, itemIdx);
          }
        }}
      >
        {/* Placeholder Shimmer effect while waiting for lazy-load observer */}
        {!isInView ? (
          <div className="absolute inset-0 w-full h-full bg-[#1A1817] overflow-hidden flex items-center justify-center select-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1C1A18] via-[#141312] to-[#1C1A18]" />
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            <div className="relative z-10 w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 animate-pulse">
              {isVid ? <Video className="w-4 h-4 text-[#C5A880]/60" /> : <Camera className="w-4 h-4 text-[#C5A880]/60" />}
            </div>
          </div>
        ) : (
          <>
            {!isLoaded && (
              <div className="absolute inset-0 bg-[#1A1817] overflow-hidden flex items-center justify-center z-10 pointer-events-none transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1C1A18] via-[#141312] to-[#1C1A18]" />
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
              </div>
            )}
            {isVid ? (
              <WorkshopVideoHoverThumbnail
                videoUrl={item.url}
                posterUrl={getWorkshopEmbeddedFallback(item.thumbnailUrl || item.url) || item.thumbnailUrl || undefined}
                alt={item.title}
                updatedAt={item.updatedAt}
                onLoaded={() => setIsLoaded(true)}
              />
            ) : (
              <img
                src={gridImgSrc || '/artisan_avatar.jpg'}
                alt={item.title}
                onLoad={() => setIsLoaded(true)}
                className={`absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ${
                  isLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
          </>
        )}

        {isSelectionMode && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              toggleSelectId(item.id);
            }}
            className="absolute top-1.5 left-1.5 z-30 p-1 rounded-md bg-black/80 text-white"
          >
            {isSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-[#C5A880]" />
            ) : (
              <Square className="w-3.5 h-3.5 text-white/70" />
            )}
          </div>
        )}

        <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-black/80 text-white flex items-center gap-1 z-20">
          {isVid ? <Video className="w-3 h-3 text-[#E6CA9E]" /> : <Camera className="w-3 h-3 text-[#E6CA9E]" />}
          <span>{isVid ? 'Video' : 'Photo'}</span>
        </span>
      </div>

      <div className="p-2">
        <h5 className="font-semibold text-xs text-[#1C1B1A] dark:text-white line-clamp-1">{item.title}</h5>
      </div>
    </div>
  );
};

/**
 * Individual Workshop Group Card Component with Viewport Intersection Observer
 */
const WorkshopGroupCardItem: React.FC<{
  group: WorkshopGroup;
  groupIdx: number;
  currentActiveSlide: number;
  currentActiveItem: WorkshopMediaItem | undefined;
  videoCount: number;
  photoCount: number;
  totalMediaCount: number;
  isGridExpanded: boolean;
  isSelectionMode: boolean;
  selectedIds: string[];
  isSellerMode: boolean;
  confirmDeleteGroupKey: string | null;
  onSelectAllGroup: (group: WorkshopGroup) => void;
  onOpenUploadModal?: (groupKey?: string) => void;
  onEditGroup?: (group: WorkshopGroup) => void;
  onDeleteGroup?: (group: WorkshopGroup) => void;
  setConfirmDeleteGroupKey: (key: string | null) => void;
  toggleGridExpand: (groupKey: string) => void;
  toggleSelectId: (id: string) => void;
  onOpenLightbox: (items: WorkshopMediaItem[], index: number) => void;
  handleSetSlide: (groupKey: string, index: number) => void;
  onEditItem?: (item: WorkshopMediaItem) => void;
  onDeleteItem?: (item: WorkshopMediaItem) => void;
  onReplaceItem?: (item: WorkshopMediaItem) => void;
  handleOpenWhatsApp: (group: WorkshopGroup) => void;
}> = ({
  group,
  groupIdx,
  currentActiveSlide,
  currentActiveItem,
  videoCount,
  photoCount,
  totalMediaCount,
  isGridExpanded,
  isSelectionMode,
  selectedIds,
  isSellerMode,
  confirmDeleteGroupKey,
  onSelectAllGroup,
  onOpenUploadModal,
  onEditGroup,
  onDeleteGroup,
  setConfirmDeleteGroupKey,
  toggleGridExpand,
  toggleSelectId,
  onOpenLightbox,
  handleSetSlide,
  onEditItem,
  onDeleteItem,
  onReplaceItem,
  handleOpenWhatsApp
}) => {
  const { containerRef, isInView } = useInView();
  const groupKey = group.groupKey || group.id;

  return (
    <div
      ref={containerRef}
      id={`workshop-group-${groupKey}`}
      className="relative bg-white dark:bg-[#1A1918] rounded-2xl sm:rounded-3xl border border-[#E8DFD8] dark:border-[#2A2825] shadow-xs hover:shadow-md transition-shadow overflow-hidden p-3.5 sm:p-5 lg:p-6 flex flex-col justify-between"
    >
      {/* Top Accent Gradient Border */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#C5A880] via-[#8C5D36] to-[#C5A880]" />

      {/* Workshop Top Banner: Batch Badge, Stats & Action CTAs */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-[#F0EBE5] dark:border-[#262422]">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#C5A880]/20 text-[#8C5D36] dark:text-[#E6CA9E] border border-[#C5A880]/30 truncate">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
            <span className="truncate">{group.badge || `Workshop #${groupIdx + 1}`}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-[#262422] text-[#5E5955] dark:text-[#C4BCB5]">
            {totalMediaCount === 0 ? (
              <span>Upcoming Batch</span>
            ) : (
              <span>
                {videoCount > 0 ? `${videoCount} ${videoCount === 1 ? 'Video' : 'Videos'} • ` : ''}{photoCount} {photoCount === 1 ? 'Photo' : 'Photos'}
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isSelectionMode && (
            <button
              type="button"
              onClick={() => onSelectAllGroup(group)}
              className="p-1.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-xs transition-all cursor-pointer"
              title="Select All"
            >
              <CheckSquare className="w-4 h-4 text-[#C5A880]" />
            </button>
          )}

          {isSellerMode && onOpenUploadModal && (
            <button
              type="button"
              onClick={() => onOpenUploadModal(groupKey)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#C5A880] hover:bg-[#b8986c] text-[#1C1B1A] text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Add Media to this workshop"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Media</span>
            </button>
          )}

          {isSellerMode && onEditGroup && (
            <button
              type="button"
              onClick={() => onEditGroup(group)}
              className="p-1.5 rounded-xl bg-neutral-100 dark:bg-[#262422] hover:bg-neutral-200 text-[#5E5955] dark:text-[#C4BCB5] transition-colors cursor-pointer"
              title="Edit workshop details"
            >
              <Edit3 className="w-4 h-4 text-[#C5A880]" />
            </button>
          )}

          {isSellerMode && onDeleteGroup && (
            confirmDeleteGroupKey === groupKey ? (
              <div className="flex items-center gap-1 bg-red-500/10 dark:bg-red-950/40 p-0.5 rounded-xl border border-red-500/30 animate-fade-in">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteGroup(group);
                    setConfirmDeleteGroupKey(null);
                  }}
                  className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteGroupKey(null)}
                  className="px-1.5 py-1 rounded bg-neutral-200 dark:bg-neutral-800 text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteGroupKey(groupKey)}
                className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 transition-colors cursor-pointer"
                title="Delete workshop"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )
          )}

          {/* Grid View Toggle */}
          <button
            type="button"
            onClick={() => toggleGridExpand(groupKey)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer text-xs font-semibold ${
              isGridExpanded
                ? 'bg-[#1C1B1A] text-white dark:bg-white dark:text-[#1C1B1A]'
                : 'bg-neutral-100 dark:bg-[#262422] text-[#5E5955] dark:text-[#C4BCB5]'
            }`}
            title={isGridExpanded ? 'Switch to Storytelling Slider' : 'View All Photos/Videos at once'}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isGridExpanded ? 'Slider' : 'All Media'}</span>
          </button>
        </div>
      </div>

      {/* Split Row: Left = Photos & Videos Display (Strict 1:1 Aspect Ratio), Right = Workshop Details & Schedule */}
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-7 items-start">
        {/* LEFT COLUMN: Photos and Videos Display in Strict 1:1 Aspect Ratio */}
        <div className={`w-full ${isGridExpanded ? 'lg:w-7/12' : 'max-w-[400px] sm:max-w-[440px] lg:w-[420px] xl:w-[460px]'} shrink-0 mx-auto lg:mx-0 transition-all`}>
          {isGridExpanded ? (
            /* Grid View of all photos and videos - Strict 1:1 Aspect Ratio */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {group.items.map((item, itemIdx) => (
                <WorkshopGridMediaCard
                  key={item.id || `grid_item_${itemIdx}`}
                  item={item}
                  itemIdx={itemIdx}
                  isSelected={selectedIds.includes(item.id)}
                  isSelectionMode={isSelectionMode}
                  toggleSelectId={toggleSelectId}
                  onOpenLightbox={onOpenLightbox}
                  allItems={group.items}
                />
              ))}
            </div>
          ) : (
            /* Storytelling Media Player with Video Hover, Sound Toggle & Thumbnails Bar */
            <CohortStorytellingPlayer
              group={group}
              activeIndex={currentActiveSlide}
              onSelectIndex={(idx) => handleSetSlide(groupKey, idx)}
              onOpenLightbox={onOpenLightbox}
              onEditItem={onEditItem}
              onDeleteItem={onDeleteItem}
              onReplaceItem={onReplaceItem}
              isSelectionMode={isSelectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelectId}
              isInView={isInView}
            />
          )}
        </div>

        {/* RIGHT COLUMN: Headline, Description & Batch Date */}
        <div className="w-full lg:flex-1 min-w-0 flex flex-col justify-between self-stretch gap-4">
          {/* Headline & Location */}
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C5A880]/15 text-[#8C5D36] dark:text-[#E6CA9E] border border-[#C5A880]/30">
                <Sparkles className="w-3 h-3 text-[#C5A880]" />
                <span>{group.badge || 'Masterclass Cohort'}</span>
              </span>
              <span className="text-xs font-semibold text-[#7A746E] dark:text-[#A8A29D]">
                📍 {group.location || 'Kathmandu Studio'}
              </span>
            </div>

            <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#1C1B1A] dark:text-white leading-snug">
              {group.title}
            </h3>
          </div>

          {/* Workshop Headline Overview Description */}
          <p className="text-xs sm:text-sm text-[#5E5955] dark:text-[#C4BCB5] leading-relaxed">
            {group.description || 'Hands-on practical workshop led by Sahina Shrestha in Kathmandu, Nepal. Master authentic artisan techniques with premium raw materials.'}
          </p>

          {/* Upcoming Start Batch Date Banner (Identifies Active Registrations) */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-[#C5A880]/10 dark:bg-[#C5A880]/15 border border-[#C5A880]/30 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#C5A880] text-[#1C1B1A] flex items-center justify-center shrink-0 font-bold shadow-2xs">
                <Calendar className="w-4 h-4 text-[#1C1B1A]" />
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8C5D36] dark:text-[#E6CA9E]">
                  Upcoming Start Batch Date
                </span>
                <span className="font-serif text-sm font-bold text-[#1C1B1A] dark:text-white">
                  {group.batchDate || group.nextBatchDate || 'Sat, Oct 24, 2026'}
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#25D366]/20 text-[#128C7E] dark:text-[#25D366] border border-[#25D366]/30">
              <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
              <span>Active Registration</span>
            </span>
          </div>

          {/* Date, Location & Seats Metas */}
          <div className="grid grid-cols-3 gap-2 py-2.5 border-t border-[#F0EBE5] dark:border-[#262422] text-xs text-[#7A746E] dark:text-[#A8A29D]">
            <div className="flex items-center gap-1.5 truncate" title={`Start Batch: ${group.batchDate || group.date || 'Oct 24, 2026'}`}>
              <Calendar className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
              <span className="truncate font-medium">{group.batchDate || group.date?.split('•')[0] || 'Oct 24, 2026'}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate" title={group.location || 'Kathmandu Studio'}>
              <MapPin className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
              <span className="truncate font-medium">{group.location || 'Kathmandu'}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate" title={`${group.attendeesCount || 15} Seats available`}>
              <Users className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
              <span className="truncate font-medium">{group.attendeesCount || 15} Seats</span>
            </div>
          </div>

          {/* Action CTA Buttons */}
          <div className="flex items-center gap-2.5 pt-2 mt-auto">
            <button
              type="button"
              onClick={() => handleOpenWhatsApp(group)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition-all transform active:scale-98 cursor-pointer shadow-sm hover:shadow"
            >
              <MessageCircle className="w-4 h-4 fill-white shrink-0" />
              <span>Register on WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenLightbox(group.items, currentActiveSlide)}
              className="p-3 rounded-xl bg-neutral-100 dark:bg-[#262422] hover:bg-neutral-200 text-[#1C1B1A] dark:text-white transition-colors cursor-pointer shrink-0"
              title="Full HD Theater"
            >
              <Maximize2 className="w-4 h-4 text-[#C5A880]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const WorkshopThreeGroupStoryFeed: React.FC<WorkshopThreeGroupStoryFeedProps> = ({
  groups,
  onOpenLightbox,
  onOpenUploadModal,
  onEditItem,
  onDeleteItem,
  onReplaceItem,
  onBatchDelete,
  onEditGroup,
  onDeleteGroup
}) => {
  const { isSellerMode } = useCart();
  const [activeTabKey, setActiveTabKey] = useState<string>(groups[0]?.groupKey || groups[0]?.id || 'all');
  const [activeSlideMap, setActiveSlideMap] = useState<Record<string, number>>({});
  const [gridExpandedMap, setGridExpandedMap] = useState<Record<string, boolean>>({});
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [confirmDeleteGroupKey, setConfirmDeleteGroupKey] = useState<string | null>(null);

  // Sync activeTabKey if current tab is deleted or unavailable
  useEffect(() => {
    if (activeTabKey !== 'all' && groups.length > 0) {
      const match = groups.some((g) => (g.groupKey || g.id) === activeTabKey);
      if (!match) {
        setActiveTabKey(groups[0]?.groupKey || groups[0]?.id || 'all');
      }
    }
  }, [groups, activeTabKey]);

  const handleSetSlide = (groupKey: string, index: number) => {
    setActiveSlideMap((prev) => ({ ...prev, [groupKey]: index }));
  };

  const toggleGridExpand = (groupKey: string) => {
    setGridExpandedMap((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllGroup = (group: WorkshopGroup) => {
    const groupItemIds = group.items.map((i) => i.id);
    const allSelected = groupItemIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !groupItemIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...groupItemIds])));
    }
  };

  const handleExecuteBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    setBatchDeleting(true);
    try {
      await batchDeleteWorkshopMediaItems(selectedIds);
      if (onBatchDelete) {
        onBatchDelete(selectedIds);
      }
      setSelectedIds([]);
      setIsSelectionMode(false);
    } catch (e) {
      console.error('Batch delete failed:', e);
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleOpenWhatsApp = (group: WorkshopGroup) => {
    const phone = '9779767573721';
    const text = encodeURIComponent(
      group.whatsappMessage || 
      `Namaste Sahina Shrestha! ✨ I would love to register for your upcoming "${group.title}" in Kathmandu.`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  if (!groups || groups.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white dark:bg-[#1A1918] rounded-3xl border border-dashed border-[#E8DFD8] dark:border-[#2A2825] my-6 shadow-sm">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#C5A880]/15 flex items-center justify-center text-[#C5A880]">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-serif font-bold text-[#1C1B1A] dark:text-[#FAF8F5] mb-2">
          {isSellerMode ? 'Workshops Cleaned & Ready' : 'Handmade Workshops in Kathmandu'}
        </h3>
        <p className="text-sm text-[#736C65] dark:text-[#9E9790] max-w-md mx-auto mb-6">
          {isSellerMode
            ? 'Ready to launch your handcrafting workshop! Upload photos and videos directly to Firebase Storage with instant info extraction.'
            : 'New workshop schedules and training sessions will be announced soon. Tap below to inquire or reserve upcoming seats via WhatsApp.'}
        </p>
        {isSellerMode && onOpenUploadModal ? (
          <button
            type="button"
            onClick={() => onOpenUploadModal()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#C5A880] hover:bg-[#b8986c] text-[#1C1B1A] font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer hover:scale-102"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Workshop (Upload Photos & Videos)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              const phone = '9779767573721';
              const text = encodeURIComponent(
                'Namaste Sahina Shrestha! ✨ I am interested in joining your upcoming handmade craft workshop in Kathmandu.'
              );
              window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>Inquire Upcoming Workshop Batches</span>
          </button>
        )}
      </div>
    );
  }

  // Display all workshop groups continuously so user can scroll down
  const finalGroups = groups;

  return (
    <div className="space-y-4">


      {/* Sticky Batch Selection Bar when items are selected */}
      {isSellerMode && (
        <div className="bg-white dark:bg-[#1C1B1A] border border-[#C5A880]/30 rounded-2xl p-2.5 sm:p-3 shadow-md flex flex-wrap items-center justify-between gap-2.5 sticky top-4 z-40">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedIds([]);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isSelectionMode 
                  ? 'bg-[#C5A880] text-[#1C1B1A] shadow-xs' 
                  : 'bg-neutral-100 dark:bg-[#262422] text-[#1C1B1A] dark:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isSelectionMode ? 'Exit Selection Mode' : 'Selective Batch Delete / Replace'}</span>
            </button>

            {isSelectionMode && (
              <span className="text-xs font-semibold text-[#7A746E] dark:text-[#A8A29D]">
                {selectedIds.length} item{selectedIds.length === 1 ? '' : 's'} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isSelectionMode && selectedIds.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleExecuteBatchDelete}
                  disabled={batchDeleting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{batchDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="px-2.5 py-1.5 rounded-xl text-xs text-[#7A746E] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Workshop Feed: Lazy Loaded Cards with 3:4 Aspect Ratio Photos/Videos at Left, Headline at Right */}
      <div className="space-y-6 sm:space-y-8">
        {finalGroups.map((group, groupIdx) => {
          const groupKey = group.groupKey || group.id;
          const currentActiveSlide = activeSlideMap[groupKey] || 0;
          const currentActiveItem = group.items[currentActiveSlide] || group.items[0];

          const videoCount = group.items.filter((i) => i.type === 'video' || isVideoMedia(i.url, i.title)).length;
          const photoCount = group.items.filter((i) => !(i.type === 'video' || isVideoMedia(i.url, i.title))).length;
          const totalMediaCount = group.items.length;

          const isGridExpanded = !!gridExpandedMap[groupKey];

          return (
            <WorkshopGroupCardItem
              key={groupKey}
              group={group}
              groupIdx={groupIdx}
              currentActiveSlide={currentActiveSlide}
              currentActiveItem={currentActiveItem}
              videoCount={videoCount}
              photoCount={photoCount}
              totalMediaCount={totalMediaCount}
              isGridExpanded={isGridExpanded}
              isSelectionMode={isSelectionMode}
              selectedIds={selectedIds}
              isSellerMode={isSellerMode}
              confirmDeleteGroupKey={confirmDeleteGroupKey}
              onSelectAllGroup={handleSelectAllGroup}
              onOpenUploadModal={onOpenUploadModal}
              onEditGroup={onEditGroup}
              onDeleteGroup={onDeleteGroup}
              setConfirmDeleteGroupKey={setConfirmDeleteGroupKey}
              toggleGridExpand={toggleGridExpand}
              toggleSelectId={toggleSelectId}
              onOpenLightbox={onOpenLightbox}
              handleSetSlide={handleSetSlide}
              onEditItem={onEditItem}
              onDeleteItem={onDeleteItem}
              onReplaceItem={onReplaceItem}
              handleOpenWhatsApp={handleOpenWhatsApp}
            />
          );
        })}
      </div>
    </div>
  );
};
