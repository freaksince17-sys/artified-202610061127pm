import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  MessageCircle, 
  CheckCircle2, 
  Layers
} from 'lucide-react';
import { WorkshopMediaItem, WorkshopGroup } from '../types';
import { fetchWorkshopMedia, fetchWorkshopGroups, buildWorkshopGroups, WORKSHOP_GROUPS_METADATA } from '../data/workshops';
import { WorkshopThreeGroupStoryFeed } from './WorkshopThreeGroupStoryFeed';
import { WorkshopLightboxModal } from './WorkshopLightboxModal';
import { useCart } from '../context/CartContext';

export const WorkshopHighlightsSection: React.FC = () => {
  const { setActiveNavTab } = useCart();
  const [mediaItems, setMediaItems] = useState<WorkshopMediaItem[]>([]);
  const [groupMetas, setGroupMetas] = useState<Omit<WorkshopGroup, 'items'>[]>(WORKSHOP_GROUPS_METADATA);
  const [lightboxItems, setLightboxItems] = useState<WorkshopMediaItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchWorkshopMedia().then((data) => {
      if (isMounted && data) {
        setMediaItems(data);
      }
    });
    fetchWorkshopGroups().then((groups) => {
      if (isMounted && groups) {
        setGroupMetas(groups);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const workshopGroups = buildWorkshopGroups(mediaItems, groupMetas);

  const handleOpenLightbox = (items: WorkshopMediaItem[], initialIndex: number) => {
    setLightboxItems(items);
    setLightboxIndex(initialIndex);
  };

  const openWhatsAppRegister = () => {
    const phone = '9779767573721';
    const text = encodeURIComponent(
      'Namaste Sahina Shrestha! ✨ I saw the handmade workshops on your website and would love to register for your upcoming handcrafting training batch in Kathmandu.'
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <section className="w-full my-6 sm:my-8 px-3 sm:px-5 lg:px-7 max-w-[1360px] mx-auto">
      {/* Section Container Card with reduced padding and compact layout */}
      <div className="bg-gradient-to-b from-[#F5EFE6]/50 via-white to-white dark:from-[#181615] dark:via-[#141312] dark:to-[#121110] border border-[#E8DFD8] dark:border-[#262422] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 lg:p-6 shadow-xs relative overflow-hidden">
        
        {/* Section Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 sm:mb-5 pb-3.5 border-b border-[#E8DFD8]/80 dark:border-[#262422]">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-[#C5A880]/15 text-[#8C5D36] dark:text-[#E6CA9E] border border-[#C5A880]/30 mb-1.5">
              <Sparkles className="w-3 h-3 text-[#C5A880]" />
              <span>{workshopGroups.length > 0 ? `${workshopGroups.length} Dedicated Workshop Batch${workshopGroups.length > 1 ? 'es' : ''}` : 'Artisan Handcrafting Workshops'}</span>
            </div>

            <h2 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-[#1C1B1A] dark:text-[#FAF8F5] tracking-tight leading-snug">
              Artisan Training & Workshops
            </h2>

            <p className="text-xs sm:text-sm text-[#5E5955] dark:text-[#A69E96] leading-relaxed mt-1">
              Led by founder & master artisan <strong className="text-[#1C1B1A] dark:text-white font-semibold">Sahina Shrestha</strong>: 
              Hands-on practical training in natural fiber knotting, couture pearl beading, and sustainable floral wearable art in Kathmandu.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveNavTab('workshops');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1C1B1A] dark:bg-[#FAF8F5] text-white dark:text-[#1C1B1A] text-xs font-semibold uppercase tracking-wider hover:bg-[#383431] dark:hover:bg-white transition-all cursor-pointer shadow-xs"
            >
              <span>Explore Workshops Tab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={openWhatsAppRegister}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#201E1C] border border-[#25D366]/40 text-[#075E54] dark:text-[#25D366] hover:bg-[#25D366]/10 text-xs font-semibold transition-all cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
              <span>Join Next Batch</span>
            </button>
          </div>
        </div>

        {/* 3-Group Story Feed in Alternating Layout with Hover-to-Play */}
        <WorkshopThreeGroupStoryFeed
          groups={workshopGroups}
          onOpenLightbox={handleOpenLightbox}
        />

        {/* Bottom Banner */}
        <div className="mt-5 pt-4 border-t border-[#E8DFD8] dark:border-[#262422] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#5E5955] dark:text-[#A69E96]">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Limited-seat workshops conducted in Kathmandu, Nepal.</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveNavTab('workshops');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C5D36] dark:text-[#E6CA9E] hover:underline cursor-pointer"
          >
            <span>Browse Full Workshop Gallery</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <WorkshopLightboxModal
          isOpen={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          items={lightboxItems}
          currentIndex={lightboxIndex}
          onNavigate={(newIdx) => setLightboxIndex(newIdx)}
        />
      )}
    </section>
  );
};
