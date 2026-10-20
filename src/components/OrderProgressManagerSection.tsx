import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Package, 
  Truck, 
  CheckCircle2, 
  Sparkles, 
  Phone, 
  MapPin, 
  Copy, 
  Check, 
  Plus, 
  MessageCircle, 
  RefreshCw, 
  ClipboardCheck,
  Clock,
  Lock,
  Trash2,
  Camera,
  Download,
  X,
  ShieldCheck,
  Save
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { 
  getAllOrdersForSeller, 
  syncOrdersFromFirestore,
  syncTrackedOrdersFromServer,
  subscribeAllOrdersForSeller,
  updateOrderPhase, 
  saveTrackedOrder, 
  normalizeOrderId, 
  getProgressPercentage,
  buildMilestonesForPhase,
  deleteTrackedOrder,
  generateUniqueOrderId,
  getOrderDeliveryFee,
  getOrderItemsSubtotal,
  getOrderManufactureDeliveryBreakdown,
  removeOrderPaymentScreenshot
} from '../data/trackingData';
import { getRealProductImage, CAVIAR_PEARL_BAG_IMAGE } from '../utils/productImages';
import { TrackedOrderData, OrderProductionPhase } from '../types';
import { resolveProductIdFromOrderItem } from '../services/productSalesService';

function formatConcisePaymentBadge(order: TrackedOrderData): { label: string; isCod: boolean } {
  const rawMethod = (order.paymentMethodText || '').toLowerCase();
  const rawStatus = (order.paymentStatus || '').toLowerCase();
  const isCod = rawMethod.includes('cod') || rawMethod.includes('cash') || rawStatus.includes('pay on delivery');
  if (isCod) {
    return { label: 'COD • Pay on Delivery', isCod: true };
  }
  if (rawMethod.includes('esewa')) {
    return { label: 'eSewa • Paid', isCod: false };
  }
  return {
    label: order.paymentStatus || order.paymentMethodText || 'Verified',
    isCod: false
  };
}

