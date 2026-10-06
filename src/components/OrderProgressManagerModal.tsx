import React, { useState, useEffect } from 'react';
import { 
  X, 
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
  History
} from 'lucide-react';
import { 
  getAllOrdersForSeller, 
  updateOrderPhase, 
  saveTrackedOrder, 
  normalizeOrderId, 
  getProgressPercentage,
  buildMilestonesForPhase 
} from '../data/trackingData';
import { getRealProductImage } from '../utils/productImages';
import { TrackedOrderData, OrderProductionPhase } from '../types';

interface OrderProgressManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string;
}

export const OrderProgressManagerModal: React.FC<OrderProgressManagerModalProps> = ({
  isOpen,
  onClose,
  initialOrderId
}) => {
  const [orders, setOrders] = useState<TrackedOrderData[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialOrderId || '');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [pendingSubFilter, setPendingSubFilter] = useState<'all' | 'confirmed' | 'handcrafting_and_packaging' | 'out_for_delivery'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAddingOrder, setIsAddingOrder] = useState(false);

  // Editable estimated arrival dates per order
  const [editingDeliveryDate, setEditingDeliveryDate] = useState<Record<string, string>>({});

  // Manual order form state
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newTotal, setNewTotal] = useState('');
  const [newDeliveryDate, setNewDeliveryDate] = useState('1-2 business days');

  const reloadOrders = () => {
    const list = getAllOrdersForSeller();
    setOrders(list);
  };

  useEffect(() => {
    if (isOpen) {
      reloadOrders();
      if (initialOrderId) setSearchQuery(initialOrderId);
    }
  }, [isOpen, initialOrderId]);

  useEffect(() => {
    const handleOrderUpdated = () => reloadOrders();
    window.addEventListener('artified_order_updated', handleOrderUpdated);
    return () => window.removeEventListener('artified_order_updated', handleOrderUpdated);
  }, []);

  if (!isOpen) return null;

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

    setOrders((prev) => 
      prev.map((o) => normalizeOrderId(o.orderId) === normalizeOrderId(orderId) ? updated : o)
    );

    const phaseNames: Record<OrderProductionPhase, string> = {
      confirmed: 'Confirmed & Paid',
      handcrafting_and_packaging: 'Handcrafting & Packaging',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      beading_in_progress: 'Handcrafting & Packaging',
      quality_and_packaging: 'Handcrafting & Packaging'
    };

    showToast(`Order #${orderId} moved to "${phaseNames[phase]}"!`);
  };

  const handleDeliveryDateChange = (orderId: string, newDate: string) => {
    setEditingDeliveryDate((prev) => ({ ...prev, [orderId]: newDate }));
    updateOrderPhase(orderId, undefined as any, { estimatedDeliveryDate: newDate });
    setOrders((prev) => 
      prev.map((o) => normalizeOrderId(o.orderId) === normalizeOrderId(orderId) ? { ...o, estimatedDeliveryDate: newDate } : o)
    );
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

  const handleCreateManualOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !newPhone.trim()) {
      alert('Please enter customer name and phone number');
      return;
    }

    const generatedId = `ART-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: TrackedOrderData = {
      orderId: generatedId,
      customerName: newCustomerName.trim(),
      phone: newPhone.trim(),
      deliveryAddress: newAddress.trim() || 'Kathmandu Valley, Nepal',
      deliveryZoneName: 'Inside Ring Road (Kathmandu / Lalitpur)',
      paymentMethodText: 'Direct Order (WhatsApp / Walk-in)',
      paymentStatus: 'Paid & Verified',
      items: [
        {
          title: newItemTitle.trim() || 'Custom Handcrafted Pearl Piece',
          image: getRealProductImage(newItemTitle.trim() || 'Custom Handcrafted Pearl Piece'),
          quantity: 1,
          price: Number(newTotal) || 2499,
          customization: 'Handcrafted by Sahina Shrestha'
        }
      ],
      total: Number(newTotal) || 2499,
      orderPlacedDate: 'Just Now',
      estimatedDeliveryDate: newDeliveryDate.trim() || '1-2 business days',
      currentPhase: 'confirmed',
      progressPercentage: getProgressPercentage('confirmed'),
      artisanName: 'Sahina Shrestha',
      artisanRole: 'Founder and Creator',
      studioLocation: 'Artified Workshop, Kathmandu, Nepal',
      liveCraftNotes: 'Handcrafting scheduled at Kathmandu workshop by Sahina Shrestha.',
      milestones: buildMilestonesForPhase('confirmed', 'Just Now', newDeliveryDate.trim() || '1-2 business days', newAddress || 'Kathmandu')
    };

    saveTrackedOrder(newOrder);
    reloadOrders();
    setIsAddingOrder(false);
    setNewCustomerName('');
    setNewPhone('');
    setNewAddress('');
    setNewItemTitle('');
    setNewTotal('');
    showToast(`Created Order #${generatedId}!`);
  };

  const pendingOrders = orders.filter((o) => o.currentPhase !== 'delivered');
  const completedOrders = orders.filter((o) => o.currentPhase === 'delivered');

  const targetList = activeTab === 'pending' ? pendingOrders : completedOrders;

  const filteredOrders = targetList.filter((order) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q || 
      order.orderId.toLowerCase().includes(q) ||
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-[#FAF8F5] rounded-3xl border border-[#E8DFD8] shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-[#1C1B1A] text-white py-2 px-3.5 sm:px-4 border-b border-[#34312F] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="font-serif text-sm sm:text-base font-bold text-white tracking-tight">
              Order Progress
            </h2>
            <span className="text-[9px] bg-[#D4AF37] text-[#1C1B1A] font-bold px-1.5 py-0.2 rounded">
              Seller
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddingOrder(!isAddingOrder)}
              className="px-2.5 py-1 bg-[#D4AF37] text-[#1C1B1A] hover:bg-[#c29f2e] text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>{isAddingOrder ? 'Cancel' : '+ Add Order'}</span>
            </button>

            <button
              type="button"
              onClick={reloadOrders}
              className="p-1 text-[#A69E96] hover:text-white rounded-md"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[#A69E96] hover:text-white rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white text-xs py-1.5 px-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{toastMessage}</span>
            </div>
            <span className="text-[10px] opacity-80">Saved</span>
          </div>
        )}

        {/* Optional Manual Order Form */}
        {isAddingOrder && (
          <div className="p-3 bg-white border-b border-[#E8DFD8] shrink-0">
            <form onSubmit={handleCreateManualOrder} className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
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
                placeholder="Item Title"
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
                className="py-1 px-2.5 bg-[#1C1B1A] text-white hover:bg-black rounded font-bold text-xs"
              >
                Save Order
              </button>
            </form>
          </div>
        )}

        {/* Tabbed Interface: Pending Orders vs Completed History */}
        <div className="p-3 bg-white border-b border-[#E8DFD8] shrink-0 space-y-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            
            {/* Primary 2 Tabs */}
            <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1 rounded-xl border border-[#E8DFD8]">
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'pending'
                    ? 'bg-[#1C1B1A] text-white shadow-2xs'
                    : 'text-[#736C65] hover:text-[#1C1B1A]'
                }`}
              >
                <Clock className="w-3 h-3 text-[#D4AF37]" />
                <span>Pending Orders</span>
                <span className={`text-[10px] px-1.5 rounded-full font-mono ${
                  activeTab === 'pending' ? 'bg-[#D4AF37] text-[#1C1B1A]' : 'bg-gray-200 text-gray-700'
                }`}>
                  {pendingOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('completed')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'completed'
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'text-[#736C65] hover:text-[#1C1B1A]'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                <span>Completed History</span>
                <span className={`text-[10px] px-1.5 rounded-full font-mono ${
                  activeTab === 'completed' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {completedOrders.length}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-[#8C7A6B] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders..."
                className="w-full pl-7 pr-6 py-1 bg-[#FAF8F5] border border-[#E8DFD8] rounded-lg text-xs text-[#1C1B1A] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#8C7A6B]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Pending Sub-filters */}
          {activeTab === 'pending' && (
            <div className="flex items-center gap-1 text-[11px] overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setPendingSubFilter('all')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  pendingSubFilter === 'all' ? 'bg-[#1C1B1A] text-white' : 'bg-[#FAF8F5] text-[#736C65]'
                }`}
              >
                All ({pendingOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setPendingSubFilter('confirmed')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  pendingSubFilter === 'confirmed' ? 'bg-[#1C1B1A] text-[#D4AF37]' : 'bg-[#FAF8F5] text-[#736C65]'
                }`}
              >
                1. Confirmed ({pendingOrders.filter(o => o.currentPhase === 'confirmed').length})
              </button>
              <button
                type="button"
                onClick={() => setPendingSubFilter('handcrafting_and_packaging')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  pendingSubFilter === 'handcrafting_and_packaging' ? 'bg-[#1C1B1A] text-[#D4AF37]' : 'bg-[#FAF8F5] text-[#736C65]'
                }`}
              >
                2. Handcrafting ({pendingOrders.filter(o => o.currentPhase === 'handcrafting_and_packaging' || o.currentPhase === 'beading_in_progress' || o.currentPhase === 'quality_and_packaging').length})
              </button>
              <button
                type="button"
                onClick={() => setPendingSubFilter('out_for_delivery')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  pendingSubFilter === 'out_for_delivery' ? 'bg-[#1C1B1A] text-[#D4AF37]' : 'bg-[#FAF8F5] text-[#736C65]'
                }`}
              >
                3. Dispatch ({pendingOrders.filter(o => o.currentPhase === 'out_for_delivery').length})
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Compact Orders List (Fits 3 to 4 orders on screen) */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 flex-1">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#D5C7BC] max-w-sm mx-auto">
              <Package className="w-8 h-8 text-[#C5A880] mx-auto mb-2" />
              <p className="text-xs font-bold text-[#1C1B1A]">
                {activeTab === 'pending' ? 'No pending orders' : 'No completed history'}
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const activePhase = order.currentPhase === 'beading_in_progress' || order.currentPhase === 'quality_and_packaging'
                ? 'handcrafting_and_packaging'
                : order.currentPhase;

              const deliveryDateValue = editingDeliveryDate[order.orderId] ?? order.estimatedDeliveryDate ?? '1-2 business days';

              return (
                <div
                  key={order.orderId}
                  className="bg-white rounded-xl border border-[#E8DFD8] p-2.5 sm:p-3 shadow-2xs hover:border-[#C5A880] transition-all space-y-2"
                >
                  {/* Top Slim Row */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[#F0EBE5] pb-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#1C1B1A] bg-[#FAF8F5] px-1.5 py-0.2 rounded border border-[#E8DFD8] text-[11px]">
                        {order.orderId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyOrderId(order.orderId)}
                        className="text-[#8C7A6B] hover:text-[#1C1B1A]"
                        title="Copy ID"
                      >
                        {copiedId === order.orderId ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <span className="text-[10px] text-[#736C65]">
                        Placed: <strong className="text-[#1C1B1A]">{order.orderPlacedDate}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-[#1C1B1A] bg-[#FAF8F5] px-1.5 py-0.2 rounded border border-[#E8DFD8]">
                        NPR {order.total.toLocaleString()}
                      </span>
                      <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {order.paymentStatus}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-[#736C65] bg-[#FAF8F5] px-1.5 py-0.2 rounded border border-[#E8DFD8]">
                        <span className="text-[#8C7A6B] uppercase font-bold text-[9px]">Est:</span>
                        <input
                          type="text"
                          value={deliveryDateValue}
                          onChange={(e) => handleDeliveryDateChange(order.orderId, e.target.value)}
                          placeholder="1-2 business days"
                          className="w-24 bg-transparent text-[10px] text-[#1C1B1A] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Compact Main Row */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
                    
                    {/* 1. Customer & Delivery (Ticked Green) */}
                    <div className="md:col-span-3 text-xs space-y-0.5 bg-[#FAF8F5] p-2 rounded-lg border border-[#E8DFD8]/80">
                      <span className="text-[8px] uppercase font-bold tracking-wider text-[#8C7A6B] block">
                        Customer & Delivery
                      </span>
                      <p className="font-bold text-[#1C1B1A] truncate text-[11px]">{order.customerName}</p>
                      <p className="text-[10px] text-[#5E5955] flex items-center gap-1 font-mono">
                        <Phone className="w-2.5 h-2.5 text-[#8C7A6B]" />
                        <a href={`tel:${order.phone}`} className="hover:underline">{order.phone}</a>
                      </p>
                      <p className="text-[10px] text-[#736C65] truncate flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-[#8C7A6B] shrink-0" />
                        <span className="truncate">{order.deliveryAddress}</span>
                      </p>
                      <span className="inline-block text-[8px] font-semibold text-[#8C7A6B] bg-white px-1 py-0.2 rounded border border-[#E8DFD8] truncate max-w-full">
                        {order.deliveryZoneName}
                      </span>
                    </div>

                    {/* 2. Ordered Items (Ticked Green) */}
                    <div className="md:col-span-3 flex items-center gap-2 bg-[#FAF8F5] p-2 rounded-lg border border-[#E8DFD8]/80 min-w-0">
                      <img
                        src={getRealProductImage(order.items[0]?.title, order.items[0]?.image)}
                        alt={order.items[0]?.title}
                        className="w-9 h-9 rounded-md object-cover border border-[#E8DFD8] shrink-0"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <span className="text-[8px] uppercase font-bold tracking-wider text-[#8C7A6B] block">
                          Ordered Items ({order.items.length})
                        </span>
                        <p className="font-semibold text-[#1C1B1A] truncate text-[11px]">{order.items[0]?.title}</p>
                        <p className="text-[10px] text-[#736C65]">
                          Qty: {order.items[0]?.quantity} • NPR {order.items[0]?.price.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* 3. 4-Stage Progress Buttons (Ticked Green) */}
                    <div className="md:col-span-4 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-[#1C1B1A] flex items-center gap-1 uppercase tracking-wider text-[9px]">
                          <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />
                          <span>Timeline Stage:</span>
                        </span>
                        <span className="font-mono font-bold text-[#C5A880] text-[9px]">
                          {getProgressPercentage(activePhase)}% Complete
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1">
                        <button
                          type="button"
                          onClick={() => handlePhaseChange(order.orderId, 'confirmed')}
                          className={`py-1 px-0.5 rounded border text-center transition-all cursor-pointer text-[9px] leading-tight font-bold ${
                            activePhase === 'confirmed'
                              ? 'bg-[#1C1B1A] text-[#D4AF37] border-[#D4AF37]'
                              : 'bg-[#FAF8F5] hover:bg-white text-[#5E5955] border-[#E8DFD8]'
                          }`}
                        >
                          1. Confirmed
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePhaseChange(order.orderId, 'handcrafting_and_packaging')}
                          className={`py-1 px-0.5 rounded border text-center transition-all cursor-pointer text-[9px] leading-tight font-bold ${
                            activePhase === 'handcrafting_and_packaging'
                              ? 'bg-[#1C1B1A] text-[#D4AF37] border-[#D4AF37]'
                              : 'bg-[#FAF8F5] hover:bg-white text-[#5E5955] border-[#E8DFD8]'
                          }`}
                        >
                          2. Handcrafting
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePhaseChange(order.orderId, 'out_for_delivery')}
                          className={`py-1 px-0.5 rounded border text-center transition-all cursor-pointer text-[9px] leading-tight font-bold ${
                            activePhase === 'out_for_delivery'
                              ? 'bg-[#1C1B1A] text-[#D4AF37] border-[#D4AF37]'
                              : 'bg-[#FAF8F5] hover:bg-white text-[#5E5955] border-[#E8DFD8]'
                          }`}
                        >
                          3. Dispatch
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePhaseChange(order.orderId, 'delivered')}
                          className={`py-1 px-0.5 rounded border text-center transition-all cursor-pointer text-[9px] leading-tight font-bold ${
                            activePhase === 'delivered'
                              ? 'bg-emerald-800 text-white border-emerald-600'
                              : 'bg-[#FAF8F5] hover:bg-white text-[#5E5955] border-[#E8DFD8]'
                          }`}
                        >
                          4. Delivered
                        </button>
                      </div>

                      <div className="w-full h-1 bg-[#FAF8F5] rounded-full overflow-hidden border border-[#E8DFD8]">
                        <div 
                          className="h-full bg-gradient-to-r from-[#D4AF37] to-[#C5A880] rounded-full transition-all duration-300"
                          style={{ width: `${getProgressPercentage(activePhase)}%` }}
                        />
                      </div>
                    </div>

                    {/* 4. WhatsApp Customer Button (Ticked Green) */}
                    <div className="md:col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(order)}
                        className="w-full sm:w-auto px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors shadow-2xs cursor-pointer"
                        title="Send WhatsApp update"
                      >
                        <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>WhatsApp Customer</span>
                      </button>
                    </div>

                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
