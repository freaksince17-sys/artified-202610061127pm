import React, { useState, useRef } from 'react';
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
  AlertTriangle,
  ArrowRight,
  Plus
} from 'lucide-react';
import { WorkshopMediaItem } from '../types';
import { useCart } from '../context/CartContext';
import { deleteWorkshopMediaItem } from '../data/workshops';

interface WorkshopAlternatingFeedProps {
  items: WorkshopMediaItem[];
  onSelectItem: (item: WorkshopMediaItem, index: number) => void;
  onEditItem?: (item: WorkshopMediaItem) => void;
  onDeleteItem?: (item: WorkshopMediaItem) => void;
  onOpenUploadModal?: () => void;
  emptyMessage?: string;
}

/**
 * Individual Video Card with smooth Hover-to-Play functionality
 */
const WorkshopVideoHoverCard: React.FC<{
  item: WorkshopMediaItem;
  onClick: () => void;
}> = ({ item, onClick }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay prevented or aborted
            setIsPlaying(false);
          });
      }
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <div
      className="relative w-full h-full min-h-[320px] sm:min-h-[400px] lg:min-h-[460px] rounded-3xl overflow-hidden bg-[#151413] shadow-lg group cursor-pointer border border-[#E8DFD8]/80 dark:border-[#2E2C29]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <video
        ref={videoRef}
        src={item.url}
        poster={item.thumbnailUrl || undefined}
        muted={isMuted}
        playsInline
        loop
        preload="metadata"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* Gradient vignette for contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none transition-opacity duration-300 group-hover:opacity-60" />

      {/* Top Media Tags */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-[#FAF8F5] border border-white/20 shadow-md">
          <Video className="w-3.5 h-3.5 text-[#E6CA9E]" />
          <span>Workshop Video</span>
          {item.duration && <span className="text-white/70 font-mono ml-1">{item.duration}</span>}
        </span>

        {isPlaying && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#25D366]/90 text-white backdrop-blur-md animate-pulse shadow-md">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Hover Previewing</span>
          </span>
        )}
      </div>

      {/* Hover preview cue / Play Button overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-300">
        {!isPlaying ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md text-white border-2 border-white/40 flex items-center justify-center shadow-2xl transition-transform duration-300 transform group-hover:scale-115 group-hover:bg-[#C5A880] group-hover:text-[#1C1B1A]">
              <Play className="w-7 h-7 fill-current ml-1" />
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-black/60 text-white/90 backdrop-blur-xs border border-white/10 opacity-90 group-hover:opacity-100 transition-opacity">
              Hover to preview • Click to expand
            </span>
          </div>
        ) : null}
      </div>

      {/* Bottom overlay bar with audio toggle and expand button */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
        <button
          type="button"
          onClick={toggleMute}
          className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#E6CA9E]" />}
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-all">
          <Maximize2 className="w-3.5 h-3.5 text-[#E6CA9E]" />
          <span>Full Theater Mode</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Individual Photo Card with zoom and lightbox trigger
 */
const WorkshopPhotoCard: React.FC<{
  item: WorkshopMediaItem;
  onClick: () => void;
}> = ({ item, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="relative w-full h-full min-h-[320px] sm:min-h-[400px] lg:min-h-[460px] rounded-3xl overflow-hidden bg-[#151413] shadow-lg group cursor-pointer border border-[#E8DFD8]/80 dark:border-[#2E2C29]"
    >
      <img
        src={item.thumbnailUrl || item.url}
        alt={item.title}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* Gradient vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/30 pointer-events-none transition-opacity duration-300 group-hover:opacity-60" />

      {/* Top Media Tag */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-[#FAF8F5] border border-white/20 shadow-md">
          <Camera className="w-3.5 h-3.5 text-[#E6CA9E]" />
          <span>Masterclass Photo</span>
        </span>

        {item.featured && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#C5A880] text-[#1C1B1A] shadow-md">
            <Sparkles className="w-3 h-3" />
            <span>Highlight</span>
          </span>
        )}
      </div>

      {/* Center expand cue on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/30 flex items-center justify-center transform group-hover:scale-110 transition-transform">
          <Maximize2 className="w-6 h-6 text-[#E6CA9E]" />
        </div>
      </div>

      {/* Bottom info banner */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
        <span className="text-xs text-white/80 backdrop-blur-xs px-2.5 py-1 rounded-lg bg-black/40 border border-white/10">
          Kathmandu, Nepal
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-white font-semibold backdrop-blur-xs px-2.5 py-1 rounded-lg bg-black/50 border border-white/15">
          <Maximize2 className="w-3 h-3 text-[#E6CA9E]" />
          <span>View High-Res</span>
        </span>
      </div>
    </div>
  );
};

export const WorkshopAlternatingFeed: React.FC<WorkshopAlternatingFeedProps> = ({
  items,
  onSelectItem,
  onEditItem,
  onDeleteItem,
  onOpenUploadModal,
  emptyMessage = 'No workshop media found matching your filter.'
}) => {
  const { isSellerMode } = useCart();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteItem = async (item: WorkshopMediaItem) => {
    setIsDeleting(true);
    try {
      await deleteWorkshopMediaItem(item.id);
      if (onDeleteItem) {
        onDeleteItem(item);
      }
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete workshop media:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const openWhatsApp = (item: WorkshopMediaItem) => {
    const phone = '9779767573721';
    const message = encodeURIComponent(
      `Namaste Sahina Shrestha! ✨ I am viewing "${item.title}" (${item.craftTechnique}) in the workshop gallery on your website. I'd love to join your next handcrafting masterclass in Kathmandu!`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white dark:bg-[#1A1918] rounded-3xl border border-[#E8DFD8] dark:border-[#2E2C29] max-w-lg mx-auto my-8">
        <Sparkles className="w-12 h-12 text-[#C5A880] mx-auto mb-3 opacity-60" />
        <h4 className="font-serif text-xl font-bold text-[#1C1B1A] dark:text-[#FAF8F5] mb-2">
          No Workshop Moments Found
        </h4>
        <p className="text-xs sm:text-sm text-[#736C65] dark:text-[#A69E96] mb-6">
          {emptyMessage}
        </p>
        {isSellerMode && onOpenUploadModal && (
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C5A880] hover:bg-[#b8986c] text-[#1C1B1A] text-xs font-bold uppercase tracking-wider transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Upload First Workshop Memory</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-10 sm:space-y-14 lg:space-y-18">
      {/* Seller Management Bar when in Seller Mode */}
      {isSellerMode && (
        <div className="bg-gradient-to-r from-[#C5A880]/15 via-[#8C5D36]/10 to-[#C5A880]/15 border border-[#C5A880]/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-[#C5A880] text-[#1C1B1A]">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-[#1C1B1A] dark:text-white">
                Seller Workshop Manager Active
              </h4>
              <p className="text-xs text-[#736C65] dark:text-[#A69E96]">
                You can directly upload new photos/videos or delete/edit any workshop entry below.
              </p>
            </div>
          </div>

          {onOpenUploadModal && (
            <button
              type="button"
              onClick={onOpenUploadModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1C1B1A] dark:bg-white text-white dark:text-[#1C1B1A] hover:bg-[#333] dark:hover:bg-neutral-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shrink-0"
            >
              <Plus className="w-4 h-4 text-[#C5A880]" />
              <span>Upload New Photo / Video</span>
            </button>
          )}
        </div>
      )}

      {/* Alternating Zig-Zag Feed */}
      {items.map((item, index) => {
        // Alternating logic:
        // Even index (0, 2, 4...) -> Media on Left, Explanation on Right
        // Odd index (1, 3, 5...)  -> Media on Right, Explanation on Left
        const isMediaOnRight = index % 2 === 1;
        const isVideo = item.type === 'video';

        return (
          <article
            key={item.id}
            className="group relative bg-white dark:bg-[#161514] rounded-3xl sm:rounded-[32px] border border-[#E8DFD8] dark:border-[#262422] p-4 sm:p-7 lg:p-8 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden"
          >
            {/* Subtle corner accent */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#C5A880]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-stretch">
              
              {/* Media Container Column */}
              <div
                className={`w-full lg:col-span-6 flex flex-col justify-center ${
                  isMediaOnRight ? 'order-1 lg:order-2' : 'order-1 lg:order-1'
                }`}
              >
                {isVideo ? (
                  <WorkshopVideoHoverCard
                    item={item}
                    onClick={() => onSelectItem(item, index)}
                  />
                ) : (
                  <WorkshopPhotoCard
                    item={item}
                    onClick={() => onSelectItem(item, index)}
                  />
                )}
              </div>

              {/* Explanation & Story Column */}
              <div
                className={`w-full lg:col-span-6 flex flex-col justify-between py-1 sm:py-2 ${
                  isMediaOnRight ? 'order-2 lg:order-1' : 'order-2 lg:order-2'
                }`}
              >
                <div>
                  {/* Top Metadata Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FAF8F5] dark:bg-[#201E1C] text-[#8C5D36] dark:text-[#E6CA9E] border border-[#E8DFD8] dark:border-[#2E2C29]">
                        Moment #{String(index + 1).padStart(2, '0')}
                      </span>

                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#736C65] dark:text-[#9E9790]">
                        <Calendar className="w-3 h-3 text-[#C5A880]" />
                        <span>{item.date || 'Sep 2026'}</span>
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] text-[#736C65] dark:text-[#9E9790]">
                      <MapPin className="w-3 h-3 text-[#C5A880]" />
                      <span>{item.location || 'Kathmandu, Nepal'}</span>
                    </span>
                  </div>

                  {/* Craft Technique Badge */}
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#C5A880]/15 text-[#8C5D36] dark:text-[#E6CA9E] border border-[#C5A880]/30">
                      <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>{item.craftTechnique || 'Handcrafted Technique'}</span>
                    </span>
                  </div>

                  {/* Main Title */}
                  <h3 className="font-serif text-2xl sm:text-3xl lg:text-3xl font-bold text-[#1C1B1A] dark:text-[#FAF8F5] tracking-tight leading-snug mb-3">
                    {item.title}
                  </h3>

                  {/* Workshop Batch Subtitle */}
                  {item.batchName && (
                    <p className="text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-3">
                      {item.batchName} • Masterclass with {item.instructor || 'Sahina Shrestha'}
                    </p>
                  )}

                  {/* Detailed Story & Explanation */}
                  <div className="bg-[#FAF8F5] dark:bg-[#121110] p-4 sm:p-5 rounded-2xl border border-[#E8DFD8] dark:border-[#262422] mb-5">
                    <p className="text-xs sm:text-sm text-[#5E5955] dark:text-[#D5CFC9] leading-relaxed">
                      {item.caption}
                    </p>
                  </div>

                  {/* Workshop Stats & Highlights */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-5">
                    <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-[#1A1918] border border-[#E8DFD8]/60 dark:border-[#2E2C29]">
                      <span className="text-[10px] text-[#736C65] dark:text-[#9E9790] block">
                        Attendees
                      </span>
                      <span className="text-xs font-bold text-[#1C1B1A] dark:text-white flex items-center gap-1 mt-0.5">
                        <Users className="w-3.5 h-3.5 text-[#C5A880]" />
                        {item.attendeesCount || 18} Candidates
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-[#1A1918] border border-[#E8DFD8]/60 dark:border-[#2E2C29]">
                      <span className="text-[10px] text-[#736C65] dark:text-[#9E9790] block">
                        Lead Instructor
                      </span>
                      <span className="text-xs font-bold text-[#1C1B1A] dark:text-white flex items-center gap-1 mt-0.5 truncate">
                        <Award className="w-3.5 h-3.5 text-[#C5A880]" />
                        {item.instructor || 'Sahina Shrestha'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-[#1A1918] border border-[#E8DFD8]/60 dark:border-[#2E2C29] col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-[#736C65] dark:text-[#9E9790] block">
                        Experience
                      </span>
                      <span className="text-xs font-bold text-[#1C1B1A] dark:text-white flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#25D366]" />
                        100% Practical
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {item.tags.map((t, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2.5 py-0.5 rounded-lg bg-neutral-100 dark:bg-[#201E1C] text-[11px] text-[#736C65] dark:text-[#A69E96]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions Row */}
                <div className="pt-4 border-t border-[#E8DFD8] dark:border-[#262422] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => openWhatsApp(item)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold uppercase tracking-wider transition-all transform active:scale-98 cursor-pointer shadow-md shadow-[#25D366]/20"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>Inquire About This Technique</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectItem(item, index)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#201E1C] dark:hover:bg-[#2C2926] text-[#1C1B1A] dark:text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>Expand View</span>
                    </button>
                  </div>

                  {/* Seller Action Buttons */}
                  {isSellerMode && (
                    <div className="flex items-center gap-2 shrink-0">
                      {onEditItem && (
                        <button
                          type="button"
                          onClick={() => onEditItem(item)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#201E1C] dark:hover:bg-[#2C2926] text-xs font-semibold text-[#1C1B1A] dark:text-white transition-colors cursor-pointer border border-[#E8DFD8] dark:border-[#2E2C29]"
                          title="Edit media details"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#C5A880]" />
                          <span>Edit</span>
                        </button>
                      )}

                      {deleteConfirmId === item.id ? (
                        <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 p-1 rounded-xl border border-red-200 dark:border-red-800">
                          <span className="text-[11px] text-red-600 dark:text-red-400 font-medium px-1">
                            Delete?
                          </span>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDeleteItem(item)}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            {isDeleting ? '...' : 'Yes, Remove'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-neutral-200 dark:bg-neutral-800 text-[#1C1B1A] dark:text-white text-[11px] rounded-lg transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/60 text-xs font-semibold text-red-600 dark:text-red-400 transition-colors cursor-pointer border border-red-200 dark:border-red-900/40"
                          title="Remove this photo/video from workshop"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};
