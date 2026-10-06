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
      return { ...DEFAULT_PAYMENT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Error reading payment settings', e);
  }
  return DEFAULT_PAYMENT_SETTINGS;
}

export function saveSellerPaymentSettings(settings: SellerPaymentSettings): void {
  try {
    localStorage.setItem('artified_payment_settings', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('artified_payment_settings_updated', { detail: settings }));
  } catch (e) {
    console.warn('Error saving payment settings', e);
  }
}
