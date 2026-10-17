import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { safeSetDoc as setDoc } from '../utils/safeFirestore';
import { compressImage } from '../utils/imageCompressor';

export interface SellerPaymentSettings {
  accountName: string;
  phone: string;
  bankName: string;
  branch: string;
  fonepayQrImage?: string;
  esewaQrImage?: string;
  khaltiQrImage?: string;
}

export const DEFAULT_PAYMENT_SETTINGS: SellerPaymentSettings = {
  accountName: 'Sahina Shrestha',
  phone: '9767573721',
  bankName: 'Global IME Bank (Fonepay Network)',
  branch: 'Kathmandu, Nepal',
  fonepayQrImage: '',
  esewaQrImage: '',
  khaltiQrImage: ''
};

export function getSellerPaymentSettings(): SellerPaymentSettings {
  try {
    const raw = localStorage.getItem('artified_payment_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { 
        ...DEFAULT_PAYMENT_SETTINGS, 
        ...parsed
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
      // Purge non-essential legacy cache items to free up space
      localStorage.removeItem('artified_custom_workshop_media_v30');
      localStorage.removeItem('artified_deleted_workshop_ids_v12');
      localStorage.setItem(key, value);
    } catch {}
  }
}

export function saveSellerPaymentSettings(settings: SellerPaymentSettings): void {
  try {
    safeLocalStorageSetItem('artified_payment_settings', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('artified_payment_settings_updated', { detail: settings }));
    
    // Asynchronously sync to Firestore cloud collection for cross-device visibility
    setDoc(doc(db, 'store_settings', 'payment_settings'), settings, { merge: true }).catch((err) => {
      console.warn('Firestore payment settings sync notice:', err);
    });
  } catch (e) {
    console.warn('Error saving payment settings', e);
  }
}

export async function saveSellerPaymentSettingsAsync(settings: SellerPaymentSettings): Promise<void> {
  // 1. Prepare lightweight settings object (compress any raw base64 data URLs >50KB)
  const preparedSettings: SellerPaymentSettings = { ...settings };

  try {
    if (preparedSettings.esewaQrImage && preparedSettings.esewaQrImage.startsWith('data:') && preparedSettings.esewaQrImage.length > 50000) {
      preparedSettings.esewaQrImage = await compressImage(preparedSettings.esewaQrImage, 500, 500, 0.75);
    }
    if (preparedSettings.fonepayQrImage && preparedSettings.fonepayQrImage.startsWith('data:') && preparedSettings.fonepayQrImage.length > 50000) {
      preparedSettings.fonepayQrImage = await compressImage(preparedSettings.fonepayQrImage, 500, 500, 0.75);
    }
    if (preparedSettings.khaltiQrImage && preparedSettings.khaltiQrImage.startsWith('data:') && preparedSettings.khaltiQrImage.length > 50000) {
      preparedSettings.khaltiQrImage = await compressImage(preparedSettings.khaltiQrImage, 500, 500, 0.75);
    }
  } catch (compressErr) {
    console.warn('Compression notice prior to save:', compressErr);
  }

  // 2. Safe local storage save + event dispatch
  safeLocalStorageSetItem('artified_payment_settings', JSON.stringify(preparedSettings));
  window.dispatchEvent(new CustomEvent('artified_payment_settings_updated', { detail: preparedSettings }));

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
      // Merge: cloud data takes precedence, but fallback to local if cloud field is missing
      const merged: SellerPaymentSettings = {
        ...DEFAULT_PAYMENT_SETTINGS,
        ...local,
        ...data,
        fonepayQrImage: data.fonepayQrImage || local.fonepayQrImage || '',
        esewaQrImage: data.esewaQrImage || local.esewaQrImage || '',
        khaltiQrImage: data.khaltiQrImage || local.khaltiQrImage || ''
      };
      localStorage.setItem('artified_payment_settings', JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('artified_payment_settings_updated', { detail: merged }));
      return merged;
    }
  } catch (e) {
    console.warn('Error fetching payment settings from cloud:', e);
  }
  return local;
}
