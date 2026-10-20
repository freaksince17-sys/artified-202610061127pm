import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Truck, 
  Sparkles, 
  CheckCircle2, 
  Package, 
  MapPin, 
  MessageCircle, 
  User, 
  AlertCircle,
  ExternalLink,
  Edit3,
  Compass,
  Map,
  Bell,
  Check
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { 
  getTrackedOrder, 
  updateOrderPhase, 
  normalizeOrderId, 
  sanitizeOrderItems,
  getOrderDeliveryFee,
  getOrderItemsSubtotal,
  getOrderManufactureDeliveryBreakdown
} from '../data/trackingData';
import { TrackedOrderData, OrderProductionPhase } from '../types';
import { getStoredOrderNotifications, markNotificationsAsRead, OrderNotification } from '../utils/orderNotificationManager';
import { OrderProgressManagerModal } from './OrderProgressManagerModal';
import { DeliveryProgressMap } from './DeliveryProgressMap';
import { subscribeToTrackedOrder } from '../services/orderTrackingService';
import { getRealProductImage, CAVIAR_PEARL_BAG_IMAGE } from '../utils/productImages';

export const OrderTrackerModal: React.FC = () => {
  const { 
    isTrackerOpen, 
    setIsTrackerOpen, 
    trackingOrderId, 
    setTrackingOrderId,
    completedOrder,
    isSellerMode
  } = useCart();

  const [inputOrderId, setInputOrderId] = useState<string>('');
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrderData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [activeTrackerTab, setActiveTrackerTab] = useState<'map' | 'milestones'>('map');
  const [activeAlert, setActiveAlert] = useState<OrderNotification | null>(null);
  const [recentNotifications, setRecentNotifications] = useState<OrderNotification[]>([]);

  // Load existing notifications from localStorage
  useEffect(() => {
    setRecentNotifications(getStoredOrderNotifications());
  }, [isTrackerOpen]);

  // Active Firestore unsubscribe reference
  const unsubscribeRef = React.useRef<(() => void) | null>(null);

  // When modal opens, only perform lookup if an order ID was explicitly passed, then clear trackingOrderId so refresh/reopen is private
  useEffect(() => {
    try {
      localStorage.removeItem('artified_last_order_id');
    } catch {}

    if (isTrackerOpen) {
      if (trackingOrderId && trackingOrderId.trim()) {
        const targetId = trackingOrderId.trim();
        setInputOrderId(targetId);
        setTrackingOrderId('');
        performLookup(targetId);
      } else {
        setInputOrderId('');
        setTrackedOrder(null);
        setErrorMsg(null);
      }
    } else {
      setInputOrderId('');
      setTrackedOrder(null);
      setErrorMsg(null);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [isTrackerOpen]);

  // Listen for order updates and status alerts from localStorage
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail) {
        if (customEvent.detail.deletedAll) {
          setTrackedOrder(null);
          setTrackingOrderId('');
          return;
        }
        const updatedNorm = normalizeOrderId(customEvent.detail.orderId || '');
        const currentNorm = trackedOrder ? normalizeOrderId(trackedOrder.orderId) : (inputOrderId ? normalizeOrderId(inputOrderId) : '');
        if (currentNorm && updatedNorm === currentNorm) {
          if (customEvent.detail.deleted) {
            setTrackedOrder(null);
            setTrackingOrderId('');
            setErrorMsg(`We couldn't locate an order with ID "${inputOrderId || currentNorm}". Please verify your order number or consult our WhatsApp support.`);
          } else if (customEvent.detail.items) {
            setTrackedOrder(sanitizeOrderItems(customEvent.detail));
          }
        }
      }
    };

    const handleAlert = (e: Event) => {
      const customEvent = e as CustomEvent<OrderNotification>;
      if (customEvent.detail) {
        setActiveAlert(customEvent.detail);
        setRecentNotifications(getStoredOrderNotifications());
      }
    };

    window.addEventListener('artified_order_updated', handleUpdate);
    window.addEventListener('artified_order_status_alert', handleAlert);
    return () => {
      window.removeEventListener('artified_order_updated', handleUpdate);
      window.removeEventListener('artified_order_status_alert', handleAlert);
    };
  }, [trackedOrder, inputOrderId]);

  const performLookup = async (idToLookup: string) => {
    const query = idToLookup.trim();
    if (!query) {
      setErrorMsg('Please enter a valid Order ID (e.g. #ART-2026-1000)');
      setTrackedOrder(null);
      return;
    }

    setIsSearching(true);
    setErrorMsg(null);

    // Unsubscribe from previous order listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Set up real-time listener on Order ID only
    unsubscribeRef.current = subscribeToTrackedOrder(
      query,
      (order) => {
        setIsSearching(false);
        if (order) {
          setTrackedOrder(sanitizeOrderItems(order));
          setErrorMsg(null);
        } else {
          setTrackedOrder(null);
          setErrorMsg(`We couldn't locate an order with ID "${query}". Please verify your Order ID or consult our WhatsApp support.`);
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

  const handleSelectQuickId = (sampleId: string) => {
    setInputOrderId(sampleId);
    setTrackingOrderId(sampleId);
    performLookup(sampleId);
  };

  const openWhatsAppInquiry = (order: TrackedOrderData) => {
    const phone = '9779767573721';
    const text = encodeURIComponent(
      `Namaste Artified Nepal! ✨ I am checking the status of my order ${order.orderId} (${order.items.map((i) => i.title).join(', ')}). Could you provide a quick update on production/dispatch? Dhanyabad!`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const handleInlinePhaseChange = (phase: OrderProductionPhase) => {
    if (!trackedOrder) return;
    const updated = updateOrderPhase(trackedOrder.orderId, phase);
    setTrackedOrder(updated);
  };

  if (!isTrackerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#1C1B1A]/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsTrackerOpen(false)}
      />

      {/* Main Modal Dialog */}
      <div className="relative bg-[#FAF8F5] w-full max-w-2xl rounded-2xl shadow-2xl border border-[#E8DFD8] overflow-hidden z-10 flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="bg-[#1C1B1A] text-white p-4 sm:p-5 flex items-center justify-between border-b border-[#34312F]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#C5A880]/20 border border-[#C5A880]/40 flex items-center justify-center text-[#C5A880]">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-semibold tracking-wide flex items-center gap-2 flex-wrap">
                <span>Handmade Order & Delivery Tracker</span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Real-time Firestore Sync</span>
                </span>
                {isSellerMode && (
                  <span className="text-[10px] bg-[#D4AF37] text-[#1C1B1A] font-bold px-1.5 py-0.5 rounded">
                    Seller Active
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-[#A69E96]">
                Kathmandu Workshop, Kathmandu • Handcrafted by Sahina Shrestha
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSellerMode && (
              <button
                type="button"
                onClick={() => setIsManagerModalOpen(true)}
                className="px-2.5 py-1 bg-[#D4AF37] text-[#1C1B1A] text-xs font-bold rounded-lg hover:bg-[#c29f2e] transition-colors"
              >
                All Orders
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsTrackerOpen(false)}
              className="p-1.5 text-[#A69E96] hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Header Bar */}
        <div className="p-4 bg-white border-b border-[#E8DFD8] space-y-2">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8C847E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inputOrderId}
                onChange={(e) => {
                  const val = e.target.value;
                  setInputOrderId(val);
                  if (!val.trim()) {
                    setTrackedOrder(null);
                    setErrorMsg(null);
                  }
                }}
                placeholder="Enter Order ID (e.g. #ART-2026-1000)"
                className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2 bg-[#1C1B1A] text-white text-xs font-semibold rounded-xl hover:bg-black transition-colors cursor-pointer shrink-0"
            >
              {isSearching ? 'Tracking...' : 'Track Status'}
            </button>
          </form>

          {/* Order lookup helper info */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#736C65]">
            <span>🔒 Private tracking: paste your Order ID to view real-time atelier status.</span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* Empty state when no order has been pasted yet */}
          {!trackedOrder && !isSearching && !errorMsg && (
            <div className="p-8 text-center bg-[#FAF8F5] rounded-2xl border border-[#E8DFD8] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center mx-auto">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-base font-bold text-[#1C1B1A]">
                Lookup Your Order Status
              </h3>
              <p className="text-xs text-[#736C65] max-w-sm mx-auto leading-relaxed">
                Enter your Order ID in the search box above to see real-time updates on your package's assembly, handcrafting, and express shipping.
              </p>
            </div>
          )}
          
          {/* Active LocalStorage Status Change Notification Banner */}
          {activeAlert && (
            <div className={`p-4 rounded-2xl border-2 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-300 shadow-sm ${
              activeAlert.type === 'delivered' 
                ? 'bg-emerald-50 border-emerald-500 text-emerald-950' 
                : 'bg-amber-50 border-amber-500 text-amber-950'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl text-white shrink-0 ${
                  activeAlert.type === 'delivered' ? 'bg-emerald-600' : 'bg-amber-600'
                }`}>
                  <Bell className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs">{activeAlert.title}</h4>
                    <span className="text-[9px] bg-white px-2 py-0.5 rounded-full border border-black/10 font-mono">
                      {activeAlert.timestamp}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 leading-relaxed text-black/80">
                    {activeAlert.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  markNotificationsAsRead(activeAlert.orderId);
                  setActiveAlert(null);
                }}
                className="p-1 rounded-lg hover:bg-black/10 transition-colors text-black/60 cursor-pointer"
                title="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{errorMsg}</p>
                <p className="text-[11px] text-amber-800 mt-1">
                  Tip: If you recently placed an order via WhatsApp or Cash on Delivery, our workshop updates status within 1-2 hours.
                </p>
              </div>
            </div>
          )}

          {trackedOrder && (
            <div className="space-y-6">

              {/* Status Simulation Controls (Seller Only) */}
              {isSellerMode && (
                <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E8DFD8] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[#8C7A6B] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                      <span>Seller Quick Status:</span>
                    </span>
                    <span className="text-[11px] text-[#5E5955]">
                      Current: <strong className="text-[#1C1B1A] uppercase">{trackedOrder.currentPhase.replace(/_/g, ' ')}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleInlinePhaseChange('out_for_delivery')}
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                        trackedOrder.currentPhase === 'out_for_delivery'
                          ? 'bg-[#1C1B1A] text-[#D4AF37] border-[#1C1B1A]'
                          : 'bg-white hover:bg-amber-50 border-[#E8DFD8] text-[#1C1B1A]'
                      }`}
                    >
                      ⚡ Move to Shipped (Out for Delivery)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInlinePhaseChange('delivered')}
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                        trackedOrder.currentPhase === 'delivered'
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white hover:bg-emerald-50 border-[#E8DFD8] text-emerald-800'
                      }`}
                    >
                      ⚡ Move to Delivered
                    </button>
                  </div>
                </div>
              )}
              
              {/* Order High-Level Status Card */}
              <div className="bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0EBE5] pb-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8C7A6B]">
                      Order Reference
                    </span>
                    <h3 className="font-mono text-xl font-bold text-[#1C1B1A]">
                      {trackedOrder.orderId}
                    </h3>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8C7A6B]">
                      Estimated Arrival (Incl. Manufacture)
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-[#C5A880]">
                      {trackedOrder.estimatedDeliveryDate}
                    </p>
                    {(() => {
                      const bd = getOrderManufactureDeliveryBreakdown(trackedOrder.items, trackedOrder.deliveryZoneName, trackedOrder.deliveryAddress);
                      return (
                        <p className="text-[10px] text-[#5E5955] font-medium mt-0.5">
                          🛠 {bd.manufactureDaysText} manufacture ({bd.categoryLabel}) + 🚚 {bd.deliveryDaysText} delivery
                        </p>
                      );
                    })()}
                  </div>
                </div>

                {/* Progress Bar with Phase Header (4 exact stages) */}
                {(() => {
                  const bd = getOrderManufactureDeliveryBreakdown(trackedOrder.items, trackedOrder.deliveryZoneName, trackedOrder.deliveryAddress);
                  const modalPhases: Array<{
                    key: OrderProductionPhase;
                    label: string;
                    sublabel: string;
                    icon: React.ComponentType<{ className?: string }>;
                  }> = [
                    { key: 'confirmed', label: '1. Order Confirmed & Paid', sublabel: 'Materials reserved', icon: Package },
                    { key: 'handcrafting_and_packaging', label: '2. Handcrafting & Packaging', sublabel: `${bd.manufactureDaysText} manufacture`, icon: Sparkles },
                    { key: 'out_for_delivery', label: '3. Dispatch & In-Transit', sublabel: `${bd.deliveryDaysText} transit`, icon: Truck },
                    { key: 'delivered', label: '4. Delivered', sublabel: 'Doorstep handover', icon: CheckCircle2 }
                  ];
                  const modalIdx =
                    trackedOrder.currentPhase === 'delivered'
                      ? 3
                      : trackedOrder.currentPhase === 'out_for_delivery'
                      ? 2
                      : trackedOrder.currentPhase === 'handcrafting_and_packaging' ||
                        trackedOrder.currentPhase === 'beading_in_progress' ||
                        trackedOrder.currentPhase === 'quality_and_packaging'
                      ? 1
                      : 0;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C5A880]">
                          Progress Timeline ({trackedOrder.progressPercentage}%)
                        </span>
                        <span className="font-semibold text-[#1C1B1A]">
                          Current Status: <strong className="text-[#C5A880]">{modalPhases[modalIdx]?.label}</strong>
                        </span>
                      </div>

                      <div className="relative pt-1">
                        <div className="block absolute top-5 left-0 w-full h-[2.5px] bg-[#E8DFD8] -translate-y-1/2 z-0 rounded-full" />
                        <div
                          className="block absolute top-5 left-0 h-[2.5px] bg-gradient-to-r from-[#D4AF37] to-[#C5A880] -translate-y-1/2 z-0 transition-all duration-700 rounded-full"
                          style={{ width: `${modalIdx >= modalPhases.length - 1 ? 100 : modalIdx * 25 + 19}%` }}
                        />
                        <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 relative z-10">
                          {modalPhases.map((phase, idx) => {
                            const isDone = idx <= modalIdx;
                            const isCurrent = idx === modalIdx;
                            const IconComp = phase.icon;
                            return (
                              <div key={phase.key} className="flex flex-col items-center gap-1.5 text-center">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                    isCurrent
                                      ? 'bg-[#C5A880] text-white shadow-sm ring-2 ring-[#C5A880]/30'
                                      : isDone
                                      ? 'bg-[#C5A880] text-white shadow-2xs'
                                      : 'bg-[#F0EBE5] text-[#8C847E]'
                                  }`}
                                >
                                  <IconComp className="w-3.5 h-3.5" />
                                </div>
                                <div className="mt-0.5">
                                  <p className={`text-[10px] sm:text-xs font-bold leading-tight ${isDone ? 'text-[#1C1B1A]' : 'text-[#8C847E]'}`}>
                                    {phase.label}
                                  </p>
                                  <p className="text-[9px] sm:text-[10px] text-[#736C65] mt-0.5">
                                    {phase.sublabel}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Handcrafter & Workshop Card */}
                <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E8DFD8] flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-white border border-[#E8DFD8] flex items-center justify-center text-[#C5A880] shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-[#1C1B1A]">
                      Handcrafted by: Sahina Shrestha (Founder & Master Handcrafter)
                    </p>
                    <p className="text-[11px] text-[#736C65] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#C5A880]" />
                      <span>Artified Workshop, Kathmandu, Nepal</span>
                    </p>
                    <p className="text-[11px] text-[#5E5955] italic pt-1 leading-relaxed border-t border-[#E8DFD8]/60 mt-1">
                      &ldquo;{trackedOrder.liveCraftNotes}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Courier details if out for delivery */}
                {trackedOrder.courierPartner && (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-700" />
                      <div>
                        <p className="font-semibold">{trackedOrder.courierPartner}</p>
                        {trackedOrder.consignmentCode && (
                          <p className="text-[10px] text-emerald-700 font-mono">
                            Consignment: {trackedOrder.consignmentCode}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded uppercase tracking-wider">
                      On Route
                    </span>
                  </div>
                )}
              </div>

              {/* View Switcher: Delivery Route Map vs Milestones */}
              <div className="flex items-center gap-1.5 p-1 bg-[#FAF8F5] border border-[#E8DFD8] rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveTrackerTab('map')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeTrackerTab === 'map'
                      ? 'bg-[#1C1B1A] text-white shadow-sm'
                      : 'text-[#736C65] hover:text-[#1C1B1A]'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Nepal Delivery Route Map & Regional ETAs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTrackerTab('milestones')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeTrackerTab === 'milestones'
                      ? 'bg-[#1C1B1A] text-white shadow-sm'
                      : 'text-[#736C65] hover:text-[#1C1B1A]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Craft & Logistics Milestones</span>
                </button>
              </div>

              {/* Dynamic View Display */}
              {activeTrackerTab === 'map' ? (
                <DeliveryProgressMap order={trackedOrder} />
              ) : (
                /* Handcrafted Milestone Timeline */
                <div className="bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs">
                  <h4 className="font-serif text-sm font-semibold uppercase tracking-wider text-[#1C1B1A] mb-4 pb-2 border-b border-[#F0EBE5]">
                    Craft & Logistics Milestones
                  </h4>

                  <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#E8DFD8]">
                    {trackedOrder.milestones.map((m, idx) => {
                      return (
                        <div key={idx} className="relative group">
                          {/* Dot indicator */}
                          <div 
                            className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              m.completed 
                                ? 'bg-emerald-600 border-emerald-600 text-white' 
                                : m.current
                                ? 'bg-[#1C1B1A] border-[#C5A880] text-[#C5A880] ring-4 ring-[#C5A880]/20'
                                : 'bg-white border-[#D8CFCA] text-[#A69E96]'
                            }`}
                          >
                            {m.completed ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : m.current ? (
                              <div className="w-2 h-2 rounded-full bg-[#C5A880] animate-pulse" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#D8CFCA]" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className={`font-semibold ${m.current ? 'text-[#C5A880]' : m.completed ? 'text-[#1C1B1A]' : 'text-[#8C847E]'}`}>
                                {m.label}
                              </span>
                              <span className="text-[10px] text-[#8C847E] font-medium">
                                {m.timestamp}
                              </span>
                            </div>

                            <p className="text-xs text-[#5E5955] leading-relaxed">
                              {m.description}
                            </p>

                            <p className="text-[10px] text-[#A69E96]">
                              📍 {m.location}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Order Items & Destination Details */}
              <div className="bg-white p-5 rounded-2xl border border-[#E8DFD8] shadow-xs space-y-4">
                <h4 className="font-serif text-sm font-semibold uppercase tracking-wider text-[#1C1B1A] pb-2 border-b border-[#F0EBE5]">
                  Order Items & Destination
                </h4>

                <div className="space-y-3">
                  {trackedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <img 
                        src={getRealProductImage(item.title, item.image)} 
                        alt={item.title} 
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = CAVIAR_PEARL_BAG_IMAGE;
                        }}
                        className="w-12 h-12 rounded-xl object-cover border border-[#E8DFD8] shrink-0 bg-white"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <p className="font-semibold text-[#1C1B1A] truncate">{item.title}</p>
                        <p className="text-[11px] text-[#736C65]">
                          Qty: {item.quantity ?? 1} • NPR {(Number(item.price) || 0).toLocaleString()}
                        </p>
                        {item.customization && (
                          <p className="text-[10px] text-[#C5A880] italic">
                            &ldquo;{item.customization}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-[#F0EBE5] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[#736C65]">
                    <span>Items Subtotal</span>
                    <span className="font-mono">NPR {getOrderItemsSubtotal(trackedOrder).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#736C65]">
                    <span>Delivery Charge ({trackedOrder.deliveryZoneName})</span>
                    <span className="font-mono">NPR {getOrderDeliveryFee(trackedOrder).toLocaleString()}</span>
                  </div>
                  <div className="pt-1.5 border-t border-[#F0EBE5] flex items-center justify-between">
                    <span className="font-semibold text-[#1C1B1A]">Total Paid / Due</span>
                    <span className="font-bold text-[#1C1B1A] font-mono text-sm">
                      NPR {(Number(trackedOrder.total) || 0).toLocaleString()} ({trackedOrder.paymentStatus || 'Verified'})
                    </span>
                  </div>
                </div>

                <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E8DFD8] text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#8C7A6B]">
                    Delivering To
                  </span>
                  <p className="font-medium text-[#1C1B1A]">{trackedOrder.customerName} ({trackedOrder.phone})</p>
                  <p className="text-[#5E5955]">{trackedOrder.deliveryAddress}</p>
                  <p className="text-[11px] text-[#736C65]">{trackedOrder.deliveryZoneName} • Delivery Charge: NPR {getOrderDeliveryFee(trackedOrder).toLocaleString()}</p>
                </div>
              </div>

              {/* Direct WhatsApp Action Button */}
              <button
                type="button"
                onClick={() => openWhatsAppInquiry(trackedOrder)}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Inquire directly on WhatsApp (+977-9767573721)</span>
              </button>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-white border-t border-[#E8DFD8] flex items-center justify-between text-xs">
          <span className="text-[#736C65] text-[11px]">
            Artified Nepal • Kathmandu, Nepal
          </span>
          <button
            type="button"
            onClick={() => setIsTrackerOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#E8DFD8] text-[#1C1B1A] font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {/* Global Order Progress Manager Modal */}
      <OrderProgressManagerModal
        isOpen={isManagerModalOpen}
        onClose={() => {
          setIsManagerModalOpen(false);
          if (trackedOrder) {
            const refreshed = getTrackedOrder(trackedOrder.orderId);
            setTrackedOrder(refreshed || null);
          }
        }}
        initialOrderId={trackedOrder?.orderId}
      />
    </div>
  );
};
