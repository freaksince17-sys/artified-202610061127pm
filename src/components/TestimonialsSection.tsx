import React, { useState } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote, CheckCircle2 } from 'lucide-react';
import { TESTIMONIALS } from '../data/products';

export const TestimonialsSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? TESTIMONIALS.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === TESTIMONIALS.length - 1 ? 0 : prev + 1));
  };

  const current = TESTIMONIALS[currentIndex];

  return (
    <section className="py-14 sm:py-18 bg-[#FAF8F5] border-b border-[#E8DFD8]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Subtle decorative quotation mark */}
        <div className="w-12 h-12 rounded-full bg-white border border-[#E8DFD8] flex items-center justify-center mx-auto mb-6 shadow-xs text-[#C5A880]">
          <Quote className="w-5 h-5 fill-[#C5A880]/30" />
        </div>

        <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-[#8C7A6B] block mb-2">
          Voices of Artified Customers
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl text-[#1C1B1A] font-semibold mb-8">
          Loved Across Nepal
        </h2>

        {/* Testimonial Active Card */}
        <div className="bg-white p-6 sm:p-10 rounded-2xl border border-[#E8DFD8] shadow-sm relative transition-all duration-300">
          
          {/* Star rating */}
          <div className="flex items-center justify-center gap-1 text-amber-400 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400" />
            ))}
          </div>

          {/* Comment */}
          <p className="font-serif text-lg sm:text-xl text-[#1C1B1A] italic leading-relaxed max-w-2xl mx-auto mb-6">
            "{current.comment}"
          </p>

          {/* Author Details */}
          <div>
            <h4 className="text-sm font-semibold text-[#1C1B1A] flex items-center justify-center gap-1.5">
              <span>{current.author}</span>
              {current.verifiedPurchase && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-normal bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified Buyer
                </span>
              )}
            </h4>
            <p className="text-xs text-[#736C65] mt-0.5">{current.location}</p>
            <p className="text-[11px] text-[#C5A880] font-medium mt-1">
              Purchased: {current.productName}
            </p>
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center justify-center gap-4 mt-8 pt-4 border-t border-[#F0EBE5]">
            <button
              onClick={prevSlide}
              className="p-2 rounded-full border border-[#E8DFD8] text-[#736C65] hover:text-[#1C1B1A] hover:bg-[#FAF8F5] transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Indicator dots */}
            <div className="flex items-center gap-1.5">
              {TESTIMONIALS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentIndex === idx ? 'w-6 bg-[#1C1B1A]' : 'bg-[#D8CFCA]'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="p-2 rounded-full border border-[#E8DFD8] text-[#736C65] hover:text-[#1C1B1A] hover:bg-[#FAF8F5] transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};