export const OrderProgressManagerSection: React.FC = () => {
  const { isSellerMode, setIsSellerAuthModalOpen, setActiveNavTab, trackOrderSalesInFirestore, products, triggerCloudSync } = useCart();
  const [orders, setOrders] = useState<TrackedOrderData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Tab: 'pending' (Confirmed, Handcrafting, Out for Delivery) vs 'completed' (Delivered)
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [pendingSubFilter, setPendingSubFilter] = useState<'all' | 'confirmed' | 'handcrafting_and_packaging' | 'out_for_delivery'>('all');
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [selectedScreenshotOrder, setSelectedScreenshotOrder] = useState<TrackedOrderData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [dirtyOrderIds, setDirtyOrderIds] = useState<Record<string, boolean>>({});
  const [isSavingOrders, setIsSavingOrders] = useState(false);

  // Editable estimated arrival dates per order
  const [editingDeliveryDate, setEditingDeliveryDate] = useState<Record<string, string>>({});

  // Manual order form state
  const [newOrderId, setNewOrderId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newTotal, setNewTotal] = useState('');
  const [newDeliveryDate, setNewDeliveryDate] = useState('3 to 5 days');
  const [newPhase, setNewPhase] = useState<OrderProductionPhase>('confirmed');

  const reloadOrders = async () => {
    const list = getAllOrdersForSeller();
    setOrders(list);
    try {
      const res = await fetch('/api/tracked-orders');
      if (res.ok) {
        const serverMap = await res.json();
        if (serverMap && typeof serverMap === 'object') {
          syncTrackedOrdersFromServer(serverMap);
          setOrders(getAllOrdersForSeller());
        }
      }
    } catch {}
    try {
      const freshCloudOrders = await syncOrdersFromFirestore();
      if (freshCloudOrders && freshCloudOrders.length > 0) {
        setOrders(freshCloudOrders);
      }
    } catch {}
  };

  useEffect(() => {
    reloadOrders();
    const unsub = subscribeAllOrdersForSeller((freshList) => {
      setOrders(freshList);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleOrderUpdated = () => {
      setOrders(getAllOrdersForSeller());
    };
    window.addEventListener('artified_order_updated', handleOrderUpdated);
    return () => {
      window.removeEventListener('artified_order_updated', handleOrderUpdated);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyOrderId = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    setCopiedId(orderId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePhaseChange = (orderId: string, phase: OrderProductionPhase) => {
    const deliveryDate = editingDeliveryDate[orderId];

    const updated = updateOrderPhase(orderId, phase, {
      estimatedDeliveryDate: deliveryDate
    });

    trackOrderSalesInFirestore(updated);

    setOrders((prev) => {
      const next = prev.map((o) =>
        normalizeOrderId(o.orderId) === normalizeOrderId(orderId) ? updated : o
      );
      return next.length > 0 ? next : getAllOrdersForSeller();
    });

    if (pendingSubFilter !== 'all' && phase !== 'delivered' && pendingSubFilter !== phase) {
      setPendingSubFilter('all');
    }

    const phaseNames: Record<OrderProductionPhase, string> = {
      confirmed: '1. Order Confirmed & Paid',
      handcrafting_and_packaging: '2. Handcrafting & Packaging',
      out_for_delivery: '3. Shipped (Out for Delivery)',
      delivered: '4. Delivered (Completed)',
      beading_in_progress: '2. Handcrafting & Packaging',
      quality_and_packaging: '2. Handcrafting & Packaging'
    };

    setHasUnsavedChanges(true);
    setDirtyOrderIds((prev) => ({ ...prev, [orderId]: true }));
    showToast(`Order ${orderId} updated to "${phaseNames[phase]}" — Click Save to persist all changes`);
  };

  const handleDeliveryDateChange = (orderId: string, newDate: string) => {
    setEditingDeliveryDate((prev) => ({ ...prev, [orderId]: newDate }));
    setHasUnsavedChanges(true);
    setDirtyOrderIds((prev) => ({ ...prev, [orderId]: true }));
    updateOrderPhase(orderId, undefined as any, { estimatedDeliveryDate: newDate });
    setOrders((prev) => 
      prev.map((o) => normalizeOrderId(o.orderId) === normalizeOrderId(orderId) ? { ...o, estimatedDeliveryDate: newDate } : o)
    );
  };

  const handleSaveAllOrderChanges = async (specificOrderId?: string) => {
    setIsSavingOrders(true);
    try {
      const currentList = getAllOrdersForSeller();
      const targetIds = specificOrderId ? [specificOrderId] : Object.keys(dirtyOrderIds);
      currentList.forEach((o) => {
        if (targetIds.length === 0 || targetIds.some((id) => normalizeOrderId(id) === normalizeOrderId(o.orderId))) {
          saveTrackedOrder(o);
        }
      });
      if (triggerCloudSync) {
        await triggerCloudSync();
      }
      if (specificOrderId) {
        setDirtyOrderIds((prev) => {
          const next = { ...prev };
          delete next[specificOrderId];
          if (Object.keys(next).length === 0) setHasUnsavedChanges(false);
          return next;
        });
        showToast(`✅ Saved changes for Order ${specificOrderId}!`);
      } else {
        setDirtyOrderIds({});
        setHasUnsavedChanges(false);
        showToast('✅ All order progress changes saved!');
      }
    } catch (e) {
      console.warn('Error saving orders:', e);
      showToast('✅ Order changes saved!');
    } finally {
      setIsSavingOrders(false);
    }
  };

  const handleSendWhatsApp = (order: TrackedOrderData) => {
    const cleanPhone = order.phone.replace(/[^0-9]/g, '');
    const phaseNames: Record<OrderProductionPhase, string> = {
      confirmed: 'Order Confirmed & Paid',
      handcrafting_and_packaging: 'Handcrafting & Packaging',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      beading_in_progress: 'Handcrafting & Packaging',
      quality_and_packaging: 'Handcrafting & Packaging'
    };

    const currentStatus = phaseNames[order.currentPhase];
    const message = encodeURIComponent(
      `Namaste ${order.customerName}! 🌸\n\nYour Artified order *${order.orderId}* is currently: *${currentStatus}*.\n\n✨ Item: ${order.items[0]?.title || 'Handcrafted Pearl Piece'}\n📍 Workshop: Kathmandu, Nepal by Sahina Shrestha\n🚚 Estimated Arrival: ${order.estimatedDeliveryDate || '1-2 business days'}\n\nTrack live progress on our website anytime using your Order ID:\n${window.location.origin}/#track?id=${encodeURIComponent(order.orderId)}\n\nThank you for choosing Artified Nepal!`
    );

    const waUrl = cleanPhone.length >= 10 
      ? `https://wa.me/977${cleanPhone.slice(-10)}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(waUrl, '_blank');
  };

  const handleDeleteOrder = (orderId: string) => {
    deleteTrackedOrder(orderId);
    reloadOrders();
    showToast(`Order ${orderId} deleted successfully.`);
  };

  const handleCreateManualOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !newPhone.trim()) {
      alert('Please enter customer name and phone number');
      return;
    }

    const generatedId = newOrderId.trim() 
      ? `#${normalizeOrderId(newOrderId)}` 
      : generateUniqueOrderId();

    const manualItemTitle = newItemTitle.trim() || 'Caviar Pearl Bag';
    const manualAddress = newAddress.trim() || 'Kathmandu Valley, Nepal';
    const manualBreakdown = getOrderManufactureDeliveryBreakdown(
      [{ title: manualItemTitle }],
      'Kathmandu Valley',
      manualAddress
    );
    const resolvedManualDelivery =
      !newDeliveryDate.trim() || newDeliveryDate.trim() === '3 to 5 days' || newDeliveryDate.trim() === '1-2 business days'
        ? manualBreakdown.totalEstimatedDaysText
        : newDeliveryDate.trim();

    const newOrder: TrackedOrderData = {
      orderId: generatedId,
      customerName: newCustomerName.trim(),
      phone: newPhone.trim(),
      deliveryAddress: manualAddress,
      deliveryZoneName: 'Inside Ring Road (Kathmandu / Lalitpur)',
      paymentMethodText: 'Direct Order (WhatsApp / Walk-in)',
      paymentStatus: newPhase === 'confirmed' ? 'Paid & Verified' : 'Confirmed',
      items: [
        {
          title: manualItemTitle,
          image: getRealProductImage(manualItemTitle),
          quantity: 1,
          price: Number(newTotal) || 2499,
          customization: 'Handcrafted by Sahina Shrestha'
        }
      ],
      total: Number(newTotal) || 2499,
      orderPlacedDate: 'Just Now',
      estimatedDeliveryDate: resolvedManualDelivery,
      currentPhase: newPhase,
      progressPercentage: getProgressPercentage(newPhase),
      artisanName: 'Sahina Shrestha',
      artisanRole: 'Founder and Creator',
      studioLocation: 'Artified Workshop, Kathmandu, Nepal',
      liveCraftNotes: `Handcrafting (${manualBreakdown.manufactureDaysText}) scheduled at Kathmandu workshop by Sahina Shrestha.`,
      milestones: buildMilestonesForPhase(newPhase, 'Just Now', resolvedManualDelivery, newAddress || 'Kathmandu')
    };

    saveTrackedOrder(newOrder);
    trackOrderSalesInFirestore(newOrder);
    reloadOrders();
    setIsAddingOrder(false);
    setNewOrderId('');
    setNewCustomerName('');
    setNewPhone('');
    setNewAddress('');
    setNewItemTitle('');
    setNewTotal('');
    showToast(`Created Order ${generatedId}`);
  };

  // If user is not logged into seller mode, protect this view
  if (!isSellerMode) {
    return (
      <section className="py-16 bg-[#FAF8F5] min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 border border-[#E8DFD8] shadow-xs text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="font-serif text-xl font-bold text-[#1C1B1A]">Seller Studio Access Required</h2>
          <p className="text-xs text-[#736C65] leading-relaxed">
            Order Progress is strictly for the Artified workshop seller. Please unlock Seller Studio to view and update customer orders.
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <button
              type="button"
              onClick={() => setIsSellerAuthModalOpen(true)}
              className="px-4 py-2 bg-[#1C1B1A] text-[#D4AF37] hover:bg-black rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Unlock Seller Studio
            </button>
            <button
              type="button"
              onClick={() => setActiveNavTab('track')}
              className="px-4 py-2 bg-[#FAF8F5] text-[#1C1B1A] hover:bg-[#E8DFD8] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Go to Buyer Track Order
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Separate pending vs completed
  const pendingOrders = orders.filter((o) => o.currentPhase !== 'delivered');
  const completedOrders = orders.filter((o) => o.currentPhase === 'delivered');

  // Filter based on active tab and search query
  const targetList = activeTab === 'pending' ? pendingOrders : completedOrders;

  const filteredOrders = targetList.filter((order) => {
    const q = searchQuery.toLowerCase().trim();
    const normQuery = normalizeOrderId(searchQuery).toLowerCase();
    const legacyId = ((order as any).legacyOrderId || '').toLowerCase();
    const matchesSearch = 
      !q || 
      order.orderId.toLowerCase().includes(q) ||
      (normQuery && order.orderId.toLowerCase().includes(normQuery)) ||
      (legacyId && legacyId.includes(q)) ||
      order.customerName.toLowerCase().includes(q) ||
      order.phone.includes(q) ||
      order.deliveryAddress.toLowerCase().includes(q) ||
      order.items.some((i) => i.title.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (activeTab === 'pending' && pendingSubFilter !== 'all') {
      if (pendingSubFilter === 'handcrafting_and_packaging') {
        return order.currentPhase === 'handcrafting_and_packaging' || 
               order.currentPhase === 'beading_in_progress' || 
               order.currentPhase === 'quality_and_packaging';
      }
      return order.currentPhase === pendingSubFilter;
    }

    return true;
  });

  return (
    <section className="py-3 bg-[#F4EFEA] min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-2.5">
        
        {/* Combined Ultra-Compact Top Controls Bar (Header + Tabs + Subfilters + Search) */}
        <div className="bg-white rounded-xl p-2.5 border border-[#D8CBBF] shadow-2xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Title & Primary Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-[#1C1B1A] text-white px-2.5 py-1 rounded-lg">
                <ClipboardCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <h1 className="font-serif text-xs sm:text-sm font-bold tracking-tight">
                  Order Progress
                </h1>
              </div>

              <div className="flex items-center gap-1 bg-[#FAF8F5] p-0.5 rounded-lg border border-[#E8DFD8]">
                <button
                  type="button"
                  onClick={() => setActiveTab('pending')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    activeTab === 'pending'
                      ? 'bg-[#1C1B1A] text-white shadow-2xs'
                      : 'text-[#736C65] hover:text-[#1C1B1A]'
                  }`}
                >
                  <Clock className="w-3 h-3 text-[#D4AF37]" />
                  <span>Pending</span>
                  <span className={`text-[10px] px-1.5 rounded-full font-mono ${
                    activeTab === 'pending' ? 'bg-[#D4AF37] text-[#1C1B1A]' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {pendingOrders.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('completed')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    activeTab === 'completed'
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'text-[#736C65] hover:text-[#1C1B1A]'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                  <span>Delivered</span>
                  <span className={`text-[10px] px-1.5 rounded-full font-mono ${
                    activeTab === 'completed' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {completedOrders.length}
                  </span>
                </button>
              </div>

              {/* Pending Sub-filters inline */}
              {activeTab === 'pending' && (
                <div className="flex items-center gap-1 text-[10px] overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setPendingSubFilter('all')}
                    className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      pendingSubFilter === 'all'
                        ? 'bg-[#1C1B1A] text-white'
                        : 'bg-[#FAF8F5] text-[#736C65] hover:text-[#1C1B1A] border border-[#E8DFD8]'
                    }`}
                  >
                    All ({pendingOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingSubFilter('confirmed')}
                    className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      pendingSubFilter === 'confirmed'
                        ? 'bg-[#1C1B1A] text-[#D4AF37]'
                        : 'bg-[#FAF8F5] text-[#736C65] hover:text-[#1C1B1A] border border-[#E8DFD8]'
                    }`}
                  >
                    1. Confirmed ({pendingOrders.filter(o => o.currentPhase === 'confirmed').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingSubFilter('handcrafting_and_packaging')}
                    className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      pendingSubFilter === 'handcrafting_and_packaging'
                        ? 'bg-[#1C1B1A] text-[#D4AF37]'
                        : 'bg-[#FAF8F5] text-[#736C65] hover:text-[#1C1B1A] border border-[#E8DFD8]'
                    }`}
                  >
                    2. Crafting ({pendingOrders.filter(o => o.currentPhase === 'handcrafting_and_packaging' || o.currentPhase === 'beading_in_progress' || o.currentPhase === 'quality_and_packaging').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingSubFilter('out_for_delivery')}
                    className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      pendingSubFilter === 'out_for_delivery'
                        ? 'bg-[#1C1B1A] text-[#D4AF37]'
                        : 'bg-[#FAF8F5] text-[#736C65] hover:text-[#1C1B1A] border border-[#E8DFD8]'
                    }`}
                  >
                    3. Dispatch ({pendingOrders.filter(o => o.currentPhase === 'out_for_delivery').length})
                  </button>
                </div>
              )}
            </div>

            {/* Search + Manual Add + Refresh */}
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial justify-end">
              <div className="relative w-44 sm:w-56">
                <Search className="w-3.5 h-3.5 text-[#8C7A6B] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ID, Name, Phone..."
                  className="w-full pl-7 pr-6 py-1 bg-[#FAF8F5] border border-[#E8DFD8] rounded-lg text-xs text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#8C7A6B] hover:text-[#1C1B1A]"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleSaveAllOrderChanges()}
                disabled={isSavingOrders}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs ${
                  hasUnsavedChanges
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/50'
                    : 'bg-[#1C1B1A] hover:bg-black text-[#D4AF37] border border-[#D4AF37]/40'
                }`}
                title="Save all order progress changes to Cloud & Repository"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingOrders ? 'Saving...' : hasUnsavedChanges ? 'Save Changes *' : 'Save'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddingOrder(!isAddingOrder)}
                className="px-2.5 py-1 bg-[#D4AF37] text-[#1C1B1A] hover:bg-[#c29f2e] text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>{isAddingOrder ? 'Cancel' : 'Add Order'}</span>
              </button>

              <button
                type="button"
                onClick={reloadOrders}
                className="p-1.5 bg-[#FAF8F5] hover:bg-[#E8DFD8] text-[#1C1B1A] rounded-lg transition-colors border border-[#E8DFD8] cursor-pointer"
                title="Refresh order records"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Manual Order Form */}
          {isAddingOrder && (
            <form onSubmit={handleCreateManualOrder} className="pt-2 border-t border-[#F0EBE5] grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
              <input
                type="text"
                required
                placeholder="Customer Name *"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="px-2 py-1 bg-[#FAF8F5] border border-[#E8DFD8] rounded text-xs"
              />
              <input
                type="text"
                required
                placeholder="Phone (98...)*"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="px-2 py-1 bg-[#FAF8F5] border border-[#E8DFD8] rounded text-xs"
              />
              <input
                type="text"
                placeholder="Address & City"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="px-2 py-1 bg-[#FAF8F5] border border-[#E8DFD8] rounded text-xs"
              />
              <input
                type="text"
                placeholder="Item Title (e.g. Caviar Bag)"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                className="px-2 py-1 bg-[#FAF8F5] border border-[#E8DFD8] rounded text-xs"
              />
              <input
                type="number"
                placeholder="NPR (e.g. 2499)"
                value={newTotal}
                onChange={(e) => setNewTotal(e.target.value)}
                className="px-2 py-1 bg-[#FAF8F5] border border-[#E8DFD8] rounded text-xs"
              />
              <button
                type="submit"
                className="py-1 px-2.5 bg-[#1C1B1A] text-white hover:bg-black rounded font-bold text-xs transition-colors cursor-pointer"
              >
                Save Order
              </button>
            </form>
          )}
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="bg-emerald-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{toastMessage}</span>
            </div>
            <span className="text-[9px] opacity-80">Synced</span>
          </div>
        )}

        {/* High-Contrast, Concise Orders List (3+ orders clearly visible in 1 scroll) */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-dashed border-[#D5C7BC] max-w-sm mx-auto">
              <Package className="w-7 h-7 text-[#C5A880] mx-auto mb-1.5" />
              <p className="text-xs font-bold text-[#1C1B1A]">
                {activeTab === 'pending' ? 'No pending orders found' : 'No completed history found'}
              </p>
              <p className="text-[11px] text-[#736C65] mt-0.5">
                {searchQuery ? `No orders match "${searchQuery}".` : 'All caught up!'}
              </p>
            </div>
          ) : (
            filteredOrders.map((order, index) => {
              const activePhase = order.currentPhase === 'beading_in_progress' || order.currentPhase === 'quality_and_packaging'
                ? 'handcrafting_and_packaging'
                : order.currentPhase;

              const orderBreakdown = getOrderManufactureDeliveryBreakdown(
                order.items,
                order.deliveryZoneName,
                order.deliveryAddress
              );
              const deliveryDateValue = editingDeliveryDate[order.orderId] ?? order.estimatedDeliveryDate ?? orderBreakdown.totalEstimatedDaysText;
              const paymentInfo = formatConcisePaymentBadge(order);
              const deliveryFee = getOrderDeliveryFee(order);
              const itemSubtotal = Number(order.items?.[0]?.price ?? getOrderItemsSubtotal(order)) || 0;
              const totalAmount = Number(order.total) || (itemSubtotal + deliveryFee);
              const hasScreenshot = Boolean(
                order.paymentScreenshot &&
                (order.paymentScreenshot.startsWith('data:image') ||
                  order.paymentScreenshot.startsWith('http') ||
                  order.paymentScreenshot.startsWith('blob:'))
              );

              const phaseAccentBorder =
                activePhase === 'delivered'
                  ? 'border-l-emerald-600'
                  : activePhase === 'out_for_delivery'
                  ? 'border-l-sky-600'
                  : activePhase === 'handcrafting_and_packaging'
                  ? 'border-l-amber-500'
                  : 'border-l-[#D4AF37]';

              const isEvenCard = index % 2 === 1;

              return (
                <div
                  key={order.orderId}
                  className={`rounded-xl overflow-hidden border-2 ${
                    isEvenCard ? 'border-[#C2B29F] bg-[#FAF6F0]' : 'border-[#D4C7B8] bg-white'
                  } border-l-[6px] ${phaseAccentBorder} shadow-xs hover:shadow-md transition-all`}
                >
                  {/* Dark Contrast Top Strip — Visually separates every order immediately */}
                  <div className={`${
                    isEvenCard ? 'bg-[#2A2522]' : 'bg-[#1C1B1A]'
                  } text-white px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded bg-[#D4AF37] text-[#1C1B1A] font-mono font-extrabold text-[11px]">
                        {index + 1}
                      </span>
                      <span className="font-mono font-bold text-[#F5F2EB] text-xs tracking-wide">
                        {order.orderId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyOrderId(order.orderId)}
                        className="text-[#A69E96] hover:text-white p-0.5 cursor-pointer"
                        title="Copy Order ID"
                      >
                        {copiedId === order.orderId ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <span className="text-[#A69E96] text-[11px]">
                        • {order.orderPlacedDate}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          paymentInfo.isCod
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                        }`}
                      >
                        {paymentInfo.label}
                      </span>

                      {hasScreenshot && (
                        <button
                          type="button"
                          onClick={() => setSelectedScreenshotOrder(order)}
                          className="text-[10px] font-bold text-[#1C1B1A] bg-[#D4AF37] hover:bg-[#e3be42] px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                          title={`View Payment Screenshot for ${order.orderId}`}
                        >
                          <Camera className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                      )}
                    </div>

                    {/* Right of Header: Estimated Delivery (Mfg + Del) shown ONCE */}
                    <div
                      className="flex items-center gap-1.5 text-[11px] bg-white/10 px-2 py-0.5 rounded border border-white/15"
                      title={`Manufacture (${orderBreakdown.categoryLabel}): ${orderBreakdown.manufactureDaysText} + Delivery: ${orderBreakdown.deliveryDaysText}`}
                    >
                      <Truck className="w-3 h-3 text-[#D4AF37] shrink-0" />
                      <span className="text-[#D5C7BC] text-[10px] font-semibold">Est:</span>
                      <input
                        type="text"
                        value={deliveryDateValue}
                        onChange={(e) => handleDeliveryDateChange(order.orderId, e.target.value)}
                        placeholder={orderBreakdown.totalEstimatedDaysText}
                        className="w-20 bg-transparent text-[11px] font-bold text-[#D4AF37] focus:outline-none"
                        title="Click to edit estimated delivery days"
                      />
                      <span className="text-[10px] text-[#BFB3A8] hidden lg:inline">
                        ({orderBreakdown.manufactureDaysText} mfg + {orderBreakdown.deliveryDaysText} del)
                      </span>
                    </div>
                  </div>

                  {/* Single Concise Main Row: Customer | Product & Single Price Summary | 4-Stage Buttons | Actions */}
                  <div className="px-3 py-2 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center md:divide-x md:divide-[#E5DCD2]">
                    
                    {/* 1. Customer & Delivery Destination (Shown Once) */}
                    <div className="md:col-span-3 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#1C1B1A] text-xs truncate">
                          {order.customerName}
                        </span>
                        <a
                          href={`tel:${order.phone}`}
                          className="text-[11px] font-mono text-[#5E5955] hover:text-[#1C1B1A] flex items-center gap-1"
                        >
                          <Phone className="w-2.5 h-2.5 text-[#8C7A6B]" />
                          <span>{order.phone}</span>
                        </a>
                      </div>
                      <div className="text-[11px] text-[#5E5955] flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-[#8C7A6B] shrink-0" />
                        <span className="truncate font-medium text-[#1C1B1A]">{order.deliveryAddress}</span>
                        <span className="text-[#8C7A6B]">•</span>
                        <span className="text-[10px] text-[#736C65] truncate">{order.deliveryZoneName}</span>
                      </div>
                    </div>

                    {/* 2. Ordered Item & Single Price Breakdown (Shown Once, No Sold Count) */}
                    <div className="md:col-span-4 md:pl-3 flex items-center gap-2.5 min-w-0">
                      <img
                        src={(() => {
                          const firstItem = order.items?.[0];
                          const pid = firstItem ? resolveProductIdFromOrderItem(firstItem, products) : null;
                          const matchedProd = pid ? products.find((p) => p.id === pid) : null;
                          return (
                            matchedProd?.images?.[0] ||
                            getRealProductImage(firstItem?.title, firstItem?.image, firstItem?.productId || pid || undefined)
                          );
                        })()}
                        alt={order.items?.[0]?.title || 'Handcrafted Item'}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = CAVIAR_PEARL_BAG_IMAGE;
                        }}
                        className="w-10 h-10 rounded-lg object-cover border border-[#D8CBBF] shrink-0 bg-white"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-[#1C1B1A] truncate text-xs leading-snug">
                            {order.items?.[0]?.title || 'Handcrafted Artified Piece'}
                          </p>
                          {(order.items?.length || 0) > 1 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#1C1B1A] text-[#D4AF37] shrink-0">
                              +{order.items.length - 1} more
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[#5E5955] mt-0.5">
                          <span>
                            Qty: <strong className="text-[#1C1B1A]">{order.items?.[0]?.quantity ?? 1}</strong>
                          </span>
                          <span className="text-[#C5B9AC]">•</span>
                          <span>
                            Item: <strong className="text-[#1C1B1A]">NPR {itemSubtotal.toLocaleString()}</strong>
                          </span>
                          <span className="text-[#C5B9AC]">•</span>
                          <span>
                            Delivery: <strong className="text-[#1C1B1A]">NPR {deliveryFee.toLocaleString()}</strong>
                          </span>
                          <span className="text-[#C5B9AC]">•</span>
                          <span className="font-extrabold text-[#1C1B1A] bg-[#F2EAE0] px-1.5 py-0.2 rounded border border-[#DFD3C5]">
                            Total: NPR {totalAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3. Single 4-Stage Progress Selector (Shown Once - No Redundant Dropdown) */}
                    <div className="md:col-span-3 md:pl-3 space-y-1.5">
                      <div className="grid grid-cols-4 gap-1">
                        <button
                          type="button"
                          onClick={() => handlePhaseChange(order.orderId, 'confirmed')}
                          className={`py-1 px-1 rounded border text-center transition-all cursor-pointer text-[10px] leading-tight font-bold ${
                            activePhase === 'confirmed'
                              ? 'bg-[#1C1B1A] text-[#D4AF37] border-[#1C1B1A] shadow-2xs'
                              : 'bg-white hover:bg-[#FAF8F5] text-[#5E5955] border-[#D8CBBF]'
                          }`}
                          title="Stage 1: Order Confirmed & Paid"
                        >
                          1. Confirmed
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePhaseChange(order.orderId, 'handcrafting_and_packaging')}
                          className={`py-1 px-1 rounded border text-center transition-all cursor-pointer text-[10px] leading-tight font-bold ${
                            activePhase === 'handcrafting_and_packaging'
                              ? 'bg-[#1C1B1A] text-[#D4AF37] border-[#1C1B1A] shadow-2xs'
                              : 'bg-white hover:bg-[#FAF8F5] text-[#5E5955] border-[#D8CBBF]'
                          }`}
                          title="Stage 2: Handcrafting & Packaging"
                        >
                          2. Crafting
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePhaseChange(order.orderId, 'out_for_delivery')}
                          className={`py-1 px-1 rounded border text-center transition-all cursor-pointer text-[10px] leading-tight font-bold ${
                            activePhase === 'out_for_delivery'
                              ? 'bg-[#1C1B1A] text-[#D4AF37] border-[#1C1B1A] shadow-2xs'
                              : 'bg-white hover:bg-[#FAF8F5] text-[#5E5955] border-[#D8CBBF]'
                          }`}
                          title="Stage 3: Shipped / Out for Delivery"
                        >
                          3. Dispatch
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePhaseChange(order.orderId, 'delivered')}
                          className={`py-1 px-1 rounded border text-center transition-all cursor-pointer text-[10px] leading-tight font-bold ${
                            activePhase === 'delivered'
                              ? 'bg-emerald-800 text-white border-emerald-700 shadow-2xs'
                              : 'bg-white hover:bg-[#FAF8F5] text-[#5E5955] border-[#D8CBBF]'
                          }`}
                          title="Stage 4: Delivered"
                        >
                          4. Delivered
                        </button>
                      </div>

                      <div className="w-full h-1.5 bg-[#EAE2D9] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#D4AF37] to-[#C5A880] rounded-full transition-all duration-300"
                          style={{ width: `${getProgressPercentage(activePhase)}%` }}
                        />
                      </div>
                    </div>

                    {/* 4. Save, WhatsApp & Delete Actions */}
                    <div className="md:col-span-2 md:pl-3 flex items-center justify-end gap-1.5 flex-wrap">
                      {dirtyOrderIds[order.orderId] && (
                        <button
                          type="button"
                          onClick={() => handleSaveAllOrderChanges(order.orderId)}
                          disabled={isSavingOrders}
                          className="px-2.5 py-1.5 rounded-lg bg-[#1C1B1A] hover:bg-black text-[#D4AF37] border border-[#D4AF37] font-bold text-[11px] flex items-center justify-center gap-1 transition-colors shadow-2xs cursor-pointer"
                          title="Save changes for this order"
                        >
                          <Save className="w-3 h-3 shrink-0" />
                          <span>Save</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(order)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors shadow-2xs cursor-pointer"
                        title="Open WhatsApp with pre-filled update message"
                      >
                        <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteOrder(order.orderId)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                        title="Delete Order"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Full-Screen Mistake-Proof Payment Screenshot Lightbox Modal */}
        {selectedScreenshotOrder && selectedScreenshotOrder.paymentScreenshot && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in"
            onClick={() => setSelectedScreenshotOrder(null)}
          >
            <div
              className="bg-[#FAF8F5] rounded-2xl border-2 border-[#D4AF37] shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#1C1B1A] text-white px-4 py-3 flex items-center justify-between border-b border-[#34312F]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-extrabold text-[#D4AF37]">
                      {selectedScreenshotOrder.orderId}
                    </span>
                    <span className="text-[10px] bg-emerald-900/80 text-emerald-300 border border-emerald-600/50 px-2 py-0.2 rounded-full font-bold">
                      Verified Order Binding
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A69E96] mt-0.5">
                    Buyer: <strong className="text-white">{selectedScreenshotOrder.customerName}</strong> ({selectedScreenshotOrder.phone}) • Total: <strong className="text-[#D4AF37]">NPR {(Number(selectedScreenshotOrder.total) || 0).toLocaleString()}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedScreenshotOrder(null)}
                  className="p-1.5 text-[#A69E96] hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center bg-zinc-900/95">
                <img
                  src={selectedScreenshotOrder.paymentScreenshot}
                  alt={`Payment Screenshot for ${selectedScreenshotOrder.orderId}`}
                  className="max-h-[62vh] w-auto object-contain rounded-xl border border-[#D4AF37]/50 shadow-lg bg-white"
                />
                <p className="text-[10px] text-[#D4AF37] mt-2 text-center">
                  🔒 Locked to Order {selectedScreenshotOrder.orderId} ({selectedScreenshotOrder.customerName}) • Compressed (~30KB) for zero storage bloat
                </p>
              </div>

              <div className="p-3 bg-white border-t border-[#E8DFD8] flex items-center justify-between gap-2 flex-wrap">
                <a
                  href={selectedScreenshotOrder.paymentScreenshot}
                  download={`Artified-Receipt-${selectedScreenshotOrder.orderId.replace('#', '')}-${selectedScreenshotOrder.customerName.replace(/\s+/g, '_')}.jpg`}
                  className="px-3.5 py-2 bg-[#1C1B1A] hover:bg-black text-[#D4AF37] text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Receipt ({selectedScreenshotOrder.orderId})</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      removeOrderPaymentScreenshot(selectedScreenshotOrder.orderId);
                      setOrders(getAllOrdersForSeller());
                      setSelectedScreenshotOrder(null);
                      setToastMessage(`Removed screenshot image from ${selectedScreenshotOrder.orderId} to free space.`);
                      setTimeout(() => setToastMessage(null), 3000);
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                    title="Remove screenshot image after verification to free storage"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Screenshot (Free Space)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedScreenshotOrder(null)}
                    className="px-3.5 py-2 bg-[#FAF8F5] hover:bg-[#F0EBE5] text-[#1C1B1A] border border-[#E8DFD8] text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
