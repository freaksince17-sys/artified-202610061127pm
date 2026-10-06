import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  Download, 
  Share2, 
  ExternalLink, 
  ShieldCheck, 
  Smartphone, 
  Building, 
  Sparkles,
  Camera,
  MessageCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import { getSellerPaymentSettings, SellerPaymentSettings } from '../data/paymentSettings';

export interface PaymentQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  customQrUrl?: string;
  accountName?: string;
  phone?: string;
  bankName?: string;
  branch?: string;
  amount?: number;
  orderId?: string;
  referenceNumber?: string;
  paymentMethod?: 'fonepay' | 'esewa' | 'khalti' | 'all';
  onTransactionCopied?: () => void;
  onPaymentConfirmed?: (transactionId: string) => void;
}

export const PaymentQRModal: React.FC<PaymentQRModalProps> = ({
  isOpen,
  onClose,
  customQrUrl,
  accountName,
  phone,
  bankName,
  branch,
  amount,
  orderId = 'ART-2026-5526',
  referenceNumber,
  paymentMethod = 'fonepay',
  onTransactionCopied,
  onPaymentConfirmed
}) => {
  const [activeTab, setActiveTab] = useState<'fonepay' | 'esewa' | 'khalti'>(
    paymentMethod === 'all' ? 'fonepay' : paymentMethod
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [enteredTxnId, setEnteredTxnId] = useState('');
  const [settings, setSettings] = useState<SellerPaymentSettings>(getSellerPaymentSettings());

  useEffect(() => {
    if (paymentMethod && paymentMethod !== 'all' && (paymentMethod === 'fonepay' || paymentMethod === 'esewa' || paymentMethod === 'khalti')) {
      setActiveTab(paymentMethod);
    }
  }, [paymentMethod]);

  useEffect(() => {
    setSettings(getSellerPaymentSettings());
    const handleUpdate = () => setSettings(getSellerPaymentSettings());
    window.addEventListener('artified_payment_settings_updated', handleUpdate);
    return () => window.removeEventListener('artified_payment_settings_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const currentAccountName = accountName || settings.accountName || 'Sahina Shrestha';
  const currentPhone = phone || settings.phone || '9767573721';
  const currentBankName = bankName || settings.bankName || 'Global IME Bank (Fonepay Network)';
  const currentBranch = branch || settings.branch || 'Kathmandu, Nepal';
  const displayRef = referenceNumber || orderId;

  // Active QR image resolution: customQrUrl -> settings uploaded image -> fallback SVG pattern
  const activeQrImage = 
    customQrUrl ||
    (activeTab === 'fonepay' && settings.fonepayQrImage ? settings.fonepayQrImage : null) ||
    (activeTab === 'esewa' && settings.esewaQrImage ? settings.esewaQrImage : null) ||
    (activeTab === 'khalti' && settings.khaltiQrImage ? settings.khaltiQrImage : null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (key === 'reference' && onTransactionCopied) {
      onTransactionCopied();
    }
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleCopyAll = () => {
    const allText = `*Artified Nepal Payment Details*\n` +
      `Payee: ${currentAccountName}\n` +
      `Phone/Wallet ID: ${currentPhone}\n` +
      `Bank: ${currentBankName}\n` +
      `Branch: ${currentBranch}\n` +
      `Reference ID: ${displayRef}\n` +
      (amount ? `Amount: NPR ${amount.toLocaleString()}\n` : '') +
      `Method: ${activeTab.toUpperCase()}`;
    copyToClipboard(allText, 'all');
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(
      `Namaste Sahina di! 🌸\n\nI am making a direct payment for Artified Order *${displayRef}*.\n` +
      (amount ? `Amount: NPR ${amount.toLocaleString()}\n` : '') +
      `Account: ${currentAccountName}\n\n` +
      (enteredTxnId ? `My Transaction ID is: *${enteredTxnId}*\n` : 'Here is my payment screenshot confirmation:\n')
    );
    window.open(`https://wa.me/9779767573721?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-[#FAF8F5] rounded-3xl border border-[#E8DFD8] shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1C1B1A] text-white p-3.5 sm:p-4 border-b border-[#34312F] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-serif text-sm sm:text-base font-bold text-white tracking-wide">
                  Direct Payment QR
                </h3>
                <span className="text-[9px] bg-[#D4AF37] text-[#1C1B1A] font-bold px-1.5 py-0.2 rounded">
                  0% Surcharge
                </span>
              </div>
              <p className="text-[11px] text-[#A69E96]">
                Pay directly to founder and creator <strong>{currentAccountName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#A69E96] hover:text-white rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Channel Switcher */}
        <div className="p-2 sm:px-4 bg-white border-b border-[#E8DFD8] flex items-center justify-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('fonepay')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'fonepay'
                ? 'bg-[#E21A22] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#5E5955] hover:bg-[#F0EBE5]'
            }`}
          >
            <span className="w-4 h-4 rounded bg-white text-[#E21A22] font-black text-[9px] flex items-center justify-center">
              FP
            </span>
            <span>Fonepay / Any Bank</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('esewa')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'esewa'
                ? 'bg-[#60BB46] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#5E5955] hover:bg-[#F0EBE5]'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white text-[#60BB46] font-black text-[9px] flex items-center justify-center">
              e
            </span>
            <span>eSewa QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('khalti')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'khalti'
                ? 'bg-[#5D2E8E] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#5E5955] hover:bg-[#F0EBE5]'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white text-[#5D2E8E] font-black text-[9px] flex items-center justify-center">
              K
            </span>
            <span>Khalti QR</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-xs">

          {/* Reference Number / Order ID Top Bar with 1-Click Copy */}
          <div className="bg-white p-3 rounded-2xl border-2 border-[#D4AF37]/50 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C7A6B] block">
                Order Reference / Bill Remarks Code
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-base font-extrabold text-[#1C1B1A] tracking-wider">
                  {displayRef}
                </span>
                {amount && (
                  <span className="text-xs font-bold bg-[#FAF8F5] text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                    NPR {amount.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#736C65] mt-0.5">
                Paste this into the <strong>Remarks / Note</strong> when scanning.
              </p>
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard(displayRef, 'reference')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                copiedKey === 'reference'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-[#1C1B1A] hover:bg-black text-[#D4AF37] shadow-2xs'
              }`}
            >
              {copiedKey === 'reference' ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Reference Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Reference ID</span>
                </>
              )}
            </button>
          </div>

          {/* QR Code Presentation Box */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] flex flex-col items-center text-center space-y-3 shadow-2xs">
            
            <div className="relative p-3 bg-white rounded-2xl border-2 border-[#E8DFD8] shadow-sm">
              {activeQrImage ? (
                <img
                  src={activeQrImage}
                  alt={`${activeTab} QR for Sahina Shrestha`}
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl"
                />
              ) : (
                /* High-fidelity Authentic Fallback QR Graphic */
                <div className="w-48 h-48 sm:w-56 sm:h-56 bg-linear-to-br from-zinc-900 via-neutral-900 to-zinc-800 rounded-xl p-3 flex flex-col items-center justify-center text-white relative">
                  <div className="grid grid-cols-6 gap-1 w-full h-full p-2 opacity-95">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-xs ${
                          (i % 2 === 0 && i % 3 === 0) || i % 7 === 0 || i === 0 || i === 5 || i === 30 || i === 35
                            ? 'bg-white'
                            : i % 5 === 0
                            ? 'bg-[#D4AF37]'
                            : 'bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
                    <div className="px-2.5 py-1 bg-white text-[#1C1B1A] font-extrabold text-[10px] rounded-lg shadow-md border border-[#E8DFD8] uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                      <span>{activeTab === 'fonepay' ? 'FONEPAY DIRECT' : activeTab === 'esewa' ? 'eSEWA VERIFIED' : 'KHALTI DIGITAL'}</span>
                    </div>
                    <span className="text-[9px] text-[#A69E96] mt-1 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs font-mono">
                      {currentPhone}
                    </span>
                  </div>
                </div>
              )}

              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-[#1C1B1A] text-white text-[9px] font-bold px-3 py-0.5 rounded-full border border-[#34312F] shadow-xs flex items-center gap-1 whitespace-nowrap">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Sahina Shrestha • 100% Free Transfer</span>
              </div>
            </div>

            <p className="text-[11px] text-[#736C65] max-w-sm pt-1">
              Scan using <strong>Global Smart, Nabil, NIC Asia, Prabhu, eSewa, or Khalti</strong>. 
              Zero payment gateway fees are charged.
            </p>
          </div>

          {/* Account Details with Individual Copy Buttons */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#E8DFD8] space-y-2 shadow-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-[#F0EBE5]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1C1B1A] flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Receiving Account Details</span>
              </span>

              <button
                type="button"
                onClick={handleCopyAll}
                className="text-[10px] text-[#C5A880] hover:text-[#1C1B1A] font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'all' ? (
                  <span className="text-emerald-600 font-bold">All Details Copied ✓</span>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy All Details</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-[#FAF8F5] rounded-xl border border-[#E8DFD8] flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-[#8C7A6B] block">Account Holder</span>
                  <strong className="text-[#1C1B1A] text-[11px]">{currentAccountName}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentAccountName, 'name')}
                  className="p-1 hover:bg-white rounded text-[#8C7A6B] hover:text-[#1C1B1A]"
                  title="Copy Account Name"
                >
                  {copiedKey === 'name' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="p-2 bg-[#FAF8F5] rounded-xl border border-[#E8DFD8] flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-[#8C7A6B] block">Phone / Wallet ID</span>
                  <strong className="text-[#1C1B1A] text-[11px] font-mono">{currentPhone}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentPhone, 'phone')}
                  className="p-1 hover:bg-white rounded text-[#8C7A6B] hover:text-[#1C1B1A]"
                  title="Copy Phone/Wallet ID"
                >
                  {copiedKey === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="p-2 bg-[#FAF8F5] rounded-xl border border-[#E8DFD8] flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-[#8C7A6B] block">Bank / Network</span>
                  <span className="text-[#1C1B1A] text-[11px] font-medium block truncate max-w-[170px]">{currentBankName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentBankName, 'bank')}
                  className="p-1 hover:bg-white rounded text-[#8C7A6B] hover:text-[#1C1B1A]"
                  title="Copy Bank Name"
                >
                  {copiedKey === 'bank' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="p-2 bg-[#FAF8F5] rounded-xl border border-[#E8DFD8] flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-[#8C7A6B] block">Branch Location</span>
                  <span className="text-[#1C1B1A] text-[11px] font-medium block truncate max-w-[170px]">{currentBranch}</span>
                </div>
                <span className="text-[9px] text-[#8C7A6B] font-semibold bg-white px-1.5 py-0.5 rounded border border-[#E8DFD8]">
                  Nepal
                </span>
              </div>
            </div>
          </div>

          {/* Screenshot Reminder Guide */}
          <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Camera className="w-4 h-4 text-amber-700" />
              <span>Important: Take a Payment Screenshot</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              After you press <strong>Confirm</strong> in your banking app, take a screenshot of the 
              <strong> "Success / Transferred"</strong> screen showing the <strong>Transaction ID</strong> and 
              amount. This ensures your order is verified in minutes by Sahina Shrestha!
            </p>
          </div>

          {/* Quick Optional Transaction Entry Inside Modal */}
          <div className="bg-white p-3 rounded-2xl border border-[#E8DFD8] space-y-2">
            <label className="block text-[11px] font-bold text-[#1C1B1A]">
              Already Paid? Enter your Transaction ID here:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={enteredTxnId}
                onChange={(e) => setEnteredTxnId(e.target.value)}
                placeholder="e.g. 9382104812 or FONEPAY-XXXX"
                className="flex-1 px-3 py-1.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs font-mono text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
              />
              <button
                type="button"
                onClick={() => {
                  if (onPaymentConfirmed && enteredTxnId.trim()) {
                    onPaymentConfirmed(enteredTxnId.trim());
                  }
                  handleOpenWhatsApp();
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Confirm on WhatsApp</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:px-4 bg-white border-t border-[#E8DFD8] flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#FAF8F5] hover:bg-[#E8DFD8] text-[#1C1B1A] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close Modal
          </button>

          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="px-4 py-2 bg-[#1C1B1A] hover:bg-black text-[#D4AF37] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>Send Receipt on WhatsApp</span>
          </button>
        </div>

      </div>
    </div>
  );
};
