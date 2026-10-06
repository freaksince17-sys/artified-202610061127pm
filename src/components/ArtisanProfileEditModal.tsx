import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Sparkles, 
  Save, 
  RotateCcw, 
  Image as ImageIcon, 
  User, 
  MapPin, 
  Clock, 
  Heart, 
  Quote, 
  Layers, 
  Phone, 
  ShieldCheck, 
  Instagram, 
  Check, 
  Upload, 
  Crosshair,
  Loader2
} from 'lucide-react';
import { 
  ArtisanProfileData, 
  DEFAULT_ARTISAN_PROFILE, 
  getArtisanProfile, 
  saveArtisanProfile 
} from '../data/artisanProfile';
import { compressImage } from '../utils/imageCompressor';
import { useCart } from '../context/CartContext';

interface ArtisanProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const ArtisanProfileEditModal: React.FC<ArtisanProfileEditModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const { artisanProfile, updateArtisanProfile, updateInstagramSettings } = useCart();
  const [profile, setProfile] = useState<ArtisanProfileData>(() => artisanProfile);
  const [activeTab, setActiveTab] = useState<'general' | 'story' | 'contact'>('general');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setProfile(artisanProfile);
      setSaveSuccess(false);
    }
  }, [isOpen, artisanProfile]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImage(true);
      try {
        const compressedUrl = await compressImage(file, 800, 1000, 0.85);
        setProfile((prev) => ({ 
          ...prev, 
          avatarUrl: compressedUrl,
          avatarPosition: prev.avatarPosition || 'center 20%'
        }));
      } catch (err) {
        console.warn('Error processing uploaded image:', err);
      } finally {
        setIsProcessingImage(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateArtisanProfile(profile);
    if (profile.instagramHandle) {
      updateInstagramSettings(profile.instagramHandle);
    }
    setSaveSuccess(true);
    if (onSaved) onSaved();
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleReset = async () => {
    if (window.confirm('Reset all artisan details to original atelier defaults?')) {
      setProfile({ ...DEFAULT_ARTISAN_PROFILE });
      await updateArtisanProfile({ ...DEFAULT_ARTISAN_PROFILE });
      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => {
        setSaveSuccess(false);
      }, 1200);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-0 cursor-pointer" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-[#FAF8F5] dark:bg-[#141312] border border-[#E8DFD8] dark:border-[#2D2B28] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] z-10 overflow-hidden text-[#1C1B1A] dark:text-[#F5F2EB] transition-colors">
        {/* Modal Header */}
        <div className="px-5 sm:px-7 py-4 bg-white dark:bg-[#1A1918] border-b border-[#E8DFD8] dark:border-[#2D2B28] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1C1B1A] dark:bg-[#252422] text-[#D4AF37] flex items-center justify-center shadow-xs border border-[#D4AF37]/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1C1B1A] dark:text-[#FAF8F5]">
                Edit "Meet the Founder & Creator"
              </h3>
              <p className="text-[11px] text-[#736C65] dark:text-[#A69E96] font-medium">
                Live Profile Editor • Instant Preview & Profile Updates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#736C65] dark:text-[#A69E96] hover:text-[#1C1B1A] dark:hover:text-white hover:bg-[#FAF8F5] dark:hover:bg-[#252422] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[#E8DFD8] dark:border-[#2D2B28] bg-[#FAF8F5] dark:bg-[#181716] px-5 sm:px-7 shrink-0 overflow-x-auto gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'general'
                ? 'border-[#C5A880] text-[#1C1B1A] dark:text-[#FAF8F5]'
                : 'border-transparent text-[#736C65] dark:text-[#A69E96] hover:text-[#1C1B1A] dark:hover:text-white'
            }`}
          >
            1. Identity & Photo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('story')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'story'
                ? 'border-[#C5A880] text-[#1C1B1A] dark:text-[#FAF8F5]'
                : 'border-transparent text-[#736C65] dark:text-[#A69E96] hover:text-[#1C1B1A] dark:hover:text-white'
            }`}
          >
            2. Headline, Story & Philosophy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'contact'
                ? 'border-[#C5A880] text-[#1C1B1A] dark:text-[#FAF8F5]'
                : 'border-transparent text-[#736C65] dark:text-[#A69E96] hover:text-[#1C1B1A] dark:hover:text-white'
            }`}
          >
            3. WhatsApp & Guarantees
          </button>
        </div>

        {/* Tab Content & Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Founder & Creator profile saved successfully! The page has updated live.</span>
            </div>
          )}

          {/* TAB 1: General & Photo */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C1B1A] dark:text-[#F5F2EB] mb-1">
                    Founder & Creator Name
                  </label>
                  <input
                    type="text"
                    value={profile.artisanName}
                    onChange={(e) => setProfile({ ...profile, artisanName: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] focus:border-[#C5A880] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none"
                    placeholder="e.g. Sahina Shrestha"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1B1A] dark:text-[#F5F2EB] mb-1">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={profile.artisanRole}
                    onChange={(e) => setProfile({ ...profile, artisanRole: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] focus:border-[#C5A880] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none"
                    placeholder="e.g. Founder and Creator"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C1B1A] dark:text-[#F5F2EB] mb-1">
                    Atelier Location Text
                  </label>
                  <input
                    type="text"
                    value={profile.atelierLocation}
                    onChange={(e) => setProfile({ ...profile, atelierLocation: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] focus:border-[#C5A880] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none"
                    placeholder="e.g. Kathmandu, Nepal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1B1A] dark:text-[#F5F2EB] mb-1">
                    Established Badge Text
                  </label>
                  <input
                    type="text"
                    value={profile.establishedText}
                    onChange={(e) => setProfile({ ...profile, establishedText: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] focus:border-[#C5A880] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none"
                    placeholder="e.g. Est. 2021 • 100% Handcrafted in Nepal"
                  />
                </div>
              </div>

              {/* Photo & Portrait */}
              <div className="pt-3 border-t border-[#E8DFD8] dark:border-[#2D2B28] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#1C1B1A] dark:text-[#F5F2EB]">
                    Sahina's Portrait Photo & Framing
                  </label>
                  <span className="text-[10px] text-[#D4AF37] font-semibold">
                    Upload any photo or enter URL
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {/* Portrait Live Preview with framing */}
                  <div className="relative w-24 h-32 rounded-2xl overflow-hidden bg-[#1C1B1A] shrink-0 border-2 border-[#D4AF37]/60 shadow-md group">
                    <img
                      src={profile.avatarUrl}
                      alt={profile.artisanName}
                      style={{ objectPosition: profile.avatarPosition || 'center 20%' }}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/artisan_avatar.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    <span className="absolute bottom-1 inset-x-0 text-center text-[8px] text-[#D4AF37] font-bold uppercase">
                      In-Focus
                    </span>
                  </div>

                  <div className="flex-1 space-y-2.5 w-full">
                    {/* Direct File Upload Trigger */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="py-2 px-3.5 rounded-xl bg-[#1C1B1A] dark:bg-[#252422] text-[#D4AF37] hover:text-white border border-[#D4AF37]/60 hover:bg-black text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Upload Photo from Computer / Phone</span>
                      </button>

                      <span className="text-[10px] text-[#736C65] dark:text-[#A69E96]">
                        Supports JPG, PNG, WEBP (Instant local load)
                      </span>
                    </div>

                    {/* Or URL input */}
                    <div>
                      <input
                        type="text"
                        value={profile.avatarUrl}
                        onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] focus:border-[#C5A880] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none font-mono"
                        placeholder="Image URL or Base64..."
                      />
                    </div>

                    {/* Framing / Focus Positioning Controls */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#8C5D36] dark:text-[#E6CA9E]">
                        <Crosshair className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Portrait Focus & Alignment Framing</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { label: 'Face & Upper Body (Default)', val: 'center 20%' },
                          { label: 'Close-Up Headshot', val: 'center 12%' },
                          { label: 'Waist-Up / Dress View', val: 'center 35%' },
                          { label: 'Center Exact', val: 'center center' }
                        ].map((pos) => (
                          <button
                            key={pos.val}
                            type="button"
                            onClick={() => setProfile({ ...profile, avatarPosition: pos.val })}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors cursor-pointer ${
                              (profile.avatarPosition || 'center 20%') === pos.val
                                ? 'bg-[#1C1B1A] dark:bg-[#FAF8F5] text-[#D4AF37] dark:text-[#1C1B1A] border-[#D4AF37] font-bold'
                                : 'bg-[#FAF8F5] dark:bg-[#252422] text-[#5E5955] dark:text-[#A69E96] border-[#E8DFD8] dark:border-[#33302C] hover:border-[#C5A880]'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Headline, Quote & Philosophy */}
          {activeTab === 'story' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1B1A] dark:text-[#F5F2EB] mb-1">
                  Main Headline (H1)
                </label>
                <input
                  type="text"
                  value={profile.headline}
                  onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] focus:border-[#C5A880] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none"
                  placeholder="e.g. Meet the Founder & Creator: Sahina Shrestha"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B1A] dark:text-[#F5F2EB] mb-1">
                  Subheadline / Tagline
                </label>
                <input
                  type="text"
                  value={profile.subheadline}
                  onChange={(e) => setProfile({ ...profile, subheadline: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] focus:border-[#C5A880] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none"
                  placeholder="e.g. From Childhood Passion to Creative Journey"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B1A] dark:text-[#F5F2EB] mb-1">
                  Founder & Creator Story
                </label>
                <textarea
                  rows={5}
                  value={profile.quote}
                  onChange={(e) => setProfile({ ...profile, quote: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] focus:border-[#C5A880] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none leading-relaxed"
                  placeholder="Founder story about childhood passion, watching mother create handicrafts..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B1A] dark:text-[#F5F2EB] mb-1">
                  Why “Artified”? Philosophy
                </label>
                <textarea
                  rows={5}
                  value={profile.whyArtified || ''}
                  onChange={(e) => setProfile({ ...profile, whyArtified: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] focus:border-[#C5A880] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none leading-relaxed"
                  placeholder="Artified comes from the combination of Art and Modified..."
                />
              </div>
            </div>
          )}

          {/* TAB 4: WhatsApp & Guarantees */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C1B1A] dark:text-[#F5F2EB] mb-1">
                    WhatsApp Phone Number (with Country Code)
                  </label>
                  <input
                    type="text"
                    value={profile.whatsappPhone}
                    onChange={(e) => setProfile({ ...profile, whatsappPhone: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] focus:border-[#C5A880] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none"
                    placeholder="e.g. 9779767573721"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1B1A] dark:text-[#F5F2EB] mb-1">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={profile.instagramHandle}
                    onChange={(e) => setProfile({ ...profile, instagramHandle: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] focus:border-[#C5A880] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none"
                    placeholder="@artified_np"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B1A] dark:text-[#F5F2EB] mb-1">
                  Exchange Guarantee Banner Text
                </label>
                <input
                  type="text"
                  value={profile.guaranteeText}
                  onChange={(e) => setProfile({ ...profile, guaranteeText: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] focus:border-[#C5A880] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none"
                  placeholder="e.g. 24-Hour Easy Exchange Guarantee across Nepal"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B1A] dark:text-[#F5F2EB] mb-1">
                  WhatsApp Default Pre-filled Message (English)
                </label>
                <textarea
                  rows={2}
                  value={profile.whatsappGreetingEn}
                  onChange={(e) => setProfile({ ...profile, whatsappGreetingEn: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] focus:border-[#C5A880] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B1A] dark:text-[#F5F2EB] mb-1">
                  WhatsApp Default Pre-filled Message (Nepali)
                </label>
                <textarea
                  rows={2}
                  value={profile.whatsappGreetingNe}
                  onChange={(e) => setProfile({ ...profile, whatsappGreetingNe: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] focus:border-[#C5A880] rounded-xl text-xs text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-[#E8DFD8] dark:border-[#2D2B28] flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-[#8C7A6B] dark:text-[#A69E96] hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Atelier Defaults</span>
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 rounded-xl border border-[#E8DFD8] dark:border-[#2D2B28] bg-white dark:bg-[#1E1D1B] text-xs font-bold text-[#5E5955] dark:text-[#A69E96] hover:text-[#1C1B1A] dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="py-2 px-5 rounded-xl bg-[#1C1B1A] hover:bg-black dark:bg-[#FAF8F5] dark:hover:bg-white text-[#D4AF37] dark:text-[#1C1B1A] border border-[#D4AF37]/60 text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save All Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
