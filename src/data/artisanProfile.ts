import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import SAVED_ARTISAN_PROFILE from './artisan_profile.json';

export interface ArtisanPillar {
  title: string;
  desc: string;
}

export interface ArtisanImageMetadata {
  uploadedAt: string;
  versionId: string;
  contentType?: string;
  source?: string;
}

export interface ArtisanProfileData {
  artisanName: string;
  artisanRole: string;
  atelierLocation: string;
  establishedText: string;
  avatarUrl: string;
  avatarPosition?: string;
  avatarUpdatedAt?: string;
  avatarMetadata?: ArtisanImageMetadata;
  stat1Value?: string;
  stat1Label?: string;
  stat2Value?: string;
  stat2Label?: string;
  headline: string;
  subheadline: string;
  quote: string;
  whyArtified?: string;
  pillar1?: ArtisanPillar;
  pillar2?: ArtisanPillar;
  pillar3?: ArtisanPillar;
  pillar4?: ArtisanPillar;
  whatsappPhone: string;
  whatsappGreetingEn: string;
  whatsappGreetingNe: string;
  guaranteeText: string;
  instagramHandle: string;
}

const savedProfile = (SAVED_ARTISAN_PROFILE as unknown as Partial<ArtisanProfileData>) || {};
const authenticAvatar = (savedProfile.avatarUrl && savedProfile.avatarUrl.length > 50) ? savedProfile.avatarUrl : '/artisan_avatar.png';

export const DEFAULT_ARTISAN_PROFILE: ArtisanProfileData = {
  artisanName: savedProfile.artisanName || 'Sahina Shrestha',
  artisanRole: 'Founder & Creator',
  atelierLocation: 'Kathmandu, Nepal',
  establishedText: savedProfile.establishedText || 'Est. 2024 • 100% Handcrafted in Nepal',
  avatarUrl: authenticAvatar,
  avatarPosition: savedProfile.avatarPosition || 'center 20%',
  avatarUpdatedAt: savedProfile.avatarUpdatedAt || '2026-10-06T00:00:00.000Z',
  avatarMetadata: savedProfile.avatarMetadata || {
    uploadedAt: '2026-10-06T00:00:00.000Z',
    versionId: 'ver_founder_creator_v7',
    source: 'Kathmandu Workshop'
  },
  stat1Value: '',
  stat1Label: '',
  stat2Value: '',
  stat2Label: '',
  headline: 'Meet the Founder & Creator: Sahina Shrestha',
  subheadline: 'From Childhood Passion to Creative Journey',
  quote: savedProfile.quote || 'My love for art and crafts began in childhood, inspired by watching my mother create beautiful handicrafts. I have always been drawn to unique and different designs, especially those inspired by cultures around the world.\n\nWhen I couldn’t find the pieces I loved in the local market, I started creating them myself. What began as a personal passion soon received appreciation from others, encouraging me to share my creations and turn my creativity into a small business.',
  whyArtified: savedProfile.whyArtified || 'Artified comes from the combination of “Art” and “Modified.” It reflects my belief that creativity can transform ordinary ideas into something unique and meaningful.\n\nEvery creation is an opportunity to experiment, add a personal touch, and make something truly different. What began as childhood curiosity has grown into a journey of creativity, learning, and entrepreneurship—with the goal of creating pieces that make people think, “I haven’t seen this before.”',
  whatsappPhone: savedProfile.whatsappPhone || '9779767573721',
  whatsappGreetingEn: savedProfile.whatsappGreetingEn || 'Namaste Sahina! 🌸 I just read your story on Artified Nepal and would love to consult with you regarding your handcrafted creations.',
  whatsappGreetingNe: savedProfile.whatsappGreetingNe || 'नमस्ते सहिना दिदी! 🌸 मैले Artified वेबसाइटमा तपाईंको कथा पढें र हस्तनिर्मित मोती/म्याक्रामे सिर्जनाबारे कुरा गर्न चाहन्छु।',
  guaranteeText: savedProfile.guaranteeText || '24-Hour Easy Exchange Guarantee across Nepal',
  instagramHandle: savedProfile.instagramHandle || '@artified_np'
};

const ARTISAN_STORAGE_KEY = 'artified_founder_creator_profile_v7';

