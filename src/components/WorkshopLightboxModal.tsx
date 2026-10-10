import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Share2, 
  Heart, 
  MapPin, 
  Calendar, 
  Sparkles, 
  Users, 
  MessageCircle, 
  Check, 
  Award,
  Video,
  Camera,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { WorkshopMediaItem } from '../types';
import { refetchWorkshopMediaFromStorage } from '../utils/workshopDiagnostics';
import { getWorkshopEmbeddedFallback } from '../data/workshopEmbeddedFallbacks';

interface WorkshopLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WorkshopMediaItem[];
  currentIndex?: number;
  initialIndex?: number;
  onNavigate?: (index: number) => void;
}

export const WorkshopLightboxModal: React.FC<WorkshopLightboxModalProps> = ({
  isOpen,
  onClose,
  items,
  currentIndex,
  initialIndex = 0,
  onNavigate
}) => {
  const validItems = items;
  const [internalIndex, setInternalIndex] = useState(initialIndex);
  const activeIndex = currentIndex !== undefined ? currentIndex : internalIndex;
  const currentItem = validItems[activeIndex] || validItems[0] || items[activeIndex];

  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isReloading, setIsReloading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>('');

  useEffect(() => {
    if (initialIndex !== undefined) {
      setInternalIndex(initialIndex);
    }
  }, [initialIndex, isOpen]);

  // Reset video state when currentItem changes
  useEffect(() => {
    setMediaError(null);
    setIsReloading(false);
    if (currentItem) {
      if (currentItem.type === 'image') {
        const embedded = getWorkshopEmbeddedFallback(currentItem.url) || getWorkshopEmbeddedFallback(currentItem.thumbnailUrl);
        setCurrentUrl(embedded || currentItem.url);
      } else {
        // Video: use item's url directly
        setCurrentUrl(currentItem.url);
      }
    }
    if (videoRef.current && currentItem?.type === 'video') {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Notice: Autoplay requires click:', err);
            setIsPlaying(false);
          });
      }
    }
  }, [activeIndex, currentItem?.id, currentItem?.url]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, items.length]);

  if (!isOpen || !currentItem) return null;

  const handlePrev = () => {
    if (items.length === 0) return;
    const prevIndex = (activeIndex - 1 + items.length) % items.length;
    if (onNavigate) onNavigate(prevIndex);
    else setInternalIndex(prevIndex);
  };

  const handleNext = () => {
    if (items.length === 0) return;
    const nextIndex = (activeIndex + 1) % items.length;
    if (onNavigate) onNavigate(nextIndex);
    else setInternalIndex(nextIndex);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      const p = videoRef.current.play();
      if (p !== undefined) {
        p.then(() => setIsPlaying(true)).catch((e) => {
          console.warn('Playback error:', e);
          setIsPlaying(false);
        });
      } else {
        setIsPlaying(true);
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const toggleLike = (id: string) => {
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleReloadMedia = async () => {
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
      setMediaError(err?.message || 'Failed to re-fetch from Firebase Storage.');
    } finally {
      setIsReloading(false);
    }
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${currentItem.title} - Artified Nepal Workshops`,
        text: `Watch Sahina Shrestha training workshop: ${currentItem.caption}`,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openWhatsAppInquiry = () => {
    const phone = '9779767573721';
    const message = encodeURIComponent(
      currentItem.whatsappMessage || 
      `Namaste Sahina! I saw your workshop media "${currentItem.title}" from ${currentItem.workshopTitle} and would love to register for the upcoming batch in Kathmandu.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-[120] bg-black/92 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 transition-opacity animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Header Actions Bar */}
      <div className="absolute top-3 left-3 right-3 sm:top-5 sm:left-6 sm:right-6 flex items-center justify-between z-30 pointer-events-auto">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20 backdrop-blur-sm">
            {currentItem.type === 'video' ? (
              <>
                <Video className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Video Moment</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Craft Photograph</span>
              </>
            )}
          </span>

          <span className="text-xs font-mono text-white/70 px-2.5 py-1 rounded-full bg-white/10 border border-white/10">
            {activeIndex + 1} / {items.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Reload Media Button */}
          <button
            type="button"
            onClick={handleReloadMedia}
            disabled={isReloading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
            title="Reload from Firebase Storage"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isReloading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reload</span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Share workshop highlight"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
            title="Close full-screen (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col lg:flex-row items-center justify-center bg-[#151413] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        {/* Left: Media Player / Viewport */}
        <div className="relative w-full lg:w-3/5 h-[48vh] sm:h-[56vh] lg:h-[78vh] bg-black flex items-center justify-center select-none overflow-hidden group">
          {mediaError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-white max-w-md">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 mb-3 border border-amber-500/30">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h4 className="font-serif text-lg font-bold mb-1">Playback Notice</h4>
              <p className="text-xs text-white/70 mb-4">{mediaError}</p>
              <button
                type="button"
                onClick={handleReloadMedia}
                disabled={isReloading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C5A880] text-[#1C1B1A] font-bold text-xs cursor-pointer shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
                <span>{isReloading ? 'Re-fetching...' : '🔄 Reload Media'}</span>
              </button>
            </div>
          ) : currentItem.type === 'video' ? (
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
                onClick={togglePlay}
                onPlay={() => {
                  setIsPlaying(true);
                  setMediaError(null);
                }}
                onPause={() => setIsPlaying(false)}
                onError={async () => {
                  try {
                    const recovered = await refetchWorkshopMediaFromStorage(currentItem);
                    if (recovered && recovered !== currentUrl && recovered !== currentItem.url) {
                      setCurrentUrl(recovered);
                      return;
                    }
                  } catch {}
                  setMediaError('Video failed to stream. Please try re-fetching or check your network.');
                }}
                className="max-h-full max-w-full object-contain cursor-pointer"
              />

              {/* Play / Pause Center Overlay Button on Click */}
              {!isPlaying && (
                <button
                  type="button"
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-sm border border-white/20 transition-transform transform hover:scale-110 cursor-pointer"
                >
                  <Play className="w-8 h-8 fill-white ml-1 text-white" />
                </button>
              )}

              {/* Bottom Video Controls Pill */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/15 opacity-90 transition-opacity">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="text-white hover:text-[#C5A880] transition-colors cursor-pointer"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="text-white hover:text-[#C5A880] transition-colors cursor-pointer"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  {currentItem.duration && (
                    <span className="text-white/70 text-xs font-mono">
                      {currentItem.duration}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-white/80">
                  <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Kathmandu Workshop Recording</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center p-2">
              <img
                src={currentUrl || currentItem.url}
                alt={currentItem.title}
                onError={() => {
                  const fallback = getWorkshopEmbeddedFallback(currentUrl || currentItem.url || currentItem.thumbnailUrl);
                  if (fallback && currentUrl !== fallback) {
                    setCurrentUrl(fallback);
                    setMediaError(null);
                    return;
                  }
                  setMediaError('Photo failed to load.');
                }}
                className="max-h-full max-w-full object-contain select-none"
              />
            </div>
          )}

          {/* Left Arrow Button */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs border border-white/10 transition-transform hover:scale-105 cursor-pointer z-20"
              title="Previous item (Left Arrow)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Right Arrow Button */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs border border-white/10 transition-transform hover:scale-105 cursor-pointer z-20"
              title="Next item (Right Arrow)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Right: Story Details & Registration Bar */}
        <div className="w-full lg:w-2/5 p-5 sm:p-6 lg:p-7 flex flex-col justify-between overflow-y-auto max-h-[44vh] sm:max-h-[36vh] lg:max-h-[78vh] bg-[#1A1918] border-t lg:border-t-0 lg:border-l border-white/10">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#C5A880]/20 text-[#E6CA9E] border border-[#C5A880]/30">
                <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>{currentItem.workshopTitle}</span>
              </span>
            </div>

            <h2 className="font-serif text-xl sm:text-2xl font-bold text-white leading-tight mb-2">
              {currentItem.title}
            </h2>

            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-sans mb-4">
              {currentItem.caption}
            </p>

            {currentItem.craftTechnique && (
              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[11px] uppercase font-bold text-[#E6CA9E] tracking-wider mb-1 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>Key Craft Technique</span>
                </div>
                <p className="text-xs text-white/90">
                  {currentItem.craftTechnique}
                </p>
              </div>
            )}

            {/* Tags */}
            {currentItem.tags && currentItem.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {currentItem.tags.map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    className="px-2.5 py-0.5 rounded-md text-[11px] bg-white/5 text-white/70 border border-white/5"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Location & Mentor Info */}
            <div className="grid grid-cols-2 gap-2 text-xs text-white/70 border-t border-white/10 pt-3 mb-4">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
                <span className="truncate">{currentItem.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
                <span>{currentItem.date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
                <span>{currentItem.attendeesCount} Candidates</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
                <span>Mentor: {currentItem.instructor}</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
            <button
              type="button"
              onClick={openWhatsAppInquiry}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs uppercase tracking-wider transition-all transform active:scale-98 shadow-lg shadow-[#25D366]/20 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Register for this Training on WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
