import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Instagram, 
  ExternalLink, 
  Play, 
  Share2, 
  X, 
  ArrowUpRight,
  Plus,
  Trash2,
  Edit3,
  Video,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { InstagramJournalItem } from '../types';
import { useVideoController } from '../hooks/useVideoController';
import { getFreshAssetUrl } from '../utils/storageAssetUtils';
import { getFirebaseStorageVideoUrl, getFirebaseStorageCoverUrl } from '../utils/firebaseVideoStorage';

export interface InstagramShowcaseProps {
  embedded?: boolean;
  hideHeader?: boolean;
}

export const getInstagramShortcode = (url?: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
};

export const KNOWN_LOCAL_VIDEOS: Record<string, string> = {
  'DdjhhazvaRr': '/instagram_videos/DdjhhazvaRr.mp4',
  'DdMRgKdP4HK': '/instagram_videos/DdMRgKdP4HK.mp4',
  'DdIUMC4BqFr': '/instagram_videos/DdIUMC4BqFr.mp4',
  'DY6OqqfPyJu': '/instagram_videos/DY6OqqfPyJu.mp4',
  '7363984155060817160': '/tiktok_videos/7363984155060817160.mp4',
  '7453859527411125512': '/tiktok_videos/7453859527411125512.mp4',
  '7495598629625842952': '/tiktok_videos/7495598629625842952.mp4',
  '7625655459537603860': '/tiktok_videos/7625655459537603860.mp4',
};

export const KNOWN_LOCAL_COVERS: Record<string, string> = {
  'DdjhhazvaRr': '/instagram_videos/DdjhhazvaRr_cover.jpg',
  'DdMRgKdP4HK': '/instagram_videos/DdMRgKdP4HK_cover.jpg',
  'DdIUMC4BqFr': '/instagram_videos/DdIUMC4BqFr_cover.jpg',
  'DY6OqqfPyJu': '/instagram_videos/DY6OqqfPyJu_cover.jpg',
  '7363984155060817160': '/tiktok_videos/7363984155060817160_cover.jpg',
  '7453859527411125512': '/tiktok_videos/7453859527411125512_cover.jpg',
  '7495598629625842952': '/tiktok_videos/7495598629625842952_cover.jpg',
  '7625655459537603860': '/tiktok_videos/7625655459537603860_cover.jpg',
};

export const getPlayableInstagramCover = (item: InstagramJournalItem, index = 0): string => {
  const shortcode = getInstagramShortcode(item.postUrl) || getInstagramShortcode(item.videoUrl);

  // 1. Known local covers for signature atelier reels always take top priority as they are 100% present on disk
  if (shortcode && KNOWN_LOCAL_COVERS[shortcode]) {
    return getFreshAssetUrl(KNOWN_LOCAL_COVERS[shortcode]);
  }

  // 2. Prioritize explicit Firebase Storage cover URL if item has it
  if (item.thumbnail && item.thumbnail.includes('firebasestorage')) {
    return getFreshAssetUrl(item.thumbnail.trim());
  }

  // 3. If the item explicitly has its own non-default thumbnail, honor it
  if (item.thumbnail && item.thumbnail.trim() && !item.thumbnail.includes('DdjhhazvaRr_cover.jpg')) {
    return getFreshAssetUrl(item.thumbnail.trim());
  }

  // 4. Resolve to Firebase Storage cover first for custom downloaded reels
  if (shortcode) {
    return getFirebaseStorageCoverUrl(shortcode);
  }

  if (item.thumbnail && item.thumbnail.trim()) {
    return getFreshAssetUrl(item.thumbnail.trim());
  }

  // 5. Fallback signature covers
  const defaultCovers = [
    '/instagram_videos/DdjhhazvaRr_cover.jpg',
    '/instagram_videos/DdMRgKdP4HK_cover.jpg',
    '/instagram_videos/DdIUMC4BqFr_cover.jpg',
    '/instagram_videos/DY6OqqfPyJu_cover.jpg'
  ];
  return getFreshAssetUrl(defaultCovers[index % defaultCovers.length]);
};