// Global isSaving flag to prevent any re-render fallback to defaults during active saves/uploads
let isProfileSavingInFlight = false;

export function getIsProfileSaving(): boolean {
  return isProfileSavingInFlight;
}

export function getArtisanProfile(): ArtisanProfileData {
  try {
    // Purge obsolete legacy storage keys if present
    try {
      localStorage.removeItem('artified_artisan_profile');
      localStorage.removeItem('artified_founder_creator_profile_v4');
      localStorage.removeItem('artified_founder_creator_profile_v5');
      localStorage.removeItem('artified_founder_creator_profile_v6');
    } catch {}

    const raw = localStorage.getItem(ARTISAN_STORAGE_KEY);
    if (raw) {
      if (/chikamugal/i.test(raw)) {
        localStorage.removeItem(ARTISAN_STORAGE_KEY);
        return DEFAULT_ARTISAN_PROFILE;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        let avatarUrl = parsed.avatarUrl;
        if (!avatarUrl || avatarUrl.includes('unsplash.com')) {
          avatarUrl = DEFAULT_ARTISAN_PROFILE.avatarUrl;
        }

        return {
          ...DEFAULT_ARTISAN_PROFILE,
          ...parsed,
          artisanRole: 'Founder & Creator',
          atelierLocation: 'Kathmandu, Nepal',
          headline: 'Meet the Founder & Creator: Sahina Shrestha',
          subheadline: 'From Childhood Passion to Creative Journey',
          quote: DEFAULT_ARTISAN_PROFILE.quote,
          whyArtified: DEFAULT_ARTISAN_PROFILE.whyArtified,
          avatarUrl,
        };
      }
    }
  } catch (e) {
    console.warn('Notice: Error loading founder & creator profile from localStorage:', e);
  }
  return DEFAULT_ARTISAN_PROFILE;
}

export async function saveArtisanProfile(data: ArtisanProfileData): Promise<void> {
  isProfileSavingInFlight = true;
  try {
    const timestamp = new Date().toISOString();
    const versionId = `ver_${Date.now()}`;
    const enrichedData: ArtisanProfileData = {
      ...data,
      avatarUpdatedAt: timestamp,
      avatarMetadata: {
        ...(data.avatarMetadata || { uploadedAt: timestamp, versionId }),
        uploadedAt: timestamp,
        versionId
      }
    };

    // Step 1: Save to localStorage immediately - local is authoritative for current browser
    try {
      localStorage.setItem(ARTISAN_STORAGE_KEY, JSON.stringify(enrichedData));
    } catch (lsErr) {
      console.warn('Notice: localStorage save error:', lsErr);
    }
    window.dispatchEvent(new CustomEvent('artified_artisan_updated', { detail: enrichedData }));
    
    // Step 2: Explicitly persist to server JSON disk via API (permanent across reloads & server restarts)
    try {
      await fetch('/api/artisan-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedData),
      });
    } catch (serverErr) {
      console.warn('Notice: Server API save error:', serverErr);
    }

    // Step 3: Explicitly persist to Firestore
    try {
      const firestorePayload: ArtisanProfileData = {
        ...enrichedData,
        avatarUrl: enrichedData.avatarUrl || DEFAULT_ARTISAN_PROFILE.avatarUrl
      };
      const activeProfileRef = doc(db, 'activeProfile', 'sahina_shrestha');
      const mirrorRef = doc(db, 'store_settings', 'artisan_profile');
      await setDoc(activeProfileRef, firestorePayload, { merge: true });
      await setDoc(mirrorRef, firestorePayload, { merge: true });
    } catch (fsErr) {
      console.warn('Notice: Firestore save error:', fsErr);
    }
  } catch (e) {
    console.warn('Notice: Error saving artisan profile:', e);
  } finally {
    isProfileSavingInFlight = false;
  }
}

