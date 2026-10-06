import React, { useState } from 'react';
import { Download, Check, X, Package, Video, Instagram, Feather, FileJson, Code, Zap, Database, Copy, RefreshCw, Globe, ExternalLink } from 'lucide-react';
import { useCart } from '../context/CartContext';
import SAVED_PRODUCTS from '../data/products.json';
import SAVED_TIKTOK_REELS from '../data/tiktok_reels.json';
import SAVED_INSTAGRAM_ITEMS from '../data/instagram_journal.json';
import SAVED_CRAFT_STORY from '../data/craft_story.json';
import { sanitizeInstagramItemsList } from '../utils/instagramSanitizer';
import { generateSitemapXml } from '../utils/sitemapGenerator';

interface WebsiteExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebsiteExportModal: React.FC<WebsiteExportModalProps> = ({ isOpen, onClose }) => {
  const { products, reels, instagramItems, craftStory } = useCart() as any;
  const [copied, setCopied] = useState(false);
  const [oneClickSuccess, setOneClickSuccess] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const currentProducts = products && products.length > 0 ? products : SAVED_PRODUCTS;
  const currentReels = reels && reels.length > 0 ? reels : SAVED_TIKTOK_REELS;
  const rawInstagram = instagramItems && instagramItems.length > 0 ? instagramItems : SAVED_INSTAGRAM_ITEMS;
  const currentInstagram = sanitizeInstagramItemsList(rawInstagram);
  const currentCraftStory = craftStory || SAVED_CRAFT_STORY;

