import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Edit3, 
  Copy, 
  Trash2, 
  Check, 
  Sparkles, 
  Layers, 
  Eye,
  PackageCheck,
  PackageX,
  FileCode,
  Cloud,
  Star,
  Bell,
  RotateCcw,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Product } from '../types';
import { calculateTotalSold, isProductBestSeller, calculateReviewsCount } from '../utils/productStats';
import { subscribeToWaitlistCounts } from '../utils/waitlistService';
import { getRealProductImage } from '../utils/productImages';

interface CatalogProductRowProps {
  prod: Product;
  index: number;
  isSelected: boolean;
  isConfirmingDelete: boolean;
  isClonedNotice: boolean;
  waitlistCount: number;
  bestsellerThreshold: number;
  onToggleSelect: (id: string) => void;
  onEdit: (prod: Product) => void;
  onToggleNewArrival: (id: string) => void;
  onToggleStock: (id: string) => void;
  onAdjustStock: (id: string, delta: number) => void;
  onOpenReviews: (id: string) => void;
  onDuplicate: (id: string) => void;
  onPreview: (prod: Product) => void;
  onRequestDelete: (id: string | null) => void;
  onConfirmDelete: (id: string) => void;
}

const CatalogProductRow: React.FC<CatalogProductRowProps> = React.memo(({
  prod,
  index,
  isSelected,
  isConfirmingDelete,
  isClonedNotice,
  waitlistCount,
  bestsellerThreshold,
  onToggleSelect,
  onEdit,
  onToggleNewArrival,
  onToggleStock,
  onAdjustStock,
  onOpenReviews,
  onDuplicate,
  onPreview,
  onRequestDelete,
  onConfirmDelete,
}) => {
  const coverImg = getRealProductImage(prod.title, prod.images?.[0] || '');
  const reviewsCount = calculateReviewsCount(prod);
  const totalSold = calculateTotalSold(prod);
  const isBestSeller = isProductBestSeller(prod, bestsellerThreshold);
  const displayStock = prod.inStock === false ? 0 : (typeof prod.stockCount === 'number' ? Math.max(0, prod.stockCount) : 0);

  const isOddRow = index % 2 === 1;
  const categoryAccentBorder =
    prod.category === 'pearl-bags'
      ? 'border-l-[#D4AF37]'
      : prod.category === 'pearl-necklaces'
      ? 'border-l-emerald-600'
      : prod.category === 'macrame'
      ? 'border-l-amber-600'
      : prod.category === 'accessories'
      ? 'border-l-rose-500'
      : 'border-l-[#8C7A6B]';

  return (
    <div 
      className={`rounded-xl border-2 border-l-[6px] ${categoryAccentBorder} transition-colors duration-100 p-2.5 sm:p-3 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 group ${
        isSelected
          ? 'border-[#C5A880] bg-amber-50/70 ring-1 ring-[#C5A880]/60'
          : isOddRow
          ? 'bg-[#FAF5EE] border-[#D1C2B0] hover:border-[#1C1B1A]'
          : 'bg-white border-[#DFD3C5] hover:border-[#1C1B1A]'
      }`}
    >
      {/* Left: Checkbox, Photo & Key Info (Title, Category, Price) */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Row selection checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect(prod.id);
          }}
          className="rounded text-[#C5A880] focus:ring-[#C5A880] w-4 h-4 cursor-pointer shrink-0"
          title="Select piece for batch New Arrival changes"
        />

        <span
          className={`inline-flex items-center justify-center min-w-[22px] h-5 px-1 rounded font-mono font-extrabold text-[11px] shrink-0 ${
            isOddRow
              ? 'bg-[#2A2522] text-[#D4AF37]'
              : 'bg-[#1C1B1A] text-[#FAF8F5]'
          }`}
        >
          {index + 1}
        </span>

        {/* Image Preview */}
        <div 
          onClick={() => onEdit(prod)}
          className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#C5A880]/50 bg-white shrink-0 cursor-pointer shadow-2xs group-hover:border-[#1C1B1A] transition-colors"
        >
          <img 
            src={coverImg} 
            alt={prod.title} 
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover" 
          />
          <span className="absolute bottom-0.5 right-0.5 bg-[#1C1B1A]/80 text-[#FAF8F5] text-[7px] font-bold px-0.5 rounded">
            {prod.images?.length || 1}
          </span>
        </div>

        {/* Title, Category & Price */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onEdit(prod)}
              className="font-serif text-xs sm:text-sm font-bold text-[#1C1B1A] hover:text-[#C5A880] text-left transition-colors truncate max-w-xs sm:max-w-md cursor-pointer"
            >
              {prod.title}
            </button>

            <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#FAF8F5] text-[#736C65] border border-[#E8DFD8]">
              {(prod.category || 'pearl-bags').replace('-', ' ')}
            </span>

            {isBestSeller && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#1C1B1A] text-[#E6C687] border border-[#C5A880]/50 shadow-2xs">
                ★ Bestseller
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-xs">
            <span className="font-bold text-[#1C1B1A]">
              NPR {Number(prod.price || 0).toLocaleString()}
            </span>
            {prod.originalPrice && prod.originalPrice > (prod.price || 0) && (
              <span className="text-[10px] text-[#A69E96] line-through">
                NPR {Number(prod.originalPrice).toLocaleString()}
              </span>
            )}
            <span className="text-[10px] text-[#8C7A6B]">
              • Sold: <strong className="text-[#1C1B1A]">{totalSold}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Middle & Right: Key Controls (New Arrival, In Stock, Reviews, Edit, Copy, Eye, Delete) */}
      <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-[#E8DFD8]/40">
        
        {/* New Arrival Direct Toggle Button */}
        <button
          type="button"
          onClick={() => onToggleNewArrival(prod.id)}
          className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 border transition-colors cursor-pointer select-none ${
            prod.isNewArrival 
              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-2xs' 
              : 'bg-white text-[#736C65] border-[#E8DFD8] hover:border-[#C5A880] hover:text-[#1C1B1A] hover:bg-[#FAF8F5]'
          }`}
          title={prod.isNewArrival ? "Click to unselect / remove from New Arrivals" : "Click to select / mark as New Arrival"}
        >
          <Sparkles className={`w-3 h-3 ${prod.isNewArrival ? 'text-amber-600 fill-amber-500' : 'text-[#A69E96]'}`} />
          <span>{prod.isNewArrival ? 'New Arrival' : '+ Mark New'}</span>
        </button>

        {/* Stock Toggle + Up/Down (+1 / -1) Arrow Stepper Buttons */}
        <div className="inline-flex items-stretch rounded-lg border overflow-hidden shadow-2xs select-none">
          {!prod.inStock && waitlistCount > 0 ? (
            <button
              type="button"
              onClick={() => onToggleStock(prod.id)}
              className="px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white cursor-pointer"
              title={`Restock now for ${waitlistCount} waiting customer(s)!`}
            >
              <Bell className="w-3 h-3 fill-white text-white" />
              <span>Restock & Notify ({waitlistCount})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggleStock(prod.id)}
              className={`px-2 py-1 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer min-w-[88px] justify-center ${
                prod.inStock 
                  ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100' 
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
              title="Click to toggle In Stock / Sold Out"
            >
              {prod.inStock ? (
                <>
                  <PackageCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="tabular-nums">In Stock ({displayStock})</span>
                </>
              ) : (
                <>
                  <PackageX className="w-3 h-3 text-rose-600 shrink-0" />
                  <span className="tabular-nums">Sold Out (0)</span>
                </>
              )}
            </button>
          )}

          {/* Small Up & Down Arrow Buttons next to In Stock button */}
          <div className={`flex flex-col border-l ${prod.inStock ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAdjustStock(prod.id, 1);
              }}
              className={`px-2 py-0.5 flex-1 flex items-center justify-center transition-transform duration-75 active:scale-90 cursor-pointer ${
                prod.inStock
                  ? 'text-emerald-800 hover:bg-emerald-200/80 active:bg-emerald-300'
                  : 'text-rose-800 hover:bg-rose-200/80 active:bg-rose-300'
              }`}
              title="Increase in-stock count by 1"
              aria-label="Increase in-stock count by 1"
            >
              <ChevronUp className="w-3 h-3 stroke-[2.75]" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAdjustStock(prod.id, -1);
              }}
              disabled={!prod.inStock || displayStock <= 0}
              className={`px-2 py-0.5 flex-1 flex items-center justify-center border-t transition-transform duration-75 active:scale-90 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                prod.inStock
                  ? 'border-emerald-200 text-emerald-800 hover:bg-emerald-200/80 active:bg-emerald-300'
                  : 'border-rose-200 text-rose-800'
              }`}
              title="Decrease in-stock count by 1"
              aria-label="Decrease in-stock count by 1"
            >
              <ChevronDown className="w-3 h-3 stroke-[2.75]" />
            </button>
          </div>
        </div>

        {/* Reviews button */}
        <button
          type="button"
          onClick={() => onOpenReviews(prod.id)}
          className="py-1 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
          title="Manage customer reviews"
        >
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          <span className="tabular-nums">Reviews ({reviewsCount})</span>
        </button>

        {/* Edit button */}
        <button
          type="button"
          onClick={() => onEdit(prod)}
          className="py-1 px-2.5 bg-[#1C1B1A] text-[#FAF8F5] hover:bg-[#34312F] text-[10px] font-semibold rounded-lg flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
          title="Edit piece"
        >
          <Edit3 className="w-3 h-3 text-[#D4AF37]" />
          <span>Edit</span>
        </button>

        {/* Clone / Duplicate button */}
        <button
          type="button"
          onClick={() => onDuplicate(prod.id)}
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            isClonedNotice 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
              : 'text-[#736C65] hover:text-[#1C1B1A] hover:bg-white border-[#E8DFD8]'
          }`}
          title="Duplicate as new piece"
        >
          {isClonedNotice ? (
            <Check className="w-3 h-3 text-emerald-600" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>

        {/* Customer preview */}
        <button
          type="button"
          onClick={() => onPreview(prod)}
          className="p-1.5 text-[#736C65] hover:text-[#1C1B1A] hover:bg-white rounded-lg border border-[#E8DFD8] transition-colors hidden sm:block cursor-pointer"
          title="View customer modal"
        >
          <Eye className="w-3 h-3" />
        </button>

        {/* Delete with inline confirmation */}
        {isConfirmingDelete ? (
          <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-lg shadow-2xs">
            <span className="text-[10px] text-rose-800 font-semibold">Delete?</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onConfirmDelete(prod.id);
              }}
              className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-bold transition-colors cursor-pointer"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRequestDelete(null);
              }}
              className="px-1 py-0.5 bg-white hover:bg-[#FAF8F5] text-[#5E5955] border border-[#E8DFD8] rounded text-[9px] transition-colors cursor-pointer"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete(prod.id);
            }}
            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
            title="Delete piece"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}

      </div>
    </div>
  );
});

