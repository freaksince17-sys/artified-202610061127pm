import React, { useState, useMemo } from 'react';
import { 
  X, 
  HelpCircle, 
  Search, 
  Truck, 
  ShieldCheck, 
  RefreshCw, 
  Gift, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  MessageCircle, 
  Ruler, 
  PackageCheck,
  CheckCircle2
} from 'lucide-react';
import { useCart } from '../context/CartContext';

interface FAQItem {
  id: string;
  category: 'shipping' | 'durability' | 'returns' | 'packaging';
  question: string;
  answer: string;
  badge?: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'ship-1',
    category: 'shipping',
    question: 'How long does delivery take inside Kathmandu Valley and across Nepal?',
    answer: 'Kathmandu Valley: Rs. 120 (1 to 2 days doorstep delivery). Outside Valley: Rs. 250 to 300 (can increase depending on location/weight, 3 to 7 days delivery via express courier).',
    badge: 'Fast Dispatch'
  },
  {
    id: 'ship-2',
    category: 'shipping',
    question: 'What payment methods are supported for orders in Nepal?',
    answer: 'We offer Cash on Delivery (COD) across the Kathmandu Valley and selected major cities. For nationwide orders, we accept instant digital wallet payments via eSewa and Khalti with QR code verification at checkout.',
    badge: 'COD & eSewa'
  },
  {
    id: 'ship-3',
    category: 'shipping',
    question: 'Can I inspect the parcel at my doorstep before paying?',
    answer: 'Yes! We encourage doorstep inspection. You can verify the packaging and handcrafted piece with the courier rider before completing Cash on Delivery payment.',
  },
  {
    id: 'dur-1',
    category: 'durability',
    question: 'How durable are Artified pearl bags? Will the wire snap under weight?',
    answer: 'Our pearl handbags are handwoven with an aerospace-grade 7-strand nylon-coated stainless steel core wire. Unlike ordinary nylon thread, our steel core cannot snap under normal usage and is engineered to comfortably support up to 1.5 kg (iPhone Pro Max, wallet, keys, cosmetics, and chargers).',
    badge: 'Steel Core Wire'
  },
  {
    id: 'dur-2',
    category: 'durability',
    question: 'Are the pearls real? Will the luster fade or peel?',
    answer: 'We craft using genuine freshwater cultured pearls, organic baroque pearls, and high-density Austrian luster pearls with scratch-resistant nacre coating. They are hypoallergenic, nickel-free, and lead-free. Follow our "Last On, First Off" perfume rule to preserve radiant luster for years.',
  },
  {
    id: 'dur-3',
    category: 'durability',
    question: 'What if my piece needs restringing or tension adjustment later?',
    answer: 'We stand behind our handmade craft! All Artified creations include complimentary lifetime tension checkups and restringing warranty at our workshop in Kathmandu, Nepal.',
    badge: 'Lifetime Workshop Warranty'
  },
  {
    id: 'ret-1',
    category: 'returns',
    question: 'What is your return and exchange policy?',
    answer: 'We offer an easy 24-hour exchange policy from delivery. If you need a different choker length, ring size, or bag color, simply message us on WhatsApp (+977 9767573721) and we will arrange a smooth doorstep swap.',
    badge: '24-Hr Easy Exchange'
  },
  {
    id: 'ret-2',
    category: 'returns',
    question: 'What happens if an item is damaged during transit?',
    answer: 'Transit safety is 100% our responsibility. If your package arrives damaged, take a quick photo and WhatsApp our atelier within 48 hours for an immediate, free replacement or repair.',
  },
  {
    id: 'ret-3',
    category: 'returns',
    question: 'Can I order a custom made-to-measure choker length for bridal wear?',
    answer: 'Yes! Founder Sahina Shrestha customizes necklace lengths, choker collar drops, and bag strap chains for brides, bridesmaids, and traditional Newari Haku Patasi / Banarasi attire. Reach out via WhatsApp with your preferred centimeter dimensions.',
  },
  {
    id: 'pack-1',
    category: 'packaging',
    question: 'How is each order packaged for gifting?',
    answer: 'Every Artified creation arrives in a luxury rigid gift box with satin ribbon, a breathable raw cotton dust bag, and a handwritten botanical calligraphy card sealed with hot burgundy wax.',
    badge: 'Wax-Sealed Luxury'
  }
];