export async function fetchArtisanProfileFromServer(): Promise<ArtisanProfileData> {
  const currentLocal = getArtisanProfile();
  
  // Return local storage state immediately so UI never blocks or lags
  // Fetch remote updates from server JSON disk and Firestore non-intrusively in background
  setTimeout(async () => {
    if (isProfileSavingInFlight) return;
    try {
      let serverData: any = null;
      let activeProfileData: any = null;
      let mirrorData: any = null;

      // 1. Fetch permanently saved profile from server disk
      try {
        const resp = await fetch('/api/artisan-profile');
        if (resp.ok) {
          serverData = await resp.json();
        }
      } catch (err) {}

      // 2. Fetch from Firestore
      try {
        const snap = await getDoc(doc(db, 'activeProfile', 'sahina_shrestha'));
        if (snap.exists()) {
          activeProfileData = snap.data();
        }
      } catch (err) {}

      try {
        const snap2 = await getDoc(doc(db, 'store_settings', 'artisan_profile'));
        if (snap2.exists()) {
          mirrorData = snap2.data();
        }
      } catch (err) {}

      // Prefer candidate with latest update or custom edits
      const candidates = [serverData, activeProfileData, mirrorData].filter(Boolean);
      if (candidates.length === 0) return;

      let authoritative = candidates[0];
      for (const cand of candidates) {
        const candTs = cand?.avatarUpdatedAt ? new Date(cand.avatarUpdatedAt).getTime() : 0;
        const authTs = authoritative?.avatarUpdatedAt ? new Date(authoritative.avatarUpdatedAt).getTime() : 0;
        if (candTs > authTs) {
          authoritative = cand;
        }
      }

      // Clean out corporate or unsplash photo if present in remote record
      if (authoritative?.avatarUrl && (authoritative.avatarUrl.includes('photo-') || authoritative.avatarUrl.includes('unsplash.com'))) {
        authoritative.avatarUrl = '/artisan_avatar.png';
      }

      // Check timestamps:
      const localUpdated = currentLocal?.avatarUpdatedAt ? new Date(currentLocal.avatarUpdatedAt).getTime() : 0;
      const remoteUpdated = authoritative?.avatarUpdatedAt ? new Date(authoritative.avatarUpdatedAt).getTime() : 0;

      // Detect if local is default
      const defaultTs = new Date('2026-10-02T00:00:00.000Z').getTime();
      const localIsDefault = !currentLocal?.avatarUpdatedAt || localUpdated <= defaultTs;

      let merged: ArtisanProfileData;
      if (remoteUpdated > localUpdated || (localIsDefault && remoteUpdated > defaultTs)) {
        // Remote is newer or local is uninitialized default: adopt remote permanently with strict sanitization
        merged = {
          ...DEFAULT_ARTISAN_PROFILE,
          ...authoritative,
          avatarUrl: authoritative.avatarUrl || currentLocal.avatarUrl || DEFAULT_ARTISAN_PROFILE.avatarUrl,
          headline: 'Meet the Founder & Creator: Sahina Shrestha',
          subheadline: 'From Childhood Passion to Creative Journey',
          atelierLocation: 'Kathmandu, Nepal',
          artisanRole: 'Founder & Creator',
          stat1Value: '',
          stat1Label: '',
          stat2Value: '',
          stat2Label: '',
          quote: DEFAULT_ARTISAN_PROFILE.quote,
          whyArtified: DEFAULT_ARTISAN_PROFILE.whyArtified
        };
        try {
          localStorage.setItem(ARTISAN_STORAGE_KEY, JSON.stringify(merged));
        } catch {}
        window.dispatchEvent(new CustomEvent('artified_artisan_updated', { detail: merged }));

        // Sync sanitized back to Firestore & server
        try {
          setDoc(doc(db, 'activeProfile', 'sahina_shrestha'), merged, { merge: true }).catch(() => {});
          setDoc(doc(db, 'store_settings', 'artisan_profile'), merged, { merge: true }).catch(() => {});
        } catch {}
      } else if (localUpdated > remoteUpdated && localUpdated > defaultTs) {
        // Local is newer: sync local to server disk API and Firestore
        try {
          fetch('/api/artisan-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentLocal)
          }).catch(() => {});
          setDoc(doc(db, 'activeProfile', 'sahina_shrestha'), currentLocal, { merge: true }).catch(() => {});
          setDoc(doc(db, 'store_settings', 'artisan_profile'), currentLocal, { merge: true }).catch(() => {});
        } catch {}
      }
    } catch (e) {}
  }, 50);

  return currentLocal;
}
