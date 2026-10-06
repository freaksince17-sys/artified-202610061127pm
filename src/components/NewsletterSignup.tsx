import React, { useState, useEffect } from 'react';
import { Mail, Check, Sparkles, Shield, Gift, Bell, Heart, ArrowRight } from 'lucide-react';

interface NewsletterSubscriber {
  email: string;
  subscribedAt: string;
}

export const NewsletterSignup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [subscriberCount, setSubscriberCount] = useState<number>(840);

  // Load existing subscribers count
  useEffect(() => {
    try {
      const stored = localStorage.getItem('artified_newsletter_subscribers');
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list)) {
          setSubscriberCount(840 + list.length);
        }
      }
    } catch {}
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setErrorMessage('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setErrorMessage('Please enter a valid email address (e.g. name@example.com)');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      try {
        const stored = localStorage.getItem('artified_newsletter_subscribers');
        const list: NewsletterSubscriber[] = stored ? JSON.parse(stored) : [];
        
        // Prevent duplicate spam
        const alreadySubscribed = list.some((sub) => sub.email === trimmed);
        if (!alreadySubscribed) {
          list.push({
            email: trimmed,
            subscribedAt: new Date().toISOString()
          });
          localStorage.setItem('artified_newsletter_subscribers', JSON.stringify(list));
          setSubscriberCount((prev) => prev + 1);
        }
      } catch {}

      setIsSubmitting(false);
      setIsSuccess(true);
      setEmail('');

      // Auto revert success message after 7 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 7000);
    }, 600);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#242220] via-[#1C1B1A] to-[#151413] border border-[#3E3A36] p-6 sm:p-8 md:p-10 shadow-2xl mb-12">
      {/* Decorative ambient glow */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-[#C5A880]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Heading and Value Props */}
          <div className="lg:col-span-7 space-y-3.5 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A880]/15 border border-[#C5A880]/30 text-[#D4AF37] text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Artified Atelier Newsletter</span>
            </div>

            <h3 className="font-serif text-2xl sm:text-3xl text-white font-medium tracking-wide">
              Be First to Know About New Drops
            </h3>

            <p className="text-xs sm:text-sm text-[#A69E96] leading-relaxed max-w-xl">
              Subscribe to get secret studio previews of our upcoming handmade pearl bags, baroque chokers, and festive collection drops woven in Kathmandu, Nepal.
            </p>

            {/* Value prop pills */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-[#C5A880]">
              <div className="flex items-center gap-2 bg-[#2B2927]/60 border border-[#3E3A36] px-3 py-2 rounded-xl">
                <Bell className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span className="text-[11px] text-[#FAF8F5]">Drop Alerts</span>
              </div>
              <div className="flex items-center gap-2 bg-[#2B2927]/60 border border-[#3E3A36] px-3 py-2 rounded-xl">
                <Gift className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span className="text-[11px] text-[#FAF8F5]">Free Gift Wrap</span>
              </div>
              <div className="flex items-center gap-2 bg-[#2B2927]/60 border border-[#3E3A36] px-3 py-2 rounded-xl">
                <Shield className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span className="text-[11px] text-[#FAF8F5]">Zero Spam</span>
              </div>
            </div>
          </div>

          {/* Right Column: Form or Success Confirmation */}
          <div className="lg:col-span-5">
            {isSuccess ? (
              <div className="bg-[#2B2927] border border-emerald-500/40 rounded-2xl p-5 sm:p-6 text-center space-y-2.5 animate-in fade-in duration-300">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-inner">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-serif text-lg text-white font-medium">
                  Namaste & Welcome!
                </h4>
                <p className="text-xs text-[#C5A880] leading-relaxed">
                  You are now subscribed to Artified's handmade collection drops. We'll email you the moment our next batch is hand-finished in Kathmandu, Nepal!
                </p>
                <div className="pt-1">
                  <span className="text-[10px] text-[#8C847E]">
                    Joined by {subscriberCount.toLocaleString()} handmade jewelry lovers across Nepal.
                  </span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <label htmlFor="newsletter-email" className="sr-only">
                    Email address for newsletter
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-[#736C65]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="newsletter-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="Enter your email (e.g. shrestha@gmail.com)"
                      disabled={isSubmitting}
                      className="w-full pl-10 pr-28 py-3.5 bg-[#2B2927] border border-[#4A4541] rounded-2xl text-xs sm:text-sm text-white placeholder-[#736C65] focus:outline-none focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] transition-all"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="absolute right-1.5 px-4 py-2 bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c59e2b] text-[#1C1B1A] font-semibold text-xs tracking-wider uppercase rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span className="inline-block w-4 h-4 border-2 border-[#1C1B1A] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Join</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                  {errorMessage && (
                    <p className="text-[11px] text-rose-400 mt-1.5 text-left px-1">
                      {errorMessage}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#736C65] px-1">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-[#C5A880] fill-[#C5A880]" />
                    <span>{subscriberCount.toLocaleString()} customers subscribed</span>
                  </span>
                  <span>Unsubscribe anytime with 1-click</span>
                </div>
              </form>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
