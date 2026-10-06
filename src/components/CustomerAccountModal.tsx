import React, { useState, useEffect } from 'react';
import { 
  X, 
  Crown, 
  Sparkles, 
  Gift, 
  Tag, 
  Check, 
  Copy, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  Phone, 
  Mail, 
  User, 
  Share2, 
  ShoppingBag,
  Info,
  Award,
  ChevronRight,
  ExternalLink,
  Heart
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { 
  getLoyaltyAccount, 
  saveLoyaltyAccount, 
  AVAILABLE_LOYALTY_VOUCHERS, 
  LOYALTY_TIERS_CONFIG, 
  redeemVoucher, 
  LoyaltyRewardVoucher 
} from '../data/loyaltyData';
import { LoyaltyAccount, LoyaltyTier } from '../types';

interface CustomerAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'rewards' | 'history' | 'tiers' | 'profile';
}

export const CustomerAccountModal: React.FC<CustomerAccountModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'rewards'
}) => {
  const { 
    applyPromoCode, 
    promoSuccess, 
    promoCode, 
    setIsCartOpen, 
    openReferralModal,
    currentUser,
    isUserLoggedIn,
    loginWithGoogle,
    logoutUser,
    isWishlistCloudSynced
  } = useCart();
  const [account, setAccount] = useState<LoyaltyAccount>(getLoyaltyAccount());
  const [activeTab, setActiveTab] = useState<'rewards' | 'history' | 'tiers' | 'profile'>(defaultTab);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  
  // Profile edit state
  const [editName, setEditName] = useState(account.customerName);
  const [editPhone, setEditPhone] = useState(account.phone);
  const [editEmail, setEditEmail] = useState(account.email);
  const [isSavedProfile, setIsSavedProfile] = useState(false);
  const [autoplayHover, setAutoplayHover] = useState(() => {
    try {
      return localStorage.getItem('artified_autoplay_on_hover') !== 'false';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (isOpen) {
      const fresh = getLoyaltyAccount();
      setAccount(fresh);
      setEditName(fresh.customerName);
      setEditPhone(fresh.phone);
      setEditEmail(fresh.email);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => {
      setAccount(getLoyaltyAccount());
    };
    window.addEventListener('artified_loyalty_updated', handleUpdate);
    return () => window.removeEventListener('artified_loyalty_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const currentTierConfig = LOYALTY_TIERS_CONFIG[account.tier] || LOYALTY_TIERS_CONFIG['Pearl Bronze'];
  
  // Tier progression logic
  let nextTierName: LoyaltyTier | null = null;
  let pointsNeededForNext = 0;
  let progressPercent = 100;

  if (account.tier === 'Pearl Bronze') {
    nextTierName = 'Silver Baroque';
    const target = LOYALTY_TIERS_CONFIG['Silver Baroque'].minPoints;
    pointsNeededForNext = Math.max(0, target - account.lifetimePoints);
    progressPercent = Math.min(100, Math.round((account.lifetimePoints / target) * 100));
  } else if (account.tier === 'Silver Baroque') {
    nextTierName = 'Gold Sovereign';
    const target = LOYALTY_TIERS_CONFIG['Gold Sovereign'].minPoints;
    const prev = LOYALTY_TIERS_CONFIG['Silver Baroque'].minPoints;
    pointsNeededForNext = Math.max(0, target - account.lifetimePoints);
    progressPercent = Math.min(100, Math.round(((account.lifetimePoints - prev) / (target - prev)) * 100));
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleApplyVoucher = (voucher: LoyaltyRewardVoucher) => {
    // If not claimed yet and user has points, redeem automatically
    if (!account.claimedVouchers.includes(voucher.code)) {
      if (account.pointsBalance < voucher.pointsCost) {
        setActionMessage(`You need ${voucher.pointsCost - account.pointsBalance} more points to redeem ${voucher.code}.`);
        setTimeout(() => setActionMessage(null), 3500);
        return;
      }
      const res = redeemVoucher(voucher);
      if (res.success) {
        setAccount(res.account);
      }
    }

    // Apply code in checkout
    applyPromoCode(voucher.code);
    handleCopyCode(voucher.code);
    setActionMessage(`Voucher "${voucher.code}" applied to checkout!`);
    setTimeout(() => setActionMessage(null), 3500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: LoyaltyAccount = {
      ...account,
      customerName: editName.trim() || account.customerName,
      phone: editPhone.trim() || account.phone,
      email: editEmail.trim() || account.email
    };
    saveLoyaltyAccount(updated);
    setAccount(updated);
    setIsSavedProfile(true);
    setTimeout(() => setIsSavedProfile(false), 2500);
  };

  const handleShareReferral = () => {
    const text = `Join Artified Nepal with my referral link to get 100 welcome loyalty points + free gift wrap on your first handmade pearl piece from Kathmandu! https://artified.com.np?ref=${account.customerId}`;
    if (navigator.share) {
      navigator.share({
        title: 'Artified Member Referral',
        text
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      handleCopyCode('referral');
      setActionMessage('Referral link copied to clipboard!');
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-[#FAF8F5] rounded-3xl border border-[#E8DFD8] shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1C1B1A] text-white p-4 sm:p-5 border-b border-[#34312F] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8C7A6B] flex items-center justify-center text-[#1C1B1A] shadow-md shrink-0">
              <Crown className="w-5 h-5 text-white fill-white/20" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-serif text-base sm:text-lg font-bold text-white tracking-wide truncate">
                  {account.customerName}
                </h3>
                <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${currentTierConfig.bgBadge}`}>
                  {account.tier}
                </span>
              </div>
              <p className="text-[11px] text-[#A69E96] truncate">
                Member ID: <span className="font-mono text-[#D4AF37]">{account.customerId}</span> • Kathmandu Atelier
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#A69E96] hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Loyalty Points Dashboard Card */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-white to-[#F7F3EE] border-b border-[#E8DFD8] shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1C1B1A] text-white p-4 rounded-2xl shadow-lg border border-[#3E3A36]">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#D4AF37] block">
                Available Loyalty Balance
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-serif text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {account.pointsBalance}
                </span>
                <span className="text-sm font-semibold text-[#D4AF37]">
                  Points
                </span>
                <span className="text-xs text-[#A69E96] bg-[#2B2927] px-2 py-0.5 rounded-md border border-[#4A4541]">
                  ≈ Rs. {account.pointsBalance} value
                </span>
              </div>
              <p className="text-[11px] text-[#A69E96] mt-1">
                Earn 1 point for every Rs. 10 spent. Redeem anytime at checkout!
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('rewards')}
              className="px-4 py-2.5 bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c59e2b] text-[#1C1B1A] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Redeem Vouchers</span>
            </button>
          </div>

          {/* Tier Progress Bar */}
          {nextTierName ? (
            <div className="mt-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#1C1B1A] flex items-center gap-1 text-[11px]">
                  <span>Tier Progress:</span>
                  <strong className="text-[#8C7A6B]">{account.tier}</strong>
                  <ArrowRight className="w-3 h-3 text-[#A69E96]" />
                  <strong className="text-[#C5A880]">{nextTierName}</strong>
                </span>
                <span className="text-[11px] text-[#736C65] font-medium">
                  {pointsNeededForNext} points to upgrade
                </span>
              </div>
              <div className="w-full bg-[#E8DFD8] rounded-full h-2 overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-[#C5A880] to-[#D4AF37] h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-800 font-bold bg-amber-50 p-2 rounded-xl border border-amber-200">
              <Crown className="w-4 h-4 text-amber-600 fill-amber-500" />
              <span>You have attained maximum VIP status: Gold Sovereign Member!</span>
            </div>
          )}

          {/* Refer a Friend Community Rewards Banner */}
          <div className="mt-3.5 p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-[#FAF8F5] border border-[#D4AF37]/50 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
                <Gift className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-[#1C1B1A]">Give 10%, Get Rs. 250 Off</p>
                <p className="text-[10px] text-[#736C65]">Invite friends & bridesmaids to shop handmade pearls</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                openReferralModal();
              }}
              className="px-3 py-1.5 bg-[#1C1B1A] hover:bg-black text-[#D4AF37] text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shrink-0 shadow-xs"
            >
              Invite Friends
            </button>
          </div>
        </div>

        {/* Global Action / Notification Toast */}
        {actionMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between animate-fade-in shrink-0">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>{actionMessage}</span>
            </span>
            <button 
              type="button" 
              onClick={() => setActionMessage(null)}
              className="text-white/80 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Navigation Controls */}
        <div className="p-2 sm:px-4 bg-white border-b border-[#E8DFD8] flex items-center justify-between gap-1 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('rewards')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'rewards'
                ? 'bg-[#1C1B1A] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#5E5955] hover:bg-[#F0EBE5]'
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Reward Vouchers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-[#1C1B1A] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#5E5955] hover:bg-[#F0EBE5]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Points History</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tiers')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'tiers'
                ? 'bg-[#1C1B1A] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#5E5955] hover:bg-[#F0EBE5]'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Tier Perks</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-[#1C1B1A] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#5E5955] hover:bg-[#F0EBE5]'
            }`}
          >
            <User className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Profile</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">

          {/* TAB 1: REWARDS VOUCHERS */}
          {activeTab === 'rewards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif text-sm font-bold text-[#1C1B1A]">
                    Redeem Points for Vouchers
                  </h4>
                  <p className="text-[11px] text-[#736C65]">
                    Click &ldquo;Apply&rdquo; to instantly attach discount to your shopping cart.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleShareReferral}
                  className="px-2.5 py-1 bg-white border border-[#E8DFD8] hover:border-[#C5A880] text-[#1C1B1A] text-[11px] font-semibold rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                >
                  <Share2 className="w-3 h-3 text-[#C5A880]" />
                  <span>Refer a Friend (+75 pts)</span>
                </button>
              </div>

              {/* Vouchers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AVAILABLE_LOYALTY_VOUCHERS.map((voucher) => {
                  const isClaimed = account.claimedVouchers.includes(voucher.code);
                  const canAfford = account.pointsBalance >= voucher.pointsCost;
                  const isCurrentCartPromo = promoCode.toUpperCase() === voucher.code.toUpperCase();

                  return (
                    <div 
                      key={voucher.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                        isCurrentCartPromo
                          ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-400 shadow-xs'
                          : 'bg-white border-[#E8DFD8] hover:border-[#C5A880]/80 shadow-2xs'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-[#1C1B1A] bg-[#FAF8F5] border border-[#E8DFD8] px-2 py-0.5 rounded-md tracking-wider">
                            {voucher.code}
                          </span>
                          <span className="text-[11px] font-extrabold text-[#D4AF37] flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                            <span>{voucher.pointsCost} Points</span>
                          </span>
                        </div>

                        <h5 className="font-serif text-xs font-bold text-[#1C1B1A] pt-1">
                          {voucher.title}
                        </h5>
                        <p className="text-[11px] text-[#736C65] leading-relaxed">
                          {voucher.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#F0EBE5] flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[#8C7A6B]">
                          {isCurrentCartPromo 
                            ? 'Applied to Cart ✓' 
                            : isClaimed 
                            ? 'Ready to use' 
                            : canAfford 
                            ? 'Ready to redeem' 
                            : `Need ${voucher.pointsCost - account.pointsBalance} more pts`}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(voucher.code)}
                            className="p-1.5 text-[#8C847E] hover:text-[#1C1B1A] border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] transition-colors cursor-pointer"
                            title="Copy code"
                          >
                            {copiedCode === voucher.code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApplyVoucher(voucher)}
                            disabled={!isClaimed && !canAfford}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              isCurrentCartPromo
                                ? 'bg-emerald-700 text-white'
                                : 'bg-[#1C1B1A] hover:bg-black text-[#D4AF37] shadow-2xs'
                            }`}
                          >
                            <span>{isCurrentCartPromo ? 'In Cart' : isClaimed ? 'Apply' : 'Redeem & Apply'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Extra Ways to Earn Box */}
              <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8DFD8] space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1C1B1A] block">
                  🌟 How to Earn More Reward Points:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#5E5955]">
                  <div className="p-2 bg-white rounded-xl border border-[#E8DFD8]">
                    <strong className="block text-[#1C1B1A]">Every Purchase</strong>
                    <span>1 pt for every Rs. 10 spent on any handmade bag or choker.</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-[#E8DFD8]">
                    <strong className="block text-[#1C1B1A]">Leave a Review</strong>
                    <span>Earn 50 bonus points when you submit a verified review.</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-[#E8DFD8]">
                    <strong className="block text-[#1C1B1A]">Invite Friends</strong>
                    <span>Earn 75 bonus points whenever a friend places an order.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: POINTS ACTIVITY HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-sm font-bold text-[#1C1B1A]">
                  Points Activity History
                </h4>
                <span className="text-[11px] text-[#736C65]">
                  Lifetime earned: <strong>{account.lifetimePoints} pts</strong>
                </span>
              </div>

              {account.history.length > 0 ? (
                <div className="bg-white rounded-2xl border border-[#E8DFD8] divide-y divide-[#F0EBE5] overflow-hidden shadow-2xs">
                  {account.history.map((tx) => (
                    <div key={tx.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#FAF8F5] transition-colors">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#1C1B1A] truncate">
                            {tx.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#8C847E]">
                          <span>{tx.date}</span>
                          {tx.orderId && (
                            <span>• Order: <strong className="font-mono text-[#5E5955]">#{tx.orderId}</strong></span>
                          )}
                        </div>
                      </div>

                      <span className={`text-xs font-mono font-extrabold px-2.5 py-1 rounded-lg shrink-0 ${
                        tx.points > 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {tx.points > 0 ? `+${tx.points} pts` : `${tx.points} pts`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-[#E8DFD8] text-[#736C65]">
                  <Clock className="w-8 h-8 text-[#C5A880] mx-auto mb-2 opacity-50" />
                  <p>No points activity logged yet. Your first order will appear here!</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TIER PERKS */}
          {activeTab === 'tiers' && (
            <div className="space-y-3.5">
              <div>
                <h4 className="font-serif text-sm font-bold text-[#1C1B1A]">
                  Artified Member Circle Membership Tiers
                </h4>
                <p className="text-[11px] text-[#736C65]">
                  Unlock permanent boosters and personal concierge perks as you collect handmade jewelry pieces.
                </p>
              </div>

              <div className="space-y-3">
                {(Object.keys(LOYALTY_TIERS_CONFIG) as LoyaltyTier[]).map((tierKey) => {
                  const conf = LOYALTY_TIERS_CONFIG[tierKey];
                  const isCurrent = account.tier === tierKey;

                  return (
                    <div 
                      key={tierKey}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-white border-[#D4AF37] ring-2 ring-[#D4AF37]/30 shadow-md'
                          : 'bg-white/80 border-[#E8DFD8] opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-[#F0EBE5] pb-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <Crown className={`w-4 h-4 ${tierKey === 'Gold Sovereign' ? 'text-amber-500 fill-amber-400' : tierKey === 'Silver Baroque' ? 'text-zinc-500' : 'text-[#8C7A6B]'}`} />
                          <span className="font-serif text-sm font-bold text-[#1C1B1A]">
                            {tierKey}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] bg-[#1C1B1A] text-[#D4AF37] px-2 py-0.2 rounded font-bold uppercase tracking-wider">
                              Your Current Tier
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-mono font-bold text-[#8C7A6B]">
                          {conf.minPoints}+ Points
                        </span>
                      </div>

                      <ul className="space-y-1.5 text-[11px] text-[#5E5955]">
                        {conf.perks.map((perk, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{perk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: PROFILE SETTINGS */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-serif text-sm font-bold text-[#1C1B1A]">
                  Member Profile & Cloud Account
                </h4>
                <p className="text-[11px] text-[#736C65]">
                  Sign in with Google to preserve your wishlist, loyalty tier, and delivery details across all your devices.
                </p>
              </div>

              {/* Google Account Cloud Connection Card */}
              <div className="p-4 rounded-2xl bg-white border border-[#E8DFD8] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1C1B1A] uppercase tracking-wider">
                    Cloud Synchronization:
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isUserLoggedIn
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}>
                    {isUserLoggedIn ? '🟢 Synced to Cloud' : 'Local Device Only'}
                  </span>
                </div>

                {isUserLoggedIn && currentUser ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#E8DFD8]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {currentUser.photoURL ? (
                        <img 
                          src={currentUser.photoURL} 
                          alt="Avatar" 
                          className="w-8 h-8 rounded-full border border-[#D4AF37]" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#1C1B1A] text-white flex items-center justify-center text-xs font-bold">
                          {currentUser.email?.slice(0, 1).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1C1B1A] truncate">
                          {currentUser.displayName || 'Valued Member'}
                        </p>
                        <p className="text-[10px] text-[#736C65] truncate">
                          {currentUser.email}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={logoutUser}
                      className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[#736C65] leading-relaxed">
                      Connect your Google account with 1 click to save your wishlist and reward points seamlessly to the cloud.
                    </p>
                    <button
                      type="button"
                      onClick={loginWithGoogle}
                      className="w-full py-2.5 px-4 bg-[#1C1B1A] hover:bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>Sign In with Google</span>
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveProfile(e);
                try {
                  localStorage.setItem('artified_autoplay_on_hover', String(autoplayHover));
                  window.dispatchEvent(new CustomEvent('artified_autoplay_on_hover_changed'));
                } catch {}
              }} className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-2xs space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    Your Full Name:
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                      Phone Number (WhatsApp):
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                      Email Address:
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                {/* User Preferences Section */}
                <div className="pt-3 border-t border-[#F0EBE5] space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7A6B] block">
                    Device & Data Preferences:
                  </span>
                  
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#E8DFD8] hover:border-[#C5A880]/60 transition-colors">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-[#1C1B1A] block">
                        Auto-play on hover
                      </span>
                      <span className="text-[10px] text-[#736C65] block leading-normal">
                        Toggle slow-motion video playback on hover. Turn off to conserve cellular data on mobile devices.
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={autoplayHover}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setAutoplayHover(val);
                          try {
                            localStorage.setItem('artified_autoplay_on_hover', String(val));
                            window.dispatchEvent(new CustomEvent('artified_autoplay_on_hover_changed'));
                          } catch {}
                        }}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-[#E8DFD8] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1C1B1A]"></div>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  {isSavedProfile ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1 text-xs">
                      <Check className="w-3.5 h-3.5" />
                      <span>Changes Saved!</span>
                    </span>
                  ) : <span />}

                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1C1B1A] text-white hover:bg-black rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-[#E8DFD8] flex items-center justify-between text-xs text-[#736C65] shrink-0">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Artified Member Circle • Kathmandu, Nepal</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-[#FAF8F5] hover:bg-[#F0EBE5] border border-[#E8DFD8] text-[#1C1B1A] font-semibold rounded-xl text-xs cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