export const SellerCatalogListModal: React.FC = () => {
  const { 
    isCatalogListOpen, 
    setIsCatalogListOpen, 
    products, 
    openProductEditor, 
    duplicateProduct, 
    toggleProductStock,
    adjustProductStockCount,
    toggleProductNewArrival,
    batchSetNewArrival,
    deleteProduct,
    setQuickViewProduct,
    forceSyncAllToCloud,
    bestsellerThreshold,
    setBestsellerThreshold,
    openReviewsManager,
    forceRefreshCatalogFromDB,
    isSellerModalOpen
  } = useCart();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const handleForceRefreshAll = async () => {
    setIsForceRefreshing(true);
    setSyncSuccessMsg(null);
    try {
      await forceRefreshCatalogFromDB();
      setSyncSuccessMsg('Client cache cleared! Re-fetched entire product catalog directly from database.');
      setTimeout(() => setSyncSuccessMsg(null), 5000);
    } catch {
      setSyncSuccessMsg('Failed to refresh catalog from database.');
    } finally {
      setIsForceRefreshing(false);
    }
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    setSyncSuccessMsg(null);
    try {
      await forceSyncAllToCloud();
      setSyncSuccessMsg('All pieces permanently saved to Cloud Firestore & repository disk! Custom prices, stock, and sales will never revert.');
      setTimeout(() => setSyncSuccessMsg(null), 5000);
    } catch {
      setSyncSuccessMsg('Sync error occurred. Please check network.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveAndClose = async () => {
    setIsSyncing(true);
    try {
      await forceSyncAllToCloud();
    } catch {
      // ignore
    } finally {
      setIsSyncing(false);
      setIsCatalogListOpen(false);
    }
  };

  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'new-arrivals' | 'pearl-bags' | 'pearl-necklaces' | 'macrame' | 'accessories' | 'custom-beaded' | 'low-stock' | 'sold-out'>('all');
  const [copiedAll, setCopiedAll] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [clonedNoticeId, setClonedNoticeId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);
  const [waitlistCounts, setWaitlistCounts] = useState<Record<string, number>>({});

  // Real-time Firestore Waitlist subscriber counts per product
  useEffect(() => {
    if (!isCatalogListOpen) return;
    const unsubscribe = subscribeToWaitlistCounts((counts) => {
      setWaitlistCounts(counts);
    });
    return () => unsubscribe();
  }, [isCatalogListOpen]);

  // Unified body scroll lock so switching between Catalog Manager and Edit Piece never causes scrollbar layout shift
  useEffect(() => {
    if (isCatalogListOpen || isSellerModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      if (!isCatalogListOpen && !isSellerModalOpen) {
        document.body.style.overflow = '';
      }
    };
  }, [isCatalogListOpen, isSellerModalOpen]);

  // Live count of New Arrivals
  const newArrivalsCount = useMemo(() => products.filter((p) => p.isNewArrival).length, [products]);

  // Filtered and searched list
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Category / stock / new arrival filter
      if (selectedFilter === 'new-arrivals' && !prod.isNewArrival) return false;
      if (selectedFilter === 'pearl-bags' && prod.category !== 'pearl-bags') return false;
      if (selectedFilter === 'pearl-necklaces' && prod.category !== 'pearl-necklaces') return false;
      if (selectedFilter === 'macrame' && prod.category !== 'macrame') return false;
      if (selectedFilter === 'accessories' && prod.category !== 'accessories') return false;
      if (selectedFilter === 'custom-beaded' && prod.category !== 'custom-beaded') return false;
      if (selectedFilter === 'low-stock' && (prod.stockCount > 3 || !prod.inStock)) return false;
      if (selectedFilter === 'sold-out' && prod.inStock) return false;

      // Text search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matches = 
          prod.title.toLowerCase().includes(q) ||
          (prod.subtitle && prod.subtitle.toLowerCase().includes(q)) ||
          prod.category.toLowerCase().includes(q) ||
          prod.materials.some((m) => m.toLowerCase().includes(q)) ||
          prod.tags.some((t) => t.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [products, search, selectedFilter]);

  const toggleSelectProduct = useCallback((id: string) => {
    setSelectedProductIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleEdit = useCallback((product: Product) => {
    openProductEditor(product);
  }, [openProductEditor]);

  const handleDuplicate = useCallback((id: string) => {
    duplicateProduct(id);
    setClonedNoticeId(id);
    setTimeout(() => setClonedNoticeId(null), 1800);
  }, [duplicateProduct]);

  const handlePreview = useCallback((prod: Product) => {
    setIsCatalogListOpen(false);
    setQuickViewProduct(prod);
  }, [setIsCatalogListOpen, setQuickViewProduct]);

  const handleConfirmDelete = useCallback((id: string) => {
    deleteProduct(id);
    setConfirmDeleteId(null);
  }, [deleteProduct]);

  const handleOpenReviews = useCallback((id: string) => {
    openReviewsManager(id);
  }, [openReviewsManager]);

  const handleSelectAllVisible = () => {
    const visibleIds = filteredProducts.map((p) => p.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedProductIds.includes(id));
    if (allSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleBatchNewArrival = async (isNew: boolean) => {
    if (selectedProductIds.length === 0) return;
    const count = selectedProductIds.length;
    await batchSetNewArrival(selectedProductIds, isNew);
    setBatchNotice(
      isNew 
        ? `Marked ${count} piece${count > 1 ? 's' : ''} as New Arrival!` 
        : `Unselected New Arrival for ${count} piece${count > 1 ? 's' : ''}!`
    );
    setTimeout(() => setBatchNotice(null), 3000);
    setSelectedProductIds([]);
  };

  const handleUnselectAllNewArrivals = async () => {
    const currentNewIds = products.filter((p) => p.isNewArrival).map((p) => p.id);
    if (currentNewIds.length === 0) return;
    await batchSetNewArrival(currentNewIds, false);
    setBatchNotice(`Unselected New Arrival for all ${currentNewIds.length} piece${currentNewIds.length > 1 ? 's' : ''}.`);
    setTimeout(() => setBatchNotice(null), 3000);
  };

  const selectedSet = useMemo(() => new Set(selectedProductIds), [selectedProductIds]);
  const inStockCount = useMemo(() => products.filter((p) => p.inStock).length, [products]);
  const soldOutCount = products.length - inStockCount;

  if (!isCatalogListOpen || isSellerModalOpen) return null;

  const handleCopyAllJson = () => {
    navigator.clipboard.writeText(JSON.stringify(products, null, 2));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-[#1C1B1A]/80 overflow-hidden">
      <div 
        className="fixed inset-0"
        onClick={() => setIsCatalogListOpen(false)}
      />

      <div className="relative bg-[#FAF8F5] border border-[#E8DFD8] w-full max-w-5xl rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header - Concise & High-density */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 sm:px-5 sm:py-2.5 bg-white border-b border-[#E8DFD8] shrink-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#1C1B1A] text-[#D4AF37] flex items-center justify-center shadow-2xs shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="font-serif text-base sm:text-lg font-semibold text-[#1C1B1A] leading-tight">
                Product Catalog Manager
              </h2>
              <p className="text-[10px] text-[#736C65] tracking-wide uppercase font-medium">
                {products.length} Handcrafted Pieces • Instant Product Listing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto flex-wrap sm:flex-nowrap">
            {/* Sync All to DB Button */}
            <button
              type="button"
              onClick={handleForceSync}
              disabled={isSyncing}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#8A6224] bg-amber-50/90 border border-[#E2CEB0] rounded-lg hover:bg-amber-100/90 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Sync all catalog pieces directly to Cloud Firestore database"
            >
              <Cloud className={`w-3 h-3 text-[#D4AF37] ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync All to DB</span>
            </button>

            {/* Force Refresh All Button */}
            <button
              type="button"
              onClick={handleForceRefreshAll}
              disabled={isForceRefreshing}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#1C1B1A] bg-white border border-[#E8DFD8] rounded-lg hover:bg-[#FAF8F5] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Clear client cache and re-fetch entire product catalog directly from database"
            >
              <RotateCcw className={`w-3 h-3 text-[#8C7A6B] ${isForceRefreshing ? 'animate-spin' : ''}`} />
              <span>Force Refresh All</span>
            </button>

            {/* Save & Close Button (replaces redundant Backup All to Cloud) */}
            <button
              type="button"
              onClick={handleSaveAndClose}
              disabled={isSyncing}
              className="flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-white bg-emerald-700 border border-emerald-800 rounded-lg hover:bg-emerald-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Save all catalog changes to Cloud & repository disk and close manager"
            >
              <Check className={`w-3.5 h-3.5 text-white ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Saving...' : 'Save & Close'}</span>
            </button>

            {/* Export JSON */}
            <button
              type="button"
              onClick={handleCopyAllJson}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#5E5955] border border-[#E8DFD8] rounded-lg hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              title="Copy entire catalog JSON"
            >
              <FileCode className="w-3 h-3 text-[#8C7A6B]" />
              <span className="hidden md:inline">{copiedAll ? 'Catalog Copied!' : 'Export JSON'}</span>
            </button>

            {/* Add New Piece */}
            <button
              type="button"
              onClick={() => openProductEditor(null)}
              className="py-1 px-3 bg-[#1C1B1A] text-white hover:bg-[#34312F] text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3 h-3 text-[#D4AF37]" />
              <span>Add New Piece</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCatalogListOpen(false)}
              className="p-1 text-[#736C65] hover:text-[#1C1B1A] rounded-full hover:bg-[#FAF8F5] transition-colors ml-0.5 cursor-pointer"
              aria-label="Close catalog list"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sync Success Feedback Notice */}
        {syncSuccessMsg && (
          <div className="px-4 py-1.5 bg-emerald-50 border-b border-emerald-200 text-[11px] text-emerald-800 font-semibold flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              {syncSuccessMsg}
            </span>
            <button 
              type="button" 
              onClick={() => setSyncSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Filter and Search Bar - Concise & High-density */}
        <div className="px-4 py-2 sm:px-5 sm:py-2 bg-[#F7F4F0] border-b border-[#E8DFD8] flex flex-col md:flex-row gap-2 items-center justify-between shrink-0">
          {/* Search box */}
          <div className="relative w-full md:w-72">
            <Search className="w-3 h-3 text-[#8C7A6B] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search piece by title, tag, bead..."
              className="w-full pl-8 pr-7 py-1 text-[11px] bg-white border border-[#E8DFD8] rounded-lg focus:outline-none focus:border-[#C5A880] text-[#1C1B1A]"
            />
            {search && (
              <button 
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#1C1B1A]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-0.5 md:pb-0 scrollbar-none no-scrollbar text-[11px]">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedFilter === 'all' 
                  ? 'bg-[#1C1B1A] text-white shadow-2xs' 
                  : 'bg-white text-[#736C65] border border-[#E8DFD8] hover:text-[#1C1B1A]'
              }`}
            >
              All ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('new-arrivals')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                selectedFilter === 'new-arrivals' 
                  ? 'bg-[#C5A880] text-white shadow-2xs' 
                  : 'bg-amber-50/70 text-[#8A6224] border border-[#E2CEB0] hover:bg-amber-100/70'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#C5A880] fill-[#C5A880]" />
              <span>New Arrivals ({newArrivalsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('pearl-bags')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedFilter === 'pearl-bags' 
                  ? 'bg-[#1C1B1A] text-white shadow-2xs' 
                  : 'bg-white text-[#736C65] border border-[#E8DFD8] hover:text-[#1C1B1A]'
              }`}
            >
              Pearl Bags
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('pearl-necklaces')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedFilter === 'pearl-necklaces' 
                  ? 'bg-[#1C1B1A] text-white shadow-2xs' 
                  : 'bg-white text-[#736C65] border border-[#E8DFD8] hover:text-[#1C1B1A]'
              }`}
            >
              Necklaces
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('macrame')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedFilter === 'macrame' 
                  ? 'bg-[#1C1B1A] text-white shadow-2xs' 
                  : 'bg-white text-[#736C65] border border-[#E8DFD8] hover:text-[#1C1B1A]'
              }`}
            >
              Macrame
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('accessories')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedFilter === 'accessories' 
                  ? 'bg-[#1C1B1A] text-white shadow-2xs' 
                  : 'bg-white text-[#736C65] border border-[#E8DFD8] hover:text-[#1C1B1A]'
              }`}
            >
              Accessories
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('low-stock')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedFilter === 'low-stock' 
                  ? 'bg-rose-900 text-white shadow-2xs' 
                  : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              Low Stock (≤3)
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('sold-out')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedFilter === 'sold-out' 
                  ? 'bg-[#736C65] text-white shadow-2xs' 
                  : 'bg-white text-[#736C65] border border-[#E8DFD8] hover:text-[#1C1B1A]'
              }`}
            >
              Sold Out ({soldOutCount})
            </button>

            {/* Monthly Bestseller Threshold Input */}
            <div className="flex items-center gap-1 px-2 py-0.5 bg-white border border-[#C5A880]/60 rounded-lg text-[11px] whitespace-nowrap ml-auto">
              <span className="text-[#736C65] text-[10px] font-medium">Bestseller Rule:</span>
              <span className="text-[#1C1B1A] font-bold">&ge;</span>
              <input
                type="number"
                min={1}
                value={bestsellerThreshold}
                onChange={(e) => setBestsellerThreshold(Math.max(1, Number(e.target.value)))}
                className="w-10 text-center font-bold text-[11px] bg-[#FAF8F5] border border-[#E8DFD8] rounded px-0.5 py-0 text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                title="Monthly threshold for Bestseller badge"
              />
              <span className="text-[#736C65] text-[10px]">sold</span>
            </div>
          </div>
        </div>

        {/* Batch Selection Action Toolbar (when items are checked) */}
        {selectedProductIds.length > 0 && (
          <div className="px-6 py-2.5 bg-[#FAF3E8] border-b border-[#E2CEB0] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 z-10 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#8A6224] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 fill-[#C5A880] text-[#C5A880]" />
                <span>{selectedProductIds.length} piece{selectedProductIds.length > 1 ? 's' : ''} selected</span>
              </span>
              <span className="text-[#D5C9BE]">|</span>
              <button
                type="button"
                onClick={() => setSelectedProductIds([])}
                className="text-[11px] text-[#736C65] hover:text-[#1C1B1A] underline cursor-pointer"
              >
                Clear selection
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBatchNewArrival(true)}
                className="px-3 py-1.5 bg-[#1C1B1A] text-[#FAF8F5] hover:bg-[#34312F] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                title="Mark all selected products as New Arrival"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Mark Selected as "New Arrival"</span>
              </button>

              <button
                type="button"
                onClick={() => handleBatchNewArrival(false)}
                className="px-3 py-1.5 bg-white text-rose-700 hover:bg-rose-50 border border-rose-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                title="Remove New Arrival status from all selected products"
              >
                <X className="w-3.5 h-3.5 text-rose-500" />
                <span>Unselect "New Arrival"</span>
              </button>
            </div>
          </div>
        )}

        {/* Batch Feedback Notification Toast */}
        {batchNotice && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              {batchNotice}
            </span>
            <button 
              type="button" 
              onClick={() => setBatchNotice(null)}
              className="text-emerald-700 hover:text-emerald-900"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Product Items Table/List - Memoized Rows & Native Buttery Smooth Scrolling */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 bg-[#F7F4F0]/50 space-y-2.5"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Quick Selection Toolbar Header */}
          <div className="pb-1 px-1 flex items-center justify-between gap-3 text-xs text-[#736C65]">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={
                  filteredProducts.length > 0 &&
                  filteredProducts.every((p) => selectedSet.has(p.id))
                }
                onChange={handleSelectAllVisible}
                className="rounded text-[#C5A880] focus:ring-[#C5A880] w-4 h-4 cursor-pointer"
              />
              <span className="text-[11px] font-medium text-[#736C65]">
                Select all ({filteredProducts.length}) visible pieces for New Arrival actions
              </span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#8C7A6B]">
                New Arrivals: <strong className="text-[#8A6224]">{newArrivalsCount}</strong>
              </span>
              {newArrivalsCount > 0 && (
                <button
                  type="button"
                  onClick={handleUnselectAllNewArrivals}
                  className="text-[11px] font-medium text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                  title="Unselect New Arrival status for all products"
                >
                  Clear all New
                </button>
              )}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-[#E8DFD8]">
              <Layers className="w-8 h-8 text-[#C5A880] mx-auto mb-2 opacity-60" />
              <p className="text-sm font-semibold text-[#1C1B1A]">No matching pieces found</p>
              <p className="text-xs text-[#736C65] mt-1">Try clearing your search or filter</p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedFilter('all');
                }}
                className="mt-3 px-3.5 py-1.5 bg-white border border-[#E8DFD8] text-xs font-medium rounded-lg text-[#1C1B1A] hover:bg-[#FAF8F5] cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            filteredProducts.map((prod, index) => (
              <CatalogProductRow
                key={prod.id}
                prod={prod}
                index={index}
                isSelected={selectedSet.has(prod.id)}
                isConfirmingDelete={confirmDeleteId === prod.id}
                isClonedNotice={clonedNoticeId === prod.id}
                waitlistCount={waitlistCounts[prod.id] || 0}
                bestsellerThreshold={bestsellerThreshold}
                onToggleSelect={toggleSelectProduct}
                onEdit={handleEdit}
                onToggleNewArrival={toggleProductNewArrival}
                onToggleStock={toggleProductStock}
                onAdjustStock={adjustProductStockCount}
                onOpenReviews={handleOpenReviews}
                onDuplicate={handleDuplicate}
                onPreview={handlePreview}
                onRequestDelete={setConfirmDeleteId}
                onConfirmDelete={handleConfirmDelete}
              />
            ))
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 bg-white border-t border-[#E8DFD8] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#736C65] shrink-0">
          <div className="flex items-center gap-3">
            <span>Total: <strong>{products.length}</strong></span>
            <span>•</span>
            <span className="text-[#8A6224]">New Arrivals: <strong>{newArrivalsCount}</strong></span>
            <span>•</span>
            <span className="text-emerald-700">In Stock: <strong>{inStockCount}</strong></span>
            <span>•</span>
            <span className="text-rose-700">Sold Out: <strong>{soldOutCount}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-[11px] text-[#8C7A6B] hidden md:block">
              ✨ Tip: Use the <strong>▲ / ▼</strong> buttons next to In Stock for instant 1-click stock adjustments.
            </p>
            <button
              type="button"
              onClick={handleSaveAndClose}
              disabled={isSyncing}
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSyncing ? 'Saving...' : 'Save & Close'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
