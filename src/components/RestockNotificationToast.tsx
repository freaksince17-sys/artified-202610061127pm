import React from 'react';
import { Bell, Sparkles, X, ArrowRight, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const RestockNotificationToast: React.FC = () => {
  const { 
    restockAlerts, 
    dismissRestockAlert, 
    products, 
    setQuickViewProduct,
    lastRestockNotice,
    setLastRestockNotice,
    isSellerMode
  } = useCart();

  const activeAlert = restockAlerts[0];

  const handleOpenProduct = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setQuickViewProduct(prod);
    }
    if (activeAlert) {
      dismissRestockAlert(activeAlert.id);
    }
  };

  return (
    <>
      {/* Seller Notification Alert Banner */}
      {isSellerMode && lastRestockNotice && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-[#1C1B1A] text-white p-4 rounded-2xl border-2 border-[#D4AF37] shadow-2xl animate-in slide-in-from-top duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="p-2 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] shrink-0">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div className="flex-1 text-xs">
              <span className="font-bold text-[#D4AF37] uppercase tracking-wider block text-[10px]">
                Firestore Notification Triggered
              </span>
              <p className="text-white font-medium mt-0.5 leading-relaxed">
                {lastRestockNotice}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLastRestockNotice(null)}
              className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Customer In-App Restock Celebration Alert */}
      {activeAlert && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 max-w-sm w-full bg-white text-[#1C1B1A] p-4 rounded-2xl border-2 border-emerald-500 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 shrink-0">
              <Sparkles className="w-5 h-5 text-emerald-600 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                  🎉 Back In Stock!
                </span>
                <span className="text-[10px] text-[#8C7A6B]">
                  Kathmandu Workshop
                </span>
              </div>
              <h4 className="font-serif font-bold text-xs sm:text-sm text-[#1C1B1A] truncate">
                {activeAlert.productTitle}
              </h4>
              <p className="text-[11px] text-[#5E5955] mt-0.5 leading-relaxed">
                Sahina has hand-crafted a new batch! Only {activeAlert.restockedStockCount} pieces reserved.
              </p>

              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenProduct(activeAlert.productId)}
                  className="px-3 py-1.5 bg-[#1C1B1A] hover:bg-black text-[#D4AF37] font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                >
                  <span>View Piece</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => dismissRestockAlert(activeAlert.id)}
                  className="px-2.5 py-1.5 text-[11px] font-medium text-[#736C65] hover:text-[#1C1B1A] cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => dismissRestockAlert(activeAlert.id)}
              className="p-1 text-[#8C7A6B] hover:text-[#1C1B1A] rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
