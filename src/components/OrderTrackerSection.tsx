import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Truck, 
  Sparkles, 
  CheckCircle2, 
  Package, 
  MapPin, 
  MessageCircle, 
  AlertCircle,
  Edit3,
  User,
  ExternalLink
} from 'lucide-react';
import { getTrackedOrder, updateOrderPhase, normalizeOrderId, sanitizeOrderItems } from '../data/trackingData';
import { TrackedOrderData, OrderProductionPhase } from '../types';
import { useCart } from '../context/CartContext';
import { OrderProgressManagerModal } from './OrderProgressManagerModal';
import { subscribeToTrackedOrder } from '../services/orderTrackingService';
import { getRealProductImage, CAVIAR_PEARL_BAG_IMAGE } from '../utils/productImages';

export const OrderTrackerSection: React.FC = () => {
  const { trackingOrderId, setTrackingOrderId, setActiveNavTab } = useCart();
  const [inputOrderId, setInputOrderId] = useState<string>(trackingOrderId || '');
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrderData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);

  const unsubscribeRef = React.useRef<(() => void) | null>(null);

  // Sync when trackingOrderId changes or on mount (only look up if order ID is explicitly provided)
  useEffect(() => {
    if (trackingOrderId && trackingOrderId.trim()) {
      setInputOrderId(trackingOrderId);
      performLookup(trackingOrderId);
    } else {
      setInputOrderId('');
      setTrackedOrder(null);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [trackingOrderId]);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<TrackedOrderData>;
      if (customEvent.detail) {
        const updatedNorm = normalizeOrderId(customEvent.detail.orderId);
        const currentNorm = trackedOrder ? normalizeOrderId(trackedOrder.orderId) : (inputOrderId ? normalizeOrderId(inputOrderId) : '');
        if (currentNorm && updatedNorm === currentNorm) {
          setTrackedOrder(sanitizeOrderItems(customEvent.detail));
        }
      }
    };
    window.addEventListener('artified_order_updated', handleUpdate);
    return () => window.removeEventListener('artified_order_updated', handleUpdate);
  }, [trackedOrder, inputOrderId]);

  const performLookup = (idToLookup: string) => {
    if (!idToLookup.trim()) {
      setErrorMsg('Please enter an Order ID or Phone Number');
      setTrackedOrder(null);
      return;
    }

    setIsSearching(true);
    setErrorMsg(null);

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    unsubscribeRef.current = subscribeToTrackedOrder(
      idToLookup,
      (order) => {
        setIsSearching(false);
        if (order) {
          const sanitized = sanitizeOrderItems(order);
          setTrackedOrder(sanitized);
          setTrackingOrderId(sanitized.orderId);
          setErrorMsg(null);
        } else {
          setTrackedOrder(null);
          setErrorMsg(`We couldn't find an order for "${idToLookup}". Please check the ID or contact us on WhatsApp.`);
        }
      },
      () => {
        setIsSearching(false);
      }
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(inputOrderId);
  };

  // 4 Exact Stages Requested by Seller
  const PHASES: Array<{
    key: OrderProductionPhase;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: 'confirmed', label: '1. Order Confirmed & Paid', sublabel: 'Materials reserved', icon: Package },
    { key: 'handcrafting_and_packaging', label: '2. Handcrafting & Packaging', sublabel: 'By Sahina Shrestha', icon: Sparkles },
    { key: 'out_for_delivery', label: '3. Dispatch & In-Transit', sublabel: 'Courier handover on route', icon: Truck },
    { key: 'delivered', label: '4. Delivered', sublabel: 'Doorstep handover', icon: CheckCircle2 }
  ];

  const getPhaseIndex = (phase?: string) => {
    switch (phase) {
      case 'confirmed': return 0;
      case 'handcrafting_and_packaging':
      case 'beading_in_progress':
      case 'quality_and_packaging': 
        return 1;
      case 'out_for_delivery': return 2;
      case 'delivered': return 3;
      default: return 0;
    }
  };

  const currentIdx = getPhaseIndex(trackedOrder?.currentPhase);

  const handleInlinePhaseChange = (phase: OrderProductionPhase) => {
    if (!trackedOrder) return;
    const updated = updateOrderPhase(trackedOrder.orderId, phase);
    setTrackedOrder(sanitizeOrderItems(updated));
  };

  return (
    <section className="pt-0.5 pb-4 sm:pt-1 sm:pb-6 bg-[#FAF8F5] dark:bg-[#0F0E0E] transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Header - Compact Single Header */}
        <div className="text-center max-w-xl mx-auto mb-2.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white dark:bg-[#1A1918] rounded-full text-[#C5A880] text-[10px] uppercase tracking-[0.2em] font-semibold mb-1 border border-[#E8DFD8] dark:border-[#2D2B28] shadow-2xs">
            <Truck className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>REAL-TIME DELIVERY TRACKER</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#1C1B1A] dark:text-[#F5F2EB] font-semibold tracking-tight">
            Track Your Order
          </h1>
          <p className="text-xs text-[#5E5955] dark:text-[#A69E96] mt-0.5 leading-relaxed">
            Follow the handcrafting progress of your pearl piece in our Kathmandu workshop, handcrafted by Sahina Shrestha through packaging and express dispatch to your doorstep.
          </p>
        </div>

        {/* Search Bar - Compact */}
        <div className="bg-white dark:bg-[#181716] rounded-2xl border border-[#E8DFD8] dark:border-[#2D2B28] p-2.5 sm:p-3.5 shadow-2xs max-w-lg mx-auto mb-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8C847E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inputOrderId}
                onChange={(e) => setInputOrderId(e.target.value)}
                placeholder="Enter Order ID (e.g. ART-2026-8842)"
                className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] dark:bg-[#201F1D] border border-[#E8DFD8] dark:border-[#33302C] rounded-xl text-xs sm:text-sm text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none focus:border-[#C5A880]"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-2 bg-[#1C1B1A] dark:bg-[#FAF8F5] text-white dark:text-[#1C1B1A] text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-black dark:hover:bg-white transition-colors cursor-pointer shrink-0"
            >
              {isSearching ? 'Checking...' : 'Track'}
            </button>
          </form>

          {/* Order lookup helper info */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#736C65] dark:text-[#A69E96] flex-wrap gap-2">
            <span className="text-[10px]">
              🔒 Private & secure: only buyers with a verified Order ID can view status details.
            </span>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2 max-w-lg mx-auto mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Empty State Prompt - Displayed when no order has been pasted yet */}
        {!trackedOrder && !isSearching && !errorMsg && (
          <div className="bg-white dark:bg-[#181716] rounded-2xl border border-[#E8DFD8] dark:border-[#2D2B28] p-6 sm:p-8 text-center max-w-lg mx-auto shadow-2xs space-y-3 my-4">
            <div className="w-12 h-12 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center mx-auto shadow-2xs">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#1C1B1A] dark:text-[#F5F2EB]">
              Lookup Your Order Progress
            </h3>
            <p className="text-xs text-[#736C65] dark:text-[#A69E96] leading-relaxed">
              Enter or paste your Order ID above (e.g. <span className="font-mono text-[#D4AF37] font-bold">ART-2026-5526</span>) to view real-time handcrafting, quality check, and express delivery updates.
            </p>
          </div>
        )}

        {/* Order Details Card - Compact Layout */}
        {trackedOrder && (
          <div className="bg-white dark:bg-[#181716] rounded-2xl border border-[#E8DFD8] dark:border-[#2D2B28] p-4 sm:p-6 shadow-2xs space-y-4 animate-fade-in">
            {/* Top Summary Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8DFD8] dark:border-[#2D2B28]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-[#1C1B1A] dark:text-[#F5F2EB]">
                    {trackedOrder.orderId}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-[#E6CA9E] border border-amber-200 dark:border-amber-800/50">
                    {trackedOrder.paymentStatus}
                  </span>
                </div>
                <p className="text-xs text-[#5E5955] dark:text-[#A69E96] mt-0.5">
                  Ordered on {trackedOrder.orderPlacedDate} • Customer: <span className="font-medium text-[#1C1B1A] dark:text-[#F5F2EB]">{trackedOrder.customerName}</span>
                </p>
                <p className="text-[11px] text-[#C5A880] mt-0.5 font-semibold flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  <span>Handcrafted by: <strong>Sahina Shrestha</strong> (Artified Kathmandu Workshop)</span>
                </p>
              </div>

              <div className="text-left sm:text-right bg-[#FAF8F5] dark:bg-[#201F1D] sm:bg-transparent sm:dark:bg-transparent p-2 sm:p-0 rounded-xl">
                <span className="text-[10px] text-[#736C65] dark:text-[#A69E96] uppercase tracking-wider block">Estimated Delivery</span>
                <span className="font-serif text-base sm:text-lg font-bold text-[#C5A880]">
                  {trackedOrder.estimatedDeliveryDate}
                </span>
              </div>
            </div>

            {/* Stepper Progress Bar (4 Exact Stages) - Compact */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C5A880]">
                  Progress Timeline ({trackedOrder.progressPercentage}%)
                </h3>
                <span className="text-xs font-semibold text-[#1C1B1A] dark:text-[#F5F2EB]">
                  Current Status: <strong className="text-[#C5A880]">{PHASES[currentIdx]?.label}</strong>
                </span>
              </div>
              
              <div className="relative">
                {/* Connecting Line */}
                <div className="hidden sm:block absolute top-4 left-0 w-full h-[2px] bg-[#E8DFD8] dark:bg-[#2D2B28] -translate-y-1/2 -z-0" />
                <div 
                  className="hidden sm:block absolute top-4 left-0 h-[2px] bg-[#C5A880] -translate-y-1/2 -z-0 transition-all duration-700"
                  style={{ width: `${(currentIdx / (PHASES.length - 1)) * 100}%` }}
                />

                {/* 4 Steps */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 relative z-10">
                  {PHASES.map((phase, idx) => {
                    const isDone = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;
                    const IconComponent = phase.icon;

                    return (
                      <div key={phase.key} className="flex sm:flex-col items-center gap-2 sm:text-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          isCurrent
                            ? 'bg-[#C5A880] text-white shadow-sm ring-2 ring-[#C5A880]/30'
                            : isDone
                            ? 'bg-[#1C1B1A] dark:bg-[#FAF8F5] text-white dark:text-[#1C1B1A]'
                            : 'bg-[#F0EBE5] dark:bg-[#252422] text-[#8C847E]'
                        }`}>
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <div className="sm:mt-0.5">
                          <p className={`text-xs font-bold leading-tight ${isDone ? 'text-[#1C1B1A] dark:text-[#F5F2EB]' : 'text-[#8C847E]'}`}>
                            {phase.label}
                          </p>
                          <p className="text-[10px] text-[#736C65] dark:text-[#A69E96] mt-0.5">
                            {phase.sublabel}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Craft Notes Banner - Compact */}
            {trackedOrder.liveCraftNotes && (
              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex items-start gap-2.5 text-xs">
                <Sparkles className="w-4 h-4 text-[#C5A880] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[11px] font-bold text-[#1C1B1A] dark:text-[#F5F2EB] uppercase tracking-wider">
                    Kathmandu Workshop Craft Update
                  </h4>
                  <p className="text-xs text-[#5E5955] dark:text-[#C2BBB2] mt-0.5 leading-relaxed">
                    {trackedOrder.liveCraftNotes}
                  </p>
                  <p className="text-[10px] text-[#8C7A6B] dark:text-[#A69E96] mt-0.5 font-medium">
                    Handcrafted at Artified Workshop, Kathmandu, Nepal
                  </p>
                </div>
              </div>
            )}

            {/* Product & Courier Info Grid - Compact 2 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              
              {/* Product Info */}
              <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#201F1D] border border-[#E8DFD8] dark:border-[#2D2B28]">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1B1A] dark:text-[#F5F2EB] mb-2">
                  Item Details
                </h4>
                <div className="space-y-2">
                  {trackedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <img 
                        src={getRealProductImage(item.title, item.image)} 
                        alt={item.title} 
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = CAVIAR_PEARL_BAG_IMAGE;
                        }}
                        className="w-11 h-11 rounded-lg object-cover border border-[#E8DFD8] dark:border-[#33302C] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="font-serif text-xs font-semibold text-[#1C1B1A] dark:text-[#F5F2EB] truncate">
                          {item.title}
                        </h5>
                        <p className="text-[11px] text-[#5E5955] dark:text-[#A69E96]">
                          Quantity: {item.quantity} • NPR {item.price.toLocaleString()}
                        </p>
                        {item.customization && (
                          <p className="text-[10px] text-[#C5A880] font-medium truncate">
                            Note: {item.customization}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 pt-2 border-t border-[#E8DFD8] dark:border-[#2D2B28] flex items-center justify-between text-xs font-semibold text-[#1C1B1A] dark:text-[#F5F2EB]">
                  <span>Total Amount</span>
                  <span>NPR {trackedOrder.total.toLocaleString()}</span>
                </div>
              </div>

              {/* Delivery Destination */}
              <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#201F1D] border border-[#E8DFD8] dark:border-[#2D2B28]">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1B1A] dark:text-[#F5F2EB] mb-2">
                  Delivery Destination
                </h4>
                <div className="flex items-start gap-2 text-xs text-[#5E5955] dark:text-[#A69E96]">
                  <MapPin className="w-3.5 h-3.5 text-[#C5A880] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#1C1B1A] dark:text-[#F5F2EB]">{trackedOrder.deliveryAddress}</p>
                    <p className="text-[11px] text-[#736C65] dark:text-[#A69E96] mt-0.5">Zone: {trackedOrder.deliveryZoneName}</p>
                    {trackedOrder.courierPartner && (
                      <p className="text-[11px] text-[#736C65] dark:text-[#A69E96] mt-0.5">
                        Courier: {trackedOrder.courierPartner} {trackedOrder.consignmentCode ? `(${trackedOrder.consignmentCode})` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Support Hotline */}
            <div className="pt-2.5 border-t border-[#E8DFD8] dark:border-[#2D2B28] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="text-[#5E5955] dark:text-[#A69E96]">
                Need immediate status assistance or want to update your delivery address?
              </span>
              <a
                href={`https://wa.me/9779767573721?text=${encodeURIComponent(`Hi Artified Nepal, I want an update on my order ${trackedOrder.orderId}`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#25D366] text-white rounded-lg font-semibold hover:bg-[#20ba5a] transition-colors text-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Helpdesk</span>
              </a>
            </div>

          </div>
        )}

        {/* Global Order Progress Manager Modal */}
        <OrderProgressManagerModal
          isOpen={isManagerModalOpen}
          onClose={() => {
            setIsManagerModalOpen(false);
            if (trackedOrder) {
              const refreshed = getTrackedOrder(trackedOrder.orderId);
              if (refreshed) setTrackedOrder(refreshed);
            }
          }}
          initialOrderId={trackedOrder?.orderId}
        />

      </div>
    </section>
  );
};
