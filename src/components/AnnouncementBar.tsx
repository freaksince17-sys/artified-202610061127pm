import React, { useState } from 'react';
import { Sparkles, MapPin, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const AnnouncementBar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const { language, t } = useLanguage();
  const isNe = language === 'ne';

  if (!isVisible) return null;

  return (
    <aside 
      aria-label="Announcement banner"
      className="bg-[#1C1B1A] text-[#FAF8F5] text-xs font-medium py-1 sm:py-1.5 px-3 sm:px-4 transition-all duration-300 relative z-40 border-b border-[#2B2927]"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Region pill */}
        <div className="hidden sm:flex items-center gap-1.5 text-[#C5A880] tracking-wider uppercase text-[9px] sm:text-[10px]">
          <MapPin className="w-3 h-3 text-[#D4AF37]" />
          <span>{t('announcementStore')}</span>
        </div>

        {/* Central message */}
        <div className="flex-1 text-center flex items-center justify-center gap-1.5 flex-wrap">
          <Sparkles className="w-3 h-3 text-[#D4AF37] animate-pulse shrink-0" />
          <p className="tracking-wide text-[10px] sm:text-[11px]">
            {isNe ? (
              <>
                काठमाडौं, नेपालबाट हस्तनिर्मित • <span className="font-semibold text-[#D4AF37]">२४ घण्टाभित्र सजिलो साटफेर</span> • कोड <span className="font-semibold text-[#D4AF37] tracking-widest underline decoration-dotted">TIKTOK10</span> प्रयोग गरी १०% छुट!
              </>
            ) : (
              <>
                Handcrafted in Kathmandu, Nepal • <span className="font-semibold text-[#D4AF37]">Easy exchange within 24 hrs</span> • Code <span className="font-semibold text-[#D4AF37] tracking-widest underline decoration-dotted">TIKTOK10</span> for 10% off
              </>
            )}
          </p>
        </div>

        {/* Close button */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => setIsVisible(false)}
            className="text-[#A69E96] hover:text-[#FAF8F5] transition-colors p-0.5 rounded focus:outline-none cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
