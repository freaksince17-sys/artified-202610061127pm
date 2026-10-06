import React, { useState } from 'react';
import { 
  X, 
  Ruler, 
  Sparkles, 
  Check, 
  HelpCircle, 
  MessageCircle, 
  ShoppingBag, 
  Layers, 
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'necklaces' | 'rings' | 'bags';
}

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'necklaces'
}) => {
  const [activeTab, setActiveTab] = useState<'necklaces' | 'rings' | 'bags'>(defaultTab);

  if (!isOpen) return null;

  const handleOpenCustomWhatsApp = (type: string) => {
    const message = `Namaste Sahina! ✨ I would like to inquire about a custom size/length for a ${type} at Artified Nepal. Could you help me with custom measurements?`;
    window.open(`https://wa.me/9779767573721?text=${encodeURIComponent(message)}`, '_blank');
  };

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

      {/* Main Modal Card */}
      <div 
        className="relative bg-[#FAF8F5] w-full max-w-2xl rounded-3xl shadow-2xl border-2 border-[#D4AF37]/50 overflow-hidden z-10 flex flex-col text-[#1C1B1A] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1C1B1A] text-white p-5 sm:p-6 flex items-center justify-between border-b border-[#34312F]">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider border border-[#D4AF37]/30">
              <Ruler className="w-3 h-3" />
              <span>Handcrafted Fit & Sizing Guide</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
              Measurements & Fit Guide
            </h2>
            <p className="text-xs text-[#A69E96]">
              Handcrafted in Kathmandu, Nepal • Custom lengths available on order
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

        {/* Tab Switcher */}
        <div className="bg-white border-b border-[#E8DFD8] p-2 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('necklaces')}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
              activeTab === 'necklaces'
                ? 'bg-[#1C1B1A] text-[#D4AF37] shadow-xs'
                : 'text-[#5E5955] hover:bg-[#FAF8F5]'
            }`}
          >
            📿 Necklaces & Chokers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rings')}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
              activeTab === 'rings'
                ? 'bg-[#1C1B1A] text-[#D4AF37] shadow-xs'
                : 'text-[#5E5955] hover:bg-[#FAF8F5]'
            }`}
          >
            💍 Rings & Sizing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bags')}
            className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
              activeTab === 'bags'
                ? 'bg-[#1C1B1A] text-[#D4AF37] shadow-xs'
                : 'text-[#5E5955] hover:bg-[#FAF8F5]'
            }`}
          >
            👜 Pearl Bags Capacity
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-[#3C3835]">
          
          {/* TAB 1: NECKLACES & CHOKERS */}
          {activeTab === 'necklaces' && (
            <div className="space-y-5">
              {/* Extender Chain Callout */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-[#D4AF37]/50 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-[#1C1B1A]">
                    Every Artified Pearl Necklace Includes a +2" (5cm) Extender Chain
                  </p>
                  <p className="text-[#5E5955] leading-relaxed">
                    Crafted with 18k gold-plated lobster clasps and an adjustable extender chain so you can adjust your necklace between snug choker fit and relaxed princess drop.
                  </p>
                </div>
              </div>

              {/* Length Tiers Table */}
              <div className="space-y-3">
                <h3 className="font-serif text-sm font-bold text-[#1C1B1A]">
                  Standard Pearl Necklace Lengths & Styling
                </h3>

                <div className="border border-[#E8DFD8] rounded-2xl overflow-hidden bg-white shadow-2xs divide-y divide-[#E8DFD8]">
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#FAF8F5]/80 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-[#1C1B1A] text-xs">Collar</strong>
                        <span className="text-[10px] font-mono bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E8DFD8] text-[#8C7A6B]">
                          12" – 13" (30 – 33 cm)
                        </span>
                      </div>
                      <p className="text-[11px] text-[#736C65] mt-1">
                        Sits snugly around the throat. Best with open-neck tops, sweetheart necklines, and bridal strapless blouses.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-[#C5A880] shrink-0">Tight Fit</span>
                  </div>

                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-50/30 hover:bg-amber-50/50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-[#1C1B1A] text-xs">Choker (Our Signature)</strong>
                        <span className="text-[10px] font-mono bg-[#1C1B1A] px-2 py-0.5 rounded text-[#D4AF37] font-bold">
                          14" – 16" (35 – 40 cm)
                        </span>
                      </div>
                      <p className="text-[11px] text-[#736C65] mt-1">
                        Rests comfortably at base of the neck. Pairs exquisitely with Newari Haku Patasi, banarasi sarees, and western collars.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 shrink-0">Most Popular ★</span>
                  </div>

                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#FAF8F5]/80 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-[#1C1B1A] text-xs">Princess</strong>
                        <span className="text-[10px] font-mono bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E8DFD8] text-[#8C7A6B]">
                          17" – 19" (43 – 48 cm)
                        </span>
                      </div>
                      <p className="text-[11px] text-[#736C65] mt-1">
                        Rests gently over the collarbone. Universally flattering for crewnecks, plunging necklines, and layered looks.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-[#8C7A6B] shrink-0">Classic Drop</span>
                  </div>

                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#FAF8F5]/80 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-[#1C1B1A] text-xs">Matinee</strong>
                        <span className="text-[10px] font-mono bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E8DFD8] text-[#8C7A6B]">
                          20" – 24" (50 – 60 cm)
                        </span>
                      </div>
                      <p className="text-[11px] text-[#736C65] mt-1">
                        Falls just above the bust. Ideal for high-neck festive kurtas and formal evening suits.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-[#8C7A6B] shrink-0">Dramatic</span>
                  </div>
                </div>
              </div>

              {/* How to Measure at Home */}
              <div className="p-4 rounded-2xl bg-white border border-[#E8DFD8] space-y-2">
                <h4 className="font-bold text-[#1C1B1A] text-xs flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>How to measure your neck at home:</span>
                </h4>
                <ol className="list-decimal pl-4 space-y-1 text-[11px] text-[#5E5955]">
                  <li>Wrap a soft measuring tape or a ribbon/string around the base of your neck.</li>
                  <li>Mark the spot where the ends comfortably meet (do not pull tightly).</li>
                  <li>Lay the string flat against a standard ruler to determine your measurement. Add 1 inch (2.5 cm) for comfortable choker drape.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: RINGS & SIZING */}
          {activeTab === 'rings' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-[#D4AF37]/50 flex items-start gap-3">
                <Info className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-[#1C1B1A]">
                    Handmade Beaded Elastic & Wire Rings
                  </p>
                  <p className="text-[#5E5955] leading-relaxed">
                    Our beaded pearl rings feature high-resilience memory elastic or 14k gold-plated wire. For wide beaded bands, we recommend sizing up by 0.5 size for maximum comfort.
                  </p>
                </div>
              </div>

              {/* Ring Conversion Chart */}
              <div className="space-y-2">
                <h3 className="font-serif text-sm font-bold text-[#1C1B1A]">
                  Ring Size & Circumference Conversion Chart
                </h3>

                <div className="border border-[#E8DFD8] rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-[#1C1B1A] text-[#D4AF37] font-semibold">
                      <tr>
                        <th className="p-2.5">US / Nepal Size</th>
                        <th className="p-2.5">Inside Diameter (mm)</th>
                        <th className="p-2.5">Inside Circumference (mm)</th>
                        <th className="p-2.5">Fit Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8DFD8] text-[#5E5955]">
                      <tr className="hover:bg-[#FAF8F5]">
                        <td className="p-2.5 font-bold text-[#1C1B1A]">Size 5</td>
                        <td className="p-2.5 font-mono">15.7 mm</td>
                        <td className="p-2.5 font-mono">49.3 mm</td>
                        <td className="p-2.5 text-[#8C7A6B]">Petite / Pinky</td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5] bg-amber-50/20">
                        <td className="p-2.5 font-bold text-[#1C1B1A]">Size 6</td>
                        <td className="p-2.5 font-mono">16.5 mm</td>
                        <td className="p-2.5 font-mono">51.9 mm</td>
                        <td className="p-2.5 text-emerald-700 font-semibold">Standard Small ★</td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5] bg-amber-50/40">
                        <td className="p-2.5 font-bold text-[#1C1B1A]">Size 7</td>
                        <td className="p-2.5 font-mono">17.3 mm</td>
                        <td className="p-2.5 font-mono">54.4 mm</td>
                        <td className="p-2.5 text-emerald-700 font-semibold">Standard Medium (Most Common) ★</td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5] bg-amber-50/20">
                        <td className="p-2.5 font-bold text-[#1C1B1A]">Size 8</td>
                        <td className="p-2.5 font-mono">18.1 mm</td>
                        <td className="p-2.5 font-mono">57.0 mm</td>
                        <td className="p-2.5 text-emerald-700 font-semibold">Standard Large ★</td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5]">
                        <td className="p-2.5 font-bold text-[#1C1B1A]">Size 9</td>
                        <td className="p-2.5 font-mono">18.9 mm</td>
                        <td className="p-2.5 font-mono">59.5 mm</td>
                        <td className="p-2.5 text-[#8C7A6B]">Thumb / Middle Finger</td>
                      </tr>
                      <tr className="hover:bg-[#FAF8F5]">
                        <td className="p-2.5 font-bold text-[#1C1B1A]">Size 10</td>
                        <td className="p-2.5 font-mono">19.8 mm</td>
                        <td className="p-2.5 font-mono">62.1 mm</td>
                        <td className="p-2.5 text-[#8C7A6B]">Extra Large</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Measuring Finger Method */}
              <div className="p-4 rounded-2xl bg-white border border-[#E8DFD8] space-y-2">
                <h4 className="font-bold text-[#1C1B1A] text-xs">
                  How to measure your finger with paper:
                </h4>
                <ol className="list-decimal pl-4 space-y-1 text-[11px] text-[#5E5955]">
                  <li>Cut a thin strip of paper (~1 cm wide) and wrap it snugly around your finger base.</li>
                  <li>Mark where the paper overlaps with a pen.</li>
                  <li>Measure the strip in millimeters against a ruler to match your Circumference in the chart above.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: PEARL BAGS CAPACITY */}
          {activeTab === 'bags' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-[#D4AF37]/50 flex items-start gap-3">
                <ShoppingBag className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-[#1C1B1A]">
                    Engineered Structural Capacity (Kathmandu Atelier)
                  </p>
                  <p className="text-[#5E5955] leading-relaxed">
                    Woven with 7-strand nylon-coated stainless steel core. Can comfortably support up to 1.5 kg without warping or sagging.
                  </p>
                </div>
              </div>

              {/* Bag Silhouettes Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Caviar & Classic Box Bag */}
                <div className="p-4 rounded-2xl bg-white border border-[#E8DFD8] shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-[#1C1B1A] text-xs">Classic Evening Pearl Bag</strong>
                    <span className="text-[10px] font-bold text-[#D4AF37] bg-[#1C1B1A] px-2 py-0.5 rounded">
                      20 × 14 × 6 cm
                    </span>
                  </div>
                  <p className="text-[11px] text-[#736C65]">
                    Handle Drop: 14 cm (Handheld) + Detachable 105 cm Crossbody Chain.
                  </p>
                  <div className="border-t border-[#E8DFD8] pt-2 space-y-1 text-[11px]">
                    <p className="font-bold text-[#1C1B1A]">What Fits Comfortably:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-emerald-800">
                      <li>iPhone 15/16 Pro Max</li>
                      <li>Cardholder / Cash wallet</li>
                      <li>Lipstick & compact powder</li>
                      <li>Car keys & AirPods</li>
                    </ul>
                  </div>
                </div>

                {/* Mini Pearl Box & Vanity */}
                <div className="p-4 rounded-2xl bg-white border border-[#E8DFD8] shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-[#1C1B1A] text-xs">Mini Pearl Vanity Box</strong>
                    <span className="text-[10px] font-bold text-[#8C7A6B] bg-[#FAF8F5] border border-[#E8DFD8] px-2 py-0.5 rounded">
                      14 × 12 × 5 cm
                    </span>
                  </div>
                  <p className="text-[11px] text-[#736C65]">
                    Handle Drop: 10 cm (Dainty wrist / forearm carry).
                  </p>
                  <div className="border-t border-[#E8DFD8] pt-2 space-y-1 text-[11px]">
                    <p className="font-bold text-[#1C1B1A]">What Fits Comfortably:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[#5E5955]">
                      <li>Standard iPhone (Diagonal fit)</li>
                      <li>Slim cardholder & cash notes</li>
                      <li>Lip balm & keys</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Custom Fit WhatsApp CTA */}
          <div className="p-4 rounded-2xl bg-[#1C1B1A] text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="text-center sm:text-left space-y-0.5">
              <p className="font-serif text-xs font-bold text-[#D4AF37]">
                Need Custom Made-to-Order Lengths for Bridal or Events?
              </p>
              <p className="text-[11px] text-[#A69E96]">
                Sahina can tailor exact centimeter lengths for your neckline or blouse.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenCustomWhatsApp(activeTab)}
              className="px-4 py-2 bg-gradient-to-r from-[#20ba59] to-[#25D366] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all hover:brightness-105 cursor-pointer shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Ask Sahina on WhatsApp</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-white border-t border-[#E8DFD8] flex items-center justify-between text-xs">
          <span className="text-[11px] text-[#736C65]">
            Artified Nepal • Kathmandu, Nepal
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#FAF8F5] hover:bg-[#E8DFD8] text-[#1C1B1A] font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
