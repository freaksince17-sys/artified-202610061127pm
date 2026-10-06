import { LoyaltyAccount, LoyaltyRewardVoucher, LoyaltyTier, LoyaltyTransaction } from '../types';

export type { LoyaltyRewardVoucher };

export const LOYALTY_TIERS_CONFIG: Record<
  LoyaltyTier,
  {
    minPoints: number;
    color: string;
    bgBadge: string;
    multiplier: number;
    perks: string[];
  }
> = {
  'Pearl Bronze': {
    minPoints: 0,
    color: '#8C7A6B',
    bgBadge: 'bg-[#FAF8F5] text-[#8C7A6B] border border-[#E8DFD8]',
    multiplier: 1.0,
    perks: [
      '1x Loyalty points on every purchase (1 pt per Rs. 10)',
      '100 Points Welcome Bonus upon sign-in',
      'Birthday Gift Wrap secret promo code',
      'Early preview of seasonal pearl drops'
    ]
  },
  'Silver Baroque': {
    minPoints: 500,
    color: '#6B7280',
    bgBadge: 'bg-zinc-100 text-zinc-800 border border-zinc-300 font-bold',
    multiplier: 1.25,
    perks: [
      '1.25x Loyalty points booster on all orders',
      'Complimentary custom necklace & choker sizing',
      'Same-day priority dispatch inside Kathmandu Valley',
      'Exclusive Silver Member private WhatsApp channel'
    ]
  },
  'Gold Sovereign': {
    minPoints: 1500,
    color: '#D4AF37',
    bgBadge: 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold',
    multiplier: 1.5,
    perks: [
      '1.5x Maximum Loyalty points booster on all orders',
      'Free Luxury Gift Packaging & Wax Seal on ALL orders',
      'Direct bespoke order concierge with founder and creator Sahina Shrestha',
      'Annual anniversary handcrafted surprise keepsake'
    ]
  }
};

export const AVAILABLE_LOYALTY_VOUCHERS: LoyaltyRewardVoucher[] = [
  {
    id: 'v-freegift',
    code: 'FREEGIFT',
    title: 'Free Luxury Gift Wrap & Calligraphy Card',
    pointsCost: 150,
    discountAmount: 150,
    description: 'Waives the Rs. 150 gift wrapping fee with satin ribbon and wax-sealed personal card.',
    type: 'free_gift_wrap'
  },
  {
    id: 'v-100',
    code: 'PEARL100',
    title: 'Rs. 100 Off Storewide',
    pointsCost: 100,
    discountAmount: 100,
    description: 'Instant Rs. 100 discount applied to any handmade bag or choker.',
    type: 'discount'
  },
  {
    id: 'v-250',
    code: 'BAROQUE250',
    title: 'Rs. 250 Off Handcrafted Pieces',
    pointsCost: 250,
    discountAmount: 250,
    description: 'Save Rs. 250 on orders above Rs. 1,000 across our Kathmandu catalog.',
    type: 'discount'
  },
  {
    id: 'v-500',
    code: 'ATELIER500',
    title: 'Rs. 500 VIP Atelier Discount',
    pointsCost: 500,
    discountAmount: 500,
    description: 'Exclusive Rs. 500 off luxury bags like Caviar, Round, and Red Pearl bags.',
    type: 'discount'
  }
];

export const DEFAULT_LOYALTY_ACCOUNT: LoyaltyAccount = {
  customerId: 'art-member-8821',
  customerName: 'Samikshya Shrestha',
  phone: '9841234567',
  email: 'samikshya@example.com',
  pointsBalance: 250,
  lifetimePoints: 450,
  tier: 'Pearl Bronze',
  claimedVouchers: ['WELCOME50'],
  history: [
    {
      id: 'tx-1',
      type: 'welcome',
      points: 100,
      description: 'Welcome to Artified Member Circle! 🌸',
      date: 'Aug 14, 2026'
    },
    {
      id: 'tx-2',
      type: 'earn',
      points: 250,
      description: 'Earned from purchase of Red Pearl Beaded Bag (#ART-2026-3829)',
      orderId: 'ART-2026-3829',
      date: 'Sep 02, 2026'
    },
    {
      id: 'tx-3',
      type: 'redeem',
      points: -100,
      description: 'Redeemed voucher PEARL100 on checkout',
      date: 'Sep 15, 2026'
    }
  ]
};

