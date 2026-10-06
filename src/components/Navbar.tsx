import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, 
  Heart, 
  Search, 
  Menu, 
  X, 
  Sparkles, 
  MessageCircle, 
  ChevronRight,
  ChevronDown,
  Truck,
  Instagram,
  ClipboardCheck,
  Star,
  Crown,
  User,
  Gift,
  Feather,
  Globe,
  Sun,
  Moon,
  ExternalLink,
  Lock,
  Award
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { NavbarSearch } from './NavbarSearch';
import { ArtifiedLogo } from './ArtifiedLogo';

interface NavbarProps {
  onOpenSearch?: () => void;
  onNavigateSection?: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigateSection }) => {
  const { 
    cartCount, 
    setIsCartOpen, 
    wishlist, 
    setIsWishlistOpen,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    openTracker,
    setActiveSocialTab,
    activeNavTab,
    setActiveNavTab,
    isSellerMode,
    setIsSellerAuthModalOpen,
    openOrderManager,
    openAccountModal,
    loyaltyPointsBalance,
    openReferralModal,
    openMeetArtisanModal,
    cartAnimationKey,
    instagramHandle,
    instagramProfileUrl
  } = useCart();

  const { language, setLanguage, toggleLanguage, t } = useLanguage();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Shortcut key '/' to trigger search instantly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavClick = (category?: string, sectionId = 'shop-section') => {
    if (category) {
      setSelectedCategory(category);
    }
    setMobileMenuOpen(false);
    if (onNavigateSection) {
      onNavigateSection(sectionId);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openWhatsApp = () => {
    const phone = '9779767573721';
    const text = encodeURIComponent('Namaste Artified_np! ✨ I am browsing your online catalog and would like to ask about a custom handcrafted piece.');
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <>
      <header
        className={`sticky top-0 z-30 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#FAF8F5]/95 dark:bg-[#0F0E0E]/95 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.15)] border-b border-[#E8DFD8] dark:border-[#262422]'
            : 'bg-[#FAF8F5] dark:bg-[#0F0E0E] border-b border-[#F0EBE5] dark:border-[#1E1D1B]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 items-center h-14 sm:h-16">
            
            {/* Left: Mobile Menu Toggle */}
            <div className="flex items-center justify-start gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 text-[#1C1B1A] dark:text-[#F5F2EB] hover:text-[#C5A880] transition-colors focus:outline-none cursor-pointer"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* Center: Artified Brand Logo */}
            <div className="flex items-center justify-center">
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveNavTab('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center justify-center group py-1"
                title="Artified Nepal - Art made with love"
                aria-label="Artified Nepal Home"
              >
                <ArtifiedLogo variant={isDarkMode ? 'light' : 'dark'} size="md" />
              </a>
            </div>

            {/* Right: Actions (Theme Toggle, WhatsApp, Wishlist, Cart) */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-2">
              {/* WhatsApp direct chat button */}
              <button
                type="button"
                onClick={openWhatsApp}
                title="Chat with Artified on WhatsApp"
                aria-label="Chat directly with founder and creator on WhatsApp"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#1C1B1A] dark:text-[#F5F2EB] hover:text-[#075E54] dark:hover:text-[#25D366] py-1.5 px-3 rounded-full border border-[#E8DFD8] dark:border-[#2E2C29] bg-white dark:bg-[#1A1918] hover:border-[#25D366] transition-all cursor-pointer shadow-2xs shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                <span className="font-medium text-[11px] tracking-tight whitespace-nowrap">DM WhatsApp</span>
              </button>

              {/* Dark Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 text-[#1C1B1A] dark:text-[#F5F2EB] hover:text-[#C5A880] dark:hover:text-[#E6CA9E] hover:bg-white/80 dark:hover:bg-[#1E1D1B] rounded-full transition-colors cursor-pointer shrink-0"
                aria-label={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
                title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-[#E6CA9E] transition-transform duration-300 hover:rotate-45" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-[#1C1B1A] transition-transform duration-300 hover:-rotate-12" />
                )}
              </button>

              {/* Wishlist Button */}
              <button
                type="button"
                onClick={() => setIsWishlistOpen(true)}
                className="relative p-2 text-[#1C1B1A] dark:text-[#F5F2EB] hover:text-[#C5A880] hover:bg-white/80 dark:hover:bg-[#1E1D1B] rounded-full transition-colors cursor-pointer shrink-0"
                aria-label={`View wishlist, ${wishlist.length} item${wishlist.length === 1 ? '' : 's'} saved`}
              >
                <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${wishlist.length > 0 ? 'fill-[#C5A880] text-[#C5A880]' : ''}`} />
                {wishlist.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-[#1C1B1A] dark:bg-[#FAF8F5] text-[#FAF8F5] dark:text-[#1C1B1A] text-[9px] font-semibold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {wishlist.length}
                  </span>
                )}
              </button>

              {/* Shopping Bag Button with smooth visual feedback */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-[#1C1B1A] dark:text-[#F5F2EB] hover:text-[#C5A880] hover:bg-white/80 dark:hover:bg-[#1E1D1B] rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 group"
                aria-label={`Shopping bag, ${cartCount} item${cartCount === 1 ? '' : 's'} in cart`}
              >
                <div className="relative">
                  <ShoppingBag className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${cartAnimationKey > 0 ? 'scale-110 text-[#C5A880]' : ''}`} />
                  {cartCount > 0 && (
                    <span 
                      key={cartAnimationKey}
                      className="absolute -top-1 -right-1 bg-[#C5A880] text-[#1C1B1A] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-scale-bounce"
                    >
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="hidden xl:inline text-xs font-semibold tracking-wider uppercase text-[#1C1B1A] dark:text-[#F5F2EB]">
                  Bag ({cartCount})
                </span>
              </button>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav 
            className="hidden lg:flex items-center justify-center gap-5 xl:gap-7 py-1 border-t border-[#E8DFD8]/60 dark:border-[#262422] text-[11px] sm:text-xs font-medium tracking-[0.08em] uppercase text-[#4A4541] dark:text-[#A69E96]"
            aria-label="Main desktop navigation"
          >
            {/* Tab 0: Shop */}
            <button
              type="button"
              onClick={() => {
                setActiveNavTab('home');
                setSelectedCategory('all');
                setSearchQuery('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label="Browse creations catalog"
              className={`hover:text-[#1C1B1A] dark:hover:text-[#FAF8F5] transition-colors pb-1 border-b-2 cursor-pointer ${
                activeNavTab === 'home'
                  ? 'border-[#C5A880] text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold'
                  : 'border-transparent text-[#5E5955] dark:text-[#A69E96]'
              }`}
            >
              {t('navCreations')}
            </button>

            {/* Meet the Founder and Creator (Sahina Shrestha) */}
            <button
              type="button"
              onClick={() => {
                setActiveNavTab('artisan');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label="Meet founder and creator Sahina Shrestha and read her story"
              className={`hover:text-[#1C1B1A] dark:hover:text-[#FAF8F5] transition-colors flex items-center gap-1.5 pb-1 border-b-2 cursor-pointer ${
                activeNavTab === 'artisan'
                  ? 'border-[#C5A880] text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold'
                  : 'border-transparent text-[#8C5D36] dark:text-[#C5A880] hover:border-[#D4AF37]'
              }`}
              title="Meet founder and creator Sahina Shrestha"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{t('navMeetArtisan')}</span>
            </button>

            {/* Workshops & Training Gallery */}
            <button
              type="button"
              onClick={() => {
                setActiveNavTab('workshops');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label="View workshops, training photos and videos"
              className={`hover:text-[#1C1B1A] dark:hover:text-[#FAF8F5] transition-colors flex items-center gap-1.5 pb-1 border-b-2 cursor-pointer ${
                activeNavTab === 'workshops'
                  ? 'border-[#C5A880] text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold'
                  : 'border-transparent text-[#5E5955] dark:text-[#A69E96]'
              }`}
              title="Workshops & Masterclasses by Sahina Shrestha"
            >
              <Award className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>{language === 'ne' ? 'कार्यशाला र तालिम' : 'Workshops'}</span>
            </button>

            {/* Tab 1: As Seen On TikTok */}
            <button
              type="button"
              onClick={() => {
                setActiveNavTab('tiktok');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label="Watch As Seen On TikTok videos"
              className={`hover:text-[#1C1B1A] dark:hover:text-[#FAF8F5] transition-colors flex items-center gap-1.5 pb-1 border-b-2 cursor-pointer ${
                activeNavTab === 'tiktok'
                  ? 'border-[#C5A880] text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold'
                  : 'border-transparent text-[#5E5955] dark:text-[#A69E96]'
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
              </svg>
              <span>{t('navTikTok')}</span>
            </button>

            {/* Tab 2: Instagram Journal */}
            <button
              type="button"
              onClick={() => {
                setActiveNavTab('journal');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label="View Instagram Craft Journal"
              className={`hover:text-[#1C1B1A] dark:hover:text-[#FAF8F5] transition-colors flex items-center gap-1.5 pb-1 border-b-2 cursor-pointer ${
                activeNavTab === 'journal'
                  ? 'border-[#C5A880] text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold'
                  : 'border-transparent text-[#5E5955] dark:text-[#A69E96]'
              }`}
            >
              <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />
              <span>{t('navJournal')}</span>
            </button>

            {/* Tab 3: Our Story & Journal (Merged) */}
            <button
              type="button"
              onClick={() => {
                setActiveNavTab('craft');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label="Read our craft story, heritage, and journal articles"
              className={`hover:text-[#1C1B1A] dark:hover:text-[#FAF8F5] transition-colors flex items-center gap-1.5 pb-1 border-b-2 cursor-pointer ${
                activeNavTab === 'craft' || activeNavTab === 'craft-journal'
                  ? 'border-[#C5A880] text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold'
                  : 'border-transparent text-[#5E5955] dark:text-[#A69E96]'
              }`}
            >
              <Feather className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>{language === 'ne' ? 'हाम्रो कथा र जर्नल' : 'Our Story & Journal'}</span>
            </button>

            {/* Tab 5: Track Order */}
            <button
              type="button"
              onClick={() => {
                setActiveNavTab('track');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label="Track order progress and delivery status"
              className={`hover:text-[#1C1B1A] dark:hover:text-[#FAF8F5] transition-colors flex items-center gap-1.5 pb-1 border-b-2 cursor-pointer ${
                activeNavTab === 'track'
                  ? 'border-[#C5A880] text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold'
                  : 'border-transparent text-[#5E5955] dark:text-[#A69E96]'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>{t('navTrackOrder')}</span>
            </button>

            {/* Tab 6: Order Progress (Strictly for Seller) */}
            {isSellerMode && (
              <button
                type="button"
                onClick={() => {
                  setActiveNavTab('orders');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                aria-label="Seller Studio: Manage order progress"
                className={`hover:text-[#1C1B1A] dark:hover:text-[#FAF8F5] transition-colors flex items-center gap-1.5 pb-1 border-b-2 cursor-pointer whitespace-nowrap animate-in fade-in duration-150 ${
                  activeNavTab === 'orders'
                    ? 'border-[#D4AF37] text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold'
                    : 'border-transparent text-[#5E5955] dark:text-[#A69E96]'
                }`}
                title="Seller Studio: Open Order Progress"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="font-semibold text-[#1C1B1A] dark:text-[#FAF8F5]">Order Progress</span>
                <span className="text-[9px] bg-[#D4AF37] text-[#1C1B1A] font-bold px-1.5 py-0.2 rounded-full">
                  Seller
                </span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Real-time Interactive Search Filtering Modal */}
      <NavbarSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col lg:hidden">
          <div
            className="fixed inset-0 bg-[#1C1B1A]/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative w-4/5 max-w-sm bg-[#FAF8F5] dark:bg-[#141312] h-full shadow-2xl flex flex-col justify-between overflow-y-auto z-10 border-r border-[#E8DFD8] dark:border-[#2D2B28] text-[#1C1B1A] dark:text-[#F5F2EB]">
            <div className="p-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#E8DFD8] dark:border-[#2D2B28]">
                <ArtifiedLogo variant={isDarkMode ? 'light' : 'dark'} size="sm" />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-[#8C847E] hover:text-[#1C1B1A] dark:hover:text-[#FAF8F5] cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Quick Action: Theme & Language Toggle */}
              <div className="mt-3 flex items-center justify-between gap-2 p-2 bg-white/80 dark:bg-[#1C1B1A] border border-[#E8DFD8] dark:border-[#2D2B28] rounded-2xl">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#FAF8F5] dark:bg-[#252422] text-xs font-semibold text-[#1C1B1A] dark:text-[#F5F2EB] shadow-2xs hover:border-[#C5A880] transition-colors"
                >
                  {isDarkMode ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-[#E6CA9E]" />
                      <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-[#1C1B1A]" />
                      <span>Dark Mode</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#FAF8F5] dark:bg-[#252422] text-xs font-semibold text-[#1C1B1A] dark:text-[#F5F2EB] shadow-2xs hover:border-[#C5A880] transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>{language === 'ne' ? 'English' : 'नेपाली'}</span>
                </button>
              </div>

              {/* Navigation links */}
              <div className="mt-4 flex flex-col space-y-1">
                {/* 0. Shop */}
                <button
                  onClick={() => {
                    setActiveNavTab('home');
                    setSelectedCategory('all');
                    setSearchQuery('');
                    setMobileMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  aria-label="Browse all handmade creations"
                  className={`flex items-center justify-between py-2.5 text-xs font-semibold tracking-wider uppercase border-b border-[#F0EBE5] dark:border-[#262422] ${
                    activeNavTab === 'home' ? 'text-[#C5A880]' : 'text-[#1C1B1A] dark:text-[#F5F2EB]'
                  }`}
                >
                  <span>{t('navCreations')}</span>
                  <ChevronRight className="w-4 h-4 text-[#8C847E]" />
                </button>

                {/* Meet the Founder and Creator (Sahina Shrestha) */}
                <button
                  onClick={() => {
                    setActiveNavTab('artisan');
                    setMobileMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  aria-label="Meet founder and creator Sahina Shrestha"
                  className={`flex items-center justify-between py-2.5 text-xs font-semibold tracking-wider uppercase border-b border-[#F0EBE5] dark:border-[#262422] ${
                    activeNavTab === 'artisan' ? 'text-[#C5A880] font-bold' : 'text-[#8C5D36] dark:text-[#E6CA9E]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <span>{t('navMeetArtisan')} (Sahina Shrestha)</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#8C847E]" />
                </button>

                {/* Workshops & Training Gallery */}
                <button
                  onClick={() => {
                    setActiveNavTab('workshops');
                    setMobileMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  aria-label="Workshops & Training"
                  className={`flex items-center justify-between py-2.5 text-xs font-semibold tracking-wider uppercase border-b border-[#F0EBE5] dark:border-[#262422] ${
                    activeNavTab === 'workshops' ? 'text-[#C5A880] font-bold' : 'text-[#4A4541] dark:text-[#A69E96]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#C5A880]" />
                    <span>{language === 'ne' ? 'कार्यशाला र तालिम' : 'Workshops & Training Gallery'}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#8C847E]" />
                </button>

                {/* 1. Follow on TikTok */}
                <button
                  onClick={() => {
                    setActiveNavTab('tiktok');
                    setMobileMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  aria-label="Follow on TikTok"
                  className={`flex items-center justify-between py-2.5 text-xs font-medium tracking-wider uppercase border-b border-[#F0EBE5] dark:border-[#262422] ${
                    activeNavTab === 'tiktok' ? 'text-[#C5A880] font-semibold' : 'text-[#4A4541] dark:text-[#A69E96]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
                    </svg>
                    <span>Follow on TikTok (@artified_np)</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#8C847E]" />
                </button>

                {/* 2. Follow on Instagram */}
                <a
                  href={instagramProfileUrl || 'https://www.instagram.com/artified_np/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Follow on Instagram"
                  className="flex items-center justify-between py-2.5 text-xs font-medium tracking-wider uppercase border-b border-[#F0EBE5] dark:border-[#262422] text-[#1C1B1A] dark:text-[#F5F2EB] hover:text-[#E1306C]"
                >
                  <span className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-[#E1306C]" />
                    <span>Follow on Instagram ({instagramHandle || '@artified_np'})</span>
                  </span>
                  <ExternalLink className="w-4 h-4 text-[#8C847E]" />
                </a>

                {/* 3. Our Craft & Story */}
                <button
                  onClick={() => {
                    setActiveNavTab('craft');
                    setMobileMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  aria-label="Read our craft story and atelier heritage"
                  className={`flex items-center justify-between py-2.5 text-xs font-medium tracking-wider uppercase border-b border-[#F0EBE5] dark:border-[#262422] ${
                    activeNavTab === 'craft' ? 'text-[#C5A880] font-semibold' : 'text-[#4A4541] dark:text-[#A69E96]'
                  }`}
                >
                  <span>{language === 'ne' ? 'हाम्रो कथा र जर्नल' : 'Our Story & Journal'}</span>
                  <ChevronRight className="w-4 h-4 text-[#8C847E]" />
                </button>

                {/* 4. Track Order */}
                <button
                  onClick={() => {
                    setActiveNavTab('track');
                    setMobileMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  aria-label="Track real-time order status"
                  className={`flex items-center justify-between py-2.5 text-xs font-medium tracking-wider uppercase border-b border-[#F0EBE5] dark:border-[#262422] ${
                    activeNavTab === 'track' ? 'text-[#C5A880] font-semibold' : 'text-[#1C1B1A] dark:text-[#F5F2EB]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#C5A880]" />
                    <span>{t('navTrackOrder')}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#8C847E]" />
                </button>

                {/* 5. Order Progress (Strictly for Seller) */}
                {isSellerMode && (
                  <button
                    onClick={() => {
                      setActiveNavTab('orders');
                      setMobileMenuOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    aria-label="Seller Studio: Manage order progress"
                    className={`flex items-center justify-between py-2.5 px-3 my-1 rounded-xl bg-[#1C1B1A] dark:bg-[#252422] text-white text-xs font-semibold border border-[#D4AF37]/50 ${
                      activeNavTab === 'orders' ? 'ring-2 ring-[#D4AF37]' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-[#D4AF37]" />
                      <span>Order Progress</span>
                    </span>
                    <span className="text-[9px] bg-[#D4AF37] text-[#1C1B1A] px-1.5 py-0.5 rounded font-bold">
                      Seller
                    </span>
                  </button>
                )}

                {/* Care Guide helper */}
                <button
                  onClick={() => {
                    setActiveNavTab('home');
                    setMobileMenuOpen(false);
                    setTimeout(() => {
                      const el = document.getElementById('care-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 350);
                  }}
                  aria-label="Read care guide"
                  className="flex items-center justify-between py-2.5 text-xs font-medium tracking-wider uppercase text-[#736C65] dark:text-[#A69E96] border-b border-[#F0EBE5] dark:border-[#262422]"
                >
                  <span>Care Guide</span>
                  <ChevronRight className="w-4 h-4 text-[#8C847E]" />
                </button>
              </div>
            </div>

            {/* Mobile Footer with Social & WhatsApp */}
            <div className="p-5 bg-white/70 dark:bg-[#1A1918] border-t border-[#E8DFD8] dark:border-[#2D2B28] space-y-2">
              <a
                href={instagramProfileUrl || 'https://www.instagram.com/artified_np/'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Artified Nepal on Instagram"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white rounded-lg text-xs font-semibold tracking-wider uppercase hover:opacity-95 transition-opacity shadow-sm"
              >
                <Instagram className="w-4 h-4" />
                <span>Follow {instagramHandle || '@artified_np'} on Instagram</span>
              </a>

              <button
                type="button"
                onClick={openWhatsApp}
                aria-label="Start WhatsApp live chat with atelier"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#25D366] text-white rounded-lg text-xs font-semibold tracking-wider uppercase hover:bg-[#20ba5a] transition-colors shadow-sm cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat on WhatsApp (+977)</span>
              </button>



              <div className="pt-1.5 flex items-center justify-center gap-4 text-xs text-[#736C65] dark:text-[#A69E96]">
                <a
                  href="https://tiktok.com/@artified_np"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#1C1B1A] dark:hover:text-[#FAF8F5] underline underline-offset-2"
                >
                  TikTok: @artified_np
                </a>
                <span>•</span>
                <a
                  href={instagramProfileUrl || 'https://www.instagram.com/artified_np/'}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#1C1B1A] dark:hover:text-[#FAF8F5] underline underline-offset-2"
                >
                  Instagram: {instagramHandle || '@artified_np'}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
