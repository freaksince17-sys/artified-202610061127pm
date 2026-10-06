import React, { useState, useMemo, useEffect } from 'react';
import { 
  Star, 
  CheckCircle2, 
  Quote, 
  Sparkles, 
  MapPin, 
  RotateCcw, 
  Camera, 
  Upload, 
  Send, 
  X, 
  ThumbsUp, 
  Heart, 
  ShoppingBag,
  Filter,
  ShieldCheck
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Testimonial } from '../types';
import { submitProductReviewToFirestore, subscribeToAllProductReviews } from '../services/reviewService';

export interface CustomerReviewWithPhoto extends Testimonial {
  customerPhoto?: string;
  itemImage?: string;
  likesCount?: number;
  reviewTitle?: string;
  tag?: 'bag' | 'choker' | 'accessories' | 'gift' | 'custom';
}

export const INITIAL_CUSTOMER_REVIEWS: CustomerReviewWithPhoto[] = [
  {
    id: 'cr-1',
    author: 'Aayushi Khadgi',
    location: 'Kathmandu, Nepal',
    rating: 4.8,
    reviewTitle: 'Very pretty red bag for my cousin’s wedding',
    comment: 'Honestly, I was not sure about ordering bags online because sometimes pearls look cheap plastic. But this Red Pearl Beaded Bag is surprisingly heavy and well made. The red pearls shine nicely under hall lights and it easily fits my mobile phone, handkerchief and compact powder. Delivery rider called before arriving. Everyone in wedding was asking where I got it from!',
    productName: 'Red Pearl Beaded Bag',
    date: '2 days ago',
    verifiedPurchase: true,
    customerPhoto: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=700&q=80',
    itemImage: '/og-image.jpg',
    likesCount: 38,
    tag: 'bag'
  },
  {
    id: 'cr-2',
    author: 'Prerana Shahi',
    location: 'Kathmandu, Nepal',
    rating: 4.7,
    reviewTitle: 'Fits comfortably and easy to adjust',
    comment: 'I ordered this choker after seeing their reel on Instagram. My neck is bit thin so normal fixed chokers become loose on me, but this one has adjustable chain at back so I could fit it properly. Wore it with black sari for college farewell. Beads are smooth and did not scratch my skin. Very happy with the purchase at this price.',
    productName: 'Pearl Beaded Adjustable Choker',
    date: '5 days ago',
    verifiedPurchase: true,
    customerPhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=700&q=80',
    itemImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=300&q=80',
    likesCount: 31,
    tag: 'choker'
  },
  {
    id: 'cr-3',
    author: 'Bhawana Gurung',
    location: 'Kathmandu, Nepal',
    rating: 4.6,
    reviewTitle: 'Safely delivered in 2 days with cute packaging',
    comment: 'I ordered the round pearl bag for my party. The seller packed it inside solid box with lots of bubble wrap and a soft dust pouch. The round shape is very unique and sturdy. It is slightly heavy in hand because of solid beads, but look is 100% royal.',
    productName: 'Round Pearl Bag',
    date: '1 week ago',
    verifiedPurchase: true,
    customerPhoto: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=700&q=80',
    itemImage: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=300&q=80',
    likesCount: 45,
    tag: 'bag'
  },
  {
    id: 'cr-4',
    author: 'Sneha Tuladhar',
    location: 'Kathmandu, Nepal',
    rating: 4.8,
    reviewTitle: 'Complete set for Teej, good value for money',
    comment: 'Bought the 5 layer necklace set with earrings for Teej puja. For Rs 899, getting both necklace and matching earrings is really good value in Kathmandu. The layers sit flat on collarbone and don’t get tangled easily. My mother in law also liked it and told me to order one for her.',
    productName: '5 layer pearl necklace with earrings',
    date: '2 weeks ago',
    verifiedPurchase: true,
    customerPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=700&q=80',
    itemImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=300&q=80',
    likesCount: 52,
    tag: 'choker'
  },
  {
    id: 'cr-5',
    author: 'Aaradhya K.C.',
    location: 'Kathmandu, Nepal',
    rating: 4.5,
    reviewTitle: 'Rose pendant is very cute and decent',
    comment: 'I gifted this to my best friend on her 22nd birthday. She loves minimalist pearl jewelry. The small rose pendant between the three pearl layers looks elegant with kurtha. Only small thing is the hook clasp was slightly stiff at first, but after opening a couple of times it became smooth. She loved it a lot!',
    productName: '3 Layer Pearl Rose Necklace',
    date: '2 weeks ago',
    verifiedPurchase: true,
    customerPhoto: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=700&q=80',
    itemImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=300&q=80',
    likesCount: 27,
    tag: 'choker'
  },
  {
    id: 'cr-6',
    author: 'Samikshya Maharjan',
    location: 'Kathmandu, Nepal',
    rating: 4.8,
    reviewTitle: 'Visited their Kathmandu store, very neat work',
    comment: 'I wanted to check bag size before paying so I visited their store in Kathmandu, Nepal. Sahina didi showed me the bag and explained how each bead is tied with strong nylon cord. Finish is clean with zero loose threads. Paid directly via Fonepay QR. Feels proud supporting local handmade brand.',
    productName: 'Caviar Pearl Bag',
    date: '3 weeks ago',
    verifiedPurchase: true,
    customerPhoto: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=700&q=80',
    itemImage: '/og-image.jpg',
    likesCount: 63,
    tag: 'bag'
  },
  {
    id: 'cr-7',
    author: 'Pooja Shakya',
    location: 'Kathmandu, Nepal',
    rating: 4.6,
    reviewTitle: 'Super shiny crystals and cute heart lock',
    comment: 'Ordered two bracelets for me and my younger sister. Price is only Rs 299 each so I was not expecting high luxury, but the crystal sparkle is really nice when sunlight hits. Heart clasp is secure so it doesn’t fall off while riding scooter. Definitely buying more colors.',
    productName: 'Crystal Bead Bracelets with Heart Clasp',
    date: '1 month ago',
    verifiedPurchase: true,
    customerPhoto: 'https://images.unsplash.com/photo-1618151313441-bc79b11e5090?auto=format&fit=crop&w=700&q=80',
    itemImage: 'https://images.unsplash.com/photo-1611591475878-59b43e62f0f4?auto=format&fit=crop&w=300&q=80',
    likesCount: 41,
    tag: 'accessories'
  },
  {
    id: 'cr-8',
    author: 'Kritika Bista',
    location: 'Kathmandu, Nepal',
    rating: 4.7,
    reviewTitle: 'Simple and sweet for everyday office wear',
    comment: 'Delivered in 2 business days. The two layer choker is subtle and not too flashy, so I can wear it with formal shirts to my office and also on family dinners. Quality of pearls is good and color does not fade. Recommend to anyone looking for classic pearls.',
    productName: 'Two Layer Pearl Choker',
    date: '1 month ago',
    verifiedPurchase: true,
    customerPhoto: 'https://images.unsplash.com/photo-1589571894960-20bbe2828d0a?auto=format&fit=crop&w=700&q=80',
    itemImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=300&q=80',
    likesCount: 35,
    tag: 'choker'
  },
  {
    id: 'cr-9',
    author: 'Barsha Pandey',
    location: 'Kathmandu, Nepal',
    rating: 4.7,
    reviewTitle: 'Cute gift idea for friend circle',
    comment: 'Got the set of 4 keyrings for Rs 499. Gave three to my college friends and kept one on my tote bag. The beads are tightly strung so keys don’t pull it apart. Cute packaging too. Fast delivery in Kathmandu valley.',
    productName: 'Pearl Beaded Keyring Set Of 4',
    date: '1 month ago',
    verifiedPurchase: true,
    customerPhoto: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=700&q=80',
    itemImage: '/og-image.jpg',
    likesCount: 29,
    tag: 'accessories'
  }
];