export const calculateTier = (lifetimePoints: number): LoyaltyTier => {
  if (lifetimePoints >= 1500) return 'Gold Sovereign';
  if (lifetimePoints >= 500) return 'Silver Baroque';
  return 'Pearl Bronze';
};

export const getLoyaltyAccount = (): LoyaltyAccount => {
  try {
    const saved = localStorage.getItem('artified_loyalty_account');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.pointsBalance === 'number') {
        parsed.tier = calculateTier(parsed.lifetimePoints || parsed.pointsBalance);
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_LOYALTY_ACCOUNT;
};

export const saveLoyaltyAccount = (account: LoyaltyAccount): void => {
  try {
    account.tier = calculateTier(account.lifetimePoints);
    localStorage.setItem('artified_loyalty_account', JSON.stringify(account));
    window.dispatchEvent(new CustomEvent('artified_loyalty_updated', { detail: account }));
  } catch {}
};

/**
 * Earn points from completed purchase:
 * Base: 1 pt per Rs. 10 spent (10% reward value!).
 * Multiplier applied based on tier.
 */
export const earnPurchasePoints = (
  orderTotal: number,
  orderId: string,
  customerName?: string,
  phone?: string,
  email?: string
): { pointsEarned: number; updatedAccount: LoyaltyAccount } => {
  const current = getLoyaltyAccount();
  if (customerName) current.customerName = customerName;
  if (phone) current.phone = phone;
  if (email) current.email = email;

  const tierConfig = LOYALTY_TIERS_CONFIG[current.tier] || LOYALTY_TIERS_CONFIG['Pearl Bronze'];
  const basePoints = Math.max(10, Math.floor(orderTotal / 10));
  const pointsEarned = Math.round(basePoints * tierConfig.multiplier);

  const newBalance = current.pointsBalance + pointsEarned;
  const newLifetime = current.lifetimePoints + pointsEarned;

  const newTxn: LoyaltyTransaction = {
    id: `tx-${Date.now()}`,
    type: 'earn',
    points: pointsEarned,
    description: `Earned on order #${orderId} (${tierConfig.multiplier}x ${current.tier} tier)`,
    orderId,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  };

  const updated: LoyaltyAccount = {
    ...current,
    pointsBalance: newBalance,
    lifetimePoints: newLifetime,
    tier: calculateTier(newLifetime),
    history: [newTxn, ...current.history]
  };

  saveLoyaltyAccount(updated);
  return { pointsEarned, updatedAccount: updated };
};

/**
 * Redeem loyalty points for a promo voucher code
 */
export const redeemVoucher = (
  voucher: LoyaltyRewardVoucher
): { success: boolean; message: string; account: LoyaltyAccount } => {
  const current = getLoyaltyAccount();
  if (current.pointsBalance < voucher.pointsCost) {
    return {
      success: false,
      message: `You need ${voucher.pointsCost - current.pointsBalance} more points to redeem this voucher.`,
      account: current
    };
  }

  const newBalance = current.pointsBalance - voucher.pointsCost;
  const newTxn: LoyaltyTransaction = {
    id: `tx-${Date.now()}`,
    type: 'redeem',
    points: -voucher.pointsCost,
    description: `Redeemed ${voucher.title} (Code: ${voucher.code})`,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  };

  const claimed = current.claimedVouchers.includes(voucher.code)
    ? current.claimedVouchers
    : [...current.claimedVouchers, voucher.code];

  const updated: LoyaltyAccount = {
    ...current,
    pointsBalance: newBalance,
    history: [newTxn, ...current.history],
    claimedVouchers: claimed
  };

  saveLoyaltyAccount(updated);
  return {
    success: true,
    message: `Successfully redeemed! Voucher code ${voucher.code} is now ready to apply at checkout.`,
    account: updated
  };
};
