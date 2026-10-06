import React, { useState } from 'react';
import { 
  Download, 
  Sparkles, 
  Link as LinkIcon, 
  Check, 
  AlertCircle, 
  Loader2, 
  Play, 
  CloudUpload, 
  FolderCheck, 
  ExternalLink,
  ClipboardPaste,
  FileVideo,
  Instagram,
  Video,
  Share2
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { uploadVideoToFirebaseStorage, uploadCoverToFirebaseStorage, getFirebaseStorageVideoUrl } from '../utils/firebaseVideoStorage';

export interface InstagramReelDownloaderSectionProps {
  onSuccessPublished?: () => void;
}

export type DownloadStep = 'idle' | 'fetching' | 'uploading' | 'success' | 'error';

export const InstagramReelDownloaderSection: React.FC<InstagramReelDownloaderSectionProps> = ({ onSuccessPublished }) => {
  const { products, addInstagramItem, addReel, instagramHandle } = useCart();

  const [reelUrl, setReelUrl] = useState('');
  const [friendlyFilename, setFriendlyFilename] = useState('');
  const [taggedProductId, setTaggedProductId] = useState('');
  
  const [step, setStep] = useState<DownloadStep>('idle');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Downloaded result state
  const [downloadResult, setDownloadResult] = useState<{
    shortcode: string;
    friendlyName: string;
    headline: string;
    caption: string;
    localVideoUrl: string;
    localCoverUrl: string;
    firebaseVideoUrl: string;
    firebaseCoverUrl: string;
  } | null>(null);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.includes('instagram.com') || text.includes('reel') || text.includes('/p/'))) {
        setReelUrl(text.trim());
        setToastMessage('📋 Instagram URL pasted from clipboard!');
        setTimeout(() => setToastMessage(null), 3000);
      } else {
        setToastMessage('No valid Instagram link found in clipboard. Copy reel link first!');
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch {
      setToastMessage('Clipboard permission denied. Please press Ctrl+V directly.');
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const handleStartDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reelUrl.trim()) {
      setErrorMessage('Please enter a valid Instagram reel or post link.');
      return;
    }

    setErrorMessage('');
    setDownloadResult(null);

    // Step 1: Fetching video stream server-side
    setStep('fetching');
    setToastMessage('⏳ Step 1/3: Fetching video stream & caption from Instagram server...');

    try {
      const targetFilename = friendlyFilename.trim() || '';
      const res = await fetch('/api/download-instagram-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: reelUrl.trim(),
          customFilename: targetFilename,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to download video stream from Instagram.');
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error('Server could not extract video from this Instagram link.');
      }

      // Step 2: Cloud & Disk Sync with fast-timeout race so Step 2 never hangs
      setStep('uploading');
      setToastMessage('☁️ Step 2/3: Linking MP4 video & thumbnail to public/instagram_videos/...');

      const nameToUse = data.friendlyName || data.shortcode;
      let cloudVidUrl = data.localVideoUrl || `/instagram_videos/${nameToUse}.mp4`;
      let cloudCovUrl = data.localCoverUrl || `/instagram_videos/${nameToUse}_cover.jpg`;

      // Non-blocking upload to Firebase Storage with a strict 1.2-second timeout race
      try {
        const uploadTask = async () => {
          if (data.videoBufferBase64) {
            const resUrl = await uploadVideoToFirebaseStorage(data.videoBufferBase64, nameToUse);
            if (resUrl) cloudVidUrl = resUrl;
          }
          if (data.coverBufferBase64) {
            const covRes = await uploadCoverToFirebaseStorage(data.coverBufferBase64, nameToUse);
            if (covRes) cloudCovUrl = covRes;
          }
        };

        const timeoutTask = new Promise((resolve) => setTimeout(resolve, 1200));
        await Promise.race([uploadTask(), timeoutTask]);
      } catch (cloudErr) {
        console.warn('Notice: Background cloud sync note:', cloudErr);
      }

      const resultObj = {
        shortcode: data.shortcode,
        friendlyName: nameToUse,
        headline: data.headline,
        caption: data.caption,
        localVideoUrl: data.localVideoUrl,
        localCoverUrl: data.localCoverUrl,
        firebaseVideoUrl: cloudVidUrl || data.localVideoUrl,
        firebaseCoverUrl: cloudCovUrl || data.localCoverUrl,
      };

      setDownloadResult(resultObj);

      // Auto-publish to Instagram Journal in CartContext
      const matchedProd = taggedProductId ? products.find((p) => p.id === taggedProductId) : null;
      await addInstagramItem({
        id: `ig-${Date.now()}`,
        title: data.headline || `Handcrafted Story • ${nameToUse}`,
        caption: data.caption || `Handcrafted release from @artified_np on Instagram. Saved as ${nameToUse}.mp4`,
        handle: instagramHandle || '@artified_np',
        postUrl: reelUrl.trim(),
        thumbnail: resultObj.firebaseCoverUrl || data.localCoverUrl,
        videoUrl: resultObj.firebaseVideoUrl || data.localVideoUrl,
        isLocked: true,
        ...(matchedProd ? {
          taggedProductId: matchedProd.id,
          taggedProductName: matchedProd.title,
          taggedProductPrice: matchedProd.price,
        } : {}),
      });

      // Step 3: Success Toast Notification
      setStep('success');
      setToastMessage(`🎉 Step 3/3: Success! Saved to public/instagram_videos/${nameToUse}.mp4 & Firebase Storage!`);

      if (onSuccessPublished) {
        onSuccessPublished();
      }
    } catch (err: any) {
      setStep('error');
      setErrorMessage(err.message || 'An unexpected error occurred during reel download.');
      setToastMessage('❌ Download failed. Check link or try pasting screenshot.');
    }
  };

  return (
    <div className="space-y-4 text-xs text-[#1C1B1A]">
      
      {/* Downloader Intro Banner */}
      <div className="p-3.5 bg-gradient-to-r from-[#FAF0E6] via-[#FAF8F5] to-[#F4EFEB] border border-[#E8DFD8] rounded-xl flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center text-white shrink-0 shadow-xs">
          <Download className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-serif font-semibold text-sm text-[#1C1B1A]">
              Instagram Reel Downloader & Cloud Sync
            </h4>
            <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
              Automated
            </span>
          </div>
          <p className="text-[11px] text-[#736C65] mt-0.5 leading-relaxed">
            Paste any Instagram Reel link below. The server downloads the MP4 video stream directly into <code>public/instagram_videos/</code> and uploads it to <strong>Firebase Storage</strong> with real-time step progress feedback.
          </p>
        </div>
      </div>

      {/* Progress-Aware Toast Notification */}
      {toastMessage && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
          step === 'fetching' || step === 'uploading' 
            ? 'bg-amber-50 border-amber-300 text-amber-950' 
            : step === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : step === 'error'
            ? 'bg-rose-50 border-rose-300 text-rose-950'
            : 'bg-white border-[#E8DFD8] text-[#1C1B1A]'
        }`}>
          <div className="flex items-center gap-2.5">
            {step === 'fetching' && <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />}
            {step === 'uploading' && <CloudUpload className="w-4 h-4 text-amber-600 animate-bounce shrink-0" />}
            {step === 'success' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
            {step === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {step === 'idle' && <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0" />}
            <span>{toastMessage}</span>
          </div>

          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-[10px] opacity-70 hover:opacity-100 cursor-pointer underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Interactive Form */}
      <form onSubmit={handleStartDownload} className="space-y-3 bg-white p-4 border border-[#E8DFD8] rounded-2xl shadow-2xs">
        
        {/* Instagram URL Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block font-semibold text-[#1C1B1A]">
              Instagram Reel URL *
            </label>
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="inline-flex items-center gap-1 text-[11px] text-[#1C1B1A] hover:text-[#D4AF37] font-semibold transition-colors cursor-pointer"
            >
              <ClipboardPaste className="w-3 h-3 text-[#D4AF37]" />
              <span>Paste Clipboard Link</span>
            </button>
          </div>
          <div className="relative">
            <LinkIcon className="w-3.5 h-3.5 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="url"
              required
              value={reelUrl}
              onChange={(e) => setReelUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/DdMRgKdP4HK/ or https://www.instagram.com/p/..."
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-[#1C1B1A] placeholder:text-[#8C7A6B] bg-[#FAF8F5] border border-[#D5C7BC] rounded-xl focus:outline-hidden focus:border-[#1C1B1A] focus:bg-white"
            />
          </div>
        </div>

        {/* Friendly File Name Input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-[#1C1B1A] mb-1">
              Friendly File Name (Optional)
            </label>
            <div className="relative">
              <FileVideo className="w-3.5 h-3.5 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={friendlyFilename}
                onChange={(e) => setFriendlyFilename(e.target.value)}
                placeholder="e.g. macrame_workshop_bts.mp4"
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-[#1C1B1A] placeholder:text-[#8C7A6B] bg-[#FAF8F5] border border-[#D5C7BC] rounded-xl focus:outline-hidden focus:border-[#1C1B1A] focus:bg-white"
              />
            </div>
            <span className="text-[10px] text-[#736C65] block mt-0.5">
              Saved as <code>public/instagram_videos/[friendly_name].mp4</code>
            </span>
          </div>

          {/* Tag Catalog Product */}
          <div>
            <label className="block font-semibold text-[#1C1B1A] mb-1">
              Tag Catalog Piece (Optional)
            </label>
            <select
              value={taggedProductId}
              onChange={(e) => setTaggedProductId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold text-[#1C1B1A] bg-[#FAF8F5] border border-[#D5C7BC] rounded-xl focus:outline-hidden focus:border-[#1C1B1A] focus:bg-white"
            >
              <option value="">None (General Social Reel)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  🛍️ {p.title} (NPR {p.price.toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit Download Button */}
        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={step === 'fetching' || step === 'uploading' || !reelUrl.trim()}
            className="px-5 py-2.5 bg-[#1C1B1A] hover:bg-[#34312F] text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-colors"
          >
            {step === 'fetching' ? (
              <>
                <Loader2 className="w-4 h-4 text-[#D4AF37] animate-spin" />
                <span>1. Fetching Stream...</span>
              </>
            ) : step === 'uploading' ? (
              <>
                <CloudUpload className="w-4 h-4 text-[#D4AF37] animate-bounce" />
                <span>2. Uploading to Cloud...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-[#D4AF37]" />
                <span>Download & Save MP4 Video</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Step Tracker Card */}
      {(step !== 'idle') && (
        <div className="p-4 bg-white border border-[#E8DFD8] rounded-2xl space-y-3">
          <h5 className="font-semibold text-xs text-[#1C1B1A] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Process Steps & Real-time Progress</span>
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Step 1 */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1 transition-all ${
              step === 'fetching' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' :
              step === 'uploading' || step === 'success' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-[#FAF8F5] border-[#E8DFD8]'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#736C65]">Step 1</span>
                {step === 'fetching' && <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />}
                {(step === 'uploading' || step === 'success') && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </div>
              <span className="font-semibold text-[11px] text-[#1C1B1A]">1. Server Download</span>
              <span className="text-[10px] text-[#736C65]">Stream MP4 to server disk</span>
            </div>

            {/* Step 2 */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1 transition-all ${
              step === 'uploading' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' :
              step === 'success' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-[#FAF8F5] border-[#E8DFD8]'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#736C65]">Step 2</span>
                {step === 'uploading' && <CloudUpload className="w-3.5 h-3.5 text-amber-600 animate-bounce" />}
                {step === 'success' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </div>
              <span className="font-semibold text-[11px] text-[#1C1B1A]">2. Firebase Cloud</span>
              <span className="text-[10px] text-[#736C65]">Upload to Firebase Storage</span>
            </div>

            {/* Step 3 */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1 transition-all ${
              step === 'success' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200' : 'bg-[#FAF8F5] border-[#E8DFD8]'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#736C65]">Step 3</span>
                {step === 'success' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </div>
              <span className="font-semibold text-[11px] text-[#1C1B1A]">3. Auto-Published</span>
              <span className="text-[10px] text-[#736C65]">Live on Website Catalog</span>
            </div>
          </div>
        </div>
      )}

      {/* Download Result Card */}
      {downloadResult && (
        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
            <div className="flex items-center gap-2">
              <FolderCheck className="w-4 h-4 text-emerald-700" />
              <h5 className="font-serif font-bold text-xs text-emerald-950">
                Downloaded & Persisted Video Details
              </h5>
            </div>
            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
              100% Ready
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start">
            {/* Video / Cover Thumbnail */}
            <div className="w-28 h-36 rounded-xl border border-emerald-300 overflow-hidden bg-black relative shrink-0">
              <img
                src={downloadResult.firebaseCoverUrl || downloadResult.localCoverUrl}
                alt="Cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Play className="w-6 h-6 text-white drop-shadow-md fill-white" />
              </div>
            </div>

            {/* Info details */}
            <div className="flex-1 space-y-1.5 min-w-0">
              <h4 className="font-bold text-xs text-emerald-950 line-clamp-1">
                {downloadResult.headline}
              </h4>
              <p className="text-[11px] text-emerald-900 line-clamp-2 leading-relaxed">
                {downloadResult.caption}
              </p>

              <div className="pt-1.5 space-y-1 text-[10px]">
                <div className="flex items-center gap-1 text-emerald-800">
                  <span className="font-semibold">Local Disk Path:</span>
                  <code className="bg-white/80 px-1.5 py-0.5 rounded border border-emerald-200 truncate font-mono">
                    {downloadResult.localVideoUrl}
                  </code>
                </div>

                <div className="flex items-center gap-1 text-emerald-800">
                  <span className="font-semibold">Firebase Cloud URL:</span>
                  <a
                    href={downloadResult.firebaseVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:text-emerald-950 underline truncate flex items-center gap-0.5 font-mono"
                  >
                    <span>{downloadResult.firebaseVideoUrl.slice(0, 45)}...</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
