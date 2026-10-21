import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { safeSetDoc as setDoc } from '../utils/safeFirestore';
import { compressImage } from '../utils/imageCompressor';
import { ESEWA_QR_FALLBACK } from './esewa_qr_fallback';
import repoPaymentSettings from './payment_settings.json';

export interface SellerPaymentSettings {
  accountName: string;
  phone: string;
  bankName: string;
  branch: string;
  fonepayQrImage?: string;
  esewaQrImage?: string;
  khaltiQrImage?: string;
  enableEsewa?: boolean;
  enableFonepay?: boolean;
  enableKhalti?: boolean;
}

/**
 * Normalizes any QR image string (raw base64 without prefix, relative path, or data URL)
 * so that it renders reliably on all domains including www.artified.com.np and AI Studio.
 */
export function normalizeQrImageUrl(url: string | undefined | null, fallback = ''): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;

  // If pointing to default static path, use embedded high-reliability base64 data URL so it never 404s or stalls
  if (trimmed === '/esewa_qr.png' || trimmed === 'esewa_qr.png' || trimmed === '/esewa_qr.jpg') {
    return ESEWA_QR_FALLBACK || '/esewa_qr.png';
  }

  // Already a valid data URL, blob URL, or full HTTP(S) URL
  if (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }

  // Raw base64 JPEG (starts with /9j/)
  if (trimmed.startsWith('/9j/') || (trimmed.startsWith('9j/') && trimmed.length > 200)) {
    const cleanBase64 = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `data:image/jpeg;base64,${cleanBase64}`;
  }

  // Raw base64 PNG (starts with iVBOR)
  if (trimmed.startsWith('iVBOR')) {
    return `data:image/png;base64,${trimmed}`;
  }

  // Raw base64 SVG
  if (trimmed.startsWith('PHN2Zy') || trimmed.startsWith('PD94b')) {
    return `data:image/svg+xml;base64,${trimmed}`;
  }

  // Raw base64 WebP
  if (trimmed.startsWith('UklGR')) {
    return `data:image/webp;base64,${trimmed}`;
  }

  // Valid short relative static path (e.g. '/custom_qr.png')
  if (trimmed.startsWith('/') && trimmed.length < 180) {
    return trimmed;
  }

  return fallback || trimmed;
}

export const DEFAULT_PAYMENT_SETTINGS: SellerPaymentSettings = {
  accountName: repoPaymentSettings.accountName || 'Sahina Shrestha',
  phone: repoPaymentSettings.phone || '9767573721',
  bankName: repoPaymentSettings.bankName || '+9779813028999 (eSewa Direct)',
  branch: repoPaymentSettings.branch || 'Kathmandu, Nepal',
  fonepayQrImage: normalizeQrImageUrl(repoPaymentSettings.fonepayQrImage, ''),
  esewaQrImage: normalizeQrImageUrl(repoPaymentSettings.esewaQrImage, ESEWA_QR_FALLBACK),
  khaltiQrImage: normalizeQrImageUrl(repoPaymentSettings.khaltiQrImage, ''),
  enableEsewa: repoPaymentSettings.enableEsewa ?? true,
  enableFonepay: repoPaymentSettings.enableFonepay ?? false,
  enableKhalti: repoPaymentSettings.enableKhalti ?? false
};

export function getSellerPaymentSettings(): SellerPaymentSettings {
  try {
    const raw = localStorage.getItem('artified_payment_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_PAYMENT_SETTINGS,
        ...parsed,
        accountName: parsed.accountName || DEFAULT_PAYMENT_SETTINGS.accountName,
        phone: parsed.phone || DEFAULT_PAYMENT_SETTINGS.phone,
        bankName: parsed.bankName || DEFAULT_PAYMENT_SETTINGS.bankName,
        branch: parsed.branch || DEFAULT_PAYMENT_SETTINGS.branch,
        fonepayQrImage: normalizeQrImageUrl(parsed.fonepayQrImage, DEFAULT_PAYMENT_SETTINGS.fonepayQrImage || ''),
        esewaQrImage: normalizeQrImageUrl(parsed.esewaQrImage, ESEWA_QR_FALLBACK),
        khaltiQrImage: normalizeQrImageUrl(parsed.khaltiQrImage, DEFAULT_PAYMENT_SETTINGS.khaltiQrImage || ''),
        enableEsewa: parsed.enableEsewa ?? true,
        enableFonepay: parsed.enableFonepay ?? false,
        enableKhalti: parsed.enableKhalti ?? false
      };
    }
  } catch (e) {
    console.warn('Error reading payment settings', e);
  }
  return DEFAULT_PAYMENT_SETTINGS;
}

function safeLocalStorageSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err: any) {
    console.warn(`[localStorage Quota Warning] Could not set "${key}":`, err?.message || err);
    try {
      localStorage.removeItem('artified_custom_workshop_media_v30');
      localStorage.removeItem('artified_deleted_workshop_ids_v12');
      localStorage.setItem(key, value);
    } catch {}
  }
}

