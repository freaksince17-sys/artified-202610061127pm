import { ReferralRewardData } from '../types';

export const getReferralData = (): ReferralRewardData => {
  try {
    const saved = localStorage.getItem('artified_referral_data');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}

  const randomCode = 'ART-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://artified.np';

  const initialData: ReferralRewardData = {
    referralCode: randomCode,
    referralLink: `${origin}/?ref=${randomCode}`,
    friendsInvited: 3,
    successfulPurchases: 1,
    rewardCode: 'REFER250',
    rewardDiscountAmount: 250,
    friendDiscountPercent: 10,
    hasClaimedReward: false
  };

  try {
    localStorage.setItem('artified_referral_data', JSON.stringify(initialData));
  } catch {}

  return initialData;
};

export const incrementReferralShareCount = (): ReferralRewardData => {
  const current = getReferralData();
  const updated: ReferralRewardData = {
    ...current,
    friendsInvited: current.friendsInvited + 1
  };
  try {
    localStorage.setItem('artified_referral_data', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('artified_referral_updated', { detail: updated }));
  } catch {}
  return updated;
};

export const claimReferralReward = (): ReferralRewardData => {
  const current = getReferralData();
  const updated: ReferralRewardData = {
    ...current,
    hasClaimedReward: true
  };
  try {
    localStorage.setItem('artified_referral_data', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('artified_referral_updated', { detail: updated }));
  } catch {}
  return updated;
};
