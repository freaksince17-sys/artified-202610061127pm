import React, { useState, useMemo, useEffect } from 'react';
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
  AlertCircle,
  Eye,
  SlidersHorizontal,
  PackageCheck,
  PackageX,
  FileCode,
  Cloud,
  RefreshCw,
  Star,
  Bell
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Product } from '../types';
import { calculateTotalSold, isProductBestSeller, calculateReviewsCount } from '../utils/productStats';
import { subscribeToWaitlistCounts } from '../utils/waitlistService';
import { getRealProductImage, CAVIAR_PEARL_BAG_IMAGE } from '../utils/productImages';

export const SellerCatalogListModal: React.FC = () => {
  const { 
    isCatalogListOpen, 
    setIsCatalogListOpen, 
    products, 
    openProductEditor, 
    duplicateProduct, 
    toggleProductStock,
    toggleProductNewArrival,
    batchSetNewArrival,
    deleteProduct,
    setQuickViewProduct,
    isCloudSynced,
    syncStatusText,
    forceSyncAllToCloud,
    bestsellerThreshold,
    setBestsellerThreshold,
    openReviewsManager
  } = useCart();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const handleForceSync = async () => {
    setIsSyncing(true);
    setSyncSuccessMsg(null);
    try {
      await forceSyncAllToCloud();
      setSyncSuccessMsg('All edits synced! Open on your smartphone to see the updates.');
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } catch {
      setSyncSuccessMsg('Sync error occurred. Please check network.');
    } finally {
      setIsSyncing(false);
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

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

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

  if (!isCatalogListOpen) return null;

  const handleEdit = (product: Product) => {
    // Keep list open or close it? We open the editor on top or close list.
    // Opening product editor:
    openProductEditor(product);
  };

  const handleCopyAllJson = () => {
    navigator.clipboard.writeText(JSON.stringify(products, null, 2));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const inStockCount = products.filter((p) => p.inStock).length;
  const soldOutCount = products.filter((p) => !p.inStock).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-[#1C1B1A]/75 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div 
        className="fixed inset-0"
        onClick={() => setIsCatalogListOpen(false)}
      />

      <div className="relative bg-[#FAF8F5] border border-[#E8DFD8] w-full max-w-5xl rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 bg-white border-b border-[#E8DFD8] sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1C1B1A] text-[#D4AF37] flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-semibold text-[#1C1B1A]">
                Product Catalog Manager
              </h2>
              <p className="text-[11px] text-[#736C65] tracking-wide uppercase font-medium">
                {products.length} Handcrafted Pieces • Instant Product Listing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleCopyAllJson}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#5E5955] border border-[#E8DFD8] rounded-lg hover:bg-[#FAF8F5] transition-colors"
              title="Copy entire catalog JSON"
            >
              <FileCode className="w-3.5 h-3.5 text-[#8C7A6B]" />
              <span className="hidden md:inline">{copiedAll ? 'Catalog Copied!' : 'Export JSON'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                openProductEditor(null);
              }}
              className="py-1.5 px-3.5 bg-[#1C1B1A] text-white hover:bg-[#34312F] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Add New Piece</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCatalogListOpen(false)}
              className="p-1.5 text-[#736C65] hover:text-[#1C1B1A] rounded-full hover:bg-[#FAF8F5] transition-colors ml-1"
              aria-label="Close catalog list"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Cloud Multi-Device Sync Indicator Bar */}
        <div className="bg-[#EFE9E2] border-b border-[#E0D5CB] px-6 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#4A453F]">
            <Cloud className="w-4 h-4 text-[#C98A2C] shrink-0" />
            <span className="font-medium">
              {syncStatusText}
            </span>
            <span className="hidden md:inline text-[11px] text-[#736C65]">
              (Changes made on this laptop immediately reflect on smartphones & customer devices)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {syncSuccessMsg && (
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                {syncSuccessMsg}
              </span>
            )}
            <button
              type="button"
              onClick={handleForceSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white text-[#2B2927] border border-[#D5C9BE] rounded-lg hover:bg-[#FAF8F5] transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
              title="Click if you want to immediately push any laptop offline edits to smartphone"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#C98A2C] ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Laptop to Smartphone'}</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-6 py-3.5 bg-[#F7F4F0] border-b border-[#E8DFD8] flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search box */}
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search piece by title, tag, or bead type..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-[#E8DFD8] rounded-xl focus:outline-none focus:border-[#C5A880] text-[#1C1B1A]"
            />
            {search && (
              <button 
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#1C1B1A]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none no-scrollbar text-[11px]">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
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
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
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
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
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
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
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
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
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
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
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
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
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
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedFilter === 'sold-out' 
                  ? 'bg-[#736C65] text-white shadow-2xs' 
                  : 'bg-white text-[#736C65] border border-[#E8DFD8] hover:text-[#1C1B1A]'
              }`}
            >
              Sold Out ({soldOutCount})
            </button>

            {/* Monthly Bestseller Threshold Input */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#C5A880]/60 rounded-lg text-xs whitespace-nowrap ml-auto">
              <span className="text-[#736C65] text-[11px] font-medium">Bestseller Rule:</span>
              <span className="text-[#1C1B1A] font-bold">&ge;</span>
              <input
                type="number"
                min={1}
                value={bestsellerThreshold}
                onChange={(e) => setBestsellerThreshold(Math.max(1, Number(e.target.value)))}
                className="w-12 text-center font-bold text-xs bg-[#FAF8F5] border border-[#E8DFD8] rounded px-1 py-0.5 text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                title="Monthly threshold for Bestseller badge"
              />
              <span className="text-[#736C65] text-[10px]">sold</span>
            </div>
          </div>
        </div>

        {/* Batch Selection Action Toolbar (when items are checked) */}
        {selectedProductIds.length > 0 && (
          <div className="px-6 py-2.5 bg-[#FAF3E8] border-b border-[#E2CEB0] flex flex-wrap items-center justify-between gap-3 text-xs animate-fade-in sticky top-[108px] z-10 shadow-xs">
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
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between animate-fade-in">
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

        {/* Product Items Table/List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-[#E8DFD8]/70">
          {/* Quick Selection Toolbar Header */}
          <div className="pb-3 flex items-center justify-between gap-3 text-xs text-[#736C65]">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={
                  filteredProducts.length > 0 &&
                  filteredProducts.every((p) => selectedProductIds.includes(p.id))
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
            <div className="py-16 text-center">
              <Layers className="w-8 h-8 text-[#C5A880] mx-auto mb-2 opacity-60" />
              <p className="text-sm font-semibold text-[#1C1B1A]">No matching pieces found</p>
              <p className="text-xs text-[#736C65] mt-1">Try clearing your search or filter</p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedFilter('all');
                }}
                className="mt-3 px-3.5 py-1.5 bg-white border border-[#E8DFD8] text-xs font-medium rounded-lg text-[#1C1B1A] hover:bg-[#FAF8F5]"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            filteredProducts.map((prod, index) => {
              const coverImg = getRealProductImage(prod.title, prod.images[0]);
              const isSelected = selectedProductIds.includes(prod.id);
              return (
                <div 
                  key={prod.id} 
                  className={`py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group -mx-2 px-2 rounded-xl transition-colors ${
                    isSelected ? 'bg-amber-50/50' : 'hover:bg-white/60'
                  }`}
                >
                  {/* Left: Checkbox, Thumbnail & Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Row selection checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelectProduct(prod.id);
                      }}
                      className="rounded text-[#C5A880] focus:ring-[#C5A880] w-4 h-4 cursor-pointer shrink-0"
                      title="Select piece for batch New Arrival changes"
                    />

                    <span className="text-[11px] font-mono font-medium text-[#A69E96] w-4 shrink-0 hidden md:block">
                      {index + 1}
                    </span>

                    {/* Image Preview */}
                    <div 
                      onClick={() => handleEdit(prod)}
                      className="relative w-14 h-16 rounded-lg overflow-hidden border border-[#E8DFD8] bg-white shrink-0 cursor-pointer shadow-2xs group-hover:border-[#C5A880] transition-colors"
                    >
                      <img 
                        src={coverImg} 
                        alt={prod.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                      <span className="absolute bottom-0.5 right-0.5 bg-[#1C1B1A]/80 text-[#FAF8F5] text-[8px] font-bold px-1 rounded">
                        {prod.images.length}
                      </span>
                    </div>

                    {/* Title and metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(prod)}
                          className="font-serif text-sm font-semibold text-[#1C1B1A] hover:text-[#C5A880] text-left transition-colors truncate max-w-xs sm:max-w-md"
                        >
                          {prod.title}
                        </button>

                        <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-[#FAF8F5] text-[#736C65] border border-[#E8DFD8]">
                          {prod.category.replace('-', ' ')}
                        </span>

                        {isProductBestSeller(prod, bestsellerThreshold) ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#1C1B1A] text-[#E6C687] border border-[#C5A880]/50 shadow-2xs">
                            ★ Bestseller ({calculateTotalSold(prod)} &ge; {bestsellerThreshold})
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-500">
                            {calculateTotalSold(prod)}/{bestsellerThreshold} to Bestseller
                          </span>
                        )}

                        {/* Waitlist subscribers count badge */}
                        {(waitlistCounts[prod.id] || 0) > 0 && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                            <Bell className="w-2.5 h-2.5 text-amber-700 animate-bounce" />
                            <span>{waitlistCounts[prod.id]} Waiting</span>
                          </span>
                        )}

                        {/* Interactive New Arrival Badge Toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProductNewArrival(prod.id);
                          }}
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 transition-all cursor-pointer ${
                            prod.isNewArrival
                              ? 'bg-[#C5A880] text-white hover:bg-[#A3865E] shadow-2xs'
                              : 'bg-[#FAF8F5] text-[#8C7A6B] border border-dashed border-[#D5C9BE] hover:border-[#C5A880] hover:text-[#8A6224] hover:bg-[#FAF3E8]'
                          }`}
                          title={prod.isNewArrival ? "Selected as New Arrival (click to unselect)" : "Click to select as New Arrival"}
                        >
                          <Sparkles className={`w-2.5 h-2.5 ${prod.isNewArrival ? 'fill-white text-white' : 'text-[#A69E96]'}`} />
                          <span>{prod.isNewArrival ? 'New Arrival' : '+ Mark New'}</span>
                          {prod.isNewArrival && (
                            <span className="text-[10px] leading-none ml-0.5 font-normal opacity-80 hover:opacity-100">✕</span>
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-[#736C65] truncate max-w-sm sm:max-w-xl">
                        {prod.subtitle || prod.description}
                      </p>

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#8C7A6B]">
                        <span>Sold: <strong className="text-[#1C1B1A]">{calculateTotalSold(prod)}</strong> {prod.onlineSalesCount ? `(${prod.onlineSalesCount} online)` : ''}</span>
                        <span>•</span>
                        <span>Reviews: <strong className="text-[#1C1B1A]">{calculateReviewsCount(prod)}</strong> ({Math.round((calculateReviewsCount(prod) / Math.max(1, calculateTotalSold(prod))) * 100)}%)</span>
                        <span>•</span>
                        <span>⭐ {prod.rating || 5.0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle / Right: Pricing, Stock Toggle, New Arrival Toggle & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E8DFD8]/40">
                    
                    {/* Price */}
                    <div className="text-left sm:text-right">
                      <div className="font-semibold text-xs sm:text-sm text-[#1C1B1A]">
                        Rs. {prod.price.toLocaleString()}
                      </div>
                      {prod.originalPrice && (
                        <div className="text-[10px] text-[#A69E96] line-through">
                          Rs. {prod.originalPrice.toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* New Arrival Direct Toggle Button */}
                    <button
                      type="button"
                      onClick={() => toggleProductNewArrival(prod.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                        prod.isNewArrival 
                          ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-2xs' 
                          : 'bg-white text-[#736C65] border-[#E8DFD8] hover:border-[#C5A880] hover:text-[#1C1B1A] hover:bg-[#FAF8F5]'
                      }`}
                      title={prod.isNewArrival ? "Click to unselect / remove from New Arrivals" : "Click to select / mark as New Arrival"}
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${prod.isNewArrival ? 'text-amber-600 fill-amber-500' : 'text-[#A69E96]'}`} />
                      <span>{prod.isNewArrival ? 'New Arrival' : 'Set New'}</span>
                      {prod.isNewArrival && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      )}
                    </button>

                    {/* Stock Toggle / Restock & Notify Button */}
                    {!prod.inStock && (waitlistCounts[prod.id] || 0) > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggleProductStock(prod.id)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white shadow-sm cursor-pointer animate-pulse"
                        title={`Restock now: will automatically update Firestore and trigger notifications for ${waitlistCounts[prod.id]} waiting customer${waitlistCounts[prod.id] > 1 ? 's' : ''}!`}
                      >
                        <Bell className="w-3.5 h-3.5 fill-white text-white" />
                        <span>Restock & Notify ({waitlistCounts[prod.id]})</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleProductStock(prod.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          prod.inStock 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                        }`}
                        title="Click to toggle In Stock / Sold Out"
                      >
                        {prod.inStock ? (
                          <>
                            <PackageCheck className="w-3 h-3 text-emerald-600" />
                            <span>In Stock ({prod.stockCount})</span>
                          </>
                        ) : (
                          <>
                            <PackageX className="w-3 h-3 text-rose-600" />
                            <span>Sold Out</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      {/* Reviews button */}
                      <button
                        type="button"
                        onClick={() => openReviewsManager(prod.id)}
                        className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                        title="Manage customer reviews for this piece in Seller Studio"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="hidden md:inline">Reviews</span>
                      </button>

                      {/* Full Edit button */}
                      <button
                        type="button"
                        onClick={() => handleEdit(prod)}
                        className="py-1.5 px-3 bg-[#1C1B1A] text-[#FAF8F5] hover:bg-[#34312F] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                        title="Edit photos, description, prices, specs"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Edit</span>
                      </button>

                      {/* Clone / Duplicate button */}
                      <button
                        type="button"
                        onClick={() => {
                          duplicateProduct(prod.id);
                          setClonedNoticeId(prod.id);
                          setTimeout(() => setClonedNoticeId(null), 1800);
                        }}
                        className={`p-2 rounded-lg border transition-colors ${
                          clonedNoticeId === prod.id 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                            : 'text-[#736C65] hover:text-[#1C1B1A] hover:bg-white border-[#E8DFD8]'
                        }`}
                        title="Duplicate as new piece (Saves time for variations)"
                      >
                        {clonedNoticeId === prod.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 animate-scale-in" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Customer preview */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsCatalogListOpen(false);
                          setQuickViewProduct(prod);
                        }}
                        className="p-2 text-[#736C65] hover:text-[#1C1B1A] hover:bg-white rounded-lg border border-[#E8DFD8] transition-colors hidden sm:block"
                        title="View customer modal"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete with inline confirmation (no window.confirm needed) */}
                      {confirmDeleteId === prod.id ? (
                        <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg animate-fade-in shadow-2xs">
                          <span className="text-[11px] text-rose-800 font-semibold">Delete?</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteProduct(prod.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition-colors shadow-2xs"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            className="px-1.5 py-0.5 bg-white hover:bg-[#FAF8F5] text-[#5E5955] border border-[#E8DFD8] rounded text-[10px] transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(prod.id);
                          }}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors"
                          title="Delete piece"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 bg-white border-t border-[#E8DFD8] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#736C65]">
          <div className="flex items-center gap-3">
            <span>Total: <strong>{products.length}</strong></span>
            <span>•</span>
            <span className="text-[#8A6224]">New Arrivals: <strong>{newArrivalsCount}</strong></span>
            <span>•</span>
            <span className="text-emerald-700">In Stock: <strong>{inStockCount}</strong></span>
            <span>•</span>
            <span className="text-rose-700">Sold Out: <strong>{soldOutCount}</strong></span>
          </div>

          <p className="text-[11px] text-[#8C7A6B]">
            ✨ Tip: Select or unselect <strong>New Arrival</strong> with 1 click directly in this list, or use checkboxes for batch actions.
          </p>
        </div>

      </div>
    </div>
  );
};