export function saveSellerPaymentSettings(settings: SellerPaymentSettings): void {
  try {
    const normalized: SellerPaymentSettings = {
      ...DEFAULT_PAYMENT_SETTINGS,
      ...settings,
      fonepayQrImage: normalizeQrImageUrl(settings.fonepayQrImage, ''),
      esewaQrImage: normalizeQrImageUrl(settings.esewaQrImage, ESEWA_QR_FALLBACK),
      khaltiQrImage: normalizeQrImageUrl(settings.khaltiQrImage, '')
    };

    safeLocalStorageSetItem('artified_payment_settings', JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent('artified_payment_settings_updated', { detail: normalized }));

    // Sync to local repository API if running in dev/studio environment
    fetch('/api/save-payment-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized)
    }).catch(() => {});

    // Asynchronously sync to Firestore cloud collection for cross-device & production domain visibility
    setDoc(doc(db, 'store_settings', 'payment_settings'), normalized, { merge: true }).catch((err) => {
      console.warn('Firestore payment settings sync notice:', err);
    });
  } catch (e) {
    console.warn('Error saving payment settings', e);
  }
}

export async function saveSellerPaymentSettingsAsync(settings: SellerPaymentSettings): Promise<void> {
  const preparedSettings: SellerPaymentSettings = {
    ...DEFAULT_PAYMENT_SETTINGS,
    ...settings,
    fonepayQrImage: normalizeQrImageUrl(settings.fonepayQrImage, ''),
    esewaQrImage: normalizeQrImageUrl(settings.esewaQrImage, ESEWA_QR_FALLBACK),
    khaltiQrImage: normalizeQrImageUrl(settings.khaltiQrImage, '')
  };

  try {
    if (preparedSettings.esewaQrImage && preparedSettings.esewaQrImage.startsWith('data:') && preparedSettings.esewaQrImage.length > 65000) {
      preparedSettings.esewaQrImage = await compressImage(preparedSettings.esewaQrImage, 600, 600, 0.82);
    }
    if (preparedSettings.fonepayQrImage && preparedSettings.fonepayQrImage.startsWith('data:') && preparedSettings.fonepayQrImage.length > 65000) {
      preparedSettings.fonepayQrImage = await compressImage(preparedSettings.fonepayQrImage, 600, 600, 0.82);
    }
    if (preparedSettings.khaltiQrImage && preparedSettings.khaltiQrImage.startsWith('data:') && preparedSettings.khaltiQrImage.length > 65000) {
      preparedSettings.khaltiQrImage = await compressImage(preparedSettings.khaltiQrImage, 600, 600, 0.82);
    }
  } catch (compressErr) {
    console.warn('Compression notice prior to save:', compressErr);
  }

  // 1. Safe local storage save + event dispatch
  safeLocalStorageSetItem('artified_payment_settings', JSON.stringify(preparedSettings));
  window.dispatchEvent(new CustomEvent('artified_payment_settings_updated', { detail: preparedSettings }));

  // 2. Persist to repository files via server API so git deployments to artified.com.np always bundle the latest QR
  try {
    await fetch('/api/save-payment-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preparedSettings)
    });
  } catch {}

  // 3. Always commit to Firestore database 'artified-staging'
  try {
    const docRef = doc(db, 'store_settings', 'payment_settings');
    await setDoc(docRef, preparedSettings, { merge: true });
    console.info('✅ Successfully committed payment settings & QR code to Firestore (artified-staging)!');
  } catch (e) {
    console.error('Error committing payment settings to Firestore:', e);
    throw e;
  }
}

export async function fetchPaymentSettingsFromServer(): Promise<SellerPaymentSettings> {
  const local = getSellerPaymentSettings();
  try {
    const docRef = doc(db, 'store_settings', 'payment_settings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as SellerPaymentSettings;
      const merged: SellerPaymentSettings = {
        ...DEFAULT_PAYMENT_SETTINGS,
        ...local,
        ...data,
        accountName: data.accountName || local.accountName || DEFAULT_PAYMENT_SETTINGS.accountName,
        phone: data.phone || local.phone || DEFAULT_PAYMENT_SETTINGS.phone,
        bankName: data.bankName || local.bankName || DEFAULT_PAYMENT_SETTINGS.bankName,
        branch: data.branch || local.branch || DEFAULT_PAYMENT_SETTINGS.branch,
        fonepayQrImage: normalizeQrImageUrl(data.fonepayQrImage || local.fonepayQrImage, ''),
        esewaQrImage: normalizeQrImageUrl(data.esewaQrImage || local.esewaQrImage, ESEWA_QR_FALLBACK),
        khaltiQrImage: normalizeQrImageUrl(data.khaltiQrImage || local.khaltiQrImage, ''),
        enableEsewa: data.enableEsewa ?? local.enableEsewa ?? true,
        enableFonepay: data.enableFonepay ?? local.enableFonepay ?? false,
        enableKhalti: data.enableKhalti ?? local.enableKhalti ?? false
      };
      safeLocalStorageSetItem('artified_payment_settings', JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('artified_payment_settings_updated', { detail: merged }));
      return merged;
    }
  } catch (e) {
    console.warn('Error fetching payment settings from cloud:', e);
  }
  return local;
}