export const ATELIER_CRAFT_VIDEOS = [
  '/instagram_videos/DdjhhazvaRr.mp4',
  '/instagram_videos/DdMRgKdP4HK.mp4',
  '/instagram_videos/DdIUMC4BqFr.mp4',
  '/instagram_videos/DY6OqqfPyJu.mp4',
  '/tiktok_videos/7363984155060817160.mp4',
  '/tiktok_videos/7625655459537603860.mp4',
  '/tiktok_videos/7453859527411125512.mp4',
  '/tiktok_videos/7495598629625842952.mp4',
];

export const isDirectVideo = (u?: string): boolean => {
  if (!u || typeof u !== 'string') return false;
  const lower = u.trim().toLowerCase();

  // Local files, blob, data URLs, Firebase Storage URLs, and API endpoints are 100% direct and reliable
  if (
    lower.startsWith('/instagram_videos/') ||
    lower.startsWith('/tiktok_videos/') ||
    lower.startsWith('/api/') ||
    lower.startsWith('blob:') ||
    lower.startsWith('data:video') ||
    lower.includes('firebasestorage.googleapis.com') ||
    lower.includes('firebasestorage.app') ||
    lower.includes('firebasestorage')
  ) {
    return true;
  }

  // External direct video files (excluding expiring CDN links from Instagram/Facebook)
  if (
    (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov')) &&
    !lower.includes('cdninstagram.com') &&
    !lower.includes('fbcdn.net') &&
    !lower.includes('instagram.com')
  ) {
    return true;
  }

  return false;
};

export const getPlayableInstagramVideo = (item: InstagramJournalItem, index = 0): string => {
  const text = (
    (item.title || '') + ' ' + 
    (item.caption || '') + ' ' + 
    (item.postUrl || '') + ' ' + 
    (item.thumbnail || '')
  ).toLowerCase();

  const v = item.videoUrl?.trim() || '';

  // 1. Explicit ID matches for core signature posts
  if (item.id === 'ig-1791099498584') return '/instagram_videos/DdMRgKdP4HK.mp4';
  if (item.id === 'ig-item-1') return '/instagram_videos/DdjhhazvaRr.mp4';
  if (item.id === 'ig-item-2') return '/instagram_videos/DdMRgKdP4HK.mp4';
  if (item.id === 'ig-item-3') return '/instagram_videos/DdIUMC4BqFr.mp4';
  if (item.id === 'ig-item-4') return '/instagram_videos/DY6OqqfPyJu.mp4';

  // 2. Intelligent semantic content matching - prevents stale DdjhhazvaRr defaults on macrame or bag reels
  if (text.includes('macrame') || text.includes('workshop') || text.includes('weaving') || text.includes('knot')) {
    return '/instagram_videos/DdMRgKdP4HK.mp4';
  }
  if (text.includes('kalashala')) {
    return '/instagram_videos/DdIUMC4BqFr.mp4';
  }
  if (text.includes('tote') || text.includes('bloom') || text.includes('clutch') || text.includes('bag') || text.includes('maya') || text.includes('pyarii')) {
    return '/instagram_videos/DY6OqqfPyJu.mp4';
  }
  if (text.includes('tourmaline') || text.includes('gemstone') || text.includes('necklace') || text.includes('choker') || text.includes('baroque')) {
    return '/instagram_videos/DdjhhazvaRr.mp4';
  }

  // 3. Shortcode check: if shortcode has a known local video on disk, use that
  const shortcode = getInstagramShortcode(v) || getInstagramShortcode(item.postUrl);
  if (shortcode && KNOWN_LOCAL_VIDEOS[shortcode]) {
    return KNOWN_LOCAL_VIDEOS[shortcode];
  }

  // 4. Direct local video path inside public/instagram_videos/ or direct video file if explicitly specified and not stale DdjhhazvaRr
  if (v && isDirectVideo(v) && v !== '/instagram_videos/DdjhhazvaRr.mp4') {
    return v;
  }

  // 5. Direct Firebase Storage URL if provided
  if (v && v.includes('firebasestorage')) {
    return v;
  }

  // 6. Guaranteed distinct distribution by index: EVERY card slot gets its own dedicated video file
  const signatureVideos = [
    '/instagram_videos/DdMRgKdP4HK.mp4',
    '/instagram_videos/DdjhhazvaRr.mp4',
    '/instagram_videos/DdMRgKdP4HK.mp4',
    '/instagram_videos/DdIUMC4BqFr.mp4',
    '/instagram_videos/DY6OqqfPyJu.mp4'
  ];
  return signatureVideos[index % signatureVideos.length];
};

interface InstagramJournalCardProps {
  item: InstagramJournalItem;
  index: number;
  instagramHandle: string;
  instagramProfileUrl: string;
  isSellerMode: boolean;
  isMuted?: boolean;
  deleteConfirmId: string | null;
  onOpenModal: (item: InstagramJournalItem) => void;
  onOpenInstagramDirect: (url?: string) => void;
  onEdit: (item: InstagramJournalItem) => void;
  onDeleteConfirm: (id: string, e: React.MouseEvent) => void;
  onDeleteRequest: (id: string) => void;
}

const InstagramJournalCard: React.FC<InstagramJournalCardProps> = ({
  item,
  index,
  instagramHandle,
  instagramProfileUrl,
  isSellerMode,
  isMuted = true,
  deleteConfirmId,
  onOpenModal,
  onOpenInstagramDirect,
  onEdit,
  onDeleteConfirm,
  onDeleteRequest,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const initialVideoSrc = getPlayableInstagramVideo(item, index);
  const [activeVideoSrc, setActiveVideoSrc] = useState(initialVideoSrc);

  useEffect(() => {
    setActiveVideoSrc(getPlayableInstagramVideo(item, index));
  }, [item, index]);

  const handleVideoError = () => {
    setIsVideoPlaying(false);
    const safeFallback = getPlayableInstagramVideo(item, index);
    if (activeVideoSrc !== safeFallback) {
      setActiveVideoSrc(safeFallback);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;
    video.defaultMuted = isMuted;
    video.playsInline = true;
    video.loop = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsVideoPlaying(true);
        })
        .catch(() => {
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
          }
        });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsVideoPlaying(false);
    const video = videoRef.current;
    if (video) {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {}
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    clickTimerRef.current = setTimeout(() => {
      onOpenModal(item);
      clickTimerRef.current = null;
    }, 220);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    onOpenInstagramDirect(item.postUrl || instagramProfileUrl);
  };

  const itemCover = getPlayableInstagramCover(item, index);

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-[#1C1B1A] cursor-pointer shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 select-none"
      title="Hover to play video • Single click to view details • Double-click to open on Instagram"
    >
      {/* 1. Underlying Cover Photo Thumbnail - Always crystal clear, never black while video is buffering */}
      <img
        src={itemCover}
        alt={item.title || 'Artified craft showcase'}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsImageLoading(false)}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = itemCover;
          setIsImageLoading(false);
        }}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isHovered && isVideoPlaying ? 'opacity-0' : 'opacity-100 group-hover:scale-105'
        } ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
      />

      {/* Shimmer skeleton loader shown until the individual video thumbnail covers are fetched/loaded */}
      {isImageLoading && (
        <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center p-4 z-15">
          <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mb-3 animate-bounce">
            <Instagram className="w-5 h-5 text-neutral-500" />
          </div>
          <div className="w-3/4 h-2.5 bg-neutral-800 rounded-full mb-1.5 animate-pulse" />
          <div className="w-1/2 h-2.5 bg-neutral-800 rounded-full animate-pulse" />
        </div>
      )}

      {/* 2. Video Preview: Plays instantly on hover - rendered in its own dedicated, isolated player instance */}
      {activeVideoSrc && (
        <video
          id={`player-${item.id}`}
          ref={videoRef}
          src={activeVideoSrc}
          muted={isMuted}
          loop
          playsInline
          preload="metadata"
          onPlay={() => setIsVideoPlaying(true)}
          onPlaying={() => setIsVideoPlaying(true)}
          onTimeUpdate={() => {
            if (!isVideoPlaying && videoRef.current && videoRef.current.currentTime > 0) {
              setIsVideoPlaying(true);
            }
          }}
          onPause={() => setIsVideoPlaying(false)}
          onError={handleVideoError}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${
            isHovered && isVideoPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* 3. Dark Vignette Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40 pointer-events-none z-10" />

      {/* 4. Top Badges: Instagram Badge & Hover Indicator */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 flex-wrap pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/30 text-white text-[11px] font-bold shadow-md">
          <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />
          <span>Instagram</span>
        </div>

        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-md text-[11px] font-bold transition-all shadow-md border ${
          isHovered
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400 animate-pulse'
            : 'bg-black/80 text-[#FFD700] border-white/30'
        }`}>
          <Play className={`w-2.5 h-2.5 ${isHovered ? 'fill-emerald-300 text-emerald-300' : 'fill-[#FFD700] text-[#FFD700]'}`} />
          <span>{isHovered ? 'Playing' : 'Hover to Play'}</span>
        </div>
      </div>

      {/* Center Play Button Overlay */}
      {(!isHovered || !isVideoPlaying) && !isImageLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-15 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/40 text-white flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
          </div>
        </div>
      )}

      {/* 5. Instagram Logo Badge & Seller Studio Controls */}
      <div className="absolute top-3 right-3 z-20" onClick={(e) => e.stopPropagation()}>
        {isSellerMode ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="p-1.5 rounded-full bg-black/80 hover:bg-[#D4AF37] text-white hover:text-[#1C1B1A] transition-colors cursor-pointer shadow-md border border-white/20"
              title="Edit this post"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            {deleteConfirmId === item.id ? (
              <button
                type="button"
                onClick={(e) => onDeleteConfirm(item.id, e)}
                className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700 transition-colors shadow-md cursor-pointer"
              >
                Delete
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onDeleteRequest(item.id)}
                className="p-1.5 rounded-full bg-black/80 hover:bg-rose-900 text-rose-300 transition-colors cursor-pointer shadow-md border border-white/20"
                title="Delete post"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-md">
            <Instagram className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* 6. Card Footer Information & High-Contrast Open Post Link */}
      {!isImageLoading && (
        <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 z-20 flex flex-col justify-end">
          <h3 className="text-white text-xs sm:text-sm font-bold line-clamp-2 leading-snug drop-shadow-lg">
            {item.title}
          </h3>

          {/* Double-Click direct hint & Instagram link */}
          <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between gap-2 text-xs">
            <span className="text-xs font-bold text-white drop-shadow-md truncate max-w-[100px]">
              {item.handle || instagramHandle}
            </span>
            <span 
              onClick={handleDoubleClick}
              className="text-xs font-extrabold text-[#FFD700] hover:text-white bg-black/80 hover:bg-[#E1306C] border border-[#FFD700]/70 px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer transition-all shadow-md ml-auto shrink-0"
              title="Double click card to open Instagram post directly"
            >
              <span>Open Post</span>
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          </div>
          <div className="text-[10px] font-semibold text-white/90 text-right mt-1 drop-shadow-md">
            Double click to open ↗
          </div>
        </div>
      )}
    </div>
  );
};

export const InstagramShowcase: React.FC<InstagramShowcaseProps> = ({ embedded = false, hideHeader = false }) => {
  const { 
    setQuickViewProduct, 
    products, 
    isSellerMode,
    instagramItems,
    instagramHandle,
    instagramProfileUrl,
    openInstagramEditor,
    deleteInstagramItem
  } = useCart();

  const [activeItem, setActiveItem] = useState<InstagramJournalItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isGalleryLoading, setIsGalleryLoading] = useState(true);

  useEffect(() => {
    // Shimmer grid elements during data loading
    const timer = setTimeout(() => {
      setIsGalleryLoading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, [instagramItems.length]);

  // Modal video player state
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isModalMuted, setIsModalMuted] = useState(false);
  const [isModalPlaying, setIsModalPlaying] = useState(true);
  const [modalVideoError, setModalVideoError] = useState(false);

  useEffect(() => {
    setModalVideoError(false);
  }, [activeItem]);

  const openInstagramDirect = (url?: string) => {
    const target = url || instagramProfileUrl;
    try {
      const a = document.createElement('a');
      a.href = target;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(target, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(instagramProfileUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteInstagramItem(id);
      setDeleteConfirmId(null);
      if (activeItem?.id === id) {
        setActiveItem(null);
      }
    } catch (err) {
      console.error('Failed to delete item', err);
    }
  };

  // ESC key handler to close modal
  useEffect(() => {
    if (!activeItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveItem(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeItem]);

  return (
    <section 
      id="instagram-section" 
      className={`pt-1 pb-4 sm:pt-1.5 sm:pb-6 bg-gradient-to-b from-[#FFF0F5] via-[#FFE4EC] to-[#FFF0F5] ${embedded ? '' : 'border-t border-[#FAD2E1]'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        {!hideHeader && (
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5 sm:mb-6">
            <div>
              <div className="flex items-center gap-2 text-[#E1306C] text-xs uppercase tracking-[0.25em] font-semibold mb-1.5">
                <span className="w-6 h-[1px] bg-[#E1306C]" />
                <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />
                <span>INSTAGRAM COMMUNITY • {instagramHandle.toUpperCase()}</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[#1C1B1A] font-semibold">
                Follow on Instagram
              </h2>
              <p className="text-xs sm:text-sm text-[#736C65] mt-1 max-w-lg">
                Discover real customer unboxings, slow-motion pearl shine tests, and wedding styling guides straight from our workshop in Kathmandu, Nepal.
              </p>
            </div>

            {/* Direct Link to Instagram Button, Hover to Play Control & Seller Controls */}
            <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
              {/* Hover to Play Indicator & Mute Audio Browsing Control */}
              <div className="inline-flex items-center bg-white/80 border border-[#FAD2E1] rounded-full p-1 shadow-2xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#1C1B1A] font-medium">
                  <Play className="w-3 h-3 text-[#E1306C] fill-[#E1306C]" />
                  <span>Hover to Play</span>
                </span>

                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    !isMuted 
                      ? 'bg-[#E1306C] text-white shadow-xs' 
                      : 'text-[#736C65] hover:text-[#1C1B1A] hover:bg-white/60'
                  }`}
                  title={isMuted ? "Turn Sound On" : "Mute Sound"}
                >
                  {isMuted ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-[#736C65]" />
                      <span>Muted</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Sound On</span>
                    </>
                  )}
                </button>
              </div>

              {isSellerMode && (
                <button
                  type="button"
                  onClick={() => openInstagramEditor(null)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#D4AF37] text-[#1C1B1A] text-xs font-bold tracking-wider uppercase hover:bg-[#c29f2e] transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manage Instagram Posts ({instagramItems.length})</span>
                </button>
              )}

              <a
                href={instagramProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white text-xs font-bold tracking-wider uppercase hover:opacity-90 transition-all shadow-sm group"
              >
                <Instagram className="w-3.5 h-3.5 text-white" />
                <span>Follow {instagramHandle}</span>
                <ExternalLink className="w-3.5 h-3.5 text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            </div>
          </div>
        )}

        {/* Video & Posts Grid - Auto-plays video on mouse hover, double click opens Instagram post */}
        {isGalleryLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((num) => (
              <div key={`skeleton-${num}`} className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-[#1A1817] flex flex-col justify-between p-4 border border-[#FAD2E1]/20 shadow-md animate-pulse">
                <div className="flex justify-between items-start">
                  <div className="h-6 w-16 bg-neutral-800 rounded-full" />
                  <div className="h-8 w-8 rounded-full bg-neutral-800" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-3/4 bg-neutral-800 rounded-full mb-1" />
                  <div className="h-3 w-1/2 bg-neutral-800 rounded-full" />
                  <div className="pt-2 border-t border-neutral-800/60 flex justify-between items-center">
                    <div className="h-3 w-1/3 bg-neutral-800 rounded-full" />
                    <div className="h-5 w-16 bg-neutral-800 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : instagramItems.length === 0 ? (
          <div className="py-12 sm:py-16 px-6 text-center max-w-lg mx-auto bg-white rounded-3xl border border-[#E8DFD8] shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center text-white mx-auto mb-4 shadow-sm">
              <Instagram className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl text-[#1C1B1A] font-semibold mb-2">
              Instagram Journal
            </h3>
            <p className="text-xs sm:text-sm text-[#736C65] leading-relaxed mb-6">
              Connect with us directly on Instagram <span className="font-semibold text-[#1C1B1A]">{instagramHandle}</span> for behind-the-scenes craftsmanship in Kathmandu, Nepal, new drops, and customer unboxings.
            </p>
            {isSellerMode && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => openInstagramEditor(null)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D4AF37] text-[#1C1B1A] text-xs font-bold uppercase tracking-wider hover:bg-[#c29f2e] transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Journal Entry</span>
                </button>
              </div>
            )}
            <a
              href={instagramProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#C5A880] hover:text-[#1C1B1A] transition-colors"
            >
              <span>Visit @{instagramHandle.replace('@', '')} on Instagram</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {instagramItems.map((item, index) => (
              <InstagramJournalCard
                key={item.id}
                item={item}
                index={index}
                instagramHandle={instagramHandle}
                instagramProfileUrl={instagramProfileUrl}
                isSellerMode={isSellerMode}
                isMuted={isMuted}
                deleteConfirmId={deleteConfirmId}
                onOpenModal={(selected) => setActiveItem(selected)}
                onOpenInstagramDirect={openInstagramDirect}
                onEdit={(selected) => openInstagramEditor(selected)}
                onDeleteConfirm={handleDeleteItem}
                onDeleteRequest={(id) => setDeleteConfirmId(id)}
              />
            ))}
          </div>
        )}

        {/* Bottom CTA Card - Direct Link to Instagram Page */}
        <div className="mt-10 bg-white/90 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-[#FAD2E1] text-center shadow-md max-w-3xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#FFF0F5] border border-[#FAD2E1] flex items-center justify-center mx-auto text-[#E1306C]">
            <Instagram className="w-6 h-6" />
          </div>

          <h3 className="font-serif text-xl sm:text-2xl text-[#1C1B1A] font-semibold">
            Follow {instagramHandle} on Instagram
          </h3>

          <p className="text-xs sm:text-sm text-[#736C65] max-w-md mx-auto leading-relaxed">
            Stay updated with daily store clips, fresh product drops, customer reviews, and handcrafted pearl creations directly from Kathmandu, Nepal.
          </p>

          <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
            {isSellerMode && (
              <button
                type="button"
                onClick={() => openInstagramEditor(null)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D4AF37] text-[#1C1B1A] text-xs font-bold tracking-wider uppercase hover:bg-[#c29f2e] shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Manage Posts</span>
              </button>
            )}

            <a
              href={instagramProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white text-xs font-bold tracking-wider uppercase hover:opacity-95 shadow-sm transition-all group"
            >
              <Instagram className="w-4 h-4 text-white" />
              <span>Visit Official Instagram Page</span>
              <ExternalLink className="w-4 h-4 text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>

      </div>

      {/* Item Detail Modal - Portaled to document.body to prevent any CSS transform / translucent screen clipping */}
      {activeItem && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          {/* Backdrop click to dismiss */}
          <div 
            className="fixed inset-0"
            onClick={() => setActiveItem(null)}
          />

          <div className="relative bg-[#1C1B1A] text-white w-full max-w-3xl rounded-3xl overflow-hidden border border-[#34312F] shadow-2xl z-10 flex flex-col md:flex-row max-h-[92vh]">
            
            {/* Prominent Floating Close Button (Always visible on mobile and desktop) */}
            <button
              type="button"
              onClick={() => setActiveItem(null)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 p-2 sm:p-2.5 rounded-full bg-black/80 hover:bg-black text-white hover:text-[#D4AF37] border border-white/30 hover:border-[#D4AF37] backdrop-blur-md shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center"
              title="Close (ESC)"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            </button>

            {/* Left Media (Portrait Video with Playback and Double-Click Direct to Instagram) */}
            <div 
              onDoubleClick={() => openInstagramDirect(activeItem.postUrl || instagramProfileUrl)}
              className="md:w-1/2 bg-black flex items-center justify-center relative min-h-[360px] sm:min-h-[420px] cursor-pointer group"
              title="Double click to open on Instagram"
            >
              {(() => {
                const modalVideoSrc = getPlayableInstagramVideo(activeItem, 0);
                const posterSrc = activeItem.thumbnail?.trim() || undefined;

                return (
                  <div className="relative w-full h-full min-h-[360px] sm:min-h-[420px] flex items-center justify-center bg-black overflow-hidden">
                    {modalVideoSrc && !modalVideoError ? (
                      <video
                        ref={modalVideoRef}
                        key={modalVideoSrc}
                        src={modalVideoSrc}
                        poster={posterSrc}
                        autoPlay
                        loop
                        muted={isModalMuted}
                        playsInline
                        className="w-full h-full object-cover max-h-[550px]"
                        onError={() => setModalVideoError(true)}
                        onPlay={() => setIsModalPlaying(true)}
                        onPause={() => setIsModalPlaying(false)}
                      />
                    ) : (
                      <div className="relative w-full h-full min-h-[360px] flex items-center justify-center">
                        <img
                          src={posterSrc || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80'}
                          alt={activeItem.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover max-h-[550px]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => openInstagramDirect(activeItem.postUrl || instagramProfileUrl)}
                            className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg"
                          >
                            <Instagram className="w-4 h-4 text-[#E1306C]" />
                            <span>View on Instagram</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Audio Toggle & Play Controls Overlay */}
                    <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsModalMuted(!isModalMuted);
                          if (modalVideoRef.current) {
                            modalVideoRef.current.muted = !isModalMuted;
                          }
                        }}
                        className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer"
                        title={isModalMuted ? 'Unmute' : 'Mute'}
                      >
                        {isModalMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#D4AF37]" />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (modalVideoRef.current) {
                            if (isModalPlaying) {
                              modalVideoRef.current.pause();
                            } else {
                              modalVideoRef.current.play();
                            }
                          }
                        }}
                        className="px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-[11px] font-medium backdrop-blur-md transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {isModalPlaying ? <span>Pause</span> : <><Play className="w-3 h-3 fill-white" /> <span>Play</span></>}
                      </button>
                    </div>

                    {/* Double click hint badge */}
                    <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-white/90 border border-white/10 pointer-events-none">
                      Double-click to open on Instagram ↗
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right Information & Action Pane */}
            <div className="md:w-1/2 p-6 flex flex-col justify-between bg-[#1C1B1A]">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/15">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] p-[1.5px] shadow-md">
                      <div className="w-full h-full rounded-full bg-[#1C1B1A] flex items-center justify-center">
                        <Instagram className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-white tracking-wide">{activeItem.handle || instagramHandle}</h4>
                      <span className="text-[11px] font-semibold text-amber-200">Kathmandu, Nepal</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSellerMode && (
                      <button
                        type="button"
                        onClick={() => {
                          const toEdit = activeItem;
                          setActiveItem(null);
                          openInstagramEditor(toEdit);
                        }}
                        className="px-3 py-1 rounded-lg bg-[#FFD700] hover:bg-white text-[#1C1B1A] text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Post</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveItem(null)}
                      className="p-1.5 rounded-full text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Title & Caption */}
                <div className="py-4 space-y-3">
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-white leading-snug">
                    {activeItem.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed whitespace-pre-line">
                    {activeItem.caption}
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-white/15 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-[#FFD700]" />
                    <span>{copiedLink ? 'Link Copied!' : 'Share Profile'}</span>
                  </button>

                  <span className="text-xs font-medium text-slate-300">
                    Kathmandu, Nepal
                  </span>
                </div>

                {/* Direct Link to Instagram */}
                <button
                  type="button"
                  onClick={() => openInstagramDirect(activeItem.postUrl || instagramProfileUrl)}
                  className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] hover:brightness-110 text-[#1C1B1A] text-xs font-extrabold uppercase tracking-wider rounded-full flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer"
                >
                  <Instagram className="w-4.5 h-4.5 text-[#1C1B1A]" />
                  <span>Open on Instagram ({activeItem.handle || instagramHandle})</span>
                  <ExternalLink className="w-4 h-4 text-[#1C1B1A] stroke-[2.5]" />
                </button>
              </div>

            </div>

          </div>
        </div>,
        document.body
      )}

    </section>
  );
};
