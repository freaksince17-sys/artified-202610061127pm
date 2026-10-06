import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Upload, 
  Check, 
  Video, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle,
  RotateCcw,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CraftStoryData } from '../types';
import { DEFAULT_CRAFT_STORY } from '../data/products';
import { compressImage } from '../utils/imageCompressor';

export const CraftStoryModal: React.FC = () => {
  const { 
    isCraftStoryModalOpen, 
    setIsCraftStoryModalOpen, 
    craftStory, 
    updateCraftStory 
  } = useCart();

  const [formData, setFormData] = useState<CraftStoryData>(craftStory || DEFAULT_CRAFT_STORY);
  const [activeTab, setActiveTab] = useState<'narrative' | 'media' | 'pillars'>('narrative');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingTikTok, setIsFetchingTikTok] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fetchSuccessMessage, setFetchSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (craftStory) {
      setFormData(craftStory);
    }
  }, [craftStory, isCraftStoryModalOpen]);

  if (!isCraftStoryModalOpen) return null;

  const handleImageUpload = (key: 'image1' | 'image2', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const rawBase64 = reader.result as string;
      try {
        const compressed = await compressImage(rawBase64, 900, 1200, 0.82);
        setFormData((prev) => ({ ...prev, [key]: compressed }));
      } catch {
        setFormData((prev) => ({ ...prev, [key]: rawBase64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Delete photo handler
  const handleDeletePhoto = (key: 'image1' | 'image2') => {
    setFormData((prev) => ({ ...prev, [key]: '' }));
  };

  // Auto-fetch details from TikTok link
  const fetchTikTokDetails = async (targetUrl?: string) => {
    const urlToFetch = (targetUrl || formData.videoUrl || '').trim();
    if (!urlToFetch) {
      setErrorMessage('Please enter a TikTok video URL first (e.g. https://www.tiktok.com/@artified_np/video/...)');
      return;
    }

    setIsFetchingTikTok(true);
    setErrorMessage('');
    setFetchSuccessMessage('');

    try {
      const res = await fetch(`/api/tiktok-info?url=${encodeURIComponent(urlToFetch)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not fetch TikTok data. Please verify the URL.');
      }

      setFormData((prev) => {
        const updated = { ...prev, videoUrl: urlToFetch };
        // Auto-fill Photo 1 if empty or using default unsplash
        if (data.thumbnail_url) {
          updated.image1 = data.thumbnail_url;
        }
        // Auto-suggest headline / caption if user doesn't have custom headline
        if (data.title && (prev.title === DEFAULT_CRAFT_STORY.title || !prev.title.trim())) {
          updated.title = data.title.slice(0, 80);
        }
        if (!prev.videoButtonLabel || prev.videoButtonLabel === "Watch How It's Handcrafted") {
          updated.videoButtonLabel = "Watch How It's Handcrafted";
        }
        return updated;
      });

      setFetchSuccessMessage('✓ Automatically loaded TikTok video info & set cover photo! You can edit any field anytime.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sync from TikTok.');
    } finally {
      setIsFetchingTikTok(false);
    }
  };

  // Auto-trigger when link is pasted into input
  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && pastedText.includes('tiktok.com')) {
      setFormData((prev) => ({ ...prev, videoUrl: pastedText }));
      fetchTikTokDetails(pastedText);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await updateCraftStory(formData);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsCraftStoryModalOpen(false);
      }, 400);
    } catch (err: any) {
      setErrorMessage('Failed to save: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDefaults = () => {
    setFormData(DEFAULT_CRAFT_STORY);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FAF8F5] w-full max-w-2xl rounded-2xl shadow-2xl border border-[#E8DFD8] flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8DFD8] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1C1B1A] flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-semibold text-[#1C1B1A]">
                  Edit "Our Handmade Craft" Story
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F4EFEB] text-[#8C7A6B] px-2 py-0.5 rounded-full border border-[#E8DFD8]">
                  Seller Studio
                </span>
              </div>
              <p className="text-xs text-[#736C65]">
                Customize your brand story, workshop photos, craft metrics, and TikTok making video.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCraftStoryModalOpen(false)}
            className="p-1.5 text-[#8C7A6B] hover:text-[#1C1B1A] rounded-lg hover:bg-[#F4EFEB] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E8DFD8] bg-[#F4EFEB]/50 px-4 sm:px-6 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('narrative')}
            className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-t-lg transition-all ${
              activeTab === 'narrative'
                ? 'bg-white text-[#1C1B1A] border-t-2 border-[#1C1B1A] shadow-xs'
                : 'text-[#8C7A6B] hover:text-[#1C1B1A]'
            }`}
          >
            Story & Headline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'media'
                ? 'bg-white text-[#1C1B1A] border-t-2 border-[#1C1B1A] shadow-xs'
                : 'text-[#8C7A6B] hover:text-[#1C1B1A]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Photos & Making Video</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pillars')}
            className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-t-lg transition-all ${
              activeTab === 'pillars'
                ? 'bg-white text-[#1C1B1A] border-t-2 border-[#1C1B1A] shadow-xs'
                : 'text-[#8C7A6B] hover:text-[#1C1B1A]'
            }`}
          >
            Craft Values & Stats
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {fetchSuccessMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{fetchSuccessMessage}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Story saved successfully to Cloud Firestore!</span>
            </div>
          )}

          {/* TAB 1: STORY & HEADLINE */}
          {activeTab === 'narrative' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  Section Pill Badge
                </label>
                <input
                  type="text"
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  placeholder="Our Handmade Craft"
                  className="w-full px-3 py-2 bg-white border border-[#D5C7BC] rounded-lg text-xs text-[#1C1B1A] focus:outline-none focus:border-[#1C1B1A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  Main Headline / Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Wearable Art Reborn in the Heart of the Valley"
                  className="w-full px-3 py-2 bg-white border border-[#D5C7BC] rounded-lg text-xs font-serif text-[#1C1B1A] focus:outline-none focus:border-[#1C1B1A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  Opening Story Paragraph
                </label>
                <textarea
                  rows={3}
                  value={formData.paragraph1}
                  onChange={(e) => setFormData({ ...formData, paragraph1: e.target.value })}
                  placeholder="Founded on the belief that accessories should carry soulful human devotion..."
                  className="w-full px-3 py-2 bg-white border border-[#D5C7BC] rounded-lg text-xs text-[#1C1B1A] focus:outline-none focus:border-[#1C1B1A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  Crafting Process & Materials Paragraph
                </label>
                <textarea
                  rows={4}
                  value={formData.paragraph2}
                  onChange={(e) => setFormData({ ...formData, paragraph2: e.target.value })}
                  placeholder="Each pearl bag is built without shortcuts. Unlike factory-pressed bags, our makers calculate tension by hand..."
                  className="w-full px-3 py-2 bg-white border border-[#D5C7BC] rounded-lg text-xs text-[#1C1B1A] focus:outline-none focus:border-[#1C1B1A]"
                />
              </div>
            </div>
          )}

          {/* TAB 2: PHOTOS & TIKTOK MAKING VIDEO */}
          {activeTab === 'media' && (
            <div className="space-y-5">
              
              {/* TikTok Craft / Making Video feature with Auto-Fill */}
              <div className="p-3.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-xl space-y-3">
                <div className="flex items-start gap-2">
                  <Video className="w-4 h-4 text-[#D4AF37] mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-[#1C1B1A]">
                      Feature a TikTok Craft Story / Making Video
                    </h4>
                    <p className="text-[11px] text-[#736C65] mt-0.5">
                      Paste your TikTok link below — the video and cover photo will <strong>fill automatically</strong>! You can edit any info anytime.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={formData.videoUrl || ''}
                      onPaste={handleUrlPaste}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      placeholder="Paste link: https://www.tiktok.com/@artified_np/video/..."
                      className="w-full px-3 py-2 bg-white border border-[#D5C7BC] rounded-lg text-xs text-[#1C1B1A] focus:outline-none focus:border-[#1C1B1A]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchTikTokDetails()}
                    disabled={isFetchingTikTok || !formData.videoUrl}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-[#FAF8F5] text-[#1C1B1A] border border-[#D5C7BC] rounded-lg text-xs font-semibold shadow-xs disabled:opacity-40 transition-colors shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF37] ${isFetchingTikTok ? 'animate-spin' : ''}`} />
                    <span>{isFetchingTikTok ? 'Syncing...' : '⚡ Auto-Sync Video'}</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#1C1B1A] mb-1">
                    Watch Button Text (Editable)
                  </label>
                  <input
                    type="text"
                    value={formData.videoButtonLabel || "Watch How It's Handcrafted"}
                    onChange={(e) => setFormData({ ...formData, videoButtonLabel: e.target.value })}
                    placeholder="Watch How It's Handcrafted"
                    className="w-full px-3 py-1.5 bg-white border border-[#D5C7BC] rounded-lg text-xs text-[#1C1B1A] focus:outline-none focus:border-[#1C1B1A]"
                  />
                </div>
              </div>

              {/* Photo 1 and Photo 2 with Delete Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Photo 1 */}
                <div className="space-y-2 p-3 bg-white rounded-xl border border-[#E8DFD8]">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#1C1B1A]">
                      Craft Photo 1
                    </label>
                    {formData.image1 && (
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto('image1')}
                        className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 font-semibold transition-colors px-1.5 py-0.5 rounded hover:bg-rose-50"
                        title="Delete Photo 1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete Photo</span>
                      </button>
                    )}
                  </div>

                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-[#FAF8F5] border border-[#E8DFD8] relative flex items-center justify-center">
                    {formData.image1?.trim() ? (
                      <>
                        <img 
                          src={formData.image1.trim()} 
                          alt="Craft 1 Preview" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto('image1')}
                          className="absolute top-2 right-2 bg-black/70 hover:bg-rose-600 text-white p-1.5 rounded-full shadow-md transition-colors"
                          title="Delete Photo 1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <ImageIcon className="w-8 h-8 text-[#B8AAA0] mx-auto mb-1 opacity-60" />
                        <p className="text-xs font-medium text-[#736C65]">No Photo</p>
                        <p className="text-[10px] text-[#A69E96]">Photo deleted. Upload or paste link below.</p>
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    value={formData.image1 || ''}
                    onChange={(e) => setFormData({ ...formData, image1: e.target.value })}
                    placeholder="Image URL (or paste TikTok / web link)"
                    className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg text-[11px] text-[#1C1B1A]"
                  />
                  <label className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-2 bg-white border border-dashed border-[#8C7A6B] rounded-lg text-xs font-medium text-[#1C1B1A] cursor-pointer hover:bg-[#FAF8F5]">
                    <Upload className="w-3.5 h-3.5 text-[#8C7A6B]" />
                    <span>Upload New Photo 1</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('image1', e)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Photo 2 */}
                <div className="space-y-2 p-3 bg-white rounded-xl border border-[#E8DFD8]">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#1C1B1A]">
                      Craft Photo 2
                    </label>
                    {formData.image2 && (
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto('image2')}
                        className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 font-semibold transition-colors px-1.5 py-0.5 rounded hover:bg-rose-50"
                        title="Delete Photo 2"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete Photo</span>
                      </button>
                    )}
                  </div>

                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-[#FAF8F5] border border-[#E8DFD8] relative flex items-center justify-center">
                    {formData.image2?.trim() ? (
                      <>
                        <img 
                          src={formData.image2.trim()} 
                          alt="Craft 2 Preview" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto('image2')}
                          className="absolute top-2 right-2 bg-black/70 hover:bg-rose-600 text-white p-1.5 rounded-full shadow-md transition-colors"
                          title="Delete Photo 2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <ImageIcon className="w-8 h-8 text-[#B8AAA0] mx-auto mb-1 opacity-60" />
                        <p className="text-xs font-medium text-[#736C65]">No Photo</p>
                        <p className="text-[10px] text-[#A69E96]">Photo deleted. Upload or paste link below.</p>
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    value={formData.image2 || ''}
                    onChange={(e) => setFormData({ ...formData, image2: e.target.value })}
                    placeholder="Image URL"
                    className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg text-[11px] text-[#1C1B1A]"
                  />
                  <label className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-2 bg-white border border-dashed border-[#8C7A6B] rounded-lg text-xs font-medium text-[#1C1B1A] cursor-pointer hover:bg-[#FAF8F5]">
                    <Upload className="w-3.5 h-3.5 text-[#8C7A6B]" />
                    <span>Upload New Photo 2</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('image2', e)}
                      className="hidden"
                    />
                  </label>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: CRAFT STATS & 3 VALUE PILLARS */}
          {activeTab === 'pillars' && (
            <div className="space-y-4">
              {/* Stat Badges */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-[#E8DFD8]">
                <div>
                  <label className="block text-[11px] font-semibold text-[#1C1B1A] mb-1">
                    Stat 1 (Number & Label)
                  </label>
                  <input
                    type="text"
                    value={formData.stat1Number}
                    onChange={(e) => setFormData({ ...formData, stat1Number: e.target.value })}
                    placeholder="9+"
                    className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg text-xs font-bold mb-1"
                  />
                  <input
                    type="text"
                    value={formData.stat1Label}
                    onChange={(e) => setFormData({ ...formData, stat1Label: e.target.value })}
                    placeholder="Hours Per Bag"
                    className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#1C1B1A] mb-1">
                    Stat 2 (Number & Label)
                  </label>
                  <input
                    type="text"
                    value={formData.stat2Number}
                    onChange={(e) => setFormData({ ...formData, stat2Number: e.target.value })}
                    placeholder="100%"
                    className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg text-xs font-bold mb-1"
                  />
                  <input
                    type="text"
                    value={formData.stat2Label}
                    onChange={(e) => setFormData({ ...formData, stat2Label: e.target.value })}
                    placeholder="Nepal Crafted"
                    className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* 3 Pillars */}
              <div className="space-y-3">
                <div className="p-3 bg-white rounded-xl border border-[#E8DFD8] space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C1B1A]">
                    Pillar 1: Fair Living Wages
                  </label>
                  <input
                    type="text"
                    value={formData.pillar1Title}
                    onChange={(e) => setFormData({ ...formData, pillar1Title: e.target.value })}
                    placeholder="Fair Living Wages"
                    className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg text-xs font-semibold"
                  />
                  <textarea
                    rows={2}
                    value={formData.pillar1Desc}
                    onChange={(e) => setFormData({ ...formData, pillar1Desc: e.target.value })}
                    placeholder="Fair compensation empowering local women makers in Lalitpur and Bhaktapur."
                    className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg text-xs"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#E8DFD8] space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C1B1A]">
                    Pillar 2: Zero Fast Fashion
                  </label>
                  <input
                    type="text"
                    value={formData.pillar2Title}
                    onChange={(e) => setFormData({ ...formData, pillar2Title: e.target.value })}
                    placeholder="Zero Fast Fashion"
                    className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg text-xs font-semibold"
                  />
                  <textarea
                    rows={2}
                    value={formData.pillar2Desc}
                    onChange={(e) => setFormData({ ...formData, pillar2Desc: e.target.value })}
                    placeholder="Made in limited small batches to eliminate excess waste and celebrate longevity."
                    className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg text-xs"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#E8DFD8] space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C1B1A]">
                    Pillar 3: Heirloom Durability
                  </label>
                  <input
                    type="text"
                    value={formData.pillar3Title}
                    onChange={(e) => setFormData({ ...formData, pillar3Title: e.target.value })}
                    placeholder="Heirloom Durability"
                    className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg text-xs font-semibold"
                  />
                  <textarea
                    rows={2}
                    value={formData.pillar3Desc}
                    onChange={(e) => setFormData({ ...formData, pillar3Desc: e.target.value })}
                    placeholder="Reinforced 15kg+ tensile core with easy exchange within 24 hrs for peace of mind."
                    className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-[#E8DFD8] gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[#8C7A6B] hover:text-[#1C1B1A] text-xs font-medium rounded-lg hover:bg-[#F4EFEB] transition-colors"
              title="Reset to default story template"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCraftStoryModalOpen(false)}
                className="px-4 py-2 bg-white border border-[#D5C7BC] rounded-lg text-xs font-semibold text-[#554E48] hover:bg-[#F4EFEB]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#1C1B1A] text-white rounded-lg text-xs font-semibold hover:bg-[#34312F] shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Saving to Cloud...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Save Craft Story</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
