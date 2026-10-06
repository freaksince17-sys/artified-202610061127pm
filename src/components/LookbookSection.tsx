import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { Product } from '../types';
import { PRODUCTS } from '../data/products';
import { Sparkles, Heart, ShoppingBag, Eye, ArrowRight, Camera } from 'lucide-react';

interface LookbookItem {
  id: string;
  customerName: string;
  location: string;
  caption: string;
  imageUrl: string;
  featuredProductId: string;
}

const LOOKBOOK_ITEMS: LookbookItem[] = [
  {
    id: 'lb_1',
    customerName: 'Aayusha Maharjan',
    location: 'Patan Durbar Square',
    caption: 'W بتاعتناing the Baroque Freshwater Choker for my brother’s wedding. Received endless compliments!',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=85',
    featuredProductId: 'prod_pearl_choker_1'
  },
  {
    id: 'lb_2',
    customerName: 'Priyanka Shrestha',
    location: 'Thamel, Kathmandu',
    caption: 'Paired my evening gown with Artified’s hand-knotted pearl pouch. Pure Kathmandu luxury.',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=85',
    featuredProductId: 'prod_pearl_bag_1'
  },
  {
    id: 'lb_3',
    customerName: 'Sneha Gurung',
    location: 'Lakeside, Pokhara',
    caption: 'The 7-strand layered pearl necklace is my absolute go-to statement piece.',
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=85',
    featuredProductId: 'prod_layered_pearl_1'
  },
  {
    id: 'lb_4',
    customerName: 'Dikshya Thapa',
    location: 'Jhamsikhel',
    caption: 'Handcrafted slow fashion at its finest. Proud to support local women creators in Kathmandu.',
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=85',
    featuredProductId: 'prod_pearl_bracelet_1'
  }
];

export const LookbookSection: React.FC = () => {
  const { setActiveNavTab, setQuickViewProduct, addToCart, quickBuy } = useCart();
  const { language } = useLanguage();
  const isNe = language === 'ne';

  return (
    <div className="w-full flex-grow flex flex-col bg-[#FAF8F5] dark:bg-[#0F0E0E] text-[#1C1B1A] dark:text-[#F5F2EB] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold tracking-widest uppercase shadow-2xs">
            <Camera className="w-3.5 h-3.5" />
            <span>{isNe ? 'ग्राहक लुकबुक' : 'Artified Lookbook'}</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1C1B1A] dark:text-white">
            {isNe ? 'वास्तविक ग्राहक, वास्तविक भव्यता' : 'Real Customers, Real Elegance'}
          </h1>
          <p className="text-xs sm:text-sm text-[#736C65] dark:text-[#A69E96] leading-relaxed">
            {isNe 
              ? 'हाम्रा हस्तनिर्मित मोती र म्याक्रामे सिर्जनाहरू लगाएका हाम्रा प्रिय ग्राहकहरूको झलक।'
              : 'Explore how our community styles their favorite handcrafted pearl pieces across Kathmandu and beyond. Tap any look to shop the exact item.'}
          </p>
        </div>

        {/* Lookbook Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {LOOKBOOK_ITEMS.map((item) => {
            const product = PRODUCTS.find((p) => p.id === item.featuredProductId) || PRODUCTS[0];

            return (
              <div 
                key={item.id}
                className="group bg-white dark:bg-[#1A1918] rounded-3xl overflow-hidden border border-[#E8DFD8] dark:border-[#2D2B28] shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                {/* Customer Photo */}
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100 dark:bg-gray-900">
                  <img 
                    src={item.imageUrl} 
                    alt={item.customerName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
                  
                  <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
                    <p className="font-serif text-sm font-bold">{item.customerName}</p>
                    <p className="text-[10px] text-[#E6C687]">{item.location}</p>
                  </div>
                </div>

                {/* Caption & Product Link */}
                <div className="p-4 sm:p-5 flex flex-col justify-between space-y-4">
                  <p className="text-xs text-[#736C65] dark:text-[#A69E96] italic leading-relaxed">
                    "{item.caption}"
                  </p>

                  {/* Featured Product Tag */}
                  <div className="pt-3 border-t border-[#E8DFD8] dark:border-[#2D2B28] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={product.images?.[0]} 
                        alt={product.title}
                        className="w-9 h-9 rounded-xl object-cover border border-[#E8DFD8] dark:border-[#33302C] shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-[#1C1B1A] dark:text-white truncate">{product.title}</p>
                        <p className="text-[10px] font-mono text-[#D4AF37] font-bold">NPR {product.price.toLocaleString()}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setQuickViewProduct(product)}
                      className="p-2 rounded-xl bg-[#1C1B1A] dark:bg-[#FAF8F5] text-[#FAF8F5] dark:text-[#1C1B1A] hover:bg-[#D4AF37] dark:hover:bg-[#D4AF37] dark:hover:text-[#1C1B1A] transition-colors cursor-pointer shrink-0 shadow-xs"
                      title="View product details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
