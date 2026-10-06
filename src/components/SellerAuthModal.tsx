import React, { useState } from 'react';
import { Lock, KeyRound, Sparkles, X, Check, ShieldCheck, HelpCircle, Key, Loader2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuthPersistence } from '../hooks/useAuthPersistence';
import { SellerChangePasswordModal } from './SellerChangePasswordModal';

export const SellerAuthModal: React.FC = () => {
  const { isSellerAuthModalOpen, setIsSellerAuthModalOpen, setIsSellerMode } = useCart();
  const { hasCustomSellerPassword, verifyPasswordHash } = useAuthPersistence();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  if (!isSellerAuthModalOpen) return null;

  const hasCustom = hasCustomSellerPassword;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;
    setIsVerifying(true);
    setError(false);

    try {
      // Full multi-layer async verification against Firestore server, Auth state, and hash
      const isValid = await verifyPasswordHash(pin);
      if (isValid) {
        setError(false);
        setSuccess(true);
        setTimeout(() => {
          setIsSellerMode(true);
          setIsSellerAuthModalOpen(false);
          setSuccess(false);
          setPin('');
          setIsVerifying(false);
        }, 400);
      } else {
        setError(true);
        setIsVerifying(false);
      }
    } catch {
      setError(true);
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1B1A]/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="fixed inset-0"
        onClick={() => setIsSellerAuthModalOpen(false)}
      />

      <div className="relative w-full max-w-md bg-[#FAF8F5] border border-[#E8DFD8] rounded-2xl shadow-2xl p-6 sm:p-8 z-10 overflow-hidden">
        {/* Subtle decorative gold glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A880]/15 rounded-full filter blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#1C1B1A] text-[#D4AF37] flex items-center justify-center shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-[#1C1B1A]">
                Seller Studio Access
              </h3>
              <p className="text-[11px] text-[#736C65] tracking-wide uppercase font-medium">
                Confidential Seller Portal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSellerAuthModalOpen(false)}
            className="p-1.5 rounded-full text-[#736C65] hover:text-[#1C1B1A] hover:bg-white/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#5E5955] leading-relaxed mb-5">
          Enter your private studio passcode to edit product photos, descriptions, prices, and beadwork materials directly on the storefront.
        </p>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#1C1B1A] mb-1.5">
              Seller Studio Passcode
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(false);
                }}
                autoFocus
                placeholder={hasCustom ? "Enter your secure passcode" : "Enter passcode (default: 1234)"}
                className={`w-full pl-10 pr-4 py-2.5 bg-white border text-sm rounded-xl focus:outline-none transition-colors ${
                  error 
                    ? 'border-rose-400 focus:ring-1 focus:ring-rose-400' 
                    : 'border-[#E8DFD8] focus:border-[#C5A880]'
                } text-[#1C1B1A]`}
              />
            </div>
            {error && (
              <p className="text-xs text-rose-600 mt-1.5 font-medium">
                {hasCustom 
                  ? 'Incorrect passcode. Please check your secure password.' 
                  : 'Incorrect passcode. Default studio passcode is 1234.'}
              </p>
            )}
            {success && (
              <p className="text-xs text-emerald-600 mt-1.5 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Passcode verified. Unlocking Seller Mode...
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <span className="text-[#8C7A6B]">
              {hasCustom ? '🔒 Custom password active' : '🔑 Using default passcode'}
            </span>
            <button
              type="button"
              onClick={() => setIsChangePasswordOpen(true)}
              className="text-[#8C5D36] hover:text-[#1C1B1A] font-semibold underline cursor-pointer"
            >
              Change Passcode
            </button>
          </div>

          <div className="bg-[#F4EFEB] p-3 rounded-xl border border-[#E8DFD8] text-[11px] text-[#736C65] flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-[#C5A880] shrink-0 mt-0.5" />
            <span>
              <strong>Buyer Privacy Guarantee:</strong> This mode is 100% invisible to customers visiting the website. You can also append <code className="bg-white px-1 py-0.5 rounded text-[#1C1B1A]">?seller=true</code> to your URL or press <kbd className="bg-white px-1 py-0.5 rounded text-[#1C1B1A]">Alt+Shift+S</kbd>.
            </span>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-[#1C1B1A] text-white text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-[#34312F] transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Unlock Studio Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSellerAuthModalOpen(false)}
              className="py-2.5 px-4 border border-[#E8DFD8] bg-white text-xs font-semibold uppercase tracking-wider text-[#5E5955] rounded-xl hover:text-[#1C1B1A] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <SellerChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};
