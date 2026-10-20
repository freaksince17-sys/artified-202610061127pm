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
  Gift,
  TrendingUp,
  BarChart3,
  Download,
  FileSpreadsheet,
  AlertCircle,
  X
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { SellerPaymentSettingsModal } from './SellerPaymentSettingsModal';
import { SellerChangePasswordModal } from './SellerChangePasswordModal';
import { ArtisanProfileEditModal } from './ArtisanProfileEditModal';
import { UnifiedMasterclassModal } from './UnifiedMasterclassModal';
import { MasterclassCreationModal } from './MasterclassCreationModal';
import { SellerD3RevenueModal } from './SellerD3RevenueModal';
import { ProductSalesTrendRechartsModal } from './ProductSalesTrendRechartsModal';
import { getLocalSalesHistory } from '../services/productSalesService';

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
  const [isD3RevenueOpen, setIsD3RevenueOpen] = useState(false);
  const [isRechartsTrendsOpen, setIsRechartsTrendsOpen] = useState(false);
  const [isSavingAndLocking, setIsSavingAndLocking] = useState(false);

  const handleSaveExitAndLock = async () => {
    setIsSavingAndLocking(true);
    try {
      if (triggerCloudSync) {
        await triggerCloudSync();
      }
    } catch (e) {
      console.warn('Save on exit notice:', e);
    } finally {
      setIsSavingAndLocking(false);
      setIsSellerMode(false);
    }
  };

  const handleDownloadCurrentMonthReport = async () => {
    try {
      let records = getLocalSalesHistory(products);
      try {
        const res = await fetch(`/api/sales/history?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.salesHistory) && data.salesHistory.length > 0) {
            records = data.salesHistory;
          }
        }
      } catch {}

      const now = new Date();
      const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const currentMonthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      const prodMap = new Map<string, { title: string; category: string; units: number; rev: number; unitPrice: number }>();
      let totalRev = 0;
      let totalUnits = 0;

      for (const rec of records) {
        if (!rec || !rec.timestamp) continue;
        const d = new Date(rec.timestamp);
        if (isNaN(d.getTime())) continue;
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (ym !== currentYM) continue;

        const prod = products.find((p) => p.id === rec.productId);
        const title = prod?.title || rec.productTitle || rec.productId || 'Artisan Creation';
        const category = prod?.category || rec.category || 'Jewelry & Accessories';
        const qty = Math.max(1, Number(rec.quantity) || 1);
        const unitPrice = Number(rec.unitPrice) > 0 ? Number(rec.unitPrice) : prod?.price || 1500;
        const rev = qty * unitPrice;

        totalRev += rev;
        totalUnits += qty;

        const existing = prodMap.get(rec.productId) || { title, category, units: 0, rev: 0, unitPrice };
        existing.units += qty;
        existing.rev += rev;
        prodMap.set(rec.productId, existing);
      }

      let csv = `Artified Seller Studio - Monthly Sales Report (${currentMonthName})\n`;
      csv += `Report Generated,${now.toLocaleString()}\n`;
      csv += `Total Month Revenue (NPR),${totalRev}\n`;
      csv += `Total Month Units Sold,${totalUnits}\n\n`;
      csv += `Product ID,Product Name,Category,Units Sold,Unit Price (NPR),Total Revenue (NPR)\n`;

      for (const [pId, item] of prodMap.entries()) {
        csv += `${pId},"${item.title.replace(/"/g, '""')}","${item.category}",${item.units},${item.unitPrice},${item.rev}\n`;
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `artified_sales_report_${currentYM}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Report download notice:', e);
    }
  };

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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1B1A] text-[#FAF8F5] border border-[#C5A880]/50 rounded-full shadow-xl hover:bg-[#2C2927] transition-colors text-xs font-semibold cursor-pointer"
          title="Expand Seller Toolbar"
        >
          <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
          <span>Seller Studio ({products.length})</span>
          <ChevronUp className="w-3.5 h-3.5 text-[#C5A880]" />
        </button>
      ) : (
        /* Compact Expanded Floating Toolbar */
        <div className="bg-[#1C1B1A] text-white border border-[#C5A880]/40 rounded-2xl shadow-2xl p-2.5 sm:p-3 w-64 sm:w-72 flex flex-col gap-2 max-h-[88vh] overflow-y-auto overscroll-contain">
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
              className="p-1 text-[#A69E96] hover:text-white rounded-md transition-colors cursor-pointer"
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
              className="w-full py-1.5 px-2.5 bg-[#FAF8F5] text-[#1C1B1A] hover:bg-white text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Manage All Products ({products.length})</span>
            </button>

            {/* Seller Analytics & Visualization Tools */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setIsD3RevenueOpen(true)}
                className="py-1.5 px-2 bg-gradient-to-r from-[#D4AF37]/20 to-[#C5A880]/20 hover:from-[#D4AF37]/30 hover:to-[#C5A880]/30 text-[#E6C687] border border-[#C5A880]/40 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors shadow-2xs cursor-pointer"
                title="Visualize sales history revenue with D3.js area and bar charts"
              >
                <TrendingUp className="w-3 h-3 text-[#D4AF37]" />
                <span>Revenue (D3)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRechartsTrendsOpen(true)}
                className="py-1.5 px-2 bg-gradient-to-r from-[#D4AF37]/20 to-[#C5A880]/20 hover:from-[#D4AF37]/30 hover:to-[#C5A880]/30 text-[#E6C687] border border-[#C5A880]/40 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors shadow-2xs cursor-pointer"
                title="Visualize product sales trends with Recharts"
              >
                <BarChart3 className="w-3 h-3 text-[#D4AF37]" />
                <span>Trends (Recharts)</span>
              </button>
            </div>

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
              onClick={() => setIsPaymentSettingsOpen(true)}
              className="w-full py-1.5 px-2.5 bg-white/10 hover:bg-white/15 text-white text-[11px] font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-white/10 cursor-pointer"
              title="Configure Sahina Shrestha's free QR codes & bank details"
            >
              <QrCode className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Personal QR & Payment Setup (Free)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsWebsiteExportOpen(true)}
              className="w-full py-1.5 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-amber-500/40 cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-amber-300" />
              <span>Export Complete Website & Products</span>
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

            {/* On-Demand Save to Repository Button */}
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isManualSyncing}
              className="w-full py-1.5 px-2.5 bg-[#D4AF37] text-[#1C1B1A] hover:bg-[#c29f2e] rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-75"
              title="Save all store data to repository files (visible on live site after pushing to GitHub)"
            >
              {isManualSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to Repository...</span>
                </>
              ) : syncSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-950 font-bold" />
                  <span>Saved! Push to GitHub to Deploy</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Save Store Data to Repo</span>
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
              onClick={handleSaveExitAndLock}
              disabled={isSavingAndLocking}
              className="w-full py-2 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold text-white rounded-lg flex items-center justify-center gap-1.5 border border-emerald-400/50 transition-all shadow-sm cursor-pointer disabled:opacity-70"
              title="Save all updated sales, stock counts, products & orders to Repository & Cloud, then exit and lock Seller Mode"
            >
              {isSavingAndLocking ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Saving All & Locking...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Save, Exit & Lock</span>
                </>
              )}
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

      {/* Seller D3 Revenue Visualization Modal */}
      <SellerD3RevenueModal
        isOpen={isD3RevenueOpen}
        onClose={() => setIsD3RevenueOpen(false)}
      />

      {/* Seller Recharts Product Sales Trends & Report Modal */}
      <ProductSalesTrendRechartsModal
        isOpen={isRechartsTrendsOpen}
        onClose={() => setIsRechartsTrendsOpen(false)}
      />
    </aside>
  );
};
