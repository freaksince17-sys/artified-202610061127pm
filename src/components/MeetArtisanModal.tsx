import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Sparkles, 
  Heart, 
  MessageCircle, 
  MapPin, 
  Award, 
  Users, 
  ShieldCheck, 
  ArrowRight,
  Instagram,
  Edit3,
  Save,
  Upload,
  Check,
  RotateCcw,
  Camera,
  Crosshair,
  Layers,
  Clock
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { 
  getArtisanProfile, 
  saveArtisanProfile, 
  ArtisanProfileData, 
  DEFAULT_ARTISAN_PROFILE 
} from '../data/artisanProfile';
import { compressImage } from '../utils/imageCompressor';

interface MeetArtisanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExploreProducts?: () => void;
}

export const MeetArtisanModal: React.FC<MeetArtisanModalProps> = ({
  isOpen,
  onClose,
  onExploreProducts
}) => {
  const { language } = useLanguage();
  const isNe = language === 'ne';
  const { isSellerMode, artisanProfile, updateArtisanProfile } = useCart();

  const profile = artisanProfile;
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<ArtisanProfileData>(() => artisanProfile);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEditForm(artisanProfile);
      setSaveSuccess(false);
      if (!isSellerMode) {
        setIsEditing(false);
      }
    }
  }, [isOpen, isSellerMode, artisanProfile]);

  useEffect(() => {
    if (!isSellerMode) {
      setIsEditing(false);
    }
  }, [isSellerMode]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedUrl = await compressImage(file, 800, 1000, 0.85);
        setEditForm((prev) => ({ 
          ...prev, 
          avatarUrl: compressedUrl,
          avatarPosition: prev.avatarPosition || 'center 20%'
        }));
      } catch (err) {
        console.warn('Error processing photo upload:', err);
      }
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateArtisanProfile(editForm);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsEditing(false);
    }, 700);
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Reset all artisan biography and images to original atelier defaults?')) {
      setEditForm({ ...DEFAULT_ARTISAN_PROFILE });
      await updateArtisanProfile({ ...DEFAULT_ARTISAN_PROFILE });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1200);
    }
  };

  const handleWhatsApp = () => {
    const phone = profile.whatsappPhone || '9779767573721';
    const text = encodeURIComponent(
      isNe
        ? (profile.whatsappGreetingNe || 'नमस्ते सहिना दिदी! 🌸 मैले Artified वेबसाइटमा तपाईंको कथा पढें र हस्तनिर्मित मोती/म्याक्रामे सिर्जनाबारे कुरा गर्न चाहन्छु।')
        : (profile.whatsappGreetingEn || 'Namaste Sahina! 🌸 I just read your story on Artified and would love to ask about your handcrafted pearl and macrame pieces.')
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const handleShop = () => {
    onClose();
    if (onExploreProducts) {
      onExploreProducts();
    } else {
      const el = document.getElementById('shop-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      {/* Dark Luxury Backdrop Click Surface */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-xs z-0 cursor-pointer"
        onClick={onClose}
        aria-label="Close modal backdrop"
      />

      {/* Modal Dialog Card - Concise and High-Density */}
      <div className="relative w-full max-w-lg bg-[#FAF8F5] dark:bg-[#141312] rounded-2xl sm:rounded-3xl shadow-2xl border border-[#D4AF37]/60 dark:border-[#2D2B28] overflow-hidden z-10 flex flex-col max-h-[90vh] text-[#1C1B1A] dark:text-[#F5F2EB] transition-colors animate-in fade-in zoom-in-95 duration-200">
        
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Compact Header */}
        <div className="relative bg-gradient-to-r from-[#1C1B1A] via-[#2A2623] to-[#1C1B1A] dark:from-[#1E1D1B] dark:to-[#121110] px-4 py-3 sm:px-5 sm:py-3.5 text-white overflow-hidden border-b border-[#D4AF37]/35 shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[#D4AF37]/10 blur-xl pointer-events-none" />

          {/* Prominent Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer focus:outline-none z-30 shadow-md"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-between gap-2 relative z-10 pr-6">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
                <Sparkles className="w-3 h-3" />
              </div>
              <div className="min-w-0">
                <h2 className="font-serif text-sm sm:text-base font-bold text-white tracking-tight truncate flex items-center gap-1.5">
                  <span>{isEditing ? editForm.artisanName : profile.artisanName}</span>
                  <span className="text-[8px] sm:text-[9px] font-sans font-bold px-1.5 py-0.2 rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 uppercase">
                    {isEditing ? editForm.artisanRole : profile.artisanRole}
                  </span>
                </h2>
                <p className="text-[9px] sm:text-[10px] text-[#C5A880] truncate">
                  {isEditing ? editForm.atelierLocation : profile.atelierLocation}
                </p>
              </div>
            </div>

            {/* Toggle Edit Button - Strictly for Seller Mode */}
            {isSellerMode && (
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`py-0.5 px-2 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs cursor-pointer shrink-0 ${
                  isEditing
                    ? 'bg-white text-[#1C1B1A] hover:bg-gray-100'
                    : 'bg-[#D4AF37] text-[#1C1B1A] hover:bg-[#C29F2E]'
                }`}
              >
                <Edit3 className="w-2.5 h-2.5" />
                <span>{isEditing ? 'Preview' : 'Edit Profile'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body - Tight Spacing & Maximum Content Efficiency */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2 text-[#1C1B1A] dark:text-[#F5F2EB]">
          
          {saveSuccess && (
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Founder & Creator biography and photo updated successfully!</span>
            </div>
          )}

          {isEditing ? (
            /* ================= EDIT MODE FORM ================= */
            <form onSubmit={handleSaveChanges} className="space-y-2.5">
              
              {/* Photo Upload & Framing Control */}
              <div className="p-2.5 bg-white dark:bg-[#1E1D1B] rounded-xl border border-[#E8DFD8] dark:border-[#2D2B28] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#8C5D36] dark:text-[#E6CA9E] flex items-center gap-1">
                    <Camera className="w-3 h-3 text-[#D4AF37]" />
                    <span>Sahina's Photo & Centered Focus</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] text-[#D4AF37] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-2.5 h-2.5" />
                    <span>Upload New Photo</span>
                  </button>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-[#1C1B1A] shrink-0 border border-[#D4AF37]/50 shadow-xs">
                    <img
                      src={editForm.avatarUrl}
                      alt={editForm.artisanName}
                      style={{ 
                        objectFit: 'cover',
                        objectPosition: editForm.avatarPosition || 'center 20%' 
                      }}
                      className="w-full h-full"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/artisan_avatar.png';
                      }}
                    />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={editForm.avatarUrl}
                      onChange={(e) => setEditForm({ ...editForm, avatarUrl: e.target.value })}
                      required
                      placeholder="Image URL or Base64..."
                      className="w-full px-2 py-1 bg-[#FAF8F5] dark:bg-[#141312] border border-[#E8DFD8] dark:border-[#2D2B28] rounded text-[10px] text-[#1C1B1A] dark:text-[#F5F2EB] font-mono focus:outline-none"
                    />

                    {/* Quick Focus Alignment */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[9px] text-[#736C65] dark:text-[#A69E96]">Focus:</span>
                      {[
                        { label: 'Face & Smile (Default)', val: 'center 20%' },
                        { label: 'Headshot', val: 'center 12%' },
                        { label: 'Waist-Up', val: 'center 35%' }
                      ].map((pos) => (
                        <button
                          key={pos.val}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, avatarPosition: pos.val })}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-medium border transition-colors cursor-pointer ${
                            (editForm.avatarPosition || 'center 20%') === pos.val
                              ? 'bg-[#1C1B1A] dark:bg-[#FAF8F5] text-[#D4AF37] dark:text-[#1C1B1A] border-[#D4AF37] font-bold'
                              : 'bg-[#FAF8F5] dark:bg-[#252422] text-[#5E5955] dark:text-[#A69E96] border-[#E8DFD8] dark:border-[#33302C]'
                          }`}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Name & Title */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-[#1C1B1A] dark:text-[#F5F2EB] mb-0.5">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editForm.artisanName}
                    onChange={(e) => setEditForm({ ...editForm, artisanName: e.target.value })}
                    required
                    className="w-full px-2 py-1 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] rounded text-[11px] text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#1C1B1A] dark:text-[#F5F2EB] mb-0.5">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={editForm.artisanRole}
                    onChange={(e) => setEditForm({ ...editForm, artisanRole: e.target.value })}
                    required
                    className="w-full px-2 py-1 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] rounded text-[11px] text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none"
                  />
                </div>
              </div>

              {/* Biography & Quote */}
              <div>
                <label className="block text-[10px] font-bold text-[#1C1B1A] dark:text-[#F5F2EB] mb-0.5">
                  Sahina Shrestha's Biography & Story
                </label>
                <textarea
                  rows={4}
                  value={editForm.quote}
                  onChange={(e) => setEditForm({ ...editForm, quote: e.target.value })}
                  required
                  className="w-full px-2 py-1.5 bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#2D2B28] rounded text-[11px] text-[#1C1B1A] dark:text-[#F5F2EB] focus:outline-none leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-1.5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-[10px] text-[#8C7A6B] hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Defaults</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="py-1 px-2.5 rounded-lg border border-[#E8DFD8] dark:border-[#2D2B28] text-[11px] font-bold text-[#736C65] dark:text-[#A69E96] hover:text-[#1C1B1A] dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="py-1 px-3.5 rounded-lg bg-[#1C1B1A] hover:bg-black dark:bg-[#FAF8F5] dark:hover:bg-white text-[#D4AF37] dark:text-[#1C1B1A] border border-[#D4AF37]/60 text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* ================= VIEW MODE - CONCISE & HIGH DENSITY ================= */
            <div className="space-y-2">
              
              {/* Seller Mode Active Banner */}
              {isSellerMode && (
                <div className="p-2 rounded-xl bg-[#1C1B1A] dark:bg-[#1E1D1B] border border-[#D4AF37]/50 text-white flex items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Edit3 className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    <span className="text-[10px] font-bold text-[#D4AF37] truncate">Seller Studio Active</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-2.5 h-2.5 text-[#D4AF37]" />
                      <span>Upload Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-2.5 py-0.5 rounded-lg bg-[#D4AF37] hover:bg-[#c29f2e] text-[#1C1B1A] text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                      <span>Edit Bio & Story</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Top Hero: Sahina's Photo & Biography in Side-by-Side Unified Card */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#181716] border border-[#E8DFD8] dark:border-[#2D2B28] shadow-2xs flex flex-row items-center gap-3">
                
                {/* Primary Photo of Sahina Shrestha (object-fit: cover, centered focus) */}
                <div className="relative w-24 sm:w-28 aspect-[3/4] rounded-xl overflow-hidden bg-[#1C1B1A] shrink-0 border-2 border-[#D4AF37]/50 shadow-md group">
                  <img
                    src={
                      !profile.avatarUrl || profile.avatarUrl.includes('unsplash.com') || profile.avatarUrl.includes('photo-')
                        ? '/artisan_avatar.png'
                        : profile.avatarUrl
                    }
                    alt={`${profile.artisanName} - ${profile.artisanRole}`}
                    style={{ 
                      objectFit: 'cover', 
                      objectPosition: profile.avatarPosition || 'center 20%' 
                    }}
                    className="w-full h-full group-hover:scale-104 transition-transform duration-500"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/artisan_avatar.png';
                    }}
                  />
                  
                  {/* Quick Photo Upload Trigger */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[#D4AF37] gap-1 p-1 text-center cursor-pointer"
                    title="Upload Sahina's Photo"
                  >
                    <Camera className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-[8px] font-bold uppercase leading-tight">Change Photo</span>
                  </button>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-1 inset-x-1 text-center text-[8px] text-white font-bold truncate">
                    {profile.artisanName}
                  </div>
                </div>

                {/* Biography & Philosophy Quote - Tight Typography */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.2 rounded-full bg-[#FAF8F5] dark:bg-[#22211F] text-[#8C5D36] dark:text-[#E6CA9E] text-[8px] font-bold uppercase tracking-wider">
                      {isNe ? 'संस्थापक र सिर्जनाकर्ताको यात्रा' : 'Founder & Creator Journey'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-[9px] text-[#D4AF37] hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                    >
                      <Edit3 className="w-2 h-2" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#2C2926] dark:text-[#F5F2EB] leading-relaxed space-y-1.5">
                    {profile.quote.split('\n\n').map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>
                  {profile.whyArtified && (
                    <div className="pt-1.5 border-t border-[#E8DFD8] dark:border-[#2D2B28] text-[10px] text-[#5E5955] dark:text-[#A69E96] leading-relaxed space-y-1">
                      <span className="font-bold text-[#1C1B1A] dark:text-[#FAF8F5] block">Why “Artified”?</span>
                      {profile.whyArtified.split('\n\n').map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Compact Guarantee & Instagram Strip */}
              <div className="px-2 py-1 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-[#D4AF37]/30 dark:border-[#D4AF37]/20 flex items-center justify-between gap-2 text-[9px]">
                <div className="flex items-center gap-1 truncate">
                  <ShieldCheck className="w-3 h-3 text-[#D4AF37] shrink-0" />
                  <span className="font-medium text-[#1C1B1A] dark:text-[#FAF8F5] truncate">
                    {profile.guaranteeText || (isNe ? '२४ घण्टे सजिलो साटफेर ग्यारेन्टी' : '24-Hour Easy Exchange across Nepal')}
                  </span>
                </div>
                <a
                  href={`https://www.instagram.com/${(profile.instagramHandle || 'artified_np').replace('@', '')}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#E1306C] font-bold hover:underline flex items-center gap-0.5 shrink-0"
                >
                  <Instagram className="w-2.5 h-2.5" />
                  <span>{profile.instagramHandle || '@artified_np'}</span>
                </a>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Actions - Ultra Compact */}
        <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-white dark:bg-[#181716] border-t border-[#E8DFD8] dark:border-[#2D2B28] flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleShop}
            className="py-1.5 px-3 rounded-lg bg-[#FAF8F5] hover:bg-[#F2ECE4] dark:bg-[#22211F] dark:hover:bg-[#2A2926] text-[#1C1B1A] dark:text-[#F5F2EB] border border-[#E8DFD8] dark:border-[#33302C] text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
          >
            <span>{isNe ? 'सिर्जनाहरू' : 'Explore Pieces'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            className="py-1.5 px-3 sm:px-3.5 rounded-lg bg-[#1C1B1A] hover:bg-black dark:bg-[#FAF8F5] dark:hover:bg-white text-[#D4AF37] dark:text-[#1C1B1A] border border-[#D4AF37]/50 text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm active:scale-95"
          >
            <MessageCircle className="w-3 h-3 text-[#25D366]" />
            <span>{isNe ? 'ह्वाट्सएप' : 'DM Sahina'}</span>
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
