import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  MapPin, 
  Award, 
  Users, 
  Heart, 
  ShieldCheck, 
  ArrowRight, 
  MessageCircle, 
  Instagram, 
  Clock, 
  CheckCircle2, 
  ShoppingBag,
  ExternalLink,
  Edit3,
  Lock,
  Upload,
  Camera,
  Check
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  ArtisanProfileData, 
  getArtisanProfile,
  saveArtisanProfile 
} from '../data/artisanProfile';
import { ArtisanProfileEditModal } from './ArtisanProfileEditModal';
import { compressImage } from '../utils/imageCompressor';
import { getFreshArtisanAvatarUrl } from '../utils/storageAssetUtils';

export const MeetArtisanSection: React.FC = () => {
  const { setActiveNavTab, isSellerMode, artisanProfile, updateArtisanProfile } = useCart();
  const { language } = useLanguage();
  const isNe = language === 'ne';

  const profile = artisanProfile;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [photoUpdatedToast, setPhotoUpdatedToast] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoFile = async (file: File) => {
    try {
      const compressedUrl = await compressImage(file, 800, 1000, 0.85);
      const updated = {
        ...profile,
        avatarUrl: compressedUrl,
        avatarPosition: profile.avatarPosition || 'center 20%'
      };
      await updateArtisanProfile(updated);
      setPhotoUpdatedToast(true);
      setTimeout(() => setPhotoUpdatedToast(false), 3000);
    } catch (err) {
      console.warn('Notice: Error compressing artisan photo:', err);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handlePhotoFile(file);
    }
  };

  const handleWhatsApp = () => {
    const phone = profile.whatsappPhone || '9779767573721';
    const text = encodeURIComponent(
      isNe
        ? (profile.whatsappGreetingNe || 'नमस्ते सहिना दिदी! 🌸 मैले Artified वेबसाइटमा तपाईंको कथा पढें र हस्तनिर्मित मोती/म्याक्रामे सिर्जनाबारे कुरा गर्न चाहन्छु।')
        : (profile.whatsappGreetingEn || 'Namaste Sahina! 🌸 I just read your story on Artified Nepal and would love to consult with you regarding your handcrafted pearl creations.')
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const handleShop = () => {
    setActiveNavTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-[#FAF8F5] dark:bg-[#0F0E0E] pt-0.5 sm:pt-1 pb-4 sm:pb-6 px-3 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-3 sm:space-y-4">
        
        {/* Photo Updated Toast */}
        {photoUpdatedToast && (
          <div className="p-3 bg-emerald-600 text-white font-bold text-xs rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-200" />
              <span>Sahina Shrestha's founder & creator photo updated & saved live!</span>
            </div>
            <button 
              type="button" 
              onClick={() => setPhotoUpdatedToast(false)}
              className="text-white/80 hover:text-white text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hidden File Input for 1-Click Upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="image/*"
          className="hidden"
        />

        {/* SELLER DIRECT EDIT BANNER (Visible only to the seller) */}
        {isSellerMode && (
          <div className="bg-gradient-to-r from-[#1C1B1A] via-[#2A2724] to-[#1C1B1A] dark:from-[#1E1D1B] dark:to-[#121110] text-white p-2.5 sm:p-3 rounded-2xl border border-[#D4AF37]/50 shadow-md flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                <Edit3 className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Seller Edit Mode Active</span>
                  <span className="text-[9px] text-[#D4AF37] bg-[#D4AF37]/20 px-1.5 py-0.2 rounded font-semibold uppercase">
                    Live
                  </span>
                </p>
                <p className="text-[10px] text-[#A69E96]">
                  Edit Sahina's bio, quotes, photos, 4 craft pillars, and stats directly.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-1 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer border border-white/20"
                title="Select image from device"
              >
                <Upload className="w-3 h-3 text-[#D4AF37]" />
                <span>Upload Photo</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="py-1 px-3 rounded-xl bg-[#D4AF37] hover:bg-[#c29f2e] text-[#1C1B1A] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        )}

        {/* HERO BANNER SECTION */}
        <section className="bg-white dark:bg-[#181716] rounded-3xl p-3.5 sm:p-5 border border-[#E8DFD8] dark:border-[#2D2B28] shadow-sm relative overflow-hidden transition-colors">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Atelier Location Strip */}
          <div className="flex items-center justify-between pb-2.5 mb-3 sm:mb-4 border-b border-[#F0EBE5] dark:border-[#262422] flex-wrap gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-[#201F1D] border border-[#E8DFD8] dark:border-[#33302C] text-[#8C5D36] dark:text-[#E6CA9E] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
              <MapPin className="w-3 h-3 text-[#D4AF37]" />
              <span>Kathmandu, Nepal</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-[#736C65] dark:text-[#A69E96]">
                {profile.establishedText || 'Est. 2024 • 100% Handcrafted in Nepal'}
              </span>

              {/* Direct Edit & Upload Buttons - Restricted exclusively to Seller Mode */}
              {isSellerMode && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#1E1D1B] border border-[#E8DFD8] dark:border-[#3A3835] hover:border-[#D4AF37] text-xs font-bold text-[#1C1B1A] dark:text-[#FAF8F5] shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                    title="Upload Sahina's photo from computer or phone"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span className="hidden sm:inline">Upload Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8F5] dark:bg-[#252422] border border-[#E8DFD8] dark:border-[#3A3835] hover:border-[#D4AF37] text-xs font-bold text-[#8C5D36] dark:text-[#E6CA9E] shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                    title="Edit profile details"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Edit Profile</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Main 2-Column Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 items-start">
            
            {/* Left: Founder & Creator Portrait */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDrop}
                className={`relative w-full max-w-sm aspect-[4/5] rounded-2xl overflow-hidden shadow-lg border-2 transition-all bg-[#1C1B1A] group ${
                  isDraggingOver ? 'border-emerald-400 scale-102 ring-4 ring-emerald-400/40' : 'border-[#D4AF37]/40'
                }`}
              >
                <img
                  src={getFreshArtisanAvatarUrl(profile.avatarUrl, profile.avatarUpdatedAt)}
                  alt="Sahina Shrestha - Founder & Creator"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/artisan_avatar.png';
                  }}
                  style={{ objectPosition: profile.avatarPosition || 'center 20%' }}
                  className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                />

                {/* Direct Action Buttons over photo - Strictly Seller Mode */}
                {isSellerMode && (
                  <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-1 px-2.5 rounded-full bg-black/85 hover:bg-black text-[#D4AF37] border border-[#D4AF37]/60 text-[10px] font-bold flex items-center gap-1.5 shadow-md transition-all hover:scale-105 cursor-pointer backdrop-blur-xs"
                      title="Upload Sahina's photo from computer or phone"
                    >
                      <Upload className="w-3 h-3 text-[#D4AF37]" />
                      <span>Upload Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(true)}
                      className="py-1 px-2 rounded-full bg-black/85 hover:bg-black text-white hover:text-[#D4AF37] border border-white/30 text-[10px] font-bold flex items-center gap-1 shadow-md transition-all hover:scale-105 cursor-pointer backdrop-blur-xs"
                      title="Edit profile details"
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}

                {/* Drag over overlay hint */}
                {isDraggingOver && (
                  <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white z-30 p-4 text-center">
                    <Upload className="w-8 h-8 text-emerald-400 mb-2 animate-bounce" />
                    <p className="font-bold text-sm">Drop Sahina's Photo Here</p>
                    <p className="text-[10px] text-emerald-200">Will instantly update & save profile</p>
                  </div>
                )}

                {/* Subtle gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                {/* Floating Founder & Creator Bio Pill */}
                <div className="absolute bottom-3 left-3 right-3 text-white z-10 space-y-0.5">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D4AF37] text-[#1C1B1A] text-[9px] font-bold uppercase tracking-wider shadow-sm">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Founder & Creator</span>
                  </div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-white flex items-center justify-between">
                    <span>{profile.artisanName || 'Sahina Shrestha'}</span>
                    {isSellerMode && (
                      <button
                        type="button"
                        onClick={() => setIsEditModalOpen(true)} 
                        className="text-[10px] text-[#D4AF37] hover:text-white font-sans font-medium underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                        <span>Edit</span>
                      </button>
                    )}
                  </h3>
                  <p className="text-[11px] text-white/80">
                    Kathmandu, Nepal
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Story, Philosophy & Journey */}
            <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl text-[#1C1B1A] dark:text-[#F5F2EB] font-semibold tracking-tight">
                    Meet the Founder & Creator: Sahina Shrestha
                  </h1>
                  {isSellerMode && (
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(true)}
                      className="p-1 rounded-lg text-[#8C7A6B] hover:text-[#1C1B1A] dark:hover:text-[#FAF8F5] transition-colors cursor-pointer shrink-0"
                      title="Edit headline"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#C5A880]" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#8C5D36] dark:text-[#E6CA9E] font-medium tracking-wide uppercase">
                  From Childhood Passion to Creative Journey
                </p>
              </div>

              {/* Founder and Creator Story & Philosophy */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] dark:bg-[#201F1D] border border-[#E8DFD8] dark:border-[#33302C] relative group space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-[#1C1B1A] dark:bg-[#121110] text-[#D4AF37] text-[9px] font-bold uppercase tracking-widest rounded-full border border-[#D4AF37]/30">
                    {isNe ? 'संस्थापक र सिर्जनाकर्ताको यात्रा' : 'Founder & Creator Journey'}
                  </span>
                  {isSellerMode && (
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(true)}
                      className="text-[10px] font-semibold text-[#8C5D36] dark:text-[#E6CA9E] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 text-xs sm:text-[13px] text-[#2C2926] dark:text-[#F5F2EB] leading-relaxed">
                  <p>
                    My love for art and crafts began in childhood, inspired by watching my mother create beautiful handicrafts. I have always been drawn to unique and different designs, especially those inspired by cultures around the world.
                  </p>
                  <p>
                    When I couldn’t find the pieces I loved in the local market, I started creating them myself. What began as a personal passion soon received appreciation from others, encouraging me to share my creations and turn my creativity into a small business.
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E8DFD8] dark:border-[#2D2B28] space-y-2">
                  <h3 className="font-serif font-bold text-xs sm:text-sm text-[#1C1B1A] dark:text-[#FAF8F5]">
                    Why “Artified”?
                  </h3>
                  <div className="space-y-2.5 text-xs sm:text-[13px] text-[#2C2926] dark:text-[#F5F2EB] leading-relaxed">
                    <p>
                      Artified comes from the combination of “Art” and “Modified.” It reflects my belief that creativity can transform ordinary ideas into something unique and meaningful.
                    </p>
                    <p>
                      Every creation is an opportunity to experiment, add a personal touch, and make something truly different. What began as childhood curiosity has grown into a journey of creativity, learning, and entrepreneurship—with the goal of creating pieces that make people think, “I haven’t seen this before.”
                    </p>
                  </div>
                </div>
              </div>

              {/* Call-to-Action Buttons */}
              <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-[#1C1B1A] hover:bg-black dark:bg-[#FAF8F5] dark:hover:bg-white text-[#D4AF37] dark:text-[#1C1B1A] border border-[#D4AF37]/60 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span>{isNe ? 'सहिनासँग ह्वाट्सएपमा कुरा गर्नुहोस्' : 'Consult Sahina on WhatsApp'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShop}
                  className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-[#FAF8F5] hover:bg-[#F2ECE4] dark:bg-[#201F1D] dark:hover:bg-[#292825] text-[#1C1B1A] dark:text-[#F5F2EB] border border-[#E8DFD8] dark:border-[#33302C] text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                >
                  <span>{isNe ? 'सिर्जनाहरू हेर्नुहोस्' : 'Browse Creations'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 24-Hour Easy Exchange Guarantee Banner */}
              <div className="px-3.5 py-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-[#D4AF37]/40 flex items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                  <span className="font-semibold text-[11px] sm:text-xs text-[#1C1B1A] dark:text-[#FAF8F5]">
                    {profile.guaranteeText || '24-Hour Easy Exchange Guarantee across Nepal'}
                  </span>
                </div>

                <a
                  href={`https://www.instagram.com/${(profile.instagramHandle || 'artified_np').replace('@', '')}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#E1306C] font-bold hover:underline flex items-center gap-1 shrink-0"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>{profile.instagramHandle || '@artified_np'}</span>
                </a>
              </div>

            </div>

          </div>

        </section>

      </div>

      {/* Artisan Profile Direct Editor Modal */}
      <ArtisanProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSaved={() => {}}
      />
    </div>
  );
};
