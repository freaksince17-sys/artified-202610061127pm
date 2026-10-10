import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Lock, 
  ChevronUp, 
  ChevronDown, 
  Package, 
  Layers, 
  Video, 
  Feather, 
  Instagram, 
  Star, 
  RefreshCw,
  QrCode,
  KeyRound,
  Check,
  Award,
  Gift
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { SellerPaymentSettingsModal } from './SellerPaymentSettingsModal';
import { SellerChangePasswordModal } from './SellerChangePasswordModal';
import { ArtisanProfileEditModal } from './ArtisanProfileEditModal';
import { UnifiedMasterclassModal } from './UnifiedMasterclassModal';
import { MasterclassCreationModal } from './MasterclassCreationModal';

export const SellerToolbar: React.FC = () => {
  const { 
    isSellerMode, 
    setIsSellerMode, 
    products, 
    setIsCatalogListOpen,
    reels,
    openTikTokEditor,
    instagramItems,
    openInstagramEditor,
    setIsCraftStoryModalOpen,
    bestsellerThreshold,
    setBestsellerThreshold,
    openReviewsManager,
    setIsWebsiteExportOpen,
    isDataSyncing,
    triggerCloudSync,
    isReferralVisible,
    toggleReferralVisibility
  } = useCart();

  const [isMinimized, setIsMinimized] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isPaymentSettingsOpen, setIsPaymentSettingsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isArtisanProfileOpen, setIsArtisanProfileOpen] = useState(false);
  const [isWorkshopModalOpen, setIsWorkshopModalOpen] = useState(false);
  const [isMasterclassCreationOpen, setIsMasterclassCreationOpen] = useState(false);

  // Ensure persistent localStorage tokens are purged so website never opens with seller mode for visitors
  useEffect(() => {
    try {
      localStorage.removeItem('artified_seller_mode');
      localStorage.removeItem('artified_seller_session');
      localStorage.removeItem('artified_seller_session_token');
    } catch {}
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    setSyncSuccess(false);
    try {
      if (triggerCloudSync) {
        await triggerCloudSync();
      }
      setSyncSuccess(true);
      setTimeout(() => {
        setSyncSuccess(false);
      }, 2500);
    } catch (e) {
      console.warn('Manual sync error:', e);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleClearMediaCache = async () => {
    try {
      if ('caches' in window) {
        await caches.delete('artified-firebase-storage-assets');
        await caches.delete('artified-video-assets');
        await caches.delete('artified-local-images');
      }
      localStorage.removeItem('artified_custom_workshop_media_v30');
      localStorage.removeItem('artified_deleted_workshop_ids_v12');
      console.info('🧹 Explicitly cleared artified-firebase-storage-assets, artified-video-assets, and artified-local-images caches.');
      window.location.reload();
    } catch (err) {
      console.error('Error clearing media cache:', err);
    }
  };

  if (!isSellerMode) return null;

  return (
    <aside 
      aria-label="Seller Studio Mode Controls" 
      className="fixed bottom-16 md:bottom-4 right-3 sm:right-5 z-[999] flex flex-col items-end gap-1.5 animate-fade-in"
    >
      {/* Minimized Pill */}
      {isMinimized ? (
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1B1A] text-[#FAF8F5] border border-[#C5A880]/50 rounded-full shadow-xl hover:bg-[#2C2927] transition-all text-xs font-semibold"
          title="Expand Seller Toolbar"
        >
          <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
          <span>Seller Studio ({products.length})</span>
          <ChevronUp className="w-3.5 h-3.5 text-[#C5A880]" />
        </button>
      ) : (
        /* Compact Expanded Floating Toolbar */
        <div className="bg-[#1C1B1A]/95 text-white border border-[#C5A880]/40 rounded-2xl shadow-2xl p-2.5 sm:p-3 backdrop-blur-md w-64 sm:w-72 flex flex-col gap-2 max-h-[88vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
              <div>
                <p className="text-[11px] font-bold text-white tracking-wide flex items-center gap-1">
                  <span>Seller Studio</span>
                  <span className="text-[9px] font-medium text-[#C5A880] bg-[#C5A880]/20 px-1 py-0.2 rounded">
                    Seller
                  </span>
                </p>
                <p className="text-[9px] text-[#A69E96]">
                  Invisible to buyers • {products.length} products
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-1 text-[#A69E96] hover:text-white rounded-md transition-colors"
              title="Minimize toolbar"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Compact Action Rows */}
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setIsCatalogListOpen(true)}
              className="w-full py-1.5 px-2.5 bg-[#FAF8F5] text-[#1C1B1A] hover:bg-white text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <Layers className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Manage All Products ({products.length})</span>
            </button>

            {/* Compact Monthly Bestseller Threshold */}
            <div className="py-1 px-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-[#D8D2CB] text-[10px]">Monthly Bestseller Goal:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  value={bestsellerThreshold}
                  onChange={(e) => setBestsellerThreshold(Math.max(1, Number(e.target.value)))}
                  className="w-12 text-center h-5 px-1 bg-black/50 border border-[#C5A880]/60 rounded text-[10px] text-[#E6C687] font-bold focus:outline-none"
                  title="Products with sold count >= this number automatically become Bestsellers"
                />
                <span className="text-[9px] text-[#A69E96]">sold</span>
              </div>
            </div>



            <button
              type="button"
              onClick={() => openReviewsManager(null)}
              className="w-full py-1.5 px-2.5 bg-white/10 hover:bg-white/15 text-white text-[11px] font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-white/10"
            >
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Manage Product Reviews</span>
            </button>

            <button
              type="button"
              onClick={() => setIsArtisanProfileOpen(true)}
              className="w-full py-1.5 px-2.5 bg-white/10 hover:bg-white/15 text-white text-[11px] font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-white/10"
              title="Edit Sahina Shrestha's biography, quotes, and photos"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Edit "Meet the Founder & Creator" Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMasterclassCreationOpen(true)}
              className="w-full py-1.5 px-2.5 bg-[#C5A880] hover:bg-[#b8986c] text-[#1C1B1A] text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              title="Create new workshop with photos, videos, and instant info extraction"
            >
              <Sparkles className="w-3.5 h-3.5 fill-[#1C1B1A]" />
              <span>+ Create Workshop (AI & Storage)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsWorkshopModalOpen(true)}
              className="w-full py-1.5 px-2.5 bg-[#C5A880]/20 hover:bg-[#C5A880]/30 text-[#E6CA9E] text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-[#C5A880]/40"
              title="Edit workshop details, syllabus, schedule, and media"
            >
              <Award className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Manage Workshops & Media</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCraftStoryModalOpen(true)}
              className="w-full py-1.5 px-2.5 bg-white/10 hover:bg-white/15 text-white text-[11px] font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-white/10"
            >
              <Feather className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Edit Craft Story & Making Video</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPaymentSettingsOpen(true)}
              className="w-full py-1.5 px-2.5 bg-white/10 hover:bg-white/15 text-white text-[11px] font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-white/10"
              title="Configure Sahina Shrestha's free QR codes & bank details"
            >
              <QrCode className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Personal QR & Payment Setup (Free)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsWebsiteExportOpen(true)}
              className="w-full py-1.5 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-amber-500/40"
            >
              <Package className="w-3.5 h-3.5 text-amber-300" />
              <span>Export Complete Website & Products</span>
            </button>

            <button
              type="button"
              onClick={handleClearMediaCache}
              className="w-full py-1.5 px-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-red-500/40"
              title="Explicitly clear artified-firebase-storage-assets, artified-video-assets, and artified-local-images caches"
            >
              <RefreshCw className="w-3.5 h-3.5 text-red-300 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Clear Media Cache</span>
            </button>

            {/* Refer a Friend Visibility Toggle for Seller */}
            <button
              type="button"
              onClick={toggleReferralVisibility}
              className={`w-full py-1.5 px-2.5 text-[11px] font-semibold rounded-lg flex items-center justify-between gap-1.5 transition-colors border ${
                isReferralVisible
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                  : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
              title="Click to toggle 'Refer a Friend' visibility on storefront"
            >
              <div className="flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" />
                <span>Refer to Friend</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 font-bold uppercase tracking-wider">
                {isReferralVisible ? 'Visible' : 'Hidden'}
              </span>
            </button>

            {/* On-Demand Manual Cloud Sync Button */}
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isManualSyncing}
              className="w-full py-1.5 px-2.5 bg-[#D4AF37] text-[#1C1B1A] hover:bg-[#c29f2e] rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-75"
              title="Click to manually sync all store data to live Cloud"
            >
              {isManualSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing Store Data...</span>
                </>
              ) : syncSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-950 font-bold" />
                  <span>Synced Successfully!</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Store Data to Cloud</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsChangePasswordOpen(true)}
              className="w-full py-1.5 px-2.5 bg-white/10 hover:bg-white/15 text-white text-[11px] font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-white/10"
              title="Change your private Seller Studio password"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Change Studio Password</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSellerMode(false)}
              className="w-full py-1.5 px-2.5 bg-white/5 hover:bg-rose-950/40 text-[11px] text-rose-300 rounded-lg flex items-center justify-center gap-1.5 border border-rose-900/30 transition-colors"
              title="Exit seller mode to view site as customer"
            >
              <Lock className="w-3 h-3 text-rose-400" />
              <span>Exit & Lock</span>
            </button>
          </div>
        </div>
      )}

      {/* Seller Personal Payment & QR Settings Modal */}
      <SellerPaymentSettingsModal
        isOpen={isPaymentSettingsOpen}
        onClose={() => setIsPaymentSettingsOpen(false)}
      />

      {/* Seller Change Password Modal */}
      <SellerChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* Seller Artisan Profile Edit Modal */}
      <ArtisanProfileEditModal
        isOpen={isArtisanProfileOpen}
        onClose={() => setIsArtisanProfileOpen(false)}
      />

      {/* Unified Masterclass & Media Management Modal */}
      <UnifiedMasterclassModal
        isOpen={isWorkshopModalOpen}
        onClose={() => setIsWorkshopModalOpen(false)}
      />

      {/* Masterclass Creation Modal with Firebase Storage & Gemini AI */}
      <MasterclassCreationModal
        isOpen={isMasterclassCreationOpen}
        onClose={() => setIsMasterclassCreationOpen(false)}
      />
    </aside>
  );
};
