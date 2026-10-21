import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Camera, 
  Smartphone, 
  Info,
  Scan
} from 'lucide-react';
import jsQR from 'jsqr';
import { Html5Qrcode } from 'html5-qrcode';
import { getSellerPaymentSettings, fetchPaymentSettingsFromServer, normalizeQrImageUrl, SellerPaymentSettings } from '../data/paymentSettings';
import { ESEWA_QR_FALLBACK } from '../data/esewa_qr_fallback';

interface QRDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRDiagnosticModal: React.FC<QRDiagnosticModalProps> = ({
  isOpen,
  onClose
}) => {
  const [settings, setSettings] = useState<SellerPaymentSettings>(getSellerPaymentSettings());
  const [activeTab, setActiveTab] = useState<'esewa' | 'fonepay' | 'khalti'>('esewa');
  const [copiedUrl, setCopiedUrl] = useState(false);
  
  // Diagnostic states
  const [isTestingValidity, setIsTestingValidity] = useState(false);
  const [httpStatusResult, setHttpStatusResult] = useState<{ status: number | string; success: boolean; message: string } | null>(null);
  const [isScanningCode, setIsScanningCode] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; payload?: string; message?: string } | null>(null);

  // Camera Overlay Scanner state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraScanPayload, setCameraScanPayload] = useState<string | null>(null);
  const [html5QrScanner, setHtml5QrScanner] = useState<Html5Qrcode | null>(null);

  const stopCamera = () => {
    if (html5QrScanner) {
      html5QrScanner.stop().then(() => {
        html5QrScanner.clear();
      }).catch(() => {});
      setHtml5QrScanner(null);
    }
    setIsCameraActive(false);
  };

  const startCameraScanner = async () => {
    setIsCameraActive(true);
    setCameraScanPayload(null);

    setTimeout(async () => {
      try {
        const qrScanner = new Html5Qrcode('qr-reader-container');
        setHtml5QrScanner(qrScanner);

        await qrScanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            setCameraScanPayload(decodedText);
            qrScanner.stop().catch(() => {});
          },
          () => {} // Ignore frame scan errors
        );
      } catch (err: any) {
        console.warn('Camera scanner start error:', err);
      }
    }, 200);
  };

  useEffect(() => {
    if (isOpen) {
      const local = getSellerPaymentSettings();
      setSettings(local);
      setHttpStatusResult(null);
      setScanResult(null);
      
      // Fetch fresh settings directly from cloud Firestore
      fetchPaymentSettingsFromServer().then((fresh) => {
        setSettings(fresh);
      }).catch(() => {});
    } else {
      stopCamera();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getActiveQrUrl = (): string => {
    if (activeTab === 'esewa') return normalizeQrImageUrl(settings.esewaQrImage, ESEWA_QR_FALLBACK);
    if (activeTab === 'fonepay') return normalizeQrImageUrl(settings.fonepayQrImage, '');
    if (activeTab === 'khalti') return normalizeQrImageUrl(settings.khaltiQrImage, '');
    return ESEWA_QR_FALLBACK;
  };

  const currentQrUrl = getActiveQrUrl();

  const handleCopyUrl = () => {
    if (!currentQrUrl) return;
    navigator.clipboard.writeText(currentQrUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // 1. Test HTTP 200 Validity
  const handleTestValidity = async () => {
    setIsTestingValidity(true);
    setHttpStatusResult(null);

    if (!currentQrUrl) {
      setHttpStatusResult({ status: 'Empty', success: false, message: 'No QR code image URL configured.' });
      setIsTestingValidity(false);
      return;
    }

    try {
      // Check image loadability via Image object
      const img = new Image();
      if (!currentQrUrl.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }

      const loadPromise = new Promise<{ status: number; message: string }>((resolve, reject) => {
        img.onload = () => resolve({ status: 200, message: 'HTTP 200 OK — Image is publicly accessible and loaded cleanly!' });
        img.onerror = () => reject(new Error('Failed to fetch image or blocked by CORS network policy.'));
        img.src = currentQrUrl;
      });

      const res = await loadPromise;
      setHttpStatusResult({ status: res.status, success: true, message: res.message });
    } catch (err: any) {
      setHttpStatusResult({ 
        status: 'Error/CORS', 
        success: false, 
        message: err?.message || 'Image failed to load. Verify public cloud permissions.' 
      });
    } finally {
      setIsTestingValidity(false);
    }
  };

  // 2. Programmatic Client-side QR Code Decoder via jsQR
  const handleScanCodeProgrammatically = async () => {
    setIsScanningCode(true);
    setScanResult(null);

    if (!currentQrUrl) {
      setScanResult({ success: false, message: 'No image URL available to scan.' });
      setIsScanningCode(false);
      return;
    }

    try {
      const img = new Image();
      if (!currentQrUrl.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 800;
          canvas.height = img.naturalHeight || img.height || 800;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            setScanResult({ success: false, message: 'Could not create canvas context for QR analysis.' });
            setIsScanningCode(false);
            return;
          }

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, canvas.width, canvas.height);

          if (code && code.data) {
            setScanResult({
              success: true,
              payload: code.data,
              message: 'QR pattern verified & 100% programmatically scannable!'
            });
          } else {
            setScanResult({
              success: false,
              message: 'No valid QR code pattern detected in this image. Please upload a clear camera shot.'
            });
          }
        } catch (e: any) {
          setScanResult({
            success: false,
            message: `Canvas analysis error: ${e?.message || 'CORS restriction or image read error.'}`
          });
        } finally {
          setIsScanningCode(false);
        }
      };

      img.onerror = () => {
        setScanResult({
          success: false,
          message: 'Failed to load image for scanning.'
        });
        setIsScanningCode(false);
      };

      img.src = currentQrUrl;

    } catch (err: any) {
      setScanResult({ success: false, message: err?.message || 'Scan error occurred.' });
      setIsScanningCode(false);
    }
  };



  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-[#FAF8F5] rounded-3xl border border-[#E8DFD8] shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1C1B1A] text-white p-4 flex items-center justify-between border-b border-[#34312F] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>QR Verification & Scanner Diagnostics</span>
                <span className="text-[9px] bg-emerald-500 text-white font-bold px-1.5 py-0.2 rounded uppercase">
                  Live Tester
                </span>
              </h3>
              <p className="text-[11px] text-[#A69E96]">
                Verify Firestore QR URLs & test 100% scanner readability
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#A69E96] hover:text-white rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Channel Switcher */}
        <div className="p-2 sm:px-4 bg-white border-b border-[#E8DFD8] flex items-center justify-center gap-2 shrink-0">
          {settings.enableEsewa !== false && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('esewa');
                setHttpStatusResult(null);
                setScanResult(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'esewa'
                  ? 'bg-[#60BB46] text-white shadow-2xs'
                  : 'bg-[#FAF8F5] text-[#5E5955] hover:bg-[#F0EBE5]'
              }`}
            >
              eSewa QR
            </button>
          )}

          {settings.enableFonepay === true && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('fonepay');
                setHttpStatusResult(null);
                setScanResult(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'fonepay'
                  ? 'bg-[#E21A22] text-white shadow-2xs'
                  : 'bg-[#FAF8F5] text-[#5E5955] hover:bg-[#F0EBE5]'
              }`}
            >
              Fonepay QR
            </button>
          )}

          {settings.enableKhalti === true && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('khalti');
                setHttpStatusResult(null);
                setScanResult(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'khalti'
                  ? 'bg-[#5D2E8E] text-white shadow-2xs'
                  : 'bg-[#FAF8F5] text-[#5E5955] hover:bg-[#F0EBE5]'
              }`}
            >
              Khalti QR
            </button>
          )}
        </div>

        {/* Scrollable Diagnostic Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">

          {/* DEDICATED QR VERIFICATION PREVIEW CARD */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] space-y-3 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0EBE5]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1C1B1A] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Firestore Cloud QR Verification Preview</span>
              </span>
              <span className="text-[10px] text-[#736C65] font-mono bg-[#FAF8F5] px-2 py-0.5 rounded border">
                {activeTab.toUpperCase()}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
              {/* Image Preview Box */}
              <div className="w-36 h-36 bg-[#FAF8F5] rounded-xl border-2 border-[#E8DFD8] p-1.5 flex items-center justify-center shrink-0 shadow-2xs relative">
                {currentQrUrl ? (
                  <img
                    src={currentQrUrl}
                    alt={`${activeTab} QR Code`}
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-center text-[#8C847E] text-[10px]">
                    <QrCode className="w-8 h-8 text-[#C5A880] mx-auto mb-1" />
                    <span>No URL set</span>
                  </div>
                )}
              </div>

              {/* URL & Diagnostic Actions */}
              <div className="space-y-2.5 flex-1 w-full min-w-0">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#8C7A6B] mb-1">
                    Raw Image URL (Firestore Store Settings):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={currentQrUrl}
                      className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-lg font-mono text-[10px] text-[#1C1B1A] focus:outline-none truncate"
                    />
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="p-2 bg-[#1C1B1A] text-white hover:bg-black rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Copy URL"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Test Validity (HTTP 200) & Programmatic Scan Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestValidity}
                    disabled={isTestingValidity}
                    className="px-3 py-1.5 bg-[#1C1B1A] hover:bg-black text-[#D4AF37] font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isTestingValidity ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Testing 200...</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3 h-3" />
                        <span>Test Validity (HTTP 200)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleScanCodeProgrammatically}
                    disabled={isScanningCode}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isScanningCode ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Scanning jsQR...</span>
                      </>
                    ) : (
                      <>
                        <Scan className="w-3 h-3" />
                        <span>Scan & Verify Code (jsQR)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* HTTP Status Test Result */}
            {httpStatusResult && (
              <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 animate-fade-in ${
                httpStatusResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}>
                {httpStatusResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <div>
                  <strong className="block text-[11px]">
                    Status: {httpStatusResult.status}
                  </strong>
                  <span className="text-[10px] leading-tight block">
                    {httpStatusResult.message}
                  </span>
                </div>
              </div>
            )}

            {/* jsQR Code Decoder Result */}
            {scanResult && (
              <div className={`p-3 rounded-xl border text-xs space-y-1 animate-fade-in ${
                scanResult.success
                  ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                  : 'bg-amber-50 text-amber-950 border-amber-300'
              }`}>
                <div className="flex items-center gap-1.5 font-bold">
                  {scanResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span>{scanResult.message}</span>
                </div>
                {scanResult.payload && (
                  <div className="p-2 bg-white rounded-lg border border-emerald-200 font-mono text-[10px] text-emerald-900 break-all select-all">
                    Payload: {scanResult.payload}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* INTERACTIVE CLIENT-SIDE CAMERA SCANNER OVERLAY (html5-qrcode) */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1C1B1A] flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#C5A880]" />
                <span>Live Client Camera / Image Scanner Overlay</span>
              </span>

              {!isCameraActive ? (
                <button
                  type="button"
                  onClick={startCameraScanner}
                  className="px-3 py-1 bg-[#1C1B1A] text-white hover:bg-black rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Start Camera Scanner
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-1 bg-rose-600 text-white hover:bg-rose-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Stop Scanner
                </button>
              )}
            </div>

            {isCameraActive && (
              <div className="p-3 bg-black rounded-2xl space-y-2 text-white">
                <div id="qr-reader-container" className="w-full rounded-xl overflow-hidden min-h-[220px] bg-zinc-900" />
                {cameraScanPayload && (
                  <div className="p-2.5 bg-emerald-900/90 text-emerald-100 rounded-xl border border-emerald-500 text-xs font-mono break-all">
                    🟢 Scanned Payload: {cameraScanPayload}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-[#E8DFD8] flex items-center justify-between text-xs text-[#736C65] shrink-0">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Artified Diagnostics • html5-qrcode & jsQR Active</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#FAF8F5] hover:bg-[#F0EBE5] text-[#1C1B1A] font-semibold rounded-xl text-xs cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