interface OrderFAQsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrderFAQsModal: React.FC<OrderFAQsModalProps> = ({ isOpen, onClose }) => {
  const { setIsTrackerOpen } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'shipping' | 'durability' | 'returns' | 'packaging'>('all');
  const [expandedIds, setExpandedIds] = useState<string[]>(['ship-1', 'dur-1', 'ret-1']);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredFAQs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return FAQ_ITEMS.filter((item) => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory;
      const matchSearch = !q || item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [searchQuery, activeCategory]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-5 md:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#1C1B1A]/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Main Modal Box */}
      <div 
        className="relative bg-[#FAF8F5] w-full max-w-2xl rounded-3xl shadow-2xl border-2 border-[#D4AF37]/50 overflow-hidden z-10 flex flex-col text-[#1C1B1A] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1C1B1A] text-white p-5 sm:p-6 flex items-center justify-between border-b border-[#34312F]">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider border border-[#D4AF37]/30">
              <HelpCircle className="w-3 h-3" />
              <span>Customer Help & Information</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
              Order FAQs & Policies
            </h2>
            <p className="text-xs text-[#A69E96]">
              Handcrafted in Kathmandu, Nepal • Fast shipping, durability & exchanges
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#A69E96] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 bg-white border-b border-[#E8DFD8] space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search delivery time, steel wire durability, exchange policy..."
              className="w-full pl-10 pr-3 py-2 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs text-[#1C1B1A] focus:outline-none focus:border-[#C5A880]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8C847E] hover:text-black"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            {[
              { id: 'all', label: 'All FAQs' },
              { id: 'shipping', label: '🚚 Shipping & COD' },
              { id: 'durability', label: '🛡️ Wire Durability' },
              { id: 'returns', label: '🔄 24-Hr Exchange' },
              { id: 'packaging', label: '🎁 Luxury Packaging' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === tab.id
                    ? 'bg-[#1C1B1A] text-[#D4AF37] shadow-xs'
                    : 'bg-[#FAF8F5] text-[#5E5955] hover:bg-[#E8DFD8] border border-[#E8DFD8]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Accordion Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-xs text-[#736C65]">No matching FAQ found for &ldquo;{searchQuery}&rdquo;</p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                className="text-xs text-[#C5A880] font-bold underline"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            filteredFAQs.map((faq) => {
              const isExpanded = expandedIds.includes(faq.id);

              return (
                <div 
                  key={faq.id}
                  className="bg-white rounded-2xl border border-[#E8DFD8] shadow-2xs overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(faq.id)}
                    className="w-full p-3.5 sm:p-4 text-left flex items-start justify-between gap-3 hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-[#1C1B1A]">
                          {faq.question}
                        </span>
                        {faq.badge && (
                          <span className="text-[9px] bg-amber-50 text-amber-900 border border-[#D4AF37]/40 px-2 py-0.2 rounded-full font-bold uppercase">
                            {faq.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-1 text-[#8C7A6B] shrink-0 mt-0.5">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 text-xs text-[#5E5955] leading-relaxed border-t border-[#F0EBE5] bg-[#FAF8F5]/60 animate-in fade-in duration-150">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Quick Helper Links Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                setIsTrackerOpen(true);
              }}
              className="p-3 rounded-2xl bg-white border border-[#E8DFD8] hover:border-[#C5A880] text-left flex items-center justify-between text-xs transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#C5A880]" />
                <span className="font-semibold text-[#1C1B1A]">Track an Existing Order</span>
              </div>
              <span className="text-[10px] text-[#8C7A6B] font-bold">&rarr;</span>
            </button>
          </div>
        </div>

        {/* Footer WhatsApp Direct Contact */}
        <div className="p-4 bg-[#1C1B1A] text-white flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#34312F]">
          <div className="text-center sm:text-left space-y-0.5">
            <p className="font-serif text-xs font-bold text-[#D4AF37]">
              Have a specific question about an upcoming occasion?
            </p>
            <p className="text-[10px] text-[#A69E96]">
              Sahina Shrestha is directly available on WhatsApp for custom assistance.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              window.open('https://wa.me/9779767573721?text=Namaste%20Sahina!%20I%20have%20an%20order%20inquiry%20regarding%20Artified%20creations.', '_blank');
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#20ba59] to-[#25D366] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:brightness-105 transition-all cursor-pointer shrink-0"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Chat on WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
