import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, 
  Instagram, 
  BookOpen, 
  Truck,
  ClipboardCheck,
  Feather,
  Sparkles,
  Camera,
  Award
} from 'lucide-react';
import { useCart, AppNavTab } from '../context/CartContext';
import { ProductGrid } from './ProductGrid';
import { MeetArtisanSection } from './MeetArtisanSection';
import { LookbookSection } from './LookbookSection';
import { WorkshopGallery } from './WorkshopGallery';
import { TikTokShowcase } from './TikTokShowcase';
import { InstagramShowcase } from './InstagramShowcase';
import { CraftStoryAndJournal } from './CraftStoryAndJournal';
import { OrderTrackerSection } from './OrderTrackerSection';
import { OrderProgressManagerSection } from './OrderProgressManagerSection';

interface TabMeta {
  id: AppNavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TikTokIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={`${className} fill-current`} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
  </svg>
);

export const TABS_SEQUENCE: TabMeta[] = [
  { id: 'home', label: 'Shop', icon: Home },
  { id: 'artisan', label: 'Meet the Founder & Creator', icon: Sparkles },
  { id: 'workshops', label: 'Workshops', icon: Award },
  { id: 'lookbook', label: 'Lookbook', icon: Camera },
  { id: 'tiktok', label: 'Follow on TikTok', icon: TikTokIcon },
  { id: 'journal', label: 'Follow on Instagram', icon: Instagram },
  { id: 'craft', label: 'Our Story & Journal', icon: Feather },
  { id: 'track', label: 'Track Order', icon: Truck },
  { id: 'orders', label: 'Order Progress', icon: ClipboardCheck },
];

export const MainSwipeDeck: React.FC = () => {
  const { 
    activeNavTab, 
    setActiveNavTab,
    isSellerMode,
    quickViewProduct,
    isCartOpen,
    isWishlistOpen,
    isCheckoutOpen,
    isTrackerOpen
  } = useCart();

  const deckRef = useRef<HTMLDivElement>(null);

  // Strictly restrict orders tab to active seller mode
  const currentTabs = isSellerMode ? TABS_SEQUENCE : TABS_SEQUENCE.filter((t) => t.id !== 'orders');

  useEffect(() => {
    if (!isSellerMode && activeNavTab === 'orders') {
      setActiveNavTab('track');
    }
    if (activeNavTab === 'craft-journal') {
      setActiveNavTab('craft');
    }
  }, [isSellerMode, activeNavTab, setActiveNavTab]);

  const activeIndex = currentTabs.findIndex((t) => t.id === activeNavTab);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;

  // When activeNavTab changes, smoothly scroll window to top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeNavTab]);

  const handlePrevTab = () => {
    const nextIdx = (safeIndex - 1 + currentTabs.length) % currentTabs.length;
    setActiveNavTab(currentTabs[nextIdx].id);
  };

  const handleNextTab = () => {
    const nextIdx = (safeIndex + 1) % currentTabs.length;
    setActiveNavTab(currentTabs[nextIdx].id);
  };

  const prevTabLabel = currentTabs[(safeIndex - 1 + currentTabs.length) % currentTabs.length].label;
  const nextTabLabel = currentTabs[(safeIndex + 1) % currentTabs.length].label;

  // Keyboard navigation when no modal is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) ||
        quickViewProduct ||
        isCartOpen ||
        isWishlistOpen ||
        isCheckoutOpen ||
        isTrackerOpen
      ) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextTab();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevTab();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safeIndex, quickViewProduct, isCartOpen, isWishlistOpen, isCheckoutOpen, isTrackerOpen]);

  return (
    <div 
      ref={deckRef}
      className="relative w-full flex-grow flex flex-col bg-[#FAF8F5] dark:bg-[#0F0E0E] transition-colors duration-200"
    >
      {/* DIRECT ACTIVE SCREEN - Height dynamically matches content, eliminating all gaps above footer */}
      <main className="w-full flex-grow flex flex-col">
        {activeNavTab === 'home' && <ProductGrid />}
        {activeNavTab === 'artisan' && <MeetArtisanSection />}
        {activeNavTab === 'workshops' && <WorkshopGallery />}
        {activeNavTab === 'lookbook' && <LookbookSection />}
        {activeNavTab === 'tiktok' && <TikTokShowcase />}
        {activeNavTab === 'journal' && <InstagramShowcase />}
        {(activeNavTab === 'craft' || activeNavTab === 'craft-journal') && <CraftStoryAndJournal />}
        {activeNavTab === 'track' && <OrderTrackerSection />}
        {isSellerMode && activeNavTab === 'orders' && <OrderProgressManagerSection />}
      </main>
    </div>
  );
};
