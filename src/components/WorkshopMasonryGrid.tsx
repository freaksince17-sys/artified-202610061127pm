import React, { useRef, useState } from 'react';
import { 
  Play, 
  Camera, 
  Video, 
  MapPin, 
  Calendar, 
  Award, 
  Sparkles, 
  Eye, 
  Heart,
  Maximize2,
  Trash2,
  Edit3,
  Volume2,
  VolumeX
} from 'lucide-react';
import { WorkshopMediaItem } from '../types';
import { useCart } from '../context/CartContext';
import { deleteWorkshopMediaItem } from '../data/workshops';

interface WorkshopMasonryGridProps {
  items: WorkshopMediaItem[];
  onSelectItem: (item: WorkshopMediaItem, index: number) => void;
  onEditItem?: (item: WorkshopMediaItem) => void;
  onDeleteItem?: (item: WorkshopMediaItem) => void;
  emptyMessage?: string;
}

const MasonryVideoHoverCard: React.FC<{
  item: WorkshopMediaItem;
  aspectClass: string;
}> = ({ item, aspectClass }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div 
      className={`relative w-full overflow-hidden bg-[#201E1C] ${aspectClass}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={item.url}
        poster={item.thumbnailUrl || undefined}
        muted
        playsInline
        loop
        preload="metadata"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Gradient Shadow Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none" />

      {/* Top Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/70 backdrop-blur-md text-white border border-white/20">
          <Video className="w-3 h-3 text-[#E6CA9E]" />
          <span>VIDEO</span>
          {item.duration && <span className="opacity-80 font-mono ml-0.5">{item.duration}</span>}
        </span>

        {isPlaying ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#25D366] text-white shadow-xs animate-pulse">
            <span>Hovering Preview</span>
          </span>
        ) : item.featured ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#C5A880] text-[#1C1B1A] shadow-xs">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Highlight</span>
          </span>
        ) : null}
      </div>

      {/* Center Play Button Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/30 transition-transform duration-300 transform group-hover:scale-115 group-hover:bg-[#C5A880] group-hover:text-[#1C1B1A]">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
      )}

      {/* Fullscreen Expand Icon on Hover */}
      <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
        <span className="p-1.5 rounded-full bg-black/60 text-white backdrop-blur-xs flex items-center justify-center hover:bg-black/90">
          <Maximize2 className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* Bottom Overlay Text on Thumbnail */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/20 backdrop-blur-md text-white">
            {item.craftTechnique}
          </span>
        </div>
        <h4 className="text-white font-serif text-sm font-bold line-clamp-2 drop-shadow-xs leading-snug">
          {item.title}
        </h4>
      </div>
    </div>
  );
};

export const WorkshopMasonryGrid: React.FC<WorkshopMasonryGridProps> = ({
  items,
  onSelectItem,
  onEditItem,
  onDeleteItem,
  emptyMessage = 'No workshop media found matching your filter.'
}) => {
  const { isSellerMode } = useCart();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent, item: WorkshopMediaItem) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await deleteWorkshopMediaItem(item.id);
      if (onDeleteItem) {
        onDeleteItem(item);
      }
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white dark:bg-[#1A1918] rounded-2xl border border-[#E8DFD8] dark:border-[#2E2C29] max-w-md mx-auto my-6">
        <Sparkles className="w-10 h-10 text-[#C5A880] mx-auto mb-3 opacity-60" />
        <h4 className="font-serif text-lg font-medium text-[#1C1B1A] dark:text-[#F5F2EB] mb-1">
          No Moments Found
        </h4>
        <p className="text-xs text-[#736C65] dark:text-[#A69E96]">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Responsive Masonry Layout */}
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4 [column-fill:_balance]">
        {items.map((item, index) => {
          const isVideo = item.type === 'video';
          const aspectClass = item.aspectRatio === 'vertical' 
            ? 'aspect-[9/14]' 
            : item.aspectRatio === 'horizontal' 
            ? 'aspect-[16/10]' 
            : 'aspect-square';

          return (
            <div
              key={item.id}
              onClick={() => onSelectItem(item, index)}
              className="break-inside-avoid group relative rounded-2xl overflow-hidden bg-white dark:bg-[#171615] border border-[#E8DFD8] dark:border-[#2E2C29] shadow-xs hover:shadow-xl hover:border-[#C5A880]/60 transition-all duration-300 cursor-pointer flex flex-col"
            >
              {/* Media Container with Hover to Play for videos */}
              {isVideo ? (
                <MasonryVideoHoverCard item={item} aspectClass={aspectClass} />
              ) : (
                <div className={`relative w-full overflow-hidden bg-[#201E1C] ${aspectClass}`}>
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Gradient Shadow Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/70 backdrop-blur-md text-white border border-white/20">
                      <Camera className="w-3 h-3 text-[#E6CA9E]" />
                      <span>PHOTO</span>
                    </span>

                    {item.featured && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#C5A880] text-[#1C1B1A] shadow-xs">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Highlight</span>
                      </span>
                    )}
                  </div>

                  {/* Fullscreen Expand Icon on Hover */}
                  <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <span className="p-1.5 rounded-full bg-black/60 text-white backdrop-blur-xs flex items-center justify-center hover:bg-black/90">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  {/* Bottom Overlay Text on Thumbnail */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 pointer-events-none">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/20 backdrop-blur-md text-white">
                        {item.craftTechnique}
                      </span>
                    </div>
                    <h4 className="text-white font-serif text-sm font-bold line-clamp-2 drop-shadow-xs leading-snug">
                      {item.title}
                    </h4>
                  </div>
                </div>
              )}

              {/* Card Footer Info */}
              <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-grow bg-white dark:bg-[#1A1918]">
                <p className="text-[11px] text-[#55504A] dark:text-[#BDB7AF] line-clamp-2 mb-2 leading-relaxed font-normal">
                  {item.caption}
                </p>

                <div className="pt-2 border-t border-[#F0EBE5] dark:border-[#2A2825] flex items-center justify-between text-[10px] text-[#736C65] dark:text-[#9E9790]">
                  <div className="flex items-center gap-1 truncate font-medium">
                    <MapPin className="w-3 h-3 text-[#C5A880] shrink-0" />
                    <span className="truncate">{item.batchName || item.workshopTitle}</span>
                  </div>

                  {/* Seller Controls inside Card */}
                  {isSellerMode ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {onEditItem && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditItem(item);
                          }}
                          className="p-1 text-[#736C65] hover:text-[#1C1B1A] dark:hover:text-white rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          title="Edit"
                        >
                          <Edit3 className="w-3 h-3 text-[#C5A880]" />
                        </button>
                      )}

                      {deleteConfirmId === item.id ? (
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={(e) => handleDelete(e, item)}
                          className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded-md"
                        >
                          {isDeleting ? '...' : 'Del'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(item.id);
                          }}
                          className="p-1 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      {item.views && (
                        <span className="flex items-center gap-1 font-medium hidden sm:flex">
                          <Eye className="w-3 h-3 text-[#A69E96]" />
                          <span>{item.views}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
