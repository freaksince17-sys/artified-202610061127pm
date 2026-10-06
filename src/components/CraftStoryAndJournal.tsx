import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  MapPin, 
  Award, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RotateCcw,
  BookOpen, 
  Clock, 
  Calendar, 
  User, 
  Share2, 
  Check, 
  Search, 
  Tag, 
  ArrowRight, 
  X, 
  Plus, 
  Edit3,
  Feather,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Heart
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { DEFAULT_CRAFT_STORY } from '../data/products';
import { getCraftArticles, saveCraftArticle } from '../data/journalArticles';
import { CAVIAR_PEARL_BAG_IMAGE, getRealProductImage } from '../utils/productImages';
import { CraftArticle } from '../types';
import { getFreshAssetUrl, getOptimizedBackgroundUrl } from '../utils/storageAssetUtils';

type CategoryFilter = 'All' | 'Craft Techniques' | 'Nepali Heritage' | 'Care Guides' | 'Bridal & Styling';

const resolveVideoSrc = (url?: string): string => {
  if (!url) return '/tiktok_videos/7625655459537603860.mp4';
  if (url.endsWith('.mp4') || url.startsWith('/tiktok_videos/') || url.startsWith('/instagram_videos/') || url.startsWith('/api/')) return url;
  const igMatch = url.match(/(?:instagram\.com\/(?:p|reel|reels|tv)\/|instagram_videos\/)([A-Za-z0-9_-]+)/);
  if (igMatch && igMatch[1]) {
    return `/instagram_videos/${igMatch[1]}.mp4`;
  }
  const match = url.match(/(\d{15,22})/);
  if (match && match[1]) {
    return `/tiktok_videos/${match[1]}.mp4`;
  }
  return '/tiktok_videos/7625655459537603860.mp4';
};

