import React, { useState, useEffect, useRef } from 'react';
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
  Award,
  Download,
  Share2
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { DELIVERY_ZONES } from '../data/products';
import { DeliveryZone, PaymentMethod, OrderDetails } from '../types';
import { 
  getSellerPaymentSettings, 
  fetchPaymentSettingsFromServer, 
  SellerPaymentSettings 
} from '../data/paymentSettings';
import { buildTrackedOrderFromOrderDetails, saveTrackedOrder, generateUniqueOrderId, syncOrdersFromFirestore, getOrderManufactureDeliveryBreakdown } from '../data/trackingData';
import { sendOrderConfirmationEmail } from '../services/emailService';
import { compressAndStampPaymentScreenshot } from '../utils/imageCompressor';

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
    recordOnlineOrderSales,
    directPurchaseItem,
    setDirectPurchaseItem,
    setTrackingOrderId
  } = useCart();

  // Form State
  const [step, setStep] = useState<'details' | 'payment' | 'instructions' | 'confirmation'>('details');
  const [confirmedOrder, setConfirmedOrder] = useState<OrderDetails | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('esewa');
  const [transactionId, setTransactionId] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [rawScreenshotFile, setRawScreenshotFile] = useState<File | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<SellerPaymentSettings>(getSellerPaymentSettings());

  useEffect(() => {
    const handleUpdate = () => setPaymentSettings(getSellerPaymentSettings());
    window.addEventListener('artified_payment_settings_updated', handleUpdate);
    return () => window.removeEventListener('artified_payment_settings_updated', handleUpdate);
  }, []);

  const [provisionalOrderId, setProvisionalOrderId] = useState<string>('');
  const [emailNotificationStatus, setEmailNotificationStatus] = useState<string | null>(null);
  const [screenshotClipboardNotice, setScreenshotClipboardNotice] = useState<string | null>(null);
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    // Reset all customer and order state when modal transitions from closed to open so previous buyers never carry over
    if (isCheckoutOpen && !prevIsOpenRef.current) {
      setStep('details');
      setConfirmedOrder(null);
      setFullName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setLandmark('');
      setRecipientName('');
      setSenderName('');
      setPaymentMethod('esewa');
      setTransactionId('');
      setScreenshotPreview(null);
      setRawScreenshotFile(null);
      setErrors({});
      setEmailNotificationStatus(null);
      setScreenshotClipboardNotice(null);
      const freshId = generateUniqueOrderId();
      setProvisionalOrderId(freshId);
      syncOrdersFromFirestore()
        .then(() => {
          setProvisionalOrderId(generateUniqueOrderId());
        })
        .catch(() => {});
      fetchPaymentSettingsFromServer().then((fresh) => setPaymentSettings(fresh)).catch(() => {});
    }
    prevIsOpenRef.current = isCheckoutOpen;
  }, [isCheckoutOpen]);

  if (!isCheckoutOpen) return null;

  const currentDeliveryFee = Math.max(0, Number(selectedDeliveryZone?.fee) || 120);
  const giftFee = giftPackaging ? 150 : 0;
  
  const itemsToBuy = directPurchaseItem ? [directPurchaseItem] : cart;
  const itemsSubtotal = itemsToBuy.reduce((sum, item) => {
    const safePrice = Math.max(100, Number(item.product?.price) || 0);
    const safeQty = Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1)));
    return sum + (safePrice * safeQty);
  }, 0);
  const safeDiscount = Math.max(0, Math.min(itemsSubtotal, Number(discount) || 0));
  const grandTotal = Math.max(0, itemsSubtotal + currentDeliveryFee + giftFee - safeDiscount);
  const checkoutBreakdown = getOrderManufactureDeliveryBreakdown(
    itemsToBuy.map((i) => ({
      productId: i.product?.id,
      title: i.product?.title || '',
      category: i.product?.category
    })),
    selectedDeliveryZone?.name,
    address
  );

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

  const handlePlaceOrder = async () => {
    // Compulsory payment screenshot validation for QR payments
    if (paymentMethod !== 'cod' && !screenshotPreview) {
      setErrors({
        payment: 'Payment screenshot upload is compulsory. Please attach your payment screenshot above before placing your order.'
      });
      return;
    }

    // Unique official Order ID auto-generation
    const finalOrderId = provisionalOrderId.startsWith('#')
      ? provisionalOrderId
      : provisionalOrderId
      ? `#${provisionalOrderId}`
      : generateUniqueOrderId();

    const finalTxn = transactionId.trim() || (paymentMethod === 'cod' ? undefined : 'Screenshot Attached');

    // Ensure screenshot is compressed (~30KB) and permanently stamped with the exact Order ID, Buyer Name, Phone, and Amount
    let finalStampedScreenshot = screenshotPreview || undefined;
    if (paymentMethod !== 'cod' && (rawScreenshotFile || screenshotPreview)) {
      try {
        finalStampedScreenshot = await compressAndStampPaymentScreenshot(
          rawScreenshotFile || screenshotPreview!,
          {
            orderId: finalOrderId,
            customerName: fullName.trim(),
            phone: phone.trim(),
            total: grandTotal,
            paymentMethod
          }
        );
        setScreenshotPreview(finalStampedScreenshot);
      } catch {}
    }

    const order: OrderDetails = {
      orderId: finalOrderId,
      items: [...itemsToBuy],
      customerName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim(),
      landmark: landmark.trim() || undefined,
      deliveryZone: selectedDeliveryZone,
      paymentMethod: paymentMethod,
      giftPackaging: giftPackaging,
      giftMessage: giftMessage.trim() || undefined,
      recipientName: recipientName.trim() || undefined,
      senderName: senderName.trim() || undefined,
      orderNote: orderNote.trim() || undefined,
      subtotal: itemsSubtotal,
      deliveryFee: currentDeliveryFee,
      giftPackagingFee: giftFee,
      discount: discount,
      total: grandTotal,
      transactionId: finalTxn,
      paymentScreenshot: finalStampedScreenshot,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    };

    // 1. Save only the current buyer's lightweight order to localStorage so previous buyers never carry over
    try {
      const lightweightOrder: OrderDetails = {
        ...order,
        paymentScreenshot: undefined,
        items: (order.items || []).map((item) => ({
          ...item,
          product: item.product ? { ...item.product, images: [] } : item.product
        }))
      };
      localStorage.setItem('artified_orders', JSON.stringify([lightweightOrder]));
    } catch {}

    // 2. Build tracked order and save to tracking storage + Firestore + Seller Studio (await cloud sync with 3.5s max bound)
    const trackedOrder = buildTrackedOrderFromOrderDetails(order);
    await Promise.race([
      saveTrackedOrder(trackedOrder),
      new Promise((resolve) => setTimeout(resolve, 3500))
    ]);

    // 3. Dispatch automated order confirmation email to both customer and seller
    sendOrderConfirmationEmail(order)
      .then((res) => {
        if (res.success) {
          setEmailNotificationStatus(`Order confirmation email sent to ${order.email || 'customer'} and artisan Sahina!`);
        }
      })
      .catch((err) => {
        console.warn('Notice: automated email dispatch:', err);
      });

    // 4. Set Context State and transition to dedicated Success Confirmation screen
    setConfirmedOrder(order);
    setCompletedOrder(order);
    recordOnlineOrderSales(itemsToBuy, order.orderId);
    setDirectPurchaseItem(null);
    clearCart();
    setStep('confirmation');
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const buildOrderWhatsAppText = (order: OrderDetails): string => {
    const singleOrderItems = Array.isArray(order.items) ? order.items : [];
    let text = `*✨ NEW ARTIFIED_NP ORDER - ${order.orderId}*\n\n`;
    text += `👤 *Customer:* ${order.customerName}\n`;
    text += `📞 *Phone:* ${order.phone}\n`;
    if (order.email) {
      text += `✉️ *Email:* ${order.email}\n`;
    }
    text += `📍 *Delivery Address:* ${order.address}\n`;
    if (order.landmark) {
      text += `🏛️ *Landmark:* Near ${order.landmark}\n`;
    }
    const orderBreakdown = getOrderManufactureDeliveryBreakdown(
      singleOrderItems.map((i) => ({
        productId: i.product?.id,
        title: i.product?.title || '',
        category: i.product?.category
      })),
      order.deliveryZone.name,
      order.address
    );
    text += `🚚 *Delivery Zone:* ${order.deliveryZone.name} (Est. Total: ${orderBreakdown.totalEstimatedDaysText} — ${orderBreakdown.manufactureDaysText} manufacture + ${orderBreakdown.deliveryDaysText} delivery)\n`;
    text += `\n🛒 *Items (${singleOrderItems.length}):*\n`;
    singleOrderItems.forEach((item, idx) => {
      text += `${idx + 1}. ${item.product.title} (Qty: ${item.quantity}) - NPR ${(item.product.price * item.quantity).toLocaleString()}\n`;
      if (item.customizationNote) {
        text += `   📝 Customization: ${item.customizationNote}\n`;
      }
    });

    text += `\n💵 *Items Subtotal:* NPR ${(order.subtotal || 0).toLocaleString()}\n`;
    text += `🚚 *Delivery Charge:* NPR ${(order.deliveryFee || 0).toLocaleString()}\n`;
    text += `💳 *Payment:* ${
      order.paymentMethod === 'cod'
        ? 'Cash on Delivery (COD)'
        : order.paymentMethod === 'fonepay'
        ? `Fonepay / Bank QR - Sahina Shrestha (${order.transactionId || 'Screenshot Attached'})`
        : order.paymentMethod === 'esewa'
        ? `eSewa QR - Sahina Shrestha (${order.transactionId || 'Screenshot Attached'})`
        : `Khalti QR - Sahina Shrestha (${order.transactionId || 'Screenshot Attached'})`
    }\n`;

    if (order.giftPackaging) {
      text += `🎁 *Luxury Gift Packaging & Note Card:* Yes (+ NPR 150)\n`;
      if (order.recipientName) text += `   To: ${order.recipientName}\n`;
      if (order.senderName) text += `   From: ${order.senderName}\n`;
      if (order.giftMessage) text += `   💌 Handwritten Message: "${order.giftMessage}"\n`;
    }
    if (order.orderNote) {
      text += `💬 *Instructions:* ${order.orderNote}\n`;
    }

    if (order.paymentMethod !== 'cod') {
      text += `📸 *Payment Screenshot:* Recorded on website under ${order.orderId} — *(Customer Reminder: Please paste or attach your payment screenshot manually right below this message in WhatsApp!)*\n`;
    }

    text += `\n💰 *Total Payable: NPR ${order.total.toLocaleString()}*\n\n`;
    text += `Thank you Sahina Shrestha! Looking forward to receiving this handcrafted piece from Kathmandu! 🌸`;
    return text;
  };

  const copyScreenshotImageToClipboard = async (dataUrl: string): Promise<boolean> => {
    try {
      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') return false;
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 600;
      canvas.height = img.naturalHeight || 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      ctx.drawImage(img, 0, 0);
      const pngBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!pngBlob) return false;
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
      return true;
    } catch {
      return false;
    }
  };

  const triggerWhatsAppConfirmation = async (order: OrderDetails) => {
    const phoneNumber = '9779767573721';
    const text = buildOrderWhatsAppText(order);

    if (order.paymentScreenshot) {
      await copyScreenshotImageToClipboard(order.paymentScreenshot);
      setScreenshotClipboardNotice('📲 Reminder: After sending the auto-generated order message in WhatsApp, please paste (Ctrl+V) or attach (📎 / 📷) your payment screenshot manually in the chat!');
    }

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${phoneNumber}?text=${encoded}`, '_blank');
  };

  const handleShareScreenshotFileToWhatsApp = async (order: OrderDetails) => {
    if (!order.paymentScreenshot) {
      triggerWhatsAppConfirmation(order);
      return;
    }
    const text = buildOrderWhatsAppText(order);
    try {
      const res = await fetch(order.paymentScreenshot);
      const blob = await res.blob();
      const cleanId = order.orderId.replace(/[^A-Za-z0-9-_]/g, '');
      const file = new File([blob], `Artified_Receipt_${cleanId}.jpg`, { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Artified Order ${order.orderId}`,
          text
        });
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
    }

    // Fallback: Download the stamped screenshot & open WhatsApp chat
    const link = document.createElement('a');
    link.href = order.paymentScreenshot;
    link.download = `Artified_Receipt_${order.orderId.replace('#', '')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerWhatsAppConfirmation(order);
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
        onClick={() => {
          setIsCheckoutOpen(false);
          setDirectPurchaseItem(null);
        }}
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
                            <span className="text-xs font-bold text-[#1C1B1A] block">NPR {zone.fee}</span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium block">
                              {(() => {
                                const zBd = getOrderManufactureDeliveryBreakdown(
                                  itemsToBuy.map((i) => ({
                                    productId: i.product?.id,
                                    title: i.product?.title || '',
                                    category: i.product?.category
                                  })),
                                  zone.name,
                                  ''
                                );
                                return `Total: ${zBd.totalEstimatedDaysText} (${zBd.manufactureDaysText} mfg + ${zone.estimatedDays} del)`;
                              })()}
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
                    END OF STEP 1
                    ======================================================= */}

                {/* Order Breakdown Snapshot */}
                <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] space-y-2 text-xs text-[#5E5955] shadow-2xs">
                  <div className="flex justify-between">
                    <span>Items ({itemsToBuy.reduce((s, i) => s + i.quantity, 0)})</span>
                    <span>NPR {itemsToBuy.reduce((s, i) => s + (i.product.price * i.quantity), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery ({selectedDeliveryZone.name})</span>
                    <span>NPR {currentDeliveryFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#736C65]">
                    <span>Estimated Total Time ({checkoutBreakdown.categoryLabel})</span>
                    <span className="font-semibold text-[#1C1B1A]">
                      {checkoutBreakdown.totalEstimatedDaysText} ({checkoutBreakdown.manufactureDaysText} mfg + {checkoutBreakdown.deliveryDaysText} del)
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Voucher Applied</span>
                      <span>- NPR {discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-[#F0EBE5] flex justify-between font-bold text-sm text-[#1C1B1A]">
                    <span>Total Payable</span>
                    <span>NPR {grandTotal.toLocaleString()}</span>
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
              
              {/* Priority eSewa Recommendation Banner */}
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-emerald-950">
                <Sparkles className="w-4 h-4 text-[#60BB46] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-900 block">
                    ✨ Why 85% of Artified customers choose eSewa QR:
                  </span>
                  <span className="text-[11px] text-emerald-800 leading-relaxed">
                    <strong>Priority Handcrafting Queue</strong> (crafting starts immediately today without waiting for a phone confirmation call) + <strong>Complimentary Satin Care Pouch</strong> + <strong>Contactless Doorstep Drop</strong> without needing exact cash!
                  </span>
                </div>
              </div>

              {/* Payment Option Tabs - eSewa QR first & recommended, COD placed last as secondary option */}
              <div className={`grid grid-cols-2 ${
                paymentSettings.enableFonepay && paymentSettings.enableKhalti
                  ? 'sm:grid-cols-4'
                  : paymentSettings.enableFonepay || paymentSettings.enableKhalti
                  ? 'sm:grid-cols-3'
                  : 'sm:grid-cols-2'
              } gap-2`}>
                {paymentSettings.enableEsewa !== false && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('esewa')}
                    className={`relative p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'esewa'
                        ? 'bg-white border-[#60BB46] ring-2 ring-[#60BB46] shadow-xs'
                        : 'bg-white border-[#60BB46]/50 hover:border-[#60BB46]'
                    }`}
                  >
                    <span className="absolute -top-2 px-1.5 py-0.2 bg-[#60BB46] text-white text-[8px] font-extrabold uppercase tracking-wider rounded-full shadow-2xs">
                      ★ Recommended
                    </span>
                    <div className="w-5 h-5 rounded-full bg-[#60BB46] text-white flex items-center justify-center font-bold text-[10px] mt-1">
                      e
                    </div>
                    <span className="text-[11px] font-bold text-[#1C1B1A]">eSewa QR</span>
                    <span className="text-[8px] text-[#60BB46] font-bold">Priority Crafting ⚡</span>
                  </button>
                )}

                {paymentSettings.enableFonepay === true && (
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
                )}

                {paymentSettings.enableKhalti === true && (
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
                )}

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'cod'
                      ? 'bg-white border-[#1C1B1A] ring-2 ring-[#1C1B1A] shadow-xs'
                      : 'bg-[#FAF8F5]/80 border-[#E8DFD8] text-[#736C65] hover:border-[#C5A880] opacity-85'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-[#8C847E]" />
                  <span className="text-[11px] font-semibold text-[#5E5955]">Cash On Delivery</span>
                  <span className="text-[8px] text-amber-700 font-medium">Manual Call Verify (+1d)</span>
                </button>
              </div>

              {/* COD DETAILS (With Gentle Nudge to Switch to eSewa QR) */}
              {paymentMethod === 'cod' ? (
                <div className="bg-white p-4 rounded-2xl border border-amber-300 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#1C1B1A]">
                      <Banknote className="w-4 h-4 text-amber-600" />
                      <span>Cash on Delivery (Standard Queue — Manual Verification Required)</span>
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 text-[11px] text-amber-950 space-y-1.5">
                    <p className="font-bold text-amber-900">
                      ⚠️ Please note before choosing Cash on Delivery:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-amber-900">
                      <li>
                        <strong>Delayed Handcrafting Start (+1 Extra Day):</strong> Because every piece is handmade to order, COD bookings wait in a manual phone/WhatsApp confirmation queue before Sahina starts weaving.
                      </li>
                      <li>
                        <strong>Exact Cash Required at Doorstep:</strong> Courier riders do not carry loose change for <strong>NPR {grandTotal.toLocaleString()}</strong> and you must be physically available to answer the rider’s call.
                      </li>
                    </ul>
                    <div className="pt-1.5">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('esewa')}
                        className="w-full py-2 px-3 bg-[#60BB46] hover:bg-[#52a33b] text-white font-bold text-[11px] rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>⚡ Switch to eSewa QR for Instant Priority Handcrafting & Faster Dispatch</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#736C65] leading-relaxed">
                    If you still prefer Cash on Delivery, you can pay <strong>NPR {grandTotal.toLocaleString()}</strong> at your doorstep in <strong>{selectedDeliveryZone.name}</strong> after answering our verification call.
                  </p>
                </div>
              ) : (
                /* DIGITAL QR OVERVIEW & PROCEED CARD */
                <div className="bg-white p-4 rounded-2xl border-2 border-[#60BB46]/40 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-[#F0EBE5] pb-2.5">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-[#60BB46]" />
                      <span className="text-xs font-bold text-[#1C1B1A]">
                        Pay to: {paymentSettings.accountName} (Priority Handcrafting Queue ⚡)
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#1C1B1A] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E8DFD8]">
                      NPR {grandTotal.toLocaleString()}
                    </span>
                  </div>

                  {activeQrImage ? (
                    <div className="flex flex-col items-center py-2">
                      <img 
                        src={activeQrImage} 
                        alt={`${paymentMethod} QR`} 
                        className="w-32 h-32 object-contain rounded-lg border border-[#E8DFD8]"
                      />
                      <p className="text-[9px] text-[#736C65] mt-2 italic">Scan to pay with {paymentMethod}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-[#5E5955] leading-relaxed">
                      In the next step, you will see the <strong>direct QR code</strong> for {paymentMethod === 'fonepay' ? 'Fonepay / Any Bank' : paymentMethod === 'esewa' ? 'eSewa' : 'Khalti'}, along with clear instructions on <strong>taking and attaching your payment screenshot</strong> for instant priority verification!
                    </p>
                  )}

                  <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>✓ Priority same-day material reservation • ✓ Complimentary satin dust pouch • ✓ 0% gateway fee direct to Sahina Shrestha</span>
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
                    ? `Confirm Cash on Delivery Order (NPR ${grandTotal.toLocaleString()}) →`
                    : `Next: Payment & Screenshot Instructions (NPR ${grandTotal.toLocaleString()}) →`}
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
                    Amount: NPR {grandTotal.toLocaleString()}
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

                    <div className="flex items-center gap-2 flex-wrap">
                      <p>
                        <strong className="text-[#1C1B1A]">eSewa QR No:</strong>{' '}
                        <span className="font-mono font-bold text-[#1C1B1A]">+9779813028999</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('+9779813028999', 'esewa_phone')}
                        className="text-[10px] text-[#C5A880] hover:text-[#1C1B1A] font-semibold flex items-center gap-1 border border-[#E8DFD8] px-1.5 py-0.2 rounded bg-white cursor-pointer"
                      >
                        {copiedKey === 'esewa_phone' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'esewa_phone' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Order Reference Box with 1-Click Copy */}
                    <div className="p-2 bg-white rounded-xl border-2 border-[#D4AF37]/50 flex items-center justify-between gap-2 mt-1">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-[#8C7A6B] block">Order Reference ID</span>
                        <strong className="text-[#1C1B1A] text-xs font-mono">
                          {provisionalOrderId.startsWith('#') ? provisionalOrderId : `#${provisionalOrderId}`}
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(provisionalOrderId.startsWith('#') ? provisionalOrderId : `#${provisionalOrderId}`, 'ref')}
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
                    <span>• Exact Amount (NPR {grandTotal.toLocaleString()})</span>
                    <span>• Payee: Sahina Shrestha</span>
                  </div>
                </div>
              </div>

              {/* Step 3: Attach Compulsory Screenshot & Optional Transaction ID */}
              <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#F0EBE5] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1C1B1A] text-white flex items-center justify-center text-[10px] font-black">
                      3
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#1C1B1A]">
                      Upload Payment Screenshot (Compulsory)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    Required *
                  </span>
                </div>

                {/* Screenshot File Upload (Compulsory) */}
                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    Attach Your Payment Screenshot <span className="text-rose-600">*</span>:
                  </label>
                  <div className="flex items-center gap-3">
                    <label
                      className={`flex-1 cursor-pointer py-3 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors border-2 border-dashed ${
                        errors.payment && !screenshotPreview
                          ? 'bg-rose-50/70 border-rose-400 text-rose-700'
                          : screenshotPreview
                          ? 'bg-emerald-50/60 border-emerald-400 text-emerald-800 font-semibold'
                          : 'bg-[#FAF8F5] border-[#C5A880] hover:bg-white text-[#736C65]'
                      }`}
                    >
                      <Camera className={`w-4 h-4 ${errors.payment && !screenshotPreview ? 'text-rose-600' : 'text-[#C5A880]'}`} />
                      <span>
                        {screenshotPreview
                          ? 'Screenshot Attached ✓ (Click to change)'
                          : 'Click to upload payment screenshot from gallery (Required)'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        className="hidden"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setRawScreenshotFile(file);
                            setErrors((prev) => ({ ...prev, payment: '' }));
                            try {
                              const stamped = await compressAndStampPaymentScreenshot(file, {
                                orderId: provisionalOrderId || '#ART-2026-1855',
                                customerName: fullName.trim(),
                                phone: phone.trim(),
                                total: grandTotal,
                                paymentMethod
                              });
                              setScreenshotPreview(stamped);
                            } catch {
                              setScreenshotPreview(URL.createObjectURL(file));
                            }
                          }
                        }}
                      />
                    </label>

                    {screenshotPreview && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#E8DFD8] shrink-0 relative group">
                        <img src={screenshotPreview} alt="Receipt Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setScreenshotPreview(null);
                            setRawScreenshotFile(null);
                          }}
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  {errors.payment && !screenshotPreview && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1.5">
                      ⚠️ {errors.payment}
                    </p>
                  )}
                </div>

                {/* Transaction ID input (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    Transaction ID / Reference Code (Optional):
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 9382104812 or eSewa Reference Code"
                    className="w-full p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs font-mono text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                  />
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
                  <span>Verify Payment & Place Order (NPR {grandTotal.toLocaleString()}) →</span>
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
                  Order Placed Successfully
                </span>
                <h3 className="font-serif text-2xl text-[#1C1B1A] font-semibold mt-1">
                  Dhanyabad, {confirmedOrder.customerName}!
                </h3>
              </div>

              {/* High-visibility dedicated Order ID & Tracking Card */}
              <div className="bg-[#FAF8F5] border-2 border-[#C5A880] p-4 sm:p-5 rounded-2xl text-center space-y-3 shadow-md">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7A6B] block">
                  Your Official Order ID
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-xl sm:text-2xl font-extrabold text-[#1C1B1A] bg-white px-4 py-2 rounded-xl border border-[#D4AF37]/50 shadow-inner tracking-wider select-all">
                    {confirmedOrder.orderId}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(confirmedOrder.orderId, 'order_id_confirmed')}
                    className="p-2 sm:px-3 sm:py-2.5 bg-[#1C1B1A] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
                    title="Copy Order ID"
                  >
                    {copiedKey === 'order_id_confirmed' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="hidden sm:inline text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="hidden sm:inline">Copy ID</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-[#736C65] max-w-md mx-auto leading-relaxed">
                  Save or copy this Order ID to track your parcel status live anytime! We've also saved it to your browser.
                </p>
                <div className="pt-1 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCheckoutOpen(false);
                      openTracker('');
                    }}
                    className="px-4 py-2 bg-[#C5A880] hover:bg-[#b0926a] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Track This Order Now</span>
                  </button>
                </div>
              </div>

              {/* Automated Order Confirmation Email Status Banner */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200 text-left space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                        Order Confirmation Email
                      </span>
                      <p className="text-xs font-semibold text-[#1C1B1A]">
                        {confirmedOrder.email
                          ? `Confirmation sent to ${confirmedOrder.email}`
                          : 'Order confirmed & logged with Artified Workshop'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    Confirmed ✓
                  </span>
                </div>
                <p className="text-[11px] text-[#5E5955] leading-relaxed">
                  {confirmedOrder.email ? (
                    <>
                      Your order confirmation receipt for Order ID <strong className="text-[#1C1B1A] font-mono">{confirmedOrder.orderId}</strong> and full order items breakdown has been sent to <strong className="text-[#1C1B1A]">{confirmedOrder.email}</strong> and artisan Sahina Shrestha.
                    </>
                  ) : (
                    <>
                      Your order <strong className="text-[#1C1B1A] font-mono">{confirmedOrder.orderId}</strong> and full order items breakdown have been confirmed and logged with artisan Sahina Shrestha.
                    </>
                  )}
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
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1B5E20]">
                    <MessageCircle className="w-5 h-5 text-[#25D366]" />
                    <span>Instant Verification & Screenshot Safekeeping via WhatsApp</span>
                  </div>
                  {confirmedOrder.paymentScreenshot && (
                    <span className="text-[10px] font-bold bg-white text-[#1B5E20] px-2 py-0.5 rounded-full border border-[#A5D6A7]">
                      ✅ Already Saved in Seller Order Progress ({confirmedOrder.orderId})
                    </span>
                  )}
                </div>

                {confirmedOrder.paymentScreenshot ? (
                  <div className="space-y-2 text-xs text-[#2E7D32] leading-relaxed">
                    <p>
                      <strong>1. Automatic Website Safekeeping:</strong> Your payment screenshot is <strong>already stamped with {confirmedOrder.orderId} ({confirmedOrder.customerName}) and saved inside Seller Order Progress</strong> on this website!
                    </p>
                    <p className="bg-white/80 p-2.5 rounded-xl border border-[#A5D6A7] text-[11px] text-[#1B5E20]">
                      <strong>2. Important Reminder for WhatsApp:</strong> Since WhatsApp web links (<code className="font-mono">wa.me</code>) only pre-fill text messages and cannot auto-attach gallery photos, please <strong>send the auto-generated order message first and then manually paste or attach your payment screenshot</strong> right after in the WhatsApp chat!
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[#2E7D32] leading-relaxed">
                    Send your order booking directly to Sahina Shrestha on WhatsApp (+977 9767573721) with one click. We will confirm your delivery slot and share live photos while weaving your piece!
                  </p>
                )}

                {screenshotClipboardNotice && (
                  <div className="p-2.5 bg-white rounded-xl border border-emerald-300 text-[11px] font-semibold text-emerald-800">
                    {screenshotClipboardNotice}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => triggerWhatsAppConfirmation(confirmedOrder)}
                    className="w-full py-3.5 px-4 bg-[#25D366] text-white font-semibold text-xs tracking-wider uppercase rounded-xl hover:bg-[#20ba5a] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer text-center"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>
                      {confirmedOrder.paymentScreenshot || confirmedOrder.paymentMethod !== 'cod'
                        ? 'Open WhatsApp Chat to Submit Order Details and Paste Screenshot Manually'
                        : 'Confirm Order via WhatsApp (Click to Send)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      copyToClipboard(buildOrderWhatsAppText(confirmedOrder), 'order_details_summary');
                      setScreenshotClipboardNotice('✅ Order details copied to clipboard! You can now paste them directly into WhatsApp alongside your payment screenshot.');
                    }}
                    className="w-full py-2.5 px-4 bg-white border border-[#A5D6A7] text-[#1B5E20] hover:bg-[#F1F8E9] font-semibold text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                  >
                    {copiedKey === 'order_details_summary' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-emerald-700">Order Details Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 shrink-0" />
                        <span>Copy Order Details</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Order Receipt Details Card */}
              <div className="bg-white p-4 rounded-xl border border-[#E8DFD8] text-left space-y-2.5 text-xs text-[#5E5955]">
                <div className="flex items-center justify-between border-b border-[#F0EBE5] pb-2 font-semibold text-[#1C1B1A]">
                  <div>
                    <span>Order Reference: </span>
                    <span className="font-mono text-[#8C7A6B]">{confirmedOrder.orderId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(buildOrderWhatsAppText(confirmedOrder), 'order_details_summary')}
                    className="px-2.5 py-1 bg-[#FAF8F5] hover:bg-[#F0EBE5] border border-[#E8DFD8] text-[#1C1B1A] text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'order_details_summary' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#C5A880]" />
                        <span>Copy Order Details</span>
                      </>
                    )}
                  </button>
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
                  <span>NPR {confirmedOrder.total.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    openTracker('');
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