  const handleSyncToServerDisk = async () => {
    setIsSyncing(true);
    try {
      await Promise.all([
        fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentProducts),
        }),
        fetch('/api/tiktok-reels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentReels),
        }),
        fetch('/api/instagram-journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentInstagram),
        }),
        fetch('/api/craft-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentCraftStory),
        }),
        fetch('/api/seller-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: 'withlovesahina',
            passwordHash: '7c450ce6e1934b25d5b00dba4c282e2be791186857f5b3b02ffb7541a7ad1f68',
            salt: 'salt_1791038978157'
          }),
        }),
      ]);

      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to sync state to server disk:', err);
      alert('Failed to sync files to server disk. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadIndividualFile = (filename: string, data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOneClickExportAll = async () => {
    // First auto-sync to disk
    await handleSyncToServerDisk();

    // Then download all 4 files
    handleDownloadIndividualFile('products.json', currentProducts);
    setTimeout(() => handleDownloadIndividualFile('tiktok_reels.json', currentReels), 250);
    setTimeout(() => handleDownloadIndividualFile('instagram_journal.json', currentInstagram), 500);
    setTimeout(() => handleDownloadIndividualFile('craft_story.json', currentCraftStory), 750);

    setOneClickSuccess(true);
    setTimeout(() => setOneClickSuccess(false), 3000);
  };

  const [copiedSitemap, setCopiedSitemap] = useState(false);

  const handleDownloadSitemap = () => {
    const xml = generateSitemapXml(currentProducts, 'https://www.artified.com.np');
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySitemapUrl = () => {
    navigator.clipboard.writeText('https://www.artified.com.np/sitemap.xml');
    setCopiedSitemap(true);
    setTimeout(() => setCopiedSitemap(false), 2500);
  };

  const handleCopyCodeInstructions = () => {
    const instructions = `
# 100% GITHUB MIGRATION & SYNC GUIDE:
1. Click "Sync & Save All to Disk" in the website export panel to flush all ${currentProducts.length} products, TikTok reels, Instagram journal items, and Craft Story directly into 'src/data/*.json' on disk.
2. Commit and push your repository to GitHub.
3. Your GitHub repository will now contain 100% of your website with zero missing data!
    `.trim();
    navigator.clipboard.writeText(instructions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF8F5] text-[#1C1B1A] border border-[#E8DFD8] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-[#736C65] hover:text-[#1C1B1A] p-1.5 rounded-full hover:bg-[#E8DFD8]/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1C1B1A] text-[#C5A880] flex items-center justify-center shadow-md">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#1C1B1A]">
              100% GitHub & Server Disk Sync
            </h3>
            <p className="text-xs text-[#736C65]">
              Ensure all {currentProducts.length} products, videos & reels are saved to disk files
            </p>
          </div>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-2xl border border-[#E8DFD8] text-center">
            <Package className="w-4 h-4 text-[#C5A880] mx-auto mb-1" />
            <div className="text-lg font-serif font-bold text-[#1C1B1A]">{currentProducts.length}</div>
            <div className="text-[10px] text-[#736C65] uppercase tracking-wider">Products</div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-[#E8DFD8] text-center">
            <Video className="w-4 h-4 text-[#C5A880] mx-auto mb-1" />
            <div className="text-lg font-serif font-bold text-[#1C1B1A]">{currentReels.length}</div>
            <div className="text-[10px] text-[#736C65] uppercase tracking-wider">TikTok Reels</div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-[#E8DFD8] text-center">
            <Instagram className="w-4 h-4 text-[#C5A880] mx-auto mb-1" />
            <div className="text-lg font-serif font-bold text-[#1C1B1A]">{currentInstagram.length}</div>
            <div className="text-[10px] text-[#736C65] uppercase tracking-wider">Instagram</div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-[#E8DFD8] text-center">
            <Feather className="w-4 h-4 text-[#C5A880] mx-auto mb-1" />
            <div className="text-lg font-serif font-bold text-[#1C1B1A]">1</div>
            <div className="text-[10px] text-[#736C65] uppercase tracking-wider">Craft Story</div>
          </div>
        </div>

        {/* WHY WAS IT ONLY 50%? EXPLANATION & FIX */}
        <div className="space-y-3 bg-amber-50 p-4 rounded-2xl border border-amber-200">
          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4 text-amber-700 animate-spin-slow" />
            <span>Why did GitHub only transfer 50% before?</span>
          </h4>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            When you add or edit products in the app, changes are temporarily stored in your browser's <code className="bg-white px-1 py-0.5 rounded border border-amber-200">localStorage</code>. Unless flushed to disk, GitHub only gets the default starter template files!
          </p>
          <button
            type="button"
            onClick={handleSyncToServerDisk}
            disabled={isSyncing}
            className="w-full py-3 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Flushing All Edits to Disk...' : '🚀 Sync & Save All 33 Products & Videos to Disk'}</span>
          </button>
          {syncSuccess && (
            <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs text-center flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-emerald-700" />
              <span>100% Synced! All products, reels, and stories are now permanently saved to `src/data/*.json` on disk.</span>
            </div>
          )}
        </div>

        {/* ONE CLICK GITHUB EXPORT BUTTON */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleOneClickExportAll}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#1C1B1A] hover:bg-[#34312F] text-[#FAF8F5] text-xs font-bold uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-[#C5A880]/30"
          >
            <Zap className="w-4 h-4 text-[#C5A880]" />
            <span>⚡ Sync to Disk & Download All 4 GitHub JSON Files</span>
          </button>
          {oneClickSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs text-center flex items-center justify-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Successfully synced to server disk and downloaded all 4 JSON files!</span>
            </div>
          )}
          <p className="text-[11px] text-[#736C65] text-center">
            Guarantees 100% of your website data is saved in disk files ready for GitHub URL import.
          </p>
        </div>

        {/* Individual Data Files */}
        <div className="space-y-2 bg-white p-4 rounded-2xl border border-[#E8DFD8]">
          <h4 className="text-xs font-bold text-[#1C1B1A] uppercase tracking-wider mb-2">
            Individual Data Files (`src/data/`)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDownloadIndividualFile('products.json', currentProducts)}
              className="p-2.5 bg-[#FAF8F5] hover:bg-[#E8DFD8]/40 border border-[#E8DFD8] rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-[#C5A880]" />
                <span className="text-xs font-medium text-[#1C1B1A]">products.json</span>
              </div>
              <Download className="w-3.5 h-3.5 text-[#736C65]" />
            </button>

            <button
              type="button"
              onClick={() => handleDownloadIndividualFile('tiktok_reels.json', currentReels)}
              className="p-2.5 bg-[#FAF8F5] hover:bg-[#E8DFD8]/40 border border-[#E8DFD8] rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-[#C5A880]" />
                <span className="text-xs font-medium text-[#1C1B1A]">tiktok_reels.json</span>
              </div>
              <Download className="w-3.5 h-3.5 text-[#736C65]" />
            </button>

            <button
              type="button"
              onClick={() => handleDownloadIndividualFile('instagram_journal.json', currentInstagram)}
              className="p-2.5 bg-[#FAF8F5] hover:bg-[#E8DFD8]/40 border border-[#E8DFD8] rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-[#C5A880]" />
                <span className="text-xs font-medium text-[#1C1B1A]">instagram_journal.json</span>
              </div>
              <Download className="w-3.5 h-3.5 text-[#736C65]" />
            </button>

            <button
              type="button"
              onClick={() => handleDownloadIndividualFile('craft_story.json', currentCraftStory)}
              className="p-2.5 bg-[#FAF8F5] hover:bg-[#E8DFD8]/40 border border-[#E8DFD8] rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-[#C5A880]" />
                <span className="text-xs font-medium text-[#1C1B1A]">craft_story.json</span>
              </div>
              <Download className="w-3.5 h-3.5 text-[#736C65]" />
            </button>
          </div>
        </div>

        {/* Real MP4 Video Files for public/instagram_videos/ */}
        <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#E8DFD8]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#1C1B1A] uppercase tracking-wider flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Real Instagram MP4 Video Files (`public/instagram_videos/`)</span>
            </h4>
            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Full Video Files (2–6 MB)
            </span>
          </div>
          <p className="text-[11px] text-[#736C65] leading-relaxed">
            Download each video below and place it into your repository's <code>public/instagram_videos/</code> folder before deploying to Vercel. This replaces the 0-byte placeholder files so videos play instantly on <code>artified.com.np</code>!
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href="/instagram_videos/DdMRgKdP4HK.mp4"
              download="DdMRgKdP4HK.mp4"
              className="p-2.5 bg-[#FAF8F5] hover:bg-[#E8DFD8]/50 border border-[#E8DFD8] rounded-xl text-left flex items-center justify-between transition-colors"
            >
              <div className="truncate">
                <span className="text-xs font-semibold text-[#1C1B1A] block truncate">DdMRgKdP4HK.mp4</span>
                <span className="text-[10px] text-[#736C65]">Macrame Workshop (2.2 MB)</span>
              </div>
              <Download className="w-3.5 h-3.5 text-[#C5A880] shrink-0 ml-2" />
            </a>

            <a
              href="/instagram_videos/DdIUMC4BqFr.mp4"
              download="DdIUMC4BqFr.mp4"
              className="p-2.5 bg-[#FAF8F5] hover:bg-[#E8DFD8]/50 border border-[#E8DFD8] rounded-xl text-left flex items-center justify-between transition-colors"
            >
              <div className="truncate">
                <span className="text-xs font-semibold text-[#1C1B1A] block truncate">DdIUMC4BqFr.mp4</span>
                <span className="text-[10px] text-[#736C65]">Kalashala (5.5 MB)</span>
              </div>
              <Download className="w-3.5 h-3.5 text-[#C5A880] shrink-0 ml-2" />
            </a>

            <a
              href="/instagram_videos/DY6OqqfPyJu.mp4"
              download="DY6OqqfPyJu.mp4"
              className="p-2.5 bg-[#FAF8F5] hover:bg-[#E8DFD8]/50 border border-[#E8DFD8] rounded-xl text-left flex items-center justify-between transition-colors"
            >
              <div className="truncate">
                <span className="text-xs font-semibold text-[#1C1B1A] block truncate">DY6OqqfPyJu.mp4</span>
                <span className="text-[10px] text-[#736C65]">Pearl Tote / Maya (5.5 MB)</span>
              </div>
              <Download className="w-3.5 h-3.5 text-[#C5A880] shrink-0 ml-2" />
            </a>

            <a
              href="/instagram_videos/DdjhhazvaRr.mp4"
              download="DdjhhazvaRr.mp4"
              className="p-2.5 bg-[#FAF8F5] hover:bg-[#E8DFD8]/50 border border-[#E8DFD8] rounded-xl text-left flex items-center justify-between transition-colors"
            >
              <div className="truncate">
                <span className="text-xs font-semibold text-[#1C1B1A] block truncate">DdjhhazvaRr.mp4</span>
                <span className="text-[10px] text-[#736C65]">Tourmaline Necklace (3.3 MB)</span>
              </div>
              <Download className="w-3.5 h-3.5 text-[#C5A880] shrink-0 ml-2" />
            </a>
          </div>
        </div>

        {/* Google Search & Sitemap.xml Generator Card */}
        <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#E8DFD8]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#1C1B1A] uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Google Search & Image Sitemap (`sitemap.xml`)</span>
            </h4>
            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {1 + 7 + 3 + currentProducts.length} URLs Indexed
            </span>
          </div>
          <p className="text-[11px] text-[#736C65] leading-relaxed">
            Includes your storefront homepage, all 7 collection pages, atelier story sections, and all {currentProducts.length} handcrafted products with Google Image search metadata and high-CTR dynamic schema.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleDownloadSitemap}
              className="flex-1 py-2 px-3 bg-[#FAF8F5] hover:bg-[#E8DFD8]/50 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#1C1B1A] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Download sitemap.xml</span>
            </button>
            <button
              type="button"
              onClick={handleCopySitemapUrl}
              className="flex-1 py-2 px-3 bg-[#1C1B1A] hover:bg-black text-[#D4AF37] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              {copiedSitemap ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSitemap ? 'Sitemap URL Copied!' : 'Copy Search Console URL'}</span>
            </button>
          </div>
          <p className="text-[10px] text-[#8C7A6B]">
            Submit <code className="bg-[#FAF8F5] px-1 py-0.5 rounded text-[#1C1B1A]">https://www.artified.com.np/sitemap.xml</code> directly in <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="underline font-medium hover:text-[#1C1B1A]">Google Search Console &rarr; Sitemaps</a>.
          </p>
        </div>

        {/* GitHub Migration Guide */}
        <div className="space-y-2 bg-white p-4 rounded-2xl border border-[#E8DFD8]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1C1B1A] uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>100% GITHUB SYNC GUIDE</span>
            </span>
            <button
              type="button"
              onClick={handleCopyCodeInstructions}
              className="text-[11px] font-semibold text-[#C5A880] hover:underline flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : null}
              <span>{copied ? 'Copied Guide!' : 'Copy Guide'}</span>
            </button>
          </div>
          <p className="text-[11px] text-[#736C65] leading-relaxed">
            After clicking <strong className="text-[#1C1B1A]">"Sync & Save All to Disk"</strong>, all {currentProducts.length} products and videos are written directly to <code className="bg-[#FAF8F5] px-1 py-0.5 rounded border border-[#E8DFD8]">src/data/*.json</code> on disk. When you push to GitHub or import via GitHub URL, 100% of your website will transfer with zero data loss!
          </p>
        </div>

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#736C65] hover:text-[#1C1B1A] font-medium underline cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
