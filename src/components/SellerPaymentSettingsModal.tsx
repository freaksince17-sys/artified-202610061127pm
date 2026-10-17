import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  Save, 
  Upload, 
  Check, 
  Info, 
  ShieldCheck, 
  Sparkles,
  Smartphone,
  CreditCard,
  Building,
  RefreshCw
} from 'lucide-react';
import { 
  getSellerPaymentSettings, 
  saveSellerPaymentSettings, 
  saveSellerPaymentSettingsAsync,
  fetchPaymentSettingsFromServer,
  SellerPaymentSettings 
} from '../data/paymentSettings';
import { storage } from '../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../utils/imageCompressor';

import jsQR from 'jsqr';

interface SellerPaymentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SellerPaymentSettingsModal: React.FC<SellerPaymentSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [settings, setSettings] = useState<SellerPaymentSettings>(getSellerPaymentSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [qualityNotice, setQualityNotice] = useState<{ type: 'success' | 'warning'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const currentLocal = getSellerPaymentSettings();
      setSettings(currentLocal);
      setSavedSuccess(false);
      setQualityNotice(null);
      // Fetch fresh payment settings from cloud Firestore
      fetchPaymentSettingsFromServer().then((fresh) => {
        setSettings(fresh);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveSellerPaymentSettingsAsync(settings);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error saving payment settings:', err);
      alert('Error committing settings to cloud. Local settings saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (
    key: 'fonepayQrImage' | 'esewaQrImage' | 'khaltiQrImage',
    file: File | undefined
  ) => {
    if (!file) return;

    setIsUploading(true);
    setQualityNotice(null);
    setUploadProgressText('Processing high-definition QR image...');
    try {
      console.log(`[QR Upload] Processing selected file for ${key}: name=${file.name}, size=${file.size}B, type=${file.type}`);
      
      // 1. Compress image to crystal-clear 1200px resolution (0.92 quality) for 100% scanner accuracy
      const compressedDataUrl = await compressImage(file, 1200, 1200, 0.92);
      console.log(`[QR Upload] High-definition compressed QR generated for ${key}, length=${compressedDataUrl.length}`);
      
      // 1.5 Client-side jsQR readability & contrast verification test
      try {
        const img = new Image();
        img.src = compressedDataUrl;
        await new Promise((res) => { img.onload = res; img.onerror = res; });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 800;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, canvas.width, canvas.height);
          if (code && code.data) {
            setQualityNotice({
              type: 'success',
              message: `🟢 100% Scannable QR Verified! Payload: ${code.data}`
            });
          } else {
            setQualityNotice({
              type: 'warning',
              message: '⚠️ Low Contrast or Unreadable Image Warning: Our scanner could not detect QR data in this photo. Please upload a higher-contrast, well-lit photo of your QR code!'
            });
          }
        }
      } catch (e) {
        console.warn('QR scan check notice:', e);
      }

      // 2. Instantly update form state AND commit to local/cloud storage so QR is never lost
      const instantSettings = { ...settings, [key]: compressedDataUrl };
      setSettings(instantSettings);
      saveSellerPaymentSettings(instantSettings);

      // 3. Attempt uploading to Firebase Storage CDN for cloud URL
      setUploadProgressText('Uploading to Firebase Storage CDN...');
      try {
        const storagePath = `qr_codes/${key}_${Date.now()}.jpg`;
        const storageRef = ref(storage, storagePath);
        
        const uploadTask = uploadString(storageRef, compressedDataUrl, 'data_url');
        const timeoutTask = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Firebase Storage upload timed out after 6s')), 6000)
        );

        await Promise.race([uploadTask, timeoutTask]);
        const cloudDownloadUrl = await getDownloadURL(storageRef);
        console.log(`[QR Upload] ✅ Firebase Storage download URL obtained for ${key}:`, cloudDownloadUrl);

        // Update settings with permanent Firebase Storage public download URL & commit
        const cloudSettings = { ...instantSettings, [key]: cloudDownloadUrl };
        setSettings(cloudSettings);
        await saveSellerPaymentSettingsAsync(cloudSettings);
      } catch (storageErr) {
        console.warn(`[QR Upload] Notice: Cloud storage upload fallback, using persistent local base64:`, storageErr);
      }

    } catch (error) {
      console.error("[QR Upload] Error processing file:", error);
      alert("Failed to process QR code file. Please try selecting a valid image file.");
    } finally {
      setIsUploading(false);
      setUploadProgressText(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-[#FAF8F5] rounded-3xl border border-[#E8DFD8] shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1C1B1A] text-white p-4 flex items-center justify-between border-b border-[#34312F] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>Personal QR & Payment Setup</span>
                <span className="text-[9px] bg-[#D4AF37] text-[#1C1B1A] font-bold px-1.5 py-0.2 rounded">
                  100% Free
                </span>
              </h3>
              <p className="text-[11px] text-[#A69E96]">
                Configure Sahina Shrestha's QR codes with 0% transaction commission
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#A69E96] hover:text-white rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Free Operations Notice */}
        <div className="p-3 bg-amber-50 border-b border-amber-200/70 text-xs text-amber-900 flex items-start gap-2 shrink-0">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Zero Fees Guarantee:</strong> Official merchant gateway APIs charge 1.5% to 3% on every sale. Using Sahina Shrestha's personal QR (Fonepay, eSewa, Khalti) is completely free, and customers can pay from all Nepali banking apps!
          </p>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Account Details Box */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#E8DFD8] space-y-3 shadow-2xs">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1B1A] flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Personal Receiving Account Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#1C1B1A] mb-1">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  required
                  value={settings.accountName}
                  onChange={(e) => setSettings({ ...settings, accountName: e.target.value })}
                  placeholder="Sahina Shrestha"
                  className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-lg text-xs font-medium text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1C1B1A] mb-1">
                  Mobile / eSewa / Khalti ID *
                </label>
                <div className="relative">
                  <Smartphone className="w-3.5 h-3.5 text-[#8C847E] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    placeholder="9767573721"
                    className="w-full pl-8 pr-2.5 py-1.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-lg text-xs font-mono text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#1C1B1A] mb-1">
                  Bank / Network Name
                </label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 text-[#8C847E] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={settings.bankName}
                    onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                    placeholder="Global IME Bank (Fonepay Network)"
                    className="w-full pl-8 pr-2.5 py-1.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-lg text-xs text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1C1B1A] mb-1">
                  Branch / Location
                </label>
                <input
                  type="text"
                  value={settings.branch}
                  onChange={(e) => setSettings({ ...settings, branch: e.target.value })}
                  placeholder="Kathmandu, Nepal"
                  className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-lg text-xs text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
                />
              </div>
            </div>
          </div>

          {/* QR Codes Upload / Configuration Box */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#E8DFD8] space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1B1A] flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Upload QR Codes (Optional - Plug in whenever ready)</span>
              </h4>
              <span className="text-[10px] text-[#736C65]">Can be added later</span>
            </div>

            <p className="text-[11px] text-[#736C65] leading-relaxed">
              When you download your QR screenshot from your banking app, eSewa, or Khalti, upload or paste it here. Until then, our elegant branded QR placeholder is active.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Fonepay QR */}
              <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8DFD8] flex flex-col items-center gap-2 text-center">
                <span className="text-[10px] font-bold text-[#E21A22] uppercase tracking-wider">
                  Fonepay / Bank QR
                </span>
                {settings.fonepayQrImage ? (
                  <img
                    src={settings.fonepayQrImage}
                    alt="Fonepay QR"
                    className="w-24 h-24 object-contain rounded-lg border border-[#E8DFD8] bg-white p-1"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg border border-dashed border-[#C5A880] flex flex-col items-center justify-center p-2 text-center bg-white text-[10px] text-[#8C847E]">
                    <QrCode className="w-6 h-6 text-[#C5A880] mb-1" />
                    <span>No QR yet</span>
                  </div>
                )}
                <label className="cursor-pointer px-2 py-1 bg-white border border-[#E8DFD8] hover:border-[#C5A880] rounded text-[10px] font-semibold text-[#1C1B1A] flex items-center gap-1">
                  <Upload className="w-2.5 h-2.5" />
                  <span>Upload QR</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload('fonepayQrImage', e.target.files?.[0])}
                  />
                </label>
              </div>

              {/* 2. eSewa QR */}
              <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8DFD8] flex flex-col items-center gap-2 text-center">
                <span className="text-[10px] font-bold text-[#60BB46] uppercase tracking-wider">
                  eSewa QR
                </span>
                {settings.esewaQrImage ? (
                  <img
                    src={settings.esewaQrImage}
                    alt="eSewa QR"
                    className="w-24 h-24 object-contain rounded-lg border border-[#E8DFD8] bg-white p-1"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg border border-dashed border-[#60BB46]/50 flex flex-col items-center justify-center p-2 text-center bg-white text-[10px] text-[#8C847E]">
                    <div className="w-6 h-6 rounded-full bg-[#60BB46] text-white flex items-center justify-center font-bold text-xs mb-1">
                      e
                    </div>
                    <span>No QR yet</span>
                  </div>
                )}
                <label className="cursor-pointer px-2 py-1 bg-white border border-[#E8DFD8] hover:border-[#60BB46] rounded text-[10px] font-semibold text-[#1C1B1A] flex items-center gap-1">
                  <Upload className="w-2.5 h-2.5" />
                  <span>Upload QR</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload('esewaQrImage', e.target.files?.[0])}
                  />
                </label>
              </div>

              {/* 3. Khalti QR */}
              <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8DFD8] flex flex-col items-center gap-2 text-center">
                <span className="text-[10px] font-bold text-[#5D2E8E] uppercase tracking-wider">
                  Khalti QR
                </span>
                {settings.khaltiQrImage ? (
                  <img
                    src={settings.khaltiQrImage}
                    alt="Khalti QR"
                    className="w-24 h-24 object-contain rounded-lg border border-[#E8DFD8] bg-white p-1"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg border border-dashed border-[#5D2E8E]/50 flex flex-col items-center justify-center p-2 text-center bg-white text-[10px] text-[#8C847E]">
                    <div className="w-6 h-6 rounded-full bg-[#5D2E8E] text-white flex items-center justify-center font-bold text-xs mb-1">
                      K
                    </div>
                    <span>No QR yet</span>
                  </div>
                )}
                <label className="cursor-pointer px-2 py-1 bg-white border border-[#E8DFD8] hover:border-[#5D2E8E] rounded text-[10px] font-semibold text-[#1C1B1A] flex items-center gap-1">
                  <Upload className="w-2.5 h-2.5" />
                  <span>Upload QR</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload('khaltiQrImage', e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* QR Readability & Contrast Verification Notice */}
          {qualityNotice && (
            <div className={`p-3 rounded-2xl border text-xs font-medium space-y-1 animate-fade-in ${
              qualityNotice.type === 'success' 
                ? 'bg-emerald-50 text-emerald-950 border-emerald-300' 
                : 'bg-amber-50 text-amber-950 border-amber-300'
            }`}>
              <div className="flex items-start gap-2">
                <ShieldCheck className={`w-4 h-4 shrink-0 mt-0.5 ${
                  qualityNotice.type === 'success' ? 'text-emerald-600' : 'text-amber-600'
                }`} />
                <span className="leading-relaxed">{qualityNotice.message}</span>
              </div>
            </div>
          )}

          {/* Upload / Save Progress Indicator Banner */}
          {(uploadProgressText || isUploading || isSaving) && (
            <div className="p-2.5 bg-[#1C1B1A] text-[#D4AF37] text-[11px] font-semibold rounded-xl flex items-center justify-between gap-2 border border-[#D4AF37]/30 shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                <span>{uploadProgressText || (isSaving ? 'Committing QR & Settings to Firestore...' : 'Uploading QR Code...')}</span>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-[#A69E96]">Auto-Syncing</span>
            </div>
          )}

          {/* Footer Save Button */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#FAF8F5] hover:bg-[#E8DFD8] text-[#1C1B1A] font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isUploading || isSaving}
              className={`px-5 py-2 bg-[#1C1B1A] ${(isUploading || isSaving) ? 'opacity-70 cursor-not-allowed' : 'hover:bg-black'} text-[#D4AF37] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer`}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading QR...</span>
                </>
              ) : isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Saving to Cloud...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved Live to Firestore!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save QR Settings</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
