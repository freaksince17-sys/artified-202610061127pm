import React, { useState } from 'react';
import { GitBranch, Download, Check, Loader2, X, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface GitHubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubImportModal: React.FC<GitHubImportModalProps> = ({ isOpen, onClose }) => {
  const { setProducts, setReels, setInstagramItems, setCraftStory } = useCart() as any;
  const [importing, setImporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [repoUrlInput, setRepoUrlInput] = useState('');

  if (!isOpen) return null;

  const handleImportJson = () => {
    setImporting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const parsed = JSON.parse(jsonInput);
      let countProducts = 0;
      let countReels = 0;
      let countInstagram = 0;

      if (parsed.products && Array.isArray(parsed.products)) {
        setProducts(parsed.products);
        localStorage.setItem('artified_products_v2', JSON.stringify(parsed.products));
        countProducts = parsed.products.length;
      }
      if (parsed.reels && Array.isArray(parsed.reels)) {
        setReels(parsed.reels);
        localStorage.setItem('artified_tiktok_reels', JSON.stringify(parsed.reels));
        countReels = parsed.reels.length;
      }
      if (parsed.instagramItems && Array.isArray(parsed.instagramItems)) {
        setInstagramItems(parsed.instagramItems);
        localStorage.setItem('artified_instagram_journal', JSON.stringify(parsed.instagramItems));
        countInstagram = parsed.instagramItems.length;
      }
      if (parsed.craftStory && typeof parsed.craftStory === 'object') {
        setCraftStory(parsed.craftStory);
        localStorage.setItem('artified_craft_story', JSON.stringify(parsed.craftStory));
      }

      setSuccessMsg(`Successfully imported ${countProducts} products, ${countReels} TikTok reels, and ${countInstagram} journal items from GitHub data!`);
      setJsonInput('');
    } catch (err: any) {
      setErrorMsg('Invalid JSON format. Please paste valid JSON exported from your GitHub repository.');
    } finally {
      setImporting(false);
    }
  };

  const handleFetchFromGitHubUrl = async () => {
    if (!repoUrlInput.trim()) {
      setErrorMsg('Please enter a valid GitHub raw URL or JSON endpoint.');
      return;
    }
    setImporting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      let targetUrl = repoUrlInput.trim();
      // Convert standard github blob url to raw if needed
      if (targetUrl.includes('github.com') && !targetUrl.includes('raw.githubusercontent.com')) {
        targetUrl = targetUrl
          .replace('github.com', 'raw.githubusercontent.com')
          .replace('/blob/', '/');
      }

      const res = await fetch(targetUrl);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();

      let countProducts = 0;
      let countReels = 0;
      let countInstagram = 0;

      if (data.products && Array.isArray(data.products)) {
        setProducts(data.products);
        localStorage.setItem('artified_products_v2', JSON.stringify(data.products));
        countProducts = data.products.length;
      }
      if (data.reels && Array.isArray(data.reels)) {
        setReels(data.reels);
        localStorage.setItem('artified_tiktok_reels', JSON.stringify(data.reels));
        countReels = data.reels.length;
      }
      if (data.instagramItems && Array.isArray(data.instagramItems)) {
        setInstagramItems(data.instagramItems);
        localStorage.setItem('artified_instagram_journal', JSON.stringify(data.instagramItems));
        countInstagram = data.instagramItems.length;
      }
      if (data.craftStory && typeof data.craftStory === 'object') {
        setCraftStory(data.craftStory);
        localStorage.setItem('artified_craft_story', JSON.stringify(data.craftStory));
      }

      setSuccessMsg(`Successfully synced & transferred ${countProducts} products, ${countReels} reels, and ${countInstagram} journal items from GitHub repository!`);
      setRepoUrlInput('');
    } catch (err: any) {
      setErrorMsg(`Failed to fetch from GitHub URL: ${err.message}. Make sure CORS allows fetching or use the JSON paste option below.`);
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setJsonInput(content);
        setSuccessMsg('File loaded into editor. Click "Import into App" below.');
      } catch {
        setErrorMsg('Could not read uploaded file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF8F5] text-[#1C1B1A] border border-[#E8DFD8] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-[#736C65] hover:text-[#1C1B1A] p-1.5 rounded-full hover:bg-[#E8DFD8]/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1C1B1A] text-[#C5A880] flex items-center justify-center shadow-md">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#1C1B1A]">
              GitHub Repository Data Transfer
            </h3>
            <p className="text-xs text-[#736C65]">
              Import products, TikTok reels, Instagram journal & Craft Story from GitHub
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3 animate-fade-in">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <p>{successMsg}</p>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Option 1: Fetch via GitHub Raw URL */}
        <div className="space-y-2 bg-white p-4 rounded-2xl border border-[#E8DFD8]">
          <label className="text-xs font-bold text-[#1C1B1A] uppercase tracking-wider block">
            1. Fetch from GitHub Raw JSON URL
          </label>
          <p className="text-[11px] text-[#736C65]">
            Paste the raw URL of your repository's export JSON (e.g. `https://raw.githubusercontent.com/...`)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={repoUrlInput}
              onChange={(e) => setRepoUrlInput(e.target.value)}
              placeholder="https://raw.githubusercontent.com/username/repo/main/export.json"
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-[#C5A880]"
            />
            <button
              type="button"
              disabled={importing}
              onClick={handleFetchFromGitHubUrl}
              className="px-4 py-2 bg-[#1C1B1A] hover:bg-[#34312F] text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1.5"
            >
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A880]" /> : <RefreshCw className="w-3.5 h-3.5 text-[#C5A880]" />}
              <span>Fetch</span>
            </button>
          </div>
        </div>

        {/* Option 2: Upload JSON file or Paste */}
        <div className="space-y-2 bg-white p-4 rounded-2xl border border-[#E8DFD8]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#1C1B1A] uppercase tracking-wider block">
              2. Upload JSON File or Paste Content
            </label>
            <label className="cursor-pointer px-3 py-1 bg-[#E8DFD8]/60 hover:bg-[#E8DFD8] text-[#1C1B1A] text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Choose File</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          <textarea
            rows={5}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={'{\n  "products": [...],\n  "reels": [...],\n  "instagramItems": [...],\n  "craftStory": {...}\n}'}
            className="w-full p-3 text-xs font-mono rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-[#C5A880]"
          />
          <button
            type="button"
            disabled={importing || !jsonInput.trim()}
            onClick={handleImportJson}
            className="w-full py-2.5 px-4 rounded-xl bg-[#C5A880] hover:bg-[#B3966D] text-[#1C1B1A] text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Import JSON into Atelier App</span>
          </button>
        </div>

        <div className="text-center pt-2">
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
