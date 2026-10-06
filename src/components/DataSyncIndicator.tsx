import React, { useState } from 'react';
import { Cloud, CheckCircle2, RefreshCw, Database, ShieldCheck, Film, Video, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const DataSyncIndicator: React.FC = () => {
  const { 
    isDataSyncing, 
    isCloudSynced, 
    syncStatusText, 
    products, 
    reels, 
    instagramItems,
    triggerCloudSync
  } = useCart();

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    if (triggerCloudSync) {
      await triggerCloudSync();
    }
    setTimeout(() => {
      setIsManualSyncing(false);
    }, 1200);
  };

  return (
    <>
      {/* Top Thin Micro-Progress Line when actively manual syncing */}
      {isManualSyncing && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-[#E8DFD8] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#D4AF37] via-[#C5A880] to-[#1C1B1A] animate-pulse w-full" />
        </div>
      )}

      {/* Floating Status Pill (Fixed at bottom-right or top-right, subtle & non-intrusive) */}
      <div className="fixed bottom-16 right-4 sm:bottom-6 sm:right-6 z-40">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-md transition-all duration-300 border ${
              isDataSyncing || isManualSyncing
                ? 'bg-[#1C1B1A]/90 text-[#D4AF37] border-[#D4AF37]/60 animate-pulse'
                : isCloudSynced
                ? 'bg-white/95 text-[#1C1B1A] border-[#E8DFD8] hover:border-[#C5A880]'
                : 'bg-white/95 text-[#736C65] border-[#E8DFD8]'
            }`}
            title="Click to view Live Cloud Storage & Synchronization status"
          >
            {isDataSyncing || isManualSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                <span className="text-[11px] font-semibold">Syncing with Firestore...</span>
              </>
            ) : isCloudSynced ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-[#1C1B1A]">
                  Cloud Synced ({products.length} Products)
                </span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 text-[#8C7A6B]" />
                <span className="text-[11px]">Local & Server Ready</span>
              </>
            )}
          </button>

          {/* Detailed Info Popover */}
          {isDetailsOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-2xl shadow-2xl border border-[#E8DFD8] p-4 text-[#1C1B1A] animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE5]">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#D4AF37]" />
                  <span className="font-serif text-sm font-bold">Cloud Data Persistence</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailsOpen(false)}
                  className="text-xs text-[#8C7A6B] hover:text-[#1C1B1A] px-1.5 py-0.5 rounded"
                >
                  ✕
                </button>
              </div>

              <div className="py-3 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-[#4A4541]">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Storage Engine:
                  </span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                    Google Cloud Firestore
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#4A4541]">
                  <span className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#8C7A6B]" />
                    Catalog Products:
                  </span>
                  <span className="font-bold text-[#1C1B1A]">
                    {products.length} Items (Safe & Cached)
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#4A4541]">
                  <span className="flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-[#8C7A6B]" />
                    TikTok Reels:
                  </span>
                  <span className="font-bold text-[#1C1B1A]">
                    {reels.length} Videos (Link-Streaming)
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#4A4541]">
                  <span className="flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-[#8C7A6B]" />
                    Instagram Reels:
                  </span>
                  <span className="font-bold text-[#1C1B1A]">
                    {instagramItems.length} Posts (Link-Streaming)
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#4A4541]">
                  <span className="text-[11px] text-[#736C65]">Direct Video Links:</span>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    No files downloaded • Played via Link
                  </span>
                </div>

                <div className="p-2 bg-[#FAF8F5] rounded-xl border border-[#E8DFD8] text-[11px] text-[#736C65]">
                  {syncStatusText}
                </div>
              </div>

              <div className="pt-2 border-t border-[#F0EBE5] flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isManualSyncing || isDataSyncing}
                  className="w-full py-1.5 px-3 bg-[#1C1B1A] text-white hover:bg-[#34312F] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing || isDataSyncing ? 'animate-spin' : ''}`} />
                  <span>{isManualSyncing || isDataSyncing ? 'Synchronizing...' : 'Refresh Cloud Sync'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
