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
  onToggleSelect
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

  const items = group.items;
  const currentItem = items[activeIndex] || items[0];
  const isVideo = currentItem?.type === 'video';
  const isSelected = currentItem ? selectedIds.includes(currentItem.id) : false;

  useEffect(() => {
    setMediaError(null);
    setDeleteConfirm(false);
    setIsReloading(false);
    if (currentItem) {
      setCurrentUrl(currentItem.url);

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

  return (
    <div className="flex flex-col w-full bg-[#181716] dark:bg-[#121110] p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl border border-[#E8DFD8]/80 dark:border-[#2E2C29] shadow-md">
      
      {/* Main Active Media Display Viewport */}
      <div 
        className="relative w-full h-[320px] sm:h-[380px] lg:h-[430px] rounded-xl sm:rounded-2xl overflow-hidden bg-black flex items-center justify-center group cursor-pointer select-none"
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

        {/* Video / Photo Render or Fallback */}
        {mediaError ? (
          /* Error Fallback Card with Reload Media Button */
          <div className="flex flex-col items-center justify-center p-6 text-center text-white max-w-md z-10 animate-fade-in">
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
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              src={currentUrl || currentItem.url}
              poster={getWorkshopEmbeddedFallback(currentItem.thumbnailUrl || currentItem.url) || currentItem.thumbnailUrl || undefined}
              playsInline
              loop
              autoPlay
              muted={isMuted}
              preload="auto"
              onPlay={() => {
                setIsPlaying(true);
                setMediaError(null);
              }}
              onPause={() => setIsPlaying(false)}
              onError={async () => {
                // If failed, attempt auto-revival from storage before presenting error
                try {
                  const recovered = await refetchWorkshopMediaFromStorage(currentItem);
                  if (recovered && recovered !== currentUrl && recovered !== currentItem.url) {
                    setCurrentUrl(recovered);
                    return;
                  }
                } catch {}
                setMediaError('Video could not be streamed. Please check network connection or reload media.');
              }}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
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
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={currentUrl || currentItem.thumbnailUrl || currentItem.url}
              alt={currentItem.title}
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
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
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
              title="Previous moment"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all transform hover:scale-110 cursor-pointer shadow-lg"
              title="Next moment"
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
      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-full">
          {items.map((item, idx) => {
            const isThumbActive = idx === activeIndex;
            const isThumbVideo = item.type === 'video';
            const isThumbSelected = selectedIds.includes(item.id);
            const thumbSrc = item.thumbnailUrl || item.url || '/workshops/pipe sunflower training.jpeg';

            return (
              <button
                key={item.id || `thumb_${idx}`}
                type="button"
                onClick={() => onSelectIndex(idx)}
                className={`relative shrink-0 w-11 h-11 sm:w-13 sm:h-13 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                  isThumbActive
                    ? 'border-[#C5A880] scale-105 shadow-md shadow-[#C5A880]/30 ring-2 ring-[#C5A880]/50'
                    : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/50'
                }`}
                title={`${isThumbVideo ? 'Video' : 'Photo'} ${idx + 1}: ${item.title}`}
              >
                <img
                  src={thumbSrc}
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
          {items.length} moments
        </span>
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
  const [activeSlideMap, setActiveSlideMap] = useState<Record<string, number>>({});
  const [gridExpandedMap, setGridExpandedMap] = useState<Record<string, boolean>>({});
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [confirmDeleteGroupKey, setConfirmDeleteGroupKey] = useState<string | null>(null);

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
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected photos/videos?`)) {
      return;
    }

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

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Sticky Batch Selection Bar when items are selected */}
      {isSellerMode && (
        <div className="bg-white dark:bg-[#1C1B1A] border border-[#C5A880]/30 rounded-2xl p-3 shadow-md flex flex-wrap items-center justify-between gap-3 sticky top-4 z-40">
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

      {groups.map((group, groupIdx) => {
        const groupKey = group.groupKey || group.id;
        const currentActiveSlide = activeSlideMap[groupKey] || 0;
        const currentActiveItem = group.items[currentActiveSlide] || group.items[0];

        const videoCount = group.items.filter((i) => i.type === 'video').length;
        const photoCount = group.items.filter((i) => i.type === 'image').length;
        const totalMediaCount = group.items.length;

        // Alternating layout: Group 0: Media Left, Group 1: Media Right, Group 2: Media Left
        const isMediaOnRight = groupIdx % 2 === 1;
        const isGridExpanded = !!gridExpandedMap[groupKey];

        return (
          <div
            key={groupKey}
            id={`workshop-group-${groupKey}`}
            className="relative bg-white dark:bg-[#1A1918] rounded-2xl sm:rounded-3xl border border-[#E8DFD8] dark:border-[#2A2825] shadow-sm hover:shadow-md transition-shadow overflow-hidden p-4 sm:p-6"
          >
            {/* Top Accent Gradient Border */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-linear-to-r from-[#C5A880] via-[#8C5D36] to-[#C5A880]" />

            {/* Workshop Top Banner: Batch Badge, Stats & Action CTAs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-4 border-b border-[#F0EBE5] dark:border-[#262422]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#C5A880]/20 text-[#8C5D36] dark:text-[#E6CA9E] border border-[#C5A880]/30">
                  <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>{group.badge || `Workshop #${groupIdx + 1}`}</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-[#262422] text-[#5E5955] dark:text-[#C4BCB5]">
                  {totalMediaCount === 0 ? (
                    <span>Upcoming Batch • Open for Registration</span>
                  ) : (
                    <>
                      {videoCount > 0 && (
                        <>
                          <span>{videoCount} Video{videoCount > 1 ? 's' : ''}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{photoCount} Photo{photoCount > 1 ? 's' : ''}</span>
                      <span>({totalMediaCount} Moments)</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isSelectionMode && (
                  <button
                    type="button"
                    onClick={() => handleSelectAllGroup(group)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span>Select All in Workshop</span>
                  </button>
                )}

                {isSellerMode && onOpenUploadModal && (
                  <button
                    type="button"
                    onClick={() => onOpenUploadModal(groupKey)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#C5A880] hover:bg-[#b8986c] text-[#1C1B1A] text-xs font-bold transition-all cursor-pointer shadow-xs"
                    title="Upload photos or videos for this workshop"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Media</span>
                  </button>
                )}

                {isSellerMode && onEditGroup && (
                  <button
                    type="button"
                    onClick={() => onEditGroup(group)}
                    className="p-1.5 rounded-xl bg-neutral-100 dark:bg-[#262422] hover:bg-neutral-200 text-[#5E5955] dark:text-[#C4BCB5] transition-colors cursor-pointer"
                    title="Edit workshop title, description & details"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#C5A880]" />
                  </button>
                )}

                {isSellerMode && onDeleteGroup && (
                  confirmDeleteGroupKey === groupKey ? (
                    <div className="flex items-center gap-1.5 bg-red-500/10 dark:bg-red-950/40 p-1 rounded-xl border border-red-500/30 animate-fade-in">
                      <span className="text-[11px] text-red-500 dark:text-red-400 font-bold px-1">Delete?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteGroup(group);
                          setConfirmDeleteGroupKey(null);
                        }}
                        className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold cursor-pointer transition-all shadow-xs"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteGroupKey(null)}
                        className="px-1.5 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-[11px] text-[#736C65] dark:text-[#A8A29D] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteGroupKey(groupKey)}
                      className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 transition-colors cursor-pointer"
                      title="Delete workshop"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )
                )}

                {/* Grid View Toggle */}
                <button
                  type="button"
                  onClick={() => toggleGridExpand(groupKey)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isGridExpanded
                      ? 'bg-[#1C1B1A] text-white dark:bg-white dark:text-[#1C1B1A]'
                      : 'bg-neutral-100 dark:bg-[#262422] text-[#5E5955] dark:text-[#C4BCB5]'
                  }`}
                  title={isGridExpanded ? 'Switch to Storytelling Slider' : 'View All Photos/Videos at once'}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>{isGridExpanded ? 'Story View' : 'Grid View'}</span>
                </button>
              </div>
            </div>

            {/* If Grid View is Expanded: Show All Photos & Videos at Once in Responsive Grid */}
            {isGridExpanded ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {group.items.map((item, itemIdx) => {
                    const isVid = item.type === 'video';
                    const isItemSel = selectedIds.includes(item.id);

                    return (
                      <div
                        key={item.id || `grid_item_${itemIdx}`}
                        className={`relative rounded-xl overflow-hidden bg-black/5 dark:bg-black/40 border border-[#E8DFD8] dark:border-white/10 group flex flex-col ${
                          isItemSel ? 'ring-3 ring-[#C5A880]' : ''
                        }`}
                      >
                        {/* Thumbnail Viewport */}
                        <div 
                          className="relative aspect-4/3 w-full overflow-hidden bg-black cursor-pointer"
                          onClick={() => {
                            if (isSelectionMode) {
                              toggleSelectId(item.id);
                            } else {
                              onOpenLightbox(group.items, itemIdx);
                            }
                          }}
                        >
                          <img
                            src={item.thumbnailUrl || item.url || '/workshops/pipe sunflower training.jpeg'}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Checkbox overlay */}
                          {isSelectionMode && (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectId(item.id);
                              }}
                              className="absolute top-2 left-2 z-30 p-1 rounded-md bg-black/80 text-white"
                            >
                              {isItemSel ? (
                                <CheckSquare className="w-4 h-4 text-[#C5A880]" />
                              ) : (
                                <Square className="w-4 h-4 text-white/70" />
                              )}
                            </div>
                          )}

                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-black/80 text-white flex items-center gap-1">
                            {isVid ? <Video className="w-3 h-3 text-[#E6CA9E]" /> : <Camera className="w-3 h-3 text-[#E6CA9E]" />}
                            <span>{isVid ? 'Video' : 'Photo'}</span>
                          </span>

                          {isSellerMode && !isSelectionMode && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                              {onReplaceItem && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReplaceItem(item);
                                  }}
                                  className="p-1 rounded-md bg-black/80 hover:bg-black text-white"
                                  title="Replace"
                                >
                                  <Repeat className="w-3 h-3 text-[#E6CA9E]" />
                                </button>
                              )}
                              {onEditItem && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditItem(item);
                                  }}
                                  className="p-1 rounded-md bg-black/80 hover:bg-black text-white"
                                  title="Edit"
                                >
                                  <Edit3 className="w-3 h-3 text-[#C5A880]" />
                                </button>
                              )}
                              {onDeleteItem && (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Delete "${item.title}"?`)) {
                                      await deleteWorkshopMediaItem(item.id);
                                      onDeleteItem(item);
                                    }
                                  }}
                                  className="p-1 rounded-md bg-red-900 hover:bg-red-800 text-white"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Title and details */}
                        <div className="p-2.5 flex-1 flex flex-col justify-between">
                          <h5 className="font-semibold text-xs line-clamp-1">{item.title}</h5>
                          <p className="text-[11px] text-[#7A746E] dark:text-[#A8A29D] line-clamp-1 mt-0.5">{item.craftTechnique || item.caption}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Storytelling View: Side-by-Side Alternating Format */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-7 items-center">
                
                {/* Media Player Viewport */}
                <div className={`lg:col-span-6 ${isMediaOnRight ? 'lg:order-2' : 'lg:order-1'}`}>
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
                  />
                </div>

                {/* Narrative & Active Moment Card */}
                <div className={`lg:col-span-6 flex flex-col justify-center ${isMediaOnRight ? 'lg:order-1' : 'lg:order-2'}`}>
                  
                  {/* Workshop Title */}
                  <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#1C1B1A] dark:text-white leading-tight mb-2">
                    {group.title}
                  </h3>

                  {/* Active Moment Story Card */}
                  {currentActiveItem ? (
                    <div className="p-4 rounded-2xl bg-[#F7F4EE] dark:bg-[#141312] border border-[#E8DFD8] dark:border-[#262422] mb-3.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C5D36] dark:text-[#E6CA9E]">
                          Moment #{currentActiveSlide + 1}: {currentActiveItem.type === 'video' ? '🎬 Live Video Session' : '📷 High-Res Craft Photo'}
                        </span>
                      </div>

                      <h4 className="font-serif text-base font-bold text-[#1C1B1A] dark:text-white mb-1.5">
                        {currentActiveItem.title}
                      </h4>

                      <p className="text-xs text-[#5E5955] dark:text-[#C4BCB5] leading-relaxed mb-3">
                        {currentActiveItem.caption}
                      </p>

                      {currentActiveItem.craftTechnique && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#C5A880]/15 text-[#8C5D36] dark:text-[#E6CA9E] text-xs font-semibold">
                          <Sparkles className="w-3 h-3 text-[#C5A880]" />
                          <span>Technique: {currentActiveItem.craftTechnique}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-[#F7F4EE] dark:bg-[#141312] border border-[#E8DFD8] dark:border-[#262422] mb-3.5 shadow-2xs">
                      <div className="flex items-center gap-2 mb-2 text-[#8C5D36] dark:text-[#E6CA9E] text-[11px] font-bold uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                        <span>Workshop Details & Registration</span>
                      </div>
                      <p className="text-xs text-[#5E5955] dark:text-[#C4BCB5] leading-relaxed mb-3">
                        {group.description || 'Hands-on practical workshop led by Sahina Shrestha in Kathmandu.'}
                      </p>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 text-xs font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Accepting Inquiries • Small Batch Size</span>
                      </div>
                    </div>
                  )}

                  {/* Date, Location & Instructor Metas */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2.5 border-t border-[#F0EBE5] dark:border-[#262422] text-xs text-[#7A746E] dark:text-[#A8A29D] mb-4">
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
                      <span className="truncate">{group.date || 'Starting Soon'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
                      <span className="truncate">{group.location || 'Kathmandu Studio'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate col-span-2 sm:col-span-1">
                      <Users className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
                      <span className="truncate">{group.attendeesCount || 15} Seats</span>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp(group)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold uppercase tracking-wider transition-all transform active:scale-98 cursor-pointer shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-white" />
                      <span>Register on WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenLightbox(group.items, currentActiveSlide)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-[#262422] hover:bg-neutral-200 text-[#1C1B1A] dark:text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>Full HD Theater</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