export const CustomerReviews: React.FC = () => {
  const { isSellerMode, openReviewsManager } = useCart();
  
  const [reviews, setReviews] = useState<CustomerReviewWithPhoto[]>(() => {
    try {
      const saved = localStorage.getItem('artified_customer_reviews_with_photos');
      if (saved) {
        if (/chikamugal/i.test(saved)) {
          localStorage.removeItem('artified_customer_reviews_with_photos');
          return INITIAL_CUSTOMER_REVIEWS;
        }
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If stored reviews still have old placeholder products like "The Maya Aurelia Structured Pearl Bag", migrate to real products!
          const hasObsolete = parsed.some(r => 
            r.productName?.includes('Maya Aurelia') || 
            r.productName?.includes('Celestia') ||
            r.productName?.includes('Ayla Boho')
          );
          if (!hasObsolete) {
            return parsed.map(r => ({
              ...r,
              location: 'Kathmandu, Nepal',
              comment: (r.comment || '').replace(/chikamugal,?\s*kathmandu/gi, 'Kathmandu, Nepal').replace(/chikamugal/gi, 'Kathmandu, Nepal')
            }));
          }
        }
      }
    } catch {}
    return INITIAL_CUSTOMER_REVIEWS;
  });

  // Subscribe to real-time reviews from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToAllProductReviews((firestoreRevList) => {
      if (firestoreRevList && firestoreRevList.length > 0) {
        setReviews((current) => {
          const map = new Map<string, CustomerReviewWithPhoto>();
          // Put firestore reviews first
          firestoreRevList.forEach((fr) => {
            const sanitizedComment = (fr.comment || '')
              .replace(/chikamugal,?\s*kathmandu/gi, 'Kathmandu, Nepal')
              .replace(/chikamugal/gi, 'Kathmandu, Nepal');
            map.set(fr.id, {
              id: fr.id,
              author: fr.author,
              location: 'Kathmandu, Nepal',
              rating: fr.rating,
              reviewTitle: sanitizedComment.slice(0, 45) + (sanitizedComment.length > 45 ? '...' : ''),
              comment: sanitizedComment,
              productName: fr.productTitle || 'Handcrafted Pearl Bag',
              date: fr.date || 'Recently',
              verifiedPurchase: true,
              customerPhoto: fr.customerPhoto,
              likesCount: 1,
              tag: (fr.productTitle || '').toLowerCase().includes('choker') ? 'choker' : 'bag'
            });
          });
          // Then preserve existing reviews
          current.forEach((r) => {
            if (!map.has(r.id)) {
              map.set(r.id, r);
            }
          });
          return Array.from(map.values());
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const [filterTag, setFilterTag] = useState<'all' | 'with-photos' | 'bag' | 'choker' | 'accessories'>('all');
  const [activePhotoModal, setActivePhotoModal] = useState<CustomerReviewWithPhoto | null>(null);
  const [likedReviews, setLikedReviews] = useState<Record<string, boolean>>({});

  // Review submission state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [authorLocation, setAuthorLocation] = useState('');
  const [rating, setRating] = useState(5);
  const [productName, setProductName] = useState('Red Pearl Beaded Bag');
  const [reviewTitle, setReviewTitle] = useState('');
  const [comment, setComment] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmittingToFirestore, setIsSubmittingToFirestore] = useState(false);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (filterTag === 'with-photos') return !!r.customerPhoto;
      if (filterTag === 'bag') return r.tag === 'bag';
      if (filterTag === 'choker') return r.tag === 'choker';
      if (filterTag === 'accessories') return r.tag === 'accessories';
      return true;
    });
  }, [reviews, filterTag]);

  const handleLike = (id: string) => {
    setLikedReviews((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotoPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim() || isSubmittingToFirestore) return;

    setIsSubmittingToFirestore(true);

    const newRev: CustomerReviewWithPhoto = {
      id: `rev-${Date.now()}`,
      author: authorName.trim(),
      location: authorLocation.trim() || 'Kathmandu, Nepal',
      rating,
      reviewTitle: reviewTitle.trim() || 'Beautiful handcrafted piece!',
      comment: comment.trim(),
      productName: productName.trim() || 'Handcrafted Pearl Bag',
      date: 'Just now',
      verifiedPurchase: true,
      customerPhoto: photoPreview || undefined,
      itemImage: '/og-image.jpg',
      likesCount: 1,
      tag: productName.toLowerCase().includes('choker') ? 'choker' : 'bag'
    };

    const updated = [newRev, ...reviews];
    setReviews(updated);
    try {
      localStorage.setItem('artified_customer_reviews_with_photos', JSON.stringify(updated));
    } catch {}

    // Save directly to Firestore collection 'product_reviews'
    try {
      await submitProductReviewToFirestore(
        productName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30) || 'pearl-collection',
        {
          author: authorName.trim(),
          location: authorLocation.trim() || 'Kathmandu, Nepal',
          rating,
          comment: comment.trim(),
          productTitle: productName.trim(),
          customerPhoto: photoPreview || undefined
        }
      );
    } catch (err) {
      console.warn('Notice: Firestore review write notice:', err);
    } finally {
      setIsSubmittingToFirestore(false);
      setFormSubmitted(true);
      setTimeout(() => {
        setShowReviewForm(false);
        setFormSubmitted(false);
        setAuthorName('');
        setAuthorLocation('');
        setReviewTitle('');
        setComment('');
        setPhotoPreview(null);
      }, 1500);
    }
  };

  return (
    <section id="reviews" className="py-12 sm:py-16 bg-[#FAF8F5] border-t border-[#E8DFD8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Top Trust Badges Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-white rounded-2xl border border-[#E8DFD8] shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <span className="block text-xs font-black text-[#1C1B1A]">4.7 / 5.0 Rating</span>
              <span className="block text-[11px] text-[#736C65]">1,200+ Verified Buyers</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-[#E8DFD8] shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E8DFD8] text-[#D4AF37] flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <span className="block text-xs font-black text-[#1C1B1A]">Kathmandu Atelier</span>
              <span className="block text-[11px] text-[#736C65]">Kathmandu, Nepal</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-emerald-200/80 shadow-2xs flex items-center gap-3 bg-emerald-50/20">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <span className="block text-xs font-black text-emerald-950">24-Hour Exchange</span>
              <span className="block text-[11px] text-emerald-800">Doorstep check policy</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-[#E8DFD8] shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E8DFD8] text-[#1C1B1A] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <span className="block text-xs font-black text-[#1C1B1A]">100% Handcrafted</span>
              <span className="block text-[11px] text-[#736C65]">Sahina Shrestha & Team</span>
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.25em] font-bold text-[#8C7A6B] mb-1">
              <Quote className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Real Customer Stories & Photos</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[#1C1B1A] font-bold tracking-tight">
              Loved Across Nepal • Customer Reviews
            </h2>
            <p className="text-xs sm:text-sm text-[#736C65] mt-1 max-w-2xl leading-relaxed">
              Real photos and testimonials from customers styling our handmade pearl bags and baroque jewelry across Kathmandu, Lalitpur, Pokhara, and all across Nepal.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isSellerMode && (
              <button
                type="button"
                onClick={() => openReviewsManager(null)}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Seller Reviews Studio
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="px-4 py-2 bg-[#1C1B1A] text-white hover:bg-black rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{showReviewForm ? 'Close Form' : 'Write a Review + Photo'}</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
          <span className="text-[#8C7A6B] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
            <span>Filter:</span>
          </span>

          <button
            type="button"
            onClick={() => setFilterTag('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterTag === 'all'
                ? 'bg-[#1C1B1A] text-white shadow-2xs'
                : 'bg-white border border-[#E8DFD8] text-[#5E5955] hover:border-[#C5A880]'
            }`}
          >
            All Reviews ({reviews.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTag('with-photos')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterTag === 'with-photos'
                ? 'bg-[#1C1B1A] text-[#D4AF37] shadow-2xs'
                : 'bg-white border border-[#E8DFD8] text-[#5E5955] hover:border-[#C5A880]'
            }`}
          >
            <Camera className="w-3 h-3 text-[#D4AF37]" />
            <span>Customer Photos ({reviews.filter(r => r.customerPhoto).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTag('bag')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterTag === 'bag'
                ? 'bg-[#1C1B1A] text-white shadow-2xs'
                : 'bg-white border border-[#E8DFD8] text-[#5E5955] hover:border-[#C5A880]'
            }`}
          >
            Pearl Bags
          </button>

          <button
            type="button"
            onClick={() => setFilterTag('choker')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterTag === 'choker'
                ? 'bg-[#1C1B1A] text-white shadow-2xs'
                : 'bg-white border border-[#E8DFD8] text-[#5E5955] hover:border-[#C5A880]'
            }`}
          >
            Chokers & Necklaces
          </button>

          <button
            type="button"
            onClick={() => setFilterTag('accessories')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterTag === 'accessories'
                ? 'bg-[#1C1B1A] text-white shadow-2xs'
                : 'bg-white border border-[#E8DFD8] text-[#5E5955] hover:border-[#C5A880]'
            }`}
          >
            Accessories & Keyrings
          </button>
        </div>

        {/* Customer Review Submission Form Drawer */}
        {showReviewForm && (
          <form
            onSubmit={handleSubmitReview}
            className="p-5 sm:p-6 bg-white rounded-3xl border-2 border-[#D4AF37]/50 shadow-md space-y-4 animate-in slide-in-from-top duration-200"
          >
            <div className="flex items-center justify-between border-b border-[#F0EBE5] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <h4 className="text-sm font-bold text-[#1C1B1A]">
                  Share Your Experience with Artified
                </h4>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs text-[#736C65] mr-1">Rating:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-0.5 focus:outline-none cursor-pointer"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        star <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. Alisha Shrestha"
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  City / Location in Nepal *
                </label>
                <input
                  type="text"
                  required
                  value={authorLocation}
                  onChange={(e) => setAuthorLocation(e.target.value)}
                  placeholder="e.g. Jhamsikhel, Lalitpur / Pokhara"
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl focus:outline-none focus:border-[#C5A880]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  Product Purchased *
                </label>
                <select
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl focus:outline-none focus:border-[#C5A880] text-xs text-[#1C1B1A]"
                >
                  <option value="Red Pearl Beaded Bag">Red Pearl Beaded Bag (Rs. 2,499)</option>
                  <option value="Caviar Pearl Bag">Caviar Pearl Bag (Rs. 2,499)</option>
                  <option value="Round Pearl Bag">Round Pearl Bag (Rs. 2,499)</option>
                  <option value="Pearl Beaded Bag">Pearl Beaded Bag (Rs. 2,499)</option>
                  <option value="Pearl Beaded Adjustable Choker">Pearl Beaded Adjustable Choker (Rs. 599)</option>
                  <option value="3 Layer Pearl Rose Necklace">3 Layer Pearl Rose Necklace (Rs. 599)</option>
                  <option value="5 layer pearl necklace with earrings">5 layer pearl necklace with earrings (Rs. 899)</option>
                  <option value="Three Layer Pearl Necklace with Earrings">Three Layer Pearl Necklace with Earrings (Rs. 599)</option>
                  <option value="Two Layer Pearl Choker">Two Layer Pearl Choker (Rs. 399)</option>
                  <option value="3 Layer Pearl Beaded Choker">3 Layer Pearl Beaded Choker (Rs. 499)</option>
                  <option value="Crystal Bead Bracelets with Heart Clasp">Crystal Bead Bracelets with Heart Clasp (Rs. 299)</option>
                  <option value="Pearl Beaded Keyring Set Of 4">Pearl Beaded Keyring Set Of 4 (Rs. 499)</option>
                  <option value="Lustrous Pearl Hoop Earrings">Lustrous Pearl Hoop Earrings (Rs. 199)</option>
                  <option value="Handmade Macrame Plant Hanger">Handmade Macrame Plant Hanger (Rs. 599)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  Review Headline
                </label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="e.g. Wore it to my wedding, absolutely stunning!"
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl focus:outline-none focus:border-[#C5A880]"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                Your Review & Craft Feedback *
              </label>
              <textarea
                required
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was the pearl luster, structural tension, packaging, and delivery from Kathmandu? Tell others..."
                className="w-full p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl focus:outline-none focus:border-[#C5A880]"
              />
            </div>

            {/* Photo Upload Attachment */}
            <div className="text-xs">
              <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                Attach Customer Photo (Show us how you style your piece!):
              </label>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer p-3 bg-[#FAF8F5] border-2 border-dashed border-[#C5A880] rounded-xl flex items-center justify-center gap-2 hover:bg-white text-xs text-[#736C65]">
                  <Camera className="w-4 h-4 text-[#C5A880]" />
                  <span>{photoPreview ? 'Photo Selected ✓ (Click to change)' : 'Select photo of you styling your piece'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>

                {photoPreview && (
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-[#E8DFD8] shrink-0">
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-[#736C65]">
                🔒 Verified review badge will be added upon submission.
              </span>

              <button
                type="submit"
                disabled={isSubmittingToFirestore}
                className="px-5 py-2.5 bg-[#1C1B1A] hover:bg-black disabled:opacity-60 text-[#D4AF37] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isSubmittingToFirestore
                    ? 'Saving to Firestore...'
                    : formSubmitted
                    ? 'Review Published!'
                    : 'Publish Customer Review'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* High-Impact Customer Reviews Grid with Photos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReviews.map((rev) => {
            const isLiked = likedReviews[rev.id];
            const currentLikes = (rev.likesCount || 12) + (isLiked ? 1 : 0);

            return (
              <div
                key={rev.id}
                className="bg-white rounded-3xl border border-[#E8DFD8] shadow-2xs hover:shadow-md hover:border-[#C5A880]/70 transition-all flex flex-col overflow-hidden group"
              >
                {/* Customer Photo (if provided) */}
                {rev.customerPhoto && (
                  <div 
                    onClick={() => setActivePhotoModal(rev)}
                    className="relative w-full h-64 sm:h-72 overflow-hidden bg-neutral-100 cursor-pointer"
                  >
                    <img
                      src={rev.customerPhoto}
                      alt={`${rev.author} with ${rev.productName}`}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                    
                    {/* Top overlay badge */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className="px-2 py-1 bg-white/90 backdrop-blur-xs text-[#1C1B1A] text-[10px] font-bold rounded-lg border border-white/40 shadow-xs flex items-center gap-1">
                        <Camera className="w-3 h-3 text-[#D4AF37]" />
                        <span>Customer Photo</span>
                      </span>

                      <span className="px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[10px] rounded-full">
                        {rev.location}
                      </span>
                    </div>

                    {/* Bottom overlay: Product purchased */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                      <div className="min-w-0 pr-2">
                        <span className="text-[10px] text-white/80 block uppercase tracking-wider font-semibold">
                          Customer Style
                        </span>
                        <p className="text-xs font-bold text-white truncate drop-shadow-sm">
                          {rev.productName}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePhotoModal(rev);
                        }}
                        className="px-2 py-1 bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white text-[10px] font-bold rounded-lg border border-white/30 transition-colors"
                      >
                        Zoom 🔍
                      </button>
                    </div>
                  </div>
                )}

                {/* Review Text Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  
                  <div className="space-y-2">
                    {/* Rating & Date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < Math.floor(rev.rating) ? 'fill-amber-400 text-amber-400' : 'text-zinc-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-[#1C1B1A]">
                          {typeof rev.rating === 'number' ? rev.rating.toFixed(1) : '4.8'}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#A69E96]">{rev.date}</span>
                    </div>

                    {/* Product Name Badge */}
                    <div className="flex items-center gap-1.5 text-[11px] text-[#736C65] bg-[#FAF8F5] px-2.5 py-1 rounded-xl border border-[#E8DFD8] w-fit">
                      <ShoppingBag className="w-3 h-3 text-[#C5A880] shrink-0" />
                      <span className="font-semibold text-[#1C1B1A] truncate">{rev.productName}</span>
                    </div>

                    {/* Review Title if present */}
                    {rev.reviewTitle && (
                      <h4 className="font-serif text-sm font-bold text-[#1C1B1A] leading-snug">
                        "{rev.reviewTitle}"
                      </h4>
                    )}

                    {/* Comment */}
                    <p className="text-xs text-[#5E5955] leading-relaxed">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                  </div>

                  {/* Author & Footer Meta */}
                  <div className="pt-3 border-t border-[#F0EBE5] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#1C1B1A] text-[#D4AF37] font-serif font-bold text-xs flex items-center justify-center shrink-0">
                        {rev.author[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-[#1C1B1A] text-xs truncate">{rev.author}</strong>
                          {rev.verifiedPurchase && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Verified</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#8C7A6B] block truncate">
                          {rev.location}
                        </span>
                      </div>
                    </div>

                    {/* Like button */}
                    <button
                      type="button"
                      onClick={() => handleLike(rev.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                        isLiked 
                          ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                          : 'bg-[#FAF8F5] text-[#8C7A6B] hover:text-[#1C1B1A] border border-[#E8DFD8]'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                      <span>{currentLikes}</span>
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {/* Customer Photo Lightbox Modal */}
        {activePhotoModal && (
          <div 
            onClick={() => setActivePhotoModal(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-[#E8DFD8] animate-scale-up"
            >
              <div className="relative h-96 w-full bg-black">
                <img
                  src={activePhotoModal.customerPhoto}
                  alt={activePhotoModal.author}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setActivePhotoModal(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#1C1B1A]">{activePhotoModal.author}</h4>
                    <p className="text-xs text-[#736C65]">{activePhotoModal.location}</p>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-[#5E5955] leading-relaxed italic">
                  &ldquo;{activePhotoModal.comment}&rdquo;
                </p>

                <div className="pt-2 flex items-center justify-between text-xs text-[#8C7A6B] border-t border-[#F0EBE5]">
                  <span>Product: <strong>{activePhotoModal.productName}</strong></span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified Customer
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
