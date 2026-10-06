import React, { useState, useEffect } from 'react';
import { 
  X, 
  Gift, 
  Sparkles, 
  Copy, 
  Check, 
  MessageCircle, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Percent, 
  Award,
  Share2
} from 'lucide-react';
import { getReferralData, incrementReferralShareCount, claimReferralReward } from '../data/referralData';
import { ReferralRewardData } from '../types';
import { useCart } from '../context/CartContext';

interface ReferAFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferAFriendModal: React.FC<ReferAFriendModalProps> = ({ isOpen, onClose }) => {
  const { applyPromoCode, setIsCartOpen } = useCart();

  const [referralData, setReferralData] = useState<ReferralRewardData>(() => getReferralData());
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [appliedReward, setAppliedReward] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReferralData(getReferralData());
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<ReferralRewardData>;
      if (custom.detail) {
        setReferralData(custom.detail);
      }
    };
    window.addEventListener('artified_referral_updated', handleUpdate);
    return () => window.removeEventListener('artified_referral_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(referralData.referralLink);
      setCopiedLink(true);
      incrementReferralShareCount();
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyCode = () => {
    try {
      navigator.clipboard.writeText(referralData.referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const message = `Namaste! ✨ I adore this boutique in Kathmandu called Artified Nepal (@artified_np)—they handcraft gorgeous pearl evening bags and baroque chokers. Use my invite link to get ${referralData.friendDiscountPercent}% off your first order:\n\n${referralData.referralLink}\n\nUse Code: ${referralData.referralCode} 🌸`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    incrementReferralShareCount();
    window.open(url, '_blank');
  };

  const handleApplyRewardCode = () => {
    applyPromoCode(referralData.rewardCode);
    claimReferralReward();
    setAppliedReward(true);
    setTimeout(() => {
      onClose();
      setIsCartOpen(true);
    }, 900);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-5 md:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#1C1B1A]/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Main Modal Card */}
      <div 
        className="relative bg-[#FAF8F5] w-full max-w-lg rounded-3xl shadow-2xl border-2 border-[#D4AF37]/50 overflow-hidden z-10 flex flex-col text-[#1C1B1A]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-br from-[#1C1B1A] via-[#2A2520] to-[#151413] text-white p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 rounded-full bg-[#D4AF37]/10 blur-2xl pointer-events-none" />
          
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-[#A69E96] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[11px] font-bold uppercase tracking-wider">
              <Gift className="w-3.5 h-3.5" />
              <span>Community Rewards Program</span>
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
              Give 10%, Get Rs. 250 Off
            </h2>

            <p className="text-xs sm:text-sm text-[#D8CFCA] leading-relaxed">
              Invite your friends and bridesmaids to experience handcrafted elegance from Kathmandu, Nepal. They receive 10% off their first order, and you unlock Rs. 250 credit!
            </p>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          
          {/* How It Works Steps */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-2xl bg-white border border-[#E8DFD8] shadow-2xs space-y-1">
              <span className="w-6 h-6 rounded-full bg-[#FAF8F5] text-[#1C1B1A] font-bold text-xs flex items-center justify-center mx-auto border border-[#E8DFD8]">
                1
              </span>
              <p className="font-semibold text-xs text-[#1C1B1A]">Share Link</p>
              <p className="text-[10px] text-[#736C65]">Send invite to friends</p>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-[#E8DFD8] shadow-2xs space-y-1">
              <span className="w-6 h-6 rounded-full bg-[#FAF8F5] text-[#1C1B1A] font-bold text-xs flex items-center justify-center mx-auto border border-[#E8DFD8]">
                2
              </span>
              <p className="font-semibold text-xs text-[#1C1B1A]">They Get 10%</p>
              <p className="text-[10px] text-[#736C65]">On their first piece</p>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-[#E8DFD8] shadow-2xs space-y-1">
              <span className="w-6 h-6 rounded-full bg-[#FAF8F5] text-[#1C1B1A] font-bold text-xs flex items-center justify-center mx-auto border border-[#E8DFD8]">
                3
              </span>
              <p className="font-semibold text-xs text-[#1C1B1A]">You Get Rs. 250</p>
              <p className="text-[10px] text-[#736C65]">+ 200 Loyalty Pts</p>
            </div>
          </div>

          {/* Exclusive Referral Code & Share Link Section */}
          <div className="p-4 rounded-2xl bg-white border border-[#E8DFD8] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1C1B1A] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Your Exclusive Referral Link:</span>
              </span>
              <span className="text-[10px] text-[#8C847E]">
                Unlimited Uses
              </span>
            </div>

            {/* Link Input Bar with 1-click copy */}
            <div className="flex items-center gap-2 bg-[#FAF8F5] p-2 rounded-xl border border-[#E8DFD8]">
              <input
                type="text"
                readOnly
                value={referralData.referralLink}
                className="flex-1 bg-transparent px-1 text-xs text-[#1C1B1A] font-mono focus:outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-[#1C1B1A] hover:bg-black text-[#D4AF37] font-bold text-xs rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Direct WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#20ba59] to-[#25D366] hover:brightness-105 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Share Invitation on WhatsApp</span>
            </button>
          </div>

          {/* Unlocked Reward Section: Rs. 250 Off Voucher */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 via-white to-amber-50/70 border border-[#D4AF37]/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#8C7A6B] tracking-wider block">
                  Your Available Reward
                </span>
                <h4 className="font-serif text-base font-bold text-[#1C1B1A]">
                  Rs. {referralData.rewardDiscountAmount} Discount Code
                </h4>
              </div>

              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                Active & Ready
              </span>
            </div>

            <p className="text-xs text-[#5E5955] leading-relaxed">
              Use code <strong className="font-mono text-[#1C1B1A] font-bold">{referralData.rewardCode}</strong> at checkout or tap below to apply it instantly to your bag.
            </p>

            <button
              type="button"
              onClick={handleApplyRewardCode}
              disabled={appliedReward}
              className="w-full py-2.5 px-4 bg-[#1C1B1A] hover:bg-black text-[#D4AF37] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {appliedReward ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Applied to Bag!</span>
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  <span>Apply Rs. {referralData.rewardDiscountAmount} Code to Checkout</span>
                </>
              )}
            </button>
          </div>

          {/* Referral Statistics */}
          <div className="p-3.5 rounded-xl bg-white border border-[#E8DFD8] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C5A880]" />
              <span className="text-[#5E5955]">
                Friends Invited: <strong className="text-[#1C1B1A]">{referralData.friendsInvited}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-[#5E5955]">
                Loyalty Bonus: <strong className="text-emerald-700">+200 Points/order</strong>
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-[#E8DFD8] flex items-center justify-between text-xs">
          <span className="text-[#736C65] text-[11px]">
            Artified Nepal • Kathmandu Atelier Community
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#E8DFD8] text-[#1C1B1A] font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
