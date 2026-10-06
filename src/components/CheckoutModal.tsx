import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  CreditCard, 
  Banknote, 
  QrCode, 
  CheckCircle2, 
  MessageCircle, 
  ArrowLeft, 
  ArrowRight,
  Sparkles, 
  Upload, 
  Phone, 
  User, 
  Mail, 
  FileText, 
  ShieldCheck, 
  Copy, 
  Check,
  Truck,
  Building,
  Camera,
  Smartphone,
  ExternalLink,
  Info,
  Maximize2,
  Gift,
  Heart,
  Crown,
  Award
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { DELIVERY_ZONES } from '../data/products';
import { DeliveryZone, PaymentMethod, OrderDetails } from '../types';
import { getSellerPaymentSettings, SellerPaymentSettings } from '../data/paymentSettings';
import { earnPurchasePoints } from '../data/loyaltyData';
import { PaymentQRModal } from './PaymentQRModal';

export const CheckoutModal: React.FC = () => {
  const {
    cart,
    isCheckoutOpen,
    setIsCheckoutOpen,
    clearCart,
    subtotal,
    giftPackaging,
    setGiftPackaging,
    discount,
    orderNote,
    giftMessage,
    setGiftMessage,
    selectedDeliveryZone,
    setSelectedDeliveryZone,
    setCompletedOrder,
    openTracker,
    openAccountModal,
    recordOnlineOrderSales
  } = useCart();

  // Form State
  const [step, setStep] = useState<'details' | 'payment' | 'instructions' | 'confirmation'>('details');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [transactionId, setTransactionId] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<SellerPaymentSettings>(getSellerPaymentSettings());

  // Fixed reference order ID generated on mount so buyer can copy it during instructions step
  const [provisionalOrderId] = useState(() => `ART-2026-${Math.floor(1000 + Math.random() * 9000)}`);

  useEffect(() => {
    const handleUpdate = () => {
      setPaymentSettings(getSellerPaymentSettings());
    };
    window.addEventListener('artified_payment_settings_updated', handleUpdate);
    return () => window.removeEventListener('artified_payment_settings_updated', handleUpdate);
  }, []);

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [confirmedOrder, setConfirmedOrder] = useState<OrderDetails | null>(null);

  if (!isCheckoutOpen) return null;

  const currentDeliveryFee = selectedDeliveryZone.fee;
  const giftFee = giftPackaging ? 150 : 0;
  const grandTotal = Math.max(0, subtotal + currentDeliveryFee + giftFee - discount);

  const validateDetails = () => {
    const errs: { [key: string]: string } = {};
    if (!fullName.trim()) errs.fullName = 'Please enter your full name';
    if (!phone.trim()) {
      errs.phone = 'Phone number is required for courier delivery';
    } else if (!/^[0-9+ ]{9,15}$/.test(phone.trim())) {
      errs.phone = 'Please provide a valid Nepali phone number (e.g. 98XXXXXXXX)';
    }
    if (!address.trim()) errs.address = 'Street address / Area is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProceedToPayment = () => {
    if (validateDetails()) {
      setStep('payment');
    }
  };

  const handleProceedToInstructions = () => {
    if (paymentMethod === 'cod') {
      handlePlaceOrder();
    } else {
      setStep('instructions');
    }
  };

  const handlePlaceOrder = () => {
    if (paymentMethod !== 'cod' && !transactionId.trim() && !screenshotPreview) {
      setErrors({ payment: 'Please enter your transaction ID or attach a payment screenshot' });
      return;
    }

    // Award loyalty points to the customer's account dashboard!
    const { pointsEarned } = earnPurchasePoints(grandTotal, provisionalOrderId, fullName, phone, email);

    const order: OrderDetails = {
      orderId: `#${provisionalOrderId}`,
      items: [...cart],
      customerName: fullName,
      phone: phone,
      email: email || undefined,
      address: address,
      landmark: landmark || undefined,
      deliveryZone: selectedDeliveryZone,
      paymentMethod: paymentMethod,
      giftPackaging: giftPackaging,
      giftMessage: giftMessage.trim() || undefined,
      recipientName: recipientName.trim() || undefined,
      senderName: senderName.trim() || undefined,
      orderNote: orderNote || undefined,
      subtotal: subtotal,
      deliveryFee: currentDeliveryFee,
      giftPackagingFee: giftFee,
      discount: discount,
      total: grandTotal,
      transactionId: transactionId || undefined,
      paymentScreenshot: screenshotPreview || undefined,
      earnedLoyaltyPoints: pointsEarned,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    };

    setConfirmedOrder(order);
    setCompletedOrder(order);
    recordOnlineOrderSales(cart);
    clearCart();
    setStep('confirmation');
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const triggerWhatsAppConfirmation = (order: OrderDetails) => {
    const phoneNumber = '9779767573721';
    let text = `*✨ NEW ARTIFIED_NP ORDER - ${order.orderId}*\n\n`;
    text += `👤 *Customer:* ${order.customerName}\n`;
    text += `📞 *Phone:* ${order.phone}\n`;
    text += `📍 *Delivery Address:* ${order.address}\n`;
    if (order.landmark) {
      text += `🏛️ *Landmark:* Near ${order.landmark}\n`;
    }
    text += `🚚 *Delivery Zone:* ${order.deliveryZone.name} (Estimated: ${order.deliveryZone.estimatedDays})\n`;
    text += `\n🛒 *Items (${order.items.length}):*\n`;
    order.items.forEach((item, idx) => {
      text += `${idx + 1}. ${item.product.title} (Qty: ${item.quantity}) - Rs. ${(item.product.price * item.quantity).toLocaleString()}\n`;
      if (item.customizationNote) {
        text += `   📝 Customization: ${item.customizationNote}\n`;
      }
    });

    text += `\n💵 *Payment:* ${
      order.paymentMethod === 'cod'
        ? 'Cash on Delivery (COD)'
        : order.paymentMethod === 'fonepay'
        ? `Fonepay / Bank QR - Sahina Shrestha (Txn ID: ${order.transactionId || 'Pending Verification'})`
        : order.paymentMethod === 'esewa'
        ? `eSewa QR - Sahina Shrestha (Txn ID: ${order.transactionId || 'Pending Verification'})`
        : `Khalti QR - Sahina Shrestha (Txn ID: ${order.transactionId || 'Pending Verification'})`
    }\n`;

    if (order.giftPackaging) {
      text += `🎁 *Luxury Gift Packaging & Note Card:* Yes (+ Rs. 150)\n`;
      if (order.recipientName) text += `   To: ${order.recipientName}\n`;
      if (order.senderName) text += `   From: ${order.senderName}\n`;
      if (order.giftMessage) text += `   💌 Handwritten Message: "${order.giftMessage}"\n`;
    }
    if (order.earnedLoyaltyPoints) {
      text += `👑 *Loyalty Points Earned:* +${order.earnedLoyaltyPoints} pts\n`;
    }
    if (order.orderNote) {
      text += `💬 *Instructions:* ${order.orderNote}\n`;
    }

    text += `\n💰 *Total Payable: Rs. ${order.total.toLocaleString()}*\n\n`;
    text += `Thank you Sahina di! Looking forward to receiving this handcrafted piece from Kathmandu! 🌸`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${phoneNumber}?text=${encoded}`, '_blank');
  };

  // Resolve QR image from settings
  const activeQrImage = 
    (paymentMethod === 'fonepay' && paymentSettings.fonepayQrImage ? paymentSettings.fonepayQrImage : null) ||
    (paymentMethod === 'esewa' && paymentSettings.esewaQrImage ? paymentSettings.esewaQrImage : null) ||
    (paymentMethod === 'khalti' && paymentSettings.khaltiQrImage ? paymentSettings.khaltiQrImage : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCheckoutOpen(false)}
      />

      {/* Modal Dialog */}
      <div className="relative bg-[#FAF8F5] w-full max-w-2xl rounded-3xl shadow-2xl border border-[#E8DFD8] overflow-hidden z-10 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 bg-white border-b border-[#E8DFD8]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold text-[#1C1B1A]">
                {step === 'details' && 'Step 1: Delivery Information in Nepal'}
                {step === 'payment' && 'Step 2: Choose Payment Method'}
                {step === 'instructions' && 'Step 3: Scan QR & Screenshot Guide'}
                {step === 'confirmation' && 'Order Placed Successfully!'}
              </h2>
              <p className="text-[11px] text-[#736C65]">
                {step === 'details' && 'Fast courier transit across Kathmandu Valley & all Nepal cities'}
                {step === 'payment' && 'Free Cash on Delivery or 0% fee direct QR transfer'}
                {step === 'instructions' && 'Take a payment screenshot after scanning to verify in minutes'}
                {step === 'confirmation' && 'We are preparing your piece at our Kathmandu workshop'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCheckoutOpen(false)}
            className="p-1.5 rounded-full text-[#8C847E] hover:text-[#1C1B1A] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-5">

          {/* STEP 1: CUSTOMER DETAILS & DELIVERY ZONE */}
          {step === 'details' && (
            <div className="space-y-4">
              
              {/* Delivery Zone Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#1C1B1A] mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Select Delivery Location (Nepal):</span>
                </label>
                <div className="space-y-2">
                  {DELIVERY_ZONES.map((zone) => {
                    const isSelected = selectedDeliveryZone.id === zone.id;
                    return (
                      <div
                        key={zone.id}
                        onClick={() => setSelectedDeliveryZone(zone)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white border-[#1C1B1A] ring-1 ring-[#1C1B1A] shadow-xs'
                            : 'bg-white/60 border-[#E8DFD8] hover:border-[#C5A880]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="deliveryZone"
                              checked={isSelected}
                              onChange={() => setSelectedDeliveryZone(zone)}
                              className="accent-[#1C1B1A] cursor-pointer"
                            />
                            <div>
                              <span className="font-semibold text-xs text-[#1C1B1A] block">{zone.name}</span>
                              <span className="text-[11px] text-[#736C65]">{zone.area}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-[#1C1B1A] block">Rs. {zone.fee}</span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                              {zone.estimatedDays}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customer Contact Details */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#8C847E] absolute left-3 top-3" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Samikshya Shrestha"
                      className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-xs text-[#1C1B1A] focus:outline-none ${
                        errors.fullName ? 'border-rose-500' : 'border-[#E8DFD8] focus:border-[#C5A880]'
                      }`}
                    />
                  </div>
                  {errors.fullName && <p className="text-[10px] text-rose-500 mt-1">{errors.fullName}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                      Phone Number (WhatsApp) *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#8C847E] absolute left-3 top-3" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 98XXXXXXXX"
                        className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-xs text-[#1C1B1A] focus:outline-none ${
                          errors.phone ? 'border-rose-500' : 'border-[#E8DFD8] focus:border-[#C5A880]'
                        }`}
                      />
                    </div>
                    {errors.phone && <p className="text-[10px] text-rose-500 mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                      Email Address (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#8C847E] absolute left-3 top-3" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="For order receipts"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    Street Address & Ward Number *
                  </label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. House No. 24, Jhamsikhel Marg, Ward 3, Lalitpur"
                    className={`w-full p-2.5 bg-white border rounded-xl text-xs text-[#1C1B1A] focus:outline-none ${
                      errors.address ? 'border-rose-500' : 'border-[#E8DFD8] focus:border-[#C5A880]'
                    }`}
                  />
                  {errors.address && <p className="text-[10px] text-rose-500 mt-1">{errors.address}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    Notable Landmark (Near cafe, temple, school)
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near New Road Gate, Basantapur, Kathmandu"
                    className="w-full p-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>

              {/* ========================================================
                  GIFT WRAP & PERSONAL NOTE TOGGLE OPTION
                  ======================================================= */}
              <div className="bg-gradient-to-br from-white to-[#FBF9F6] p-4 sm:p-5 rounded-2xl border-2 border-[#D4AF37]/50 shadow-xs space-y-3.5 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0 mt-0.5">
                      <Gift className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif text-sm font-bold text-[#1C1B1A]">
                          Gift Wrap & Personal Note
                        </span>
                        <span className="text-[10px] bg-[#D4AF37]/20 text-[#8C7A6B] font-bold px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                          {discount >= 150 ? 'Free Voucher Applied' : '+ Rs. 150'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#736C65] mt-0.5 leading-relaxed">
                        Handcrafted gold satin ribbon, rigid luxury gift box, and botanical handwritten calligraphy card with a genuine red wax seal.
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={giftPackaging}
                      onChange={(e) => setGiftPackaging(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1C1B1A]"></div>
                  </label>
                </div>

                {/* Expanded Custom Message Card Controls */}
                {giftPackaging && (
                  <div className="pt-3 border-t border-[#E8DFD8] space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                          To (Recipient Name):
                        </label>
                        <input
                          type="text"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="e.g. Dearest Sneha"
                          className="w-full p-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                          From (Your Name / Sender):
                        </label>
                        <input
                          type="text"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          placeholder="e.g. Aayushi"
                          className="w-full p-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-[#1C1B1A]">
                          Custom Message for Handwritten Calligraphy Card:
                        </label>
                        <span className="text-[10px] text-[#8C847E]">
                          {giftMessage.length} / 220 chars
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        maxLength={220}
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        placeholder="Write your heartfelt note here. Our founder and creator in Kathmandu will hand-write it onto botanical parchment paper..."
                        className="w-full p-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#1C1B1A] focus:outline-none focus:border-[#C5A880] leading-relaxed"
                      />
                    </div>

                    {/* Quick Preset Messages */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#8C7A6B] block mb-1.5">
                        ✨ Quick Note Presets (Click to insert):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'Happy Birthday! Wishing you joy, radiant pearls, and endless smiles 🌸',
                          'With love and heartfelt blessings from Kathmandu ✨',
                          'Happy Anniversary to my favorite person in the world! 💍',
                          'Congratulations on your milestone! So very proud of you 🎓'
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setGiftMessage(preset)}
                            className="px-2.5 py-1 bg-white hover:bg-[#FAF8F5] border border-[#E8DFD8] text-[10px] text-[#5E5955] hover:text-[#1C1B1A] rounded-lg transition-colors cursor-pointer text-left"
                          >
                            {preset.slice(0, 36)}...
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ultra-Realistic Luxury Calligraphy Gift Card Live Preview */}
                    <div className="mt-3 p-4 sm:p-5 bg-gradient-to-b from-[#FAF5ED] to-[#F5EFE6] rounded-2xl border-2 border-[#D4AF37]/60 text-[#1C1B1A] relative shadow-md overflow-hidden">
                      {/* Gold Foil Top Border Accent */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C5A880] via-[#D4AF37] to-[#C5A880]" />

                      {/* Header Badge */}
                      <div className="flex items-center justify-between border-b border-[#E8DFD8]/80 pb-2.5 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[#8C7A6B]">
                            Live Gift Card Preview
                          </span>
                        </div>
                        {/* Real-looking Burgundy Wax Seal */}
                        <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-900 to-red-950 text-[#F5EFE6] px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm border border-red-700/50">
                          <span>⚜️</span>
                          <span>Artified Wax Seal</span>
                        </div>
                      </div>

                      {/* The Physical Card Body */}
                      <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#D4AF37]/30 shadow-inner relative space-y-2.5">
                        {/* Decorative Corner Ornaments */}
                        <span className="absolute top-2 left-2 text-[10px] text-[#D4AF37]/60 select-none">✦</span>
                        <span className="absolute top-2 right-2 text-[10px] text-[#D4AF37]/60 select-none">✦</span>
                        <span className="absolute bottom-2 left-2 text-[10px] text-[#D4AF37]/60 select-none">✦</span>
                        <span className="absolute bottom-2 right-2 text-[10px] text-[#D4AF37]/60 select-none">✦</span>

                        <div className="px-3 py-1 font-serif space-y-2">
                          <p className="font-bold text-xs text-[#1C1B1A]">
                            {recipientName.trim() ? `Dearest ${recipientName.trim()},` : 'Dearest Recipient,'}
                          </p>
                          <p className="italic text-xs sm:text-sm text-[#2B2927] leading-relaxed tracking-wide min-h-[44px] whitespace-pre-wrap">
                            &ldquo;{giftMessage.trim() || 'Wishing you radiant moments with this handmade pearl treasure. Handcrafted with love in Kathmandu.'}&rdquo;
                          </p>
                          <p className="text-right text-xs font-semibold text-[#8C7A6B] pt-1">
                            {senderName.trim() ? `With love, ${senderName.trim()}` : 'With love, Your Secret Admirer'}
                          </p>
                        </div>
                      </div>

                      {/* Packaging Footnote */}
                      <div className="mt-3 flex items-center justify-between text-[10px] text-[#736C65] px-1">
                        <span className="flex items-center gap-1 font-medium">
                          <span>🌿 Hand-penned on 280gsm botanical cotton cardstock</span>
                        </span>
                        <span className="text-[#C5A880] font-bold">
                          Kathmandu, Nepal
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Breakdown Snapshot with Loyalty Points Preview */}
              <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] space-y-2 text-xs text-[#5E5955] shadow-2xs">
                <div className="flex justify-between">
                  <span>Items ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
                  <span>Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery ({selectedDeliveryZone.name})</span>
                  <span>Rs. {currentDeliveryFee.toLocaleString()}</span>
                </div>
                {giftPackaging && (
                  <div className="flex justify-between text-[#8C7A6B] font-medium">
                    <span>Luxury Gift Wrap & Calligraphy Card</span>
                    <span>+ Rs. 150</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Voucher Applied</span>
                    <span>- Rs. {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#F0EBE5] flex justify-between font-bold text-sm text-[#1C1B1A]">
                  <span>Total Payable</span>
                  <span>Rs. {grandTotal.toLocaleString()}</span>
                </div>

                {/* Loyalty Points Earning Badge */}
                <div className="pt-2 border-t border-[#F0EBE5] flex items-center justify-between bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8DFD8]">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]/20" />
                    <div>
                      <span className="text-[11px] font-bold text-[#1C1B1A] block">
                        +{Math.max(10, Math.floor(grandTotal / 10))} Loyalty Reward Points
                      </span>
                      <span className="text-[10px] text-[#736C65]">
                        Earned upon order completion (1 pt / Rs. 10)
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAccountModal('rewards')}
                    className="text-[10px] font-bold text-[#C5A880] hover:text-[#1C1B1A] underline cursor-pointer"
                  >
                    View Rewards
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleProceedToPayment}
                className="w-full py-3.5 bg-[#1C1B1A] text-white rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-black transition-all shadow-sm cursor-pointer"
              >
                Proceed to Payment Selection →
              </button>
            </div>
          )}

          {/* STEP 2: PAYMENT METHOD SELECTION */}
          {step === 'payment' && (
            <div className="space-y-4">
              
              {/* Payment Option Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'cod'
                      ? 'bg-white border-[#1C1B1A] ring-2 ring-[#1C1B1A] shadow-xs'
                      : 'bg-white/60 border-[#E8DFD8] hover:border-[#C5A880]'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-[#C5A880]" />
                  <span className="text-[11px] font-bold text-[#1C1B1A]">Cash On Delivery</span>
                  <span className="text-[8px] text-[#736C65]">Pay at doorstep</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('fonepay')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'fonepay'
                      ? 'bg-white border-[#E21A22] ring-2 ring-[#E21A22] shadow-xs'
                      : 'bg-white/60 border-[#E8DFD8] hover:border-[#E21A22]'
                  }`}
                >
                  <div className="w-5 h-5 rounded-md bg-[#E21A22] text-white flex items-center justify-center font-bold text-[9px]">
                    FP
                  </div>
                  <span className="text-[11px] font-bold text-[#1C1B1A]">Fonepay / Bank</span>
                  <span className="text-[8px] text-[#E21A22] font-semibold">Any Bank QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('esewa')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'esewa'
                      ? 'bg-white border-[#60BB46] ring-2 ring-[#60BB46] shadow-xs'
                      : 'bg-white/60 border-[#E8DFD8] hover:border-[#60BB46]'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-[#60BB46] text-white flex items-center justify-center font-bold text-[10px]">
                    e
                  </div>
                  <span className="text-[11px] font-bold text-[#1C1B1A]">eSewa QR</span>
                  <span className="text-[8px] text-[#60BB46] font-semibold">Instant Wallet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('khalti')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'khalti'
                      ? 'bg-white border-[#5D2E8E] ring-2 ring-[#5D2E8E] shadow-xs'
                      : 'bg-white/60 border-[#E8DFD8] hover:border-[#5D2E8E]'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-[#5D2E8E] text-white flex items-center justify-center font-bold text-[10px]">
                    K
                  </div>
                  <span className="text-[11px] font-bold text-[#1C1B1A]">Khalti QR</span>
                  <span className="text-[8px] text-[#5D2E8E] font-semibold">Digital Payment</span>
                </button>
              </div>

              {/* COD DETAILS */}
              {paymentMethod === 'cod' ? (
                <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1C1B1A]">
                    <Banknote className="w-4 h-4 text-[#C5A880]" />
                    <span>Cash on Delivery (Doorstep Verification)</span>
                  </div>
                  <p className="text-xs text-[#5E5955] leading-relaxed">
                    You can pay the full amount of <strong>Rs. {grandTotal.toLocaleString()}</strong> in cash or scan the courier rider’s QR code when your handmade package arrives at your doorstep in <strong>{selectedDeliveryZone.name}</strong>.
                  </p>
                  <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8DFD8] text-[11px] text-[#736C65] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Open & inspect your handmade parcel in front of the rider before paying with our 24-hr check guarantee.</span>
                  </div>
                </div>
              ) : (
                /* DIGITAL QR OVERVIEW & PROCEED CARD */
                <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-[#F0EBE5] pb-2.5">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-xs font-bold text-[#1C1B1A]">
                        Pay to: {paymentSettings.accountName}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#1C1B1A] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E8DFD8]">
                      NPR {grandTotal.toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-[#5E5955] leading-relaxed">
                    In the next step, you will see the <strong>direct QR code</strong> for {paymentMethod === 'fonepay' ? 'Fonepay / Any Bank' : paymentMethod === 'esewa' ? 'eSewa' : 'Khalti'}, along with clear instructions on <strong>taking and attaching your payment screenshot</strong> for instant verification!
                  </p>

                  <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>0% gateway commission. 100% of payment goes directly to founder and creator Sahina Shrestha.</span>
                  </div>
                </div>
              )}

              {/* Navigation Back & Submit Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="px-4 py-3 border border-[#E8DFD8] text-xs font-semibold uppercase tracking-wider text-[#1C1B1A] rounded-xl hover:bg-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleProceedToInstructions}
                  className="flex-1 py-3.5 bg-[#1C1B1A] text-white rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-black transition-all shadow-sm cursor-pointer"
                >
                  {paymentMethod === 'cod'
                    ? `Confirm Cash on Delivery Order (Rs. ${grandTotal.toLocaleString()}) →`
                    : `Next: Payment & Screenshot Instructions (Rs. ${grandTotal.toLocaleString()}) →`}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DEDICATED INSTRUCTIONS & SCREENSHOT GUIDE */}
          {step === 'instructions' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Instructions Header Banner */}
              <div className="bg-[#1C1B1A] text-white p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-sm border border-[#34312F]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xs sm:text-sm font-bold text-white tracking-wide">
                      Scan QR & Payment Screenshot Instructions
                    </h3>
                    <p className="text-[10px] text-[#A69E96]">
                      Follow these 3 easy steps to complete your booking with Sahina Shrestha
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsQRModalOpen(true)}
                  className="px-2.5 py-1 bg-[#D4AF37] text-[#1C1B1A] hover:bg-[#c29f2e] text-[10px] font-bold rounded-lg flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                  title="Enlarge direct payment QR code in modal"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Enlarge QR</span>
                </button>
              </div>

              {/* Step 1: Scan & Transfer Details */}
              <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#F0EBE5] pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#1C1B1A] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#1C1B1A] text-white flex items-center justify-center text-[10px] font-black">
                      1
                    </span>
                    <span>Scan QR with {paymentMethod === 'fonepay' ? 'Fonepay / Mobile Banking' : paymentMethod === 'esewa' ? 'eSewa' : 'Khalti'}</span>
                  </span>

                  <span className="text-xs font-bold text-[#1C1B1A] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E8DFD8]">
                    Amount: Rs. {grandTotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8DFD8]">
                  {/* QR Image Box with Enlarge Link */}
                  <div 
                    onClick={() => setIsQRModalOpen(true)}
                    className="w-36 h-36 bg-white p-2 rounded-xl border border-[#E8DFD8] shadow-xs flex flex-col items-center justify-center shrink-0 relative overflow-hidden cursor-pointer group"
                    title="Click to view full screen QR"
                  >
                    {activeQrImage ? (
                      <img src={activeQrImage} alt="Direct QR" className="w-full h-full object-contain" />
                    ) : (
                      <>
                        <div className="w-full h-full bg-linear-to-br from-zinc-900 to-zinc-700 rounded-lg p-1.5 flex flex-col items-center justify-center text-white">
                          <div className="grid grid-cols-4 gap-1 w-full h-full p-1 opacity-90">
                            <div className="bg-white rounded-xs"></div>
                            <div className="bg-white rounded-xs"></div>
                            <div className="bg-zinc-800"></div>
                            <div className="bg-white rounded-xs"></div>
                            <div className="bg-zinc-800"></div>
                            <div className="bg-white rounded-xs"></div>
                            <div className="bg-white rounded-xs"></div>
                            <div className="bg-zinc-800"></div>
                            <div className="bg-white rounded-xs"></div>
                            <div className="bg-zinc-800"></div>
                            <div className="bg-white rounded-xs"></div>
                            <div className="bg-white rounded-xs"></div>
                            <div className="bg-white rounded-xs"></div>
                            <div className="bg-white rounded-xs"></div>
                            <div className="bg-zinc-800"></div>
                            <div className="bg-white rounded-xs"></div>
                          </div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="px-2 py-0.5 bg-white text-[9px] font-bold rounded shadow-xs text-[#1C1B1A] border border-[#E8DFD8]">
                            {paymentMethod.toUpperCase()}
                          </span>
                        </div>
                      </>
                    )}
                    <span className="absolute bottom-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to Enlarge 🔍
                    </span>
                  </div>

                  <div className="text-xs text-[#5E5955] space-y-1.5 flex-1 w-full">
                    <p>
                      <strong className="text-[#1C1B1A]">Account Holder:</strong>{' '}
                      <span className="font-bold text-[#1C1B1A]">{paymentSettings.accountName}</span>
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      <p>
                        <strong className="text-[#1C1B1A]">Mobile / ID:</strong>{' '}
                        <span className="font-mono font-bold text-[#1C1B1A]">{paymentSettings.phone}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(paymentSettings.phone, 'phone')}
                        className="text-[10px] text-[#C5A880] hover:text-[#1C1B1A] font-semibold flex items-center gap-1 border border-[#E8DFD8] px-1.5 py-0.2 rounded bg-white cursor-pointer"
                      >
                        {copiedKey === 'phone' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'phone' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <p>
                      <strong className="text-[#1C1B1A]">Bank:</strong> {paymentSettings.bankName}
                    </p>

                    {/* Order Reference Box with 1-Click Copy */}
                    <div className="p-2 bg-white rounded-xl border-2 border-[#D4AF37]/50 flex items-center justify-between gap-2 mt-1">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-[#8C7A6B] block">Order Reference ID</span>
                        <strong className="text-[#1C1B1A] text-xs font-mono">#{provisionalOrderId}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(provisionalOrderId, 'ref')}
                        className="px-2.5 py-1 bg-[#1C1B1A] text-[#D4AF37] hover:bg-black text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedKey === 'ref' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'ref' ? 'Copied!' : 'Copy Ref'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: How to Take a Screenshot (Exact Prompt Requirement) */}
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/90 text-amber-950 space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <span className="w-5 h-5 rounded-full bg-amber-800 text-white flex items-center justify-center text-[10px] font-black">
                    2
                  </span>
                  <span>How to Take Your Payment Screenshot on Your Phone</span>
                </div>

                <p className="text-[11px] leading-relaxed text-amber-900">
                  Immediately after you hit <strong>"Transfer / Confirm"</strong> in your banking app or digital wallet, you will see a <strong>"Payment Successful"</strong> receipt screen.
                </p>

                {/* Device-Specific Visual Shortcuts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200 flex items-start gap-2">
                    <Smartphone className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[11px] text-[#1C1B1A]">Android Phones (Samsung, Xiaomi, etc.)</strong>
                      <span className="text-[10px] text-amber-900">Press <strong>Volume Down + Power Button</strong> simultaneously (or swipe down 3 fingers).</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200 flex items-start gap-2">
                    <Smartphone className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[11px] text-[#1C1B1A]">Apple iPhones</strong>
                      <span className="text-[10px] text-amber-900">Press <strong>Side Button + Volume Up</strong> at the same moment.</span>
                    </div>
                  </div>
                </div>

                {/* Checklist of what should be visible */}
                <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200 text-[11px] space-y-1">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-amber-900 block">
                    ✓ Ensure these details are visible in your screenshot:
                  </span>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-amber-800">
                    <span>• "Success" or "Transferred" banner</span>
                    <span>• Transaction / Ref Code (e.g. 9382...)</span>
                    <span>• Exact Amount (Rs. {grandTotal.toLocaleString()})</span>
                    <span>• Payee: Sahina Shrestha</span>
                  </div>
                </div>
              </div>

              {/* Step 3: Attach Screenshot or Enter Transaction ID */}
              <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-2xs space-y-3">
                <div className="flex items-center gap-2 border-b border-[#F0EBE5] pb-2">
                  <span className="w-5 h-5 rounded-full bg-[#1C1B1A] text-white flex items-center justify-center text-[10px] font-black">
                    3
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#1C1B1A]">
                    Attach Screenshot or Enter Transaction ID
                  </span>
                </div>

                {/* Screenshot File Upload */}
                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    Attach Your Payment Screenshot:
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer py-2.5 px-3 bg-[#FAF8F5] border-2 border-dashed border-[#C5A880] rounded-xl flex items-center justify-center gap-2 hover:bg-white text-xs text-[#736C65] transition-colors">
                      <Camera className="w-4 h-4 text-[#C5A880]" />
                      <span>{screenshotPreview ? 'Screenshot Attached ✓ (Click to change)' : 'Click to select payment screenshot from gallery'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setScreenshotPreview(URL.createObjectURL(e.target.files[0]));
                          }
                        }}
                      />
                    </label>

                    {screenshotPreview && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#E8DFD8] shrink-0 relative group">
                        <img src={screenshotPreview} alt="Receipt Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setScreenshotPreview(null)}
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transaction ID input */}
                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    Or Enter Transaction ID / Reference Code:
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 9382104812 or FONEPAY-XXXXXX"
                    className="w-full p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs font-mono text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                  />
                  {errors.payment && <p className="text-[10px] text-rose-500 mt-1">{errors.payment}</p>}
                </div>

                {/* WhatsApp Alternative Reassurance */}
                <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8DFD8] text-[11px] text-[#736C65] flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tip: If you prefer, you can also place your order right now and forward your payment screenshot to Sahina Shrestha on WhatsApp!</span>
                </div>
              </div>

              {/* Navigation Back & Submit Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('payment')}
                  className="px-4 py-3 border border-[#E8DFD8] text-xs font-semibold uppercase tracking-wider text-[#1C1B1A] rounded-xl hover:bg-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  className="flex-1 py-3.5 bg-[#1C1B1A] text-white rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-black transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Verify Payment & Place Order (Rs. {grandTotal.toLocaleString()}) →</span>
                </button>
              </div>

            </div>
          )}

          {/* STEP 4: ORDER CONFIRMATION & WHATSAPP TRIGGER */}
          {step === 'confirmation' && confirmedOrder && (
            <div className="text-center py-4 space-y-5">
              
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#8C7A6B]">
                  Booking Received
                </span>
                <h3 className="font-serif text-2xl text-[#1C1B1A] font-semibold mt-1">
                  Dhanyabad, {confirmedOrder.customerName}!
                </h3>
                <p className="text-xs text-[#736C65] mt-1">
                  Your handmade order <strong className="text-[#1C1B1A]">{confirmedOrder.orderId}</strong> has been logged and received.
                </p>
              </div>

              {/* Loyalty Points Earned Celebration Card */}
              <div className="bg-gradient-to-br from-[#242220] via-[#1C1B1A] to-[#151413] border border-[#D4AF37]/50 p-4 sm:p-5 rounded-2xl text-left text-white shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                      <Crown className="w-5 h-5 text-[#D4AF37] fill-[#D4AF37]/30" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-widest block">
                        Loyalty Rewards Earned
                      </span>
                      <h4 className="font-serif text-sm sm:text-base font-bold text-white">
                        +{confirmedOrder.earnedLoyaltyPoints || Math.max(10, Math.floor(confirmedOrder.total / 10))} Loyalty Points Credited!
                      </h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCheckoutOpen(false);
                      openAccountModal('rewards');
                    }}
                    className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#c29f2e] text-[#1C1B1A] font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>View Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-[#A69E96]">
                  Points have been logged to your account. You can redeem vouchers for upcoming collections or free gift wraps!
                </p>
              </div>

              {/* Gift Wrap & Handwritten Card Attached Confirmation */}
              {confirmedOrder.giftPackaging && (
                <div className="bg-white p-4 rounded-xl border border-[#D4AF37]/40 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-[#F0EBE5] pb-1.5">
                    <span className="font-bold text-[#1C1B1A] flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-[#D4AF37]" />
                      <span>Luxury Gift Wrap & Calligraphy Note Attached</span>
                    </span>
                    <span className="text-[9px] bg-red-900 text-white font-bold px-2 py-0.2 rounded-full">
                      Wax Sealed
                    </span>
                  </div>
                  {confirmedOrder.recipientName && (
                    <p className="text-[#5E5955]">
                      <strong className="text-[#1C1B1A]">To:</strong> {confirmedOrder.recipientName}
                      {confirmedOrder.senderName && (
                        <span> • <strong className="text-[#1C1B1A]">From:</strong> {confirmedOrder.senderName}</span>
                      )}
                    </p>
                  )}
                  {confirmedOrder.giftMessage && (
                    <div className="p-2.5 bg-[#FAF6EE] rounded-lg border border-[#E8DFD8] italic text-[#3E3A36]">
                      &ldquo;{confirmedOrder.giftMessage}&rdquo;
                    </div>
                  )}
                </div>
              )}

              {/* High impact WhatsApp Action Banner */}
              <div className="bg-[#E8F5E9] border border-[#A5D6A7] p-5 rounded-2xl text-left space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1B5E20]">
                  <MessageCircle className="w-5 h-5 text-[#25D366]" />
                  <span>Instant Verification & Tracking via WhatsApp</span>
                </div>
                <p className="text-xs text-[#2E7D32] leading-relaxed">
                  Send your order booking and payment slip directly to Sahina Shrestha on WhatsApp (+977 9767573721) with one click. We will confirm your delivery slot and share live photos while weaving your piece!
                </p>

                <button
                  type="button"
                  onClick={() => triggerWhatsAppConfirmation(confirmedOrder)}
                  className="w-full py-3.5 bg-[#25D366] text-white font-semibold text-xs tracking-wider uppercase rounded-xl hover:bg-[#20ba5a] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Confirm Order via WhatsApp (Click to Send)</span>
                </button>
              </div>

              {/* Order Receipt Details Card */}
              <div className="bg-white p-4 rounded-xl border border-[#E8DFD8] text-left space-y-2.5 text-xs text-[#5E5955]">
                <div className="flex justify-between border-b border-[#F0EBE5] pb-2 font-semibold text-[#1C1B1A]">
                  <span>Order Reference</span>
                  <span className="font-mono text-[#8C7A6B]">{confirmedOrder.orderId}</span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Zone</span>
                  <span className="font-medium text-[#1C1B1A]">{confirmedOrder.deliveryZone.name}</span>
                </div>

                <div className="flex justify-between">
                  <span>Payment Mode</span>
                  <span className="font-medium text-[#1C1B1A] uppercase">{confirmedOrder.paymentMethod}</span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Address</span>
                  <span className="font-medium text-[#1C1B1A] text-right max-w-xs">{confirmedOrder.address}</span>
                </div>

                <div className="pt-2 border-t border-[#F0EBE5] flex justify-between font-bold text-sm text-[#1C1B1A]">
                  <span>Total Payable</span>
                  <span>Rs. {confirmedOrder.total.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    openTracker(confirmedOrder.orderId);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#FAF8F5] border border-[#C5A880] text-[#1C1B1A] text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Truck className="w-4 h-4 text-[#C5A880]" />
                  <span>Track Order Live ({confirmedOrder.orderId})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#1C1B1A] text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-[#34312F] transition-colors cursor-pointer"
                >
                  Return to Store
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Standalone Direct Payment QR Modal for Sahina Shrestha */}
      <PaymentQRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        accountName={paymentSettings.accountName}
        phone={paymentSettings.phone}
        bankName={paymentSettings.bankName}
        branch={paymentSettings.branch}
        amount={grandTotal}
        orderId={provisionalOrderId}
        referenceNumber={provisionalOrderId}
        paymentMethod={paymentMethod as 'fonepay' | 'esewa' | 'khalti'}
        onPaymentConfirmed={(txn) => {
          setTransactionId(txn);
          setIsQRModalOpen(false);
        }}
      />
    </div>
  );
};
