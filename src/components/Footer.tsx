import React, { useState } from 'react';
import { 
  Sparkles, 
  MapPin, 
  Phone, 
  Mail, 
  Heart, 
  ShieldCheck, 
  Truck, 
  ArrowUp, 
  Check,
  Lock,
  Instagram,
  ArrowUpRight,
  Users,
  ExternalLink,
  HelpCircle,
  ArrowRight,
  Crown,
  Gift,
  Globe
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { ArtifiedLogo } from './ArtifiedLogo';

export const Footer: React.FC = () => {
  const { 
    setSelectedCategory, 
    openTracker, 
    setIsSellerAuthModalOpen, 
    setActiveNavTab,
    openOrderFAQsModal,
    openAccountModal,
    openReferralModal,
    isReferralVisible,
    instagramHandle,
    instagramProfileUrl
  } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const isNe = language === 'ne';
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setSubscribed(true);
      setTimeout(() => {
        setEmailInput('');
        setSubscribed(false);
      }, 4000);
    }
  };

  const handleNavCategory = (category: string) => {
    setActiveNavTab('home');
    setSelectedCategory(category);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#1C1B1A] text-[#FAF8F5] pt-6 sm:pt-8 pb-20 lg:pb-10 border-t border-[#2B2927]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Middle Footer Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          
          {/* Column 1: Brand Info */}
          <div className="space-y-4">
            <div>
              <ArtifiedLogo variant="light" size="lg" />
              <p className="text-[10px] tracking-widest uppercase text-[#C5A880] mt-1 font-medium">
                Kathmandu Atelier, Nepal
              </p>
            </div>
            <p className="text-xs text-[#A69E96] leading-relaxed">
              Handmade pearl evening bags, freshwater baroque chokers, and macrame creations woven with patient mastery in Kathmandu, Nepal.
            </p>
            <div className="flex flex-col gap-2 pt-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-[#8C7A6B] tracking-wider block">
                Official Channels:
              </span>
              <a
                href={instagramProfileUrl || 'https://www.instagram.com/artified_np/'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#833ab4]/20 via-[#fd1d1d]/20 to-[#fcb045]/20 bg-[#E1306C]/15 border border-[#E1306C]/40 hover:border-[#E1306C] hover:bg-[#E1306C]/25 text-white transition-all group shadow-xs"
              >
                <Instagram className="w-4 h-4 text-[#E1306C] group-hover:scale-110 transition-transform" />
                <div className="text-left flex-1 min-w-0">
                  <span className="font-semibold text-xs block text-white group-hover:text-pink-200 transition-colors">{instagramHandle || '@artified_np'}</span>
                  <span className="text-[10px] text-[#D8B4C8]">Instagram • Store & Journal</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#E1306C] group-hover:text-white" />
              </a>

              <a
                href="https://tiktok.com/@artified_np"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-black hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white transition-all group shadow-xs"
              >
                <svg className="w-4 h-4 fill-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
                </svg>
                <div className="text-left flex-1 min-w-0">
                  <span className="font-semibold text-xs block text-white group-hover:text-zinc-200 transition-colors">@artified_np</span>
                  <span className="text-[10px] text-[#A69E96]">TikTok • Viral Clips & Drops</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white" />
              </a>
            </div>
          </div>

          {/* Column 2: Handcrafted Categories */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-[0.18em] text-[#C5A880] mb-4">
              {t('navCreations')}
            </h5>
            <ul className="space-y-2.5 text-xs text-[#A69E96]">
              <li>
                <button
                  type="button"
                  onClick={() => handleNavCategory('pearl-bags')}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  {t('navPearlBags')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNavCategory('pearl-necklaces')}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  {t('navPearlNecklaces')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNavCategory('macrame')}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  {t('navMacrame')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNavCategory('accessories')}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  {t('navAccessories')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNavCategory('new-arrivals')}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  {t('navNewArrivals')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNavCategory('best-sellers')}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  {t('navBestSellers')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveNavTab('tiktok');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors flex items-center gap-1.5 text-left cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
                  </svg>
                  <span>Follow on TikTok</span>
                </button>
              </li>
              <li>
                <a
                  href={instagramProfileUrl || 'https://www.instagram.com/artified_np/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5 text-left cursor-pointer"
                >
                  <Instagram className="w-3.5 h-3.5 text-[#E1306C] shrink-0" />
                  <span>Follow on Instagram ({instagramHandle || '@artified_np'})</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Client Care & Policies */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-[0.18em] text-[#C5A880] mb-4">
              Client Care
            </h5>
            <ul className="space-y-2.5 text-xs text-[#A69E96]">
              <li>
                <button
                  type="button"
                  onClick={openOrderFAQsModal}
                  className="hover:text-white text-[#D4AF37] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Order FAQs & Policies (Shipping, Durability, Returns)</span>
                </button>
              </li>
              {isReferralVisible && (
                <li>
                  <button
                    type="button"
                    onClick={openReferralModal}
                    className="hover:text-[#D4AF37] text-[#D4AF37] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                  >
                    <Gift className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Refer a Friend (Get 10% Off)</span>
                  </button>
                </li>
              )}
              <li>
                <a
                  href="https://wa.me/9779767573721"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 transition-colors font-semibold flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 fill-current text-emerald-400 shrink-0" viewBox="0 0 24 24">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.43 12.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z"/>
                  </svg>
                  <span>Direct WhatsApp Helpdesk</span>
                </a>
              </li>
              <li>
                <a
                  href={`https://ig.me/m/${(instagramHandle || 'artified_np').replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#fcb045] hover:text-[#fd1d1d] transition-colors font-semibold flex items-center gap-1.5"
                >
                  <Instagram className="w-3.5 h-3.5 text-[#E1306C] shrink-0" />
                  <span>Direct Instagram DM ({instagramHandle || '@artified_np'})</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Store Nepal */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-[0.18em] text-[#C5A880] mb-4">
              Store & Orders
            </h5>
            <div className="flex items-start gap-2.5 text-xs text-[#A69E96]">
              <MapPin className="w-4 h-4 text-[#C5A880] shrink-0 mt-0.5" />
              <span>Kathmandu, Nepal</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#A69E96]">
              <Phone className="w-4 h-4 text-[#C5A880] shrink-0" />
              <span>+977 9767573721 (Call / WhatsApp)</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#A69E96]">
              <Mail className="w-4 h-4 text-[#C5A880] shrink-0" />
              <span>artified.np0@gmail.com</span>
            </div>

            {/* Accepted Local Payment Methods */}
            <div className="pt-2">
              <p className="text-[10px] uppercase tracking-wider text-[#736C65] font-semibold mb-2">
                Accepted In Nepal:
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 bg-[#2B2927] text-white text-[10px] rounded border border-[#3E3A36]">
                  Cash on Delivery (COD)
                </span>
                <span className="px-2 py-0.5 bg-[#60BB46]/20 text-[#82d66a] text-[10px] rounded border border-[#60BB46]/40 font-semibold">
                  eSewa
                </span>
                <span className="px-2 py-0.5 bg-[#5D2E8E]/20 text-[#a379d4] text-[10px] rounded border border-[#5D2E8E]/40 font-semibold">
                  Khalti
                </span>
                <span className="px-2 py-0.5 bg-[#2B2927] text-white text-[10px] rounded border border-[#3E3A36]">
                  Fonepay QR
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#2B2927] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#736C65]">
          <div className="flex flex-wrap items-center gap-3">
            <p>© {new Date().getFullYear()} Artified_np. {t('rightsReserved')}</p>
            <span className="text-[#3A3530]">•</span>
            {/* Discreet Studio Portal Access for the seller (Hidden from regular shoppers) */}
            <button
              type="button"
              onClick={() => setIsSellerAuthModalOpen(true)}
              className="text-[10px] text-[#4A4540] hover:text-[#A69E96] transition-colors flex items-center gap-1 cursor-pointer focus:outline-none"
              title="Seller Studio Login (Passcode required)"
            >
              <span>Studio</span>
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-[#262320] p-1 rounded-xl border border-[#3E3A36] shadow-xs">
              <Globe className="w-3.5 h-3.5 text-[#C5A880] ml-1.5" />
              <button
                type="button"
                onClick={() => setLanguage('en')}
                aria-label="Switch website language to English"
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-[#FAF8F5] text-[#1C1B1A] font-bold shadow-xs'
                    : 'text-[#A69E96] hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ne')}
                aria-label="Switch website language to Nepali"
                className={`px-2.5 py-1 rounded-lg text-[11px] font-serif font-bold transition-all cursor-pointer ${
                  language === 'ne'
                    ? 'bg-[#FAF8F5] text-[#1C1B1A] font-bold shadow-xs'
                    : 'text-[#A69E96] hover:text-white'
                }`}
              >
                नेपाली
              </button>
            </div>

            <span className="hidden sm:inline text-[#3A3530]">•</span>
            <span className="text-[11px]">{t('pricingInNpr')}</span>
            <span>•</span>
            <button
              onClick={scrollToTop}
              className="flex items-center gap-1 text-[#A69E96] hover:text-white transition-colors cursor-pointer"
            >
              <span>{t('backToTop')}</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