export const CraftStoryAndJournal: React.FC = () => {
  const { 
    craftStory, 
    isSellerMode, 
    setIsCraftStoryModalOpen,
    setQuickViewProduct,
    products,
    openMeetArtisanModal,
    activeNavTab
  } = useCart();
  const { language } = useLanguage();
  const isNe = language === 'ne';

  const story = craftStory || DEFAULT_CRAFT_STORY;

  // Video State
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isSectionMuted, setIsSectionMuted] = useState(true);
  const [isCraftHovered, setIsCraftHovered] = useState(false);
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);

  // Journal Articles State
  const [articles, setArticles] = useState<CraftArticle[]>(() => getCraftArticles());
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticle, setActiveArticle] = useState<CraftArticle | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Publisher modal for Shop Owner
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newExcerpt, setNewExcerpt] = useState('');
  const [newCategory, setNewCategory] = useState<'Craft Techniques' | 'Nepali Heritage' | 'Care Guides' | 'Bridal & Styling'>('Craft Techniques');
  const [newCoverImage, setNewCoverImage] = useState(CAVIAR_PEARL_BAG_IMAGE);
  const [newContentText, setNewContentText] = useState('');
  const [newTagsText, setNewTagsText] = useState('Pearl Weaving, Kathmandu, Handmade');
  const [newKeywordsText, setNewKeywordsText] = useState('handmade pearl bags nepal, kathmandu craft');

  useEffect(() => {
    const handleUpdate = () => {
      setArticles(getCraftArticles());
    };
    window.addEventListener('artified_articles_updated', handleUpdate);
    return () => window.removeEventListener('artified_articles_updated', handleUpdate);
  }, []);

  // ESC key handler to close modal
  useEffect(() => {
    if (!activeArticle) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveArticle(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeArticle]);

  // Safe hover autoplay handlers: starts playing on mouse hover, pauses on leave
  const playVideoOnHover = () => {
    setIsCraftHovered(true);
    const video = mainVideoRef.current;
    if (video) {
      video.muted = isSectionMuted;
      // Default to muted if needed for browser policy
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlayingVideo(true))
          .catch(() => {
            // If sound was blocked, mute and retry playing immediately
            video.muted = true;
            setIsSectionMuted(true);
            video.play()
              .then(() => setIsPlayingVideo(true))
              .catch((err) => console.warn('Hover play notice:', err));
          });
      }
    }
  };

  const pauseVideoOnLeave = () => {
    setIsCraftHovered(false);
    const video = mainVideoRef.current;
    if (video) {
      video.pause();
      setIsPlayingVideo(false);
    }
  };

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = mainVideoRef.current;
    if (!video) return;
    if (video.paused) {
      video.muted = isSectionMuted;
      const p = video.play();
      if (p !== undefined) {
        p.then(() => setIsPlayingVideo(true)).catch(() => {
          video.muted = true;
          setIsSectionMuted(true);
          video.play().then(() => setIsPlayingVideo(true)).catch(() => {});
        });
      }
    } else {
      video.pause();
      setIsPlayingVideo(false);
    }
  };

  const toggleMute = () => {
    setIsSectionMuted((prev) => {
      const next = !prev;
      if (mainVideoRef.current) {
        mainVideoRef.current.muted = next;
      }
      return next;
    });
  };

  const filteredArticles = articles.filter((art) => {
    const matchCategory = selectedCategory === 'All' || art.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchQuery = !query || 
      art.title.toLowerCase().includes(query) ||
      art.subtitle.toLowerCase().includes(query) ||
      art.tags.some(t => t.toLowerCase().includes(query));
    return matchCategory && matchQuery;
  });

  const handleShareArticle = (art: CraftArticle) => {
    if (navigator.share) {
      navigator.share({
        title: art.title,
        text: art.excerpt,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleSaveNewArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContentText.trim()) return;

    const newArt: CraftArticle = {
      id: `art-${Date.now()}`,
      slug: newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || `journal-${Date.now()}`,
      title: newTitle.trim(),
      subtitle: newSubtitle.trim() || 'Handcrafted Heritage from Kathmandu',
      excerpt: newExcerpt.trim() || newContentText.slice(0, 160) + '...',
      content: newContentText.trim().split('\n\n'),
      author: 'Sahina Shrestha',
      authorRole: 'Founder and Creator',
      category: newCategory,
      publishedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      readTime: `${Math.max(2, Math.ceil(newContentText.split(' ').length / 180))} min read`,
      coverImage: newCoverImage.trim(),
      tags: newTagsText.split(',').map(t => t.trim()).filter(Boolean),
      seoKeywords: newKeywordsText.split(',').map(k => k.trim()).filter(Boolean),
    };

    saveCraftArticle(newArt);
    setArticles(getCraftArticles());
    setIsPublishModalOpen(false);
    // Reset
    setNewTitle('');
    setNewSubtitle('');
    setNewExcerpt('');
    setNewContentText('');
  };

  // Safe image helper with cache-busting version resolution
  const getSafeImageUrl = (img?: string) => {
    return getOptimizedBackgroundUrl(img, {
      fallback: '/tiktok_videos/7625655459537603860_cover.jpg'
    });
  };

  return (
    <div className="bg-[#FAF8F5] dark:bg-[#0F0E0E] pt-0.5 pb-4 sm:pb-6 px-3 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4">

        {/* SECTION 1: THE ATELIER STORY & LIVING CRAFT */}
        <section className="bg-white dark:bg-[#181716] rounded-3xl p-3 sm:p-4.5 border border-[#E8DFD8] dark:border-[#2D2B28] shadow-sm relative overflow-hidden transition-colors">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#C5A880]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-2.5 mb-2.5 sm:mb-3 pb-2 border-b border-[#F0EBE5] dark:border-[#262422]">
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-[#201F1D] border border-[#E8DFD8] dark:border-[#33302C] text-[#8C5D36] dark:text-[#E6CA9E] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                <MapPin className="w-3 h-3 text-[#D4AF37]" />
                <span>Kathmandu, Nepal</span>
              </div>
              <h1 className="font-serif text-lg sm:text-2xl lg:text-3xl text-[#1C1B1A] dark:text-[#F5F2EB] font-semibold tracking-tight">
                {isNe ? 'हाम्रो कथा र जीवित शिल्पकारी' : 'Our Story & Living Craft'}
              </h1>
              <p className="text-[11px] sm:text-xs text-[#736C65] dark:text-[#A69E96] max-w-2xl leading-relaxed">
                {isNe
                  ? 'काठमाडौंको ऐतिहासिक गल्लीमा मोती र म्याक्रामेलाई आधुनिक विलासितामा रूपान्तरण गर्दै।'
                  : 'Every pearl strand and cotton cord is knotted with intention and human warmth in our Kathmandu workshop.'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={openMeetArtisanModal}
                className="py-1 px-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F2ECE4] dark:bg-[#201F1D] dark:hover:bg-[#282724] text-[#1C1B1A] dark:text-[#F5F2EB] border border-[#E8DFD8] dark:border-[#33302C] text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                <span>Meet Sahina Shrestha</span>
              </button>

              {isSellerMode && (
                <button
                  type="button"
                  onClick={() => setIsCraftStoryModalOpen(true)}
                  className="py-1 px-2 rounded-xl bg-[#1C1B1A] dark:bg-[#252422] text-[#D4AF37] border border-[#D4AF37]/50 text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Story</span>
                </button>
              )}
            </div>
          </div>

          {/* Story Showcase: Video & Philosophy Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5 items-center">
            
            {/* Left: Making Video Player with Instant Mouse Hover Autoplay */}
            <div 
              className="lg:col-span-6 relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] max-h-[260px] sm:max-h-[290px] rounded-2xl overflow-hidden bg-[#1C1B1A] shadow-sm border border-[#E8DFD8] dark:border-[#2D2B28] group cursor-pointer"
              onMouseEnter={playVideoOnHover}
              onMouseLeave={pauseVideoOnLeave}
              onClick={togglePlay}
            >
              <video
                ref={mainVideoRef}
                src={resolveVideoSrc(story.videoUrl)}
                poster={getSafeImageUrl(story.image1)}
                autoPlay={false}
                muted={isSectionMuted}
                loop
                playsInline
                preload="auto"
                onPlay={() => setIsPlayingVideo(true)}
                onPause={() => setIsPlayingVideo(false)}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/tiktok_videos/7625655459537603860.mp4')) {
                    target.src = '/tiktok_videos/7625655459537603860.mp4';
                    target.load();
                    if (isCraftHovered) {
                      target.play().catch(() => {});
                    }
                  }
                }}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />

              {/* Video Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />

              {/* Play / Pause / Hover preview indicator button */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`rounded-full bg-white/20 backdrop-blur-md border border-white/50 flex items-center justify-center text-white transition-all transform ${isPlayingVideo || isCraftHovered ? 'opacity-0 scale-75' : 'opacity-100 scale-100 shadow-xl px-3 py-1.5 gap-1.5'}`}>
                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                  <span className="text-[10px] font-bold tracking-wider uppercase">Hover to Play</span>
                </div>
              </div>

              {/* Top controls */}
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-white text-xs z-10">
                <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[9px] font-bold uppercase tracking-wider border border-white/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span>Kathmandu Workshop</span>
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  className="p-1.5 rounded-full bg-black/60 backdrop-blur-xs text-white hover:bg-black/80 border border-white/20 transition-all cursor-pointer"
                  aria-label={isSectionMuted ? 'Unmute video' : 'Mute video'}
                >
                  {isSectionMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Bottom Video Caption */}
              <div className="absolute bottom-2 left-2 right-2 text-white space-y-0.5 z-10">
                <p className="text-xs font-bold font-serif tracking-wide drop-shadow-sm">
                  {story.title || 'Hand-knotted with Reinforced Core Wire'}
                </p>
                <p className="text-[10px] text-white/80 line-clamp-1">
                  Each baroque pearl is individually threaded and balanced by hand in our Kathmandu workshop.
                </p>
              </div>
            </div>

            {/* Right: The 3 Core Pillars */}
            <div className="lg:col-span-6 space-y-2">
              {/* Pillar 1 */}
              <div className="p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#201F1D] border border-[#E8DFD8] dark:border-[#33302C] hover:border-[#D4AF37]/50 transition-all space-y-0.5">
                <div className="flex items-center gap-1.5 text-[#D4AF37]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <h3 className="font-serif font-bold text-xs sm:text-sm text-[#1C1B1A] dark:text-[#F5F2EB]">
                    {isNe ? '१. १००% मौलिक हस्तनिर्मित' : '1. 100% Patiently Handcrafted'}
                  </h3>
                </div>
                <p className="text-[11px] text-[#5E5955] dark:text-[#A69E96] leading-snug">
                  No factory molding. Every piece is crafted with meticulous continuous hand-knotting on high-tensile core threads.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#201F1D] border border-[#E8DFD8] dark:border-[#33302C] hover:border-[#D4AF37]/50 transition-all space-y-0.5">
                <div className="flex items-center gap-1.5 text-[#D4AF37]">
                  <Heart className="w-3.5 h-3.5" />
                  <h3 className="font-serif font-bold text-xs sm:text-sm text-[#1C1B1A] dark:text-[#F5F2EB]">
                    {isNe ? '२. घरेलु महिला कालिगढको सशक्तीकरण' : '2. Ethical Valley Livelihoods'}
                  </h3>
                </div>
                <p className="text-[11px] text-[#5E5955] dark:text-[#A69E96] leading-snug">
                  Artified supports and empowers skilled home-based women creators across Kathmandu with ethical compensation.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#201F1D] border border-[#E8DFD8] dark:border-[#33302C] hover:border-[#D4AF37]/50 transition-all space-y-0.5">
                <div className="flex items-center gap-1.5 text-[#D4AF37]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <h3 className="font-serif font-bold text-xs sm:text-sm text-[#1C1B1A] dark:text-[#F5F2EB]">
                    {isNe ? '३. मौलिक प्राकृतिक मोती' : '3. Authentic Baroque Freshwater Pearls'}
                  </h3>
                </div>
                <p className="text-[11px] text-[#5E5955] dark:text-[#A69E96] leading-snug">
                  We hand-select organic freshwater baroque pearls with deep luster and unique contours, creating one-of-a-kind heirlooms.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* SECTION 2: THE CRAFT JOURNAL & HERITAGE LIBRARY */}
        <section className="space-y-2.5">
          
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 pb-1.5 border-b border-[#E8DFD8] dark:border-[#262422]">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[#C5A880] text-[10px] font-bold uppercase tracking-wider mb-0.5">
                <Feather className="w-3 h-3" />
                <span>Craft Essays & Heritage Guides</span>
              </div>
              <h2 className="font-serif text-lg sm:text-xl text-[#1C1B1A] dark:text-[#F5F2EB] font-semibold">
                Craft Journal & Styling Library
              </h2>
            </div>

            {/* Actions: Search & Publisher */}
            <div className="flex items-center gap-2">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3 h-3 text-[#8C847E] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles..."
                  className="pl-7 pr-3 py-1 bg-white dark:bg-[#1A1918] border border-[#E8DFD8] dark:border-[#2D2B28] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB] placeholder-[#8C847E] focus:outline-none focus:border-[#C5A880] w-40 sm:w-52 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8C847E] hover:text-[#1C1B1A] dark:hover:text-[#FAF8F5]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {isSellerMode && (
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(true)}
                  className="py-1 px-2.5 rounded-xl bg-[#1C1B1A] dark:bg-[#252422] text-[#D4AF37] border border-[#D4AF37]/50 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Article</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(['All', 'Craft Techniques', 'Nepali Heritage', 'Care Guides', 'Bridal & Styling'] as CategoryFilter[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`py-1 px-2.5 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#1C1B1A] dark:bg-[#FAF8F5] text-[#FAF8F5] dark:text-[#1C1B1A] shadow-xs'
                    : 'bg-white dark:bg-[#1A1918] text-[#736C65] dark:text-[#A69E96] border border-[#E8DFD8] dark:border-[#2D2B28] hover:border-[#C5A880] hover:text-[#1C1B1A] dark:hover:text-[#FAF8F5]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Article Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
            {filteredArticles.map((article) => (
              <article
                key={article.id}
                onClick={() => setActiveArticle(article)}
                className="bg-white dark:bg-[#181716] rounded-2xl overflow-hidden border border-[#E8DFD8] dark:border-[#2D2B28] hover:border-[#C5A880] dark:hover:border-[#C5A880] transition-all shadow-2xs hover:shadow-sm cursor-pointer flex flex-col group"
              >
                {/* Article Cover Photo */}
                <div className="aspect-[16/9] overflow-hidden bg-[#FAF8F5] dark:bg-[#201F1D] relative">
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  />
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#1C1B1A]/85 backdrop-blur-xs text-[#FAF8F5] text-[9px] font-bold uppercase tracking-wider border border-white/20">
                      {article.category}
                    </span>
                  </div>
                  <div className="absolute bottom-2 right-2">
                    <span className="px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[9px] font-medium flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{article.readTime}</span>
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5">
                  <div className="space-y-0.5">
                    <h3 className="font-serif text-sm sm:text-base font-semibold text-[#1C1B1A] dark:text-[#F5F2EB] group-hover:text-[#C5A880] dark:group-hover:text-[#E6CA9E] transition-colors line-clamp-2 leading-snug">
                      {article.title}
                    </h3>
                    <p className="text-[11px] text-[#736C65] dark:text-[#A69E96] line-clamp-2 leading-relaxed">
                      {article.excerpt}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#F0EBE5] dark:border-[#262422] flex items-center justify-between text-[10px] sm:text-[11px] text-[#8C847E] dark:text-[#A69E96]">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-[#C5A880]" />
                      <span className="font-medium text-[#1C1B1A] dark:text-[#F5F2EB]">{article.author}</span>
                    </span>
                    <span className="text-[#C5A880] group-hover:translate-x-1 transition-transform font-bold inline-flex items-center gap-1">
                      <span>Read</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {filteredArticles.length === 0 && (
            <div className="p-8 text-center bg-white dark:bg-[#181716] rounded-2xl border border-[#E8DFD8] dark:border-[#2D2B28]">
              <p className="text-sm font-semibold text-[#1C1B1A] dark:text-[#F5F2EB]">No articles found matching &quot;{searchQuery}&quot;</p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                className="mt-2 text-xs text-[#C5A880] hover:underline font-bold"
              >
                Clear filters
              </button>
            </div>
          )}

        </section>

      </div>

      {/* ARTICLE READER MODAL */}
      {activeArticle && (
        <div 
          className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-5 md:p-6 animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop Click Dismiss */}
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity -z-10 cursor-pointer"
            onClick={() => setActiveArticle(null)}
          />

          <div 
            className="relative bg-[#FAF8F5] dark:bg-[#141312] rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-[#E8DFD8] dark:border-[#2D2B28] z-10 text-[#1C1B1A] dark:text-[#F5F2EB] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-white dark:bg-[#1A1918] border-b border-[#E8DFD8] dark:border-[#2D2B28] flex items-center justify-between shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C5A880]">
                {activeArticle.category}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShareArticle(activeArticle)}
                  className="p-1.5 rounded-full hover:bg-[#FAF8F5] dark:hover:bg-[#252422] text-[#736C65] dark:text-[#A69E96] hover:text-[#1C1B1A] dark:hover:text-[#FAF8F5] cursor-pointer"
                  title="Share article"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveArticle(null)}
                  className="p-1.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[#1C1B1A] dark:text-white transition-colors cursor-pointer"
                  title="Close article"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Reader Content */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="aspect-[16/9] rounded-2xl overflow-hidden shadow-xs bg-[#E8DFD8] dark:bg-[#222]">
                <img
                  src={activeArticle.coverImage}
                  alt={activeArticle.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h2 className="font-serif text-xl sm:text-2xl text-[#1C1B1A] dark:text-[#F5F2EB] font-semibold leading-tight">
                  {activeArticle.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-[#8C847E] dark:text-[#A69E96] mt-1.5 flex-wrap">
                  <span>By {activeArticle.author} ({activeArticle.authorRole})</span>
                  <span>•</span>
                  <span>{activeArticle.publishedDate}</span>
                  <span>•</span>
                  <span>{activeArticle.readTime}</span>
                </div>
              </div>

              <div className="prose prose-sm max-w-none text-[#5E5955] dark:text-[#C2BBB2] space-y-3 leading-relaxed font-sans text-xs sm:text-sm">
                {activeArticle.content.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>

              {/* Tags */}
              <div className="pt-3 border-t border-[#E8DFD8] dark:border-[#2D2B28] flex flex-wrap gap-1.5">
                {activeArticle.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#33302C] text-[#736C65] dark:text-[#A69E96] text-[10px] rounded-lg">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Reader Footer */}
            <div className="px-5 py-3 bg-white dark:bg-[#1A1918] border-t border-[#E8DFD8] dark:border-[#2D2B28] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveArticle(null);
                  openMeetArtisanModal();
                }}
                className="text-xs font-bold text-[#8C5D36] dark:text-[#E6CA9E] hover:underline transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Meet the Founder & Creator</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                className="py-1.5 px-4 bg-[#1C1B1A] dark:bg-[#FAF8F5] text-white dark:text-[#1C1B1A] rounded-xl text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PUBLISHER MODAL FOR SHOP OWNER (SELLER STUDIO) */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#181716] rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-[#E8DFD8] dark:border-[#2D2B28]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD8] dark:border-[#2D2B28] mb-3">
              <h3 className="font-serif text-lg font-bold text-[#1C1B1A] dark:text-[#F5F2EB]">Publish Journal Article</h3>
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="p-1 text-[#8C847E] hover:text-[#1C1B1A] dark:hover:text-[#FAF8F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewArticle} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#1C1B1A] dark:text-[#F5F2EB] uppercase mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. The Sacred Knotting of Baroque Pearls"
                  className="w-full px-3 py-2 bg-[#FAF8F5] dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1C1B1A] dark:text-[#F5F2EB] uppercase mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB]"
                >
                  <option value="Craft Techniques">Craft Techniques</option>
                  <option value="Nepali Heritage">Nepali Heritage</option>
                  <option value="Care Guides">Care Guides</option>
                  <option value="Bridal & Styling">Bridal & Styling</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1C1B1A] dark:text-[#F5F2EB] uppercase mb-1">Cover Image URL</label>
                <input
                  type="text"
                  required
                  value={newCoverImage}
                  onChange={(e) => setNewCoverImage(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1C1B1A] dark:text-[#F5F2EB] uppercase mb-1">Content (Paragraphs)</label>
                <textarea
                  required
                  rows={4}
                  value={newContentText}
                  onChange={(e) => setNewContentText(e.target.value)}
                  placeholder="Write the article content here. Separate paragraphs with double enter..."
                  className="w-full px-3 py-2 bg-[#FAF8F5] dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="py-1.5 px-3.5 rounded-xl text-xs font-semibold text-[#736C65] dark:text-[#A69E96]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 rounded-xl bg-[#1C1B1A] dark:bg-[#FAF8F5] text-[#D4AF37] dark:text-[#1C1B1A] font-bold text-xs"
                >
                  Publish Article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
