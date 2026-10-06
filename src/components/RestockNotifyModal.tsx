import React, { useState } from 'react';
import { X, Bell, Mail, Phone, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { Product } from '../types';
import { subscribeToRestockWaitlist } from '../utils/waitlistService';

interface RestockNotifyModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RestockNotifyModal: React.FC<RestockNotifyModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await subscribeToRestockWaitlist(
      product.id,
      product.title,
      email,
      phone
    );

    setIsSubmitting(false);

    if (res.success) {
      setIsSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setIsSuccess(false);
        setEmail('');
        setPhone('');
        onClose();
      }, 2500);
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#1C1B1A]/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div 
        className="relative bg-[#FAF8F5] w-full max-w-md rounded-3xl shadow-2xl border-2 border-[#D4AF37]/50 overflow-hidden z-10 flex flex-col text-[#1C1B1A] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1C1B1A] text-white p-5 flex items-center justify-between border-b border-[#34312F]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37]">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-white">
                Back in Stock Alert
              </h3>
              <p className="text-[11px] text-[#A69E96]">
                Artified Nepal • Kathmandu Workshop
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#A69E96] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Product Snapshot */}
          <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-[#E8DFD8] shadow-2xs">
            <img 
              src={product.images?.[0]} 
              alt={product.title} 
              className="w-14 h-14 object-cover rounded-xl border border-[#E8DFD8] shrink-0" 
            />
            <div className="min-w-0">
              <span className="text-[9px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.2 rounded border border-rose-200 uppercase">
                Currently Out of Stock
              </span>
              <h4 className="font-bold text-xs text-[#1C1B1A] truncate mt-0.5">
                {product.title}
              </h4>
              <p className="text-xs font-semibold text-[#8C7A6B]">
                Rs. {product.price.toLocaleString()}
              </p>
            </div>
          </div>

          {isSuccess ? (
            <div className="py-6 px-4 bg-emerald-50 rounded-2xl border border-emerald-300 text-center space-y-2 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-md">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="font-serif text-sm font-bold text-emerald-950">
                You're on the VIP Waitlist!
              </h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                As soon as Sahina crafts the next batch at our Kathmandu workshop, you will be the very first to receive an email alert.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="text-xs text-[#5E5955] leading-relaxed">
                Enter your contact info below. We will notify you via email (and WhatsApp if provided) as soon as materials arrive and this piece is ready for order!
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  WhatsApp Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98XXXXXXXX"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-600 font-medium">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-[#1C1B1A] hover:bg-black text-[#D4AF37] font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Bell className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving to Waitlist...' : 'Notify Me When Restocked'}</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#8C7A6B] pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero Spam • Only a 1-time restock alert from Artified Nepal</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
