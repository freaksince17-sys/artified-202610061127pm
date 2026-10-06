import React, { useState } from 'react';
import { MessageCircle, X, Sparkles, Send, ShieldCheck } from 'lucide-react';

const WHATSAPP_PHONE = '9779767573721';
const SHOP_OWNER_NAME = 'Sahina Shrestha';

const QUICK_INQUIRY_PROMPTS = [
  '🌸 Pearl Bag Sizing & Lead Times',
  '💍 Custom Choker Length Inquiry',
  '🚚 Kathmandu Delivery Timeline'
];

export const FloatingWhatsAppButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState(
    "Namaste Sahina! ✨ I'm visiting your online boutique and would like to ask about a handcrafted piece."
  );
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleOpenChat = (messageToSend?: string) => {
    const text = messageToSend || customMessage;
    const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text.trim())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleSelectPrompt = (prompt: string) => {
    const fullMsg = `Namaste Sahina! ✨ Question regarding: ${prompt}. Could you please guide me?`;
    setCustomMessage(fullMsg);
    setHasInteracted(true);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end">
        {/* Unopened Teaser Tooltip (Visible on desktop until opened) */}
        {!isOpen && !hasInteracted && (
          <div 
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-1.5 mb-2 px-3 py-1 rounded-full bg-[#1C1B1A]/95 text-white text-[11px] shadow-lg border border-[#D4AF37]/40 cursor-pointer hover:bg-black transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">Chat on WhatsApp</span>
            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
          </div>
        )}

        {/* The Main Round WhatsApp Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open WhatsApp live support chat with shop owner"
          className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#20ba59] to-[#25D366] text-white shadow-[0_6px_20px_rgba(37,211,102,0.45)] hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer border-2 border-white group"
        >
          {isOpen ? (
            <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
          ) : (
            <svg 
              className="w-6 h-6 sm:w-7 sm:h-7 fill-white transition-transform group-hover:scale-110" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.43 12.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z"/>
            </svg>
          )}

          {/* Green Online Status Dot */}
          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white shadow-xs flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </span>
        </button>
      </div>

      {/* Expanded Concise Inquiry Popover */}
      {isOpen && (
        <div 
          className="fixed bottom-36 lg:bottom-22 right-4 sm:right-6 z-50 w-[88vw] sm:w-80 max-w-sm rounded-3xl bg-[#FAF8F5] border-2 border-[#D4AF37]/50 shadow-[0_15px_40px_rgba(0,0,0,0.25)] overflow-hidden text-[#1C1B1A] animate-in zoom-in-95 duration-200"
          role="dialog"
          aria-label="Direct WhatsApp customer support chat"
        >
          {/* Header */}
          <div className="bg-[#1C1B1A] text-white p-3.5 flex items-center justify-between border-b border-[#34312F]">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#C5A880] to-[#E8DFD8] flex items-center justify-center text-[#1C1B1A] font-bold text-xs shadow-md">
                  SS
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#1C1B1A]" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h4 className="font-serif text-xs font-bold tracking-wide">
                    {SHOP_OWNER_NAME}
                  </h4>
                  <span className="text-[8px] bg-[#D4AF37] text-[#1C1B1A] font-black px-1.5 py-0.2 rounded-full uppercase">
                    Owner
                  </span>
                </div>
                <p className="text-[9px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online • Kathmandu Workshop</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-[#A69E96] hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Body */}
          <div className="p-3.5 space-y-2.5 bg-gradient-to-b from-[#FAF8F5] to-white text-xs">
            {/* Quick Inquiry Suggestions */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-[#8C7A6B] tracking-wider block">
                Quick Inquiries:
              </span>
              <div className="flex flex-col gap-1">
                {QUICK_INQUIRY_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPrompt(prompt)}
                    className="text-left py-1.5 px-2.5 rounded-xl bg-white hover:bg-amber-50/60 border border-[#E8DFD8] text-[11px] text-[#1C1B1A] transition-all cursor-pointer hover:border-[#C5A880] active:scale-[0.99] truncate"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Pre-filled Message Input */}
            <div>
              <label className="text-[9px] uppercase font-bold text-[#8C7A6B] tracking-wider block mb-1">
                Message Preview:
              </label>
              <textarea
                rows={2}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full p-2 bg-white border border-[#E8DFD8] focus:border-[#25D366] focus:outline-none rounded-xl text-[11px] text-[#1C1B1A] leading-relaxed resize-none transition-all shadow-2xs"
                placeholder="Type your message..."
              />
            </div>

            {/* Direct Open WhatsApp Button */}
            <button
              type="button"
              onClick={() => handleOpenChat()}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#20ba59] to-[#25D366] hover:brightness-105 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 fill-white shrink-0" viewBox="0 0 24 24">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.43 12.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z"/>
              </svg>
              <span>Chat on WhatsApp (+977 9767573721)</span>
            </button>

            {/* Trust Footnote */}
            <div className="flex items-center justify-center gap-1 text-[9px] text-[#736C65]">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Official Artified Nepal Helpdesk • Direct Atelier</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
