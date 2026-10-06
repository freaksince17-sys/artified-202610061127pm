import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'ne';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    // Brand & General
    brandName: 'Artified_np',
    brandTagline: '-Art made with love',
    atelierLocation: 'Kathmandu, Nepal',
    pricingInNpr: 'Pricing in NPR (Rs.)',
    currencyNpr: 'NPR',

    // Announcement Bar
    announcementStore: 'Store: Kathmandu, Nepal',
    announcementText: 'Handcrafted in Kathmandu, Nepal • Easy exchange within 24 hrs • Code TIKTOK10 for 10% off',
    referFriendGet: 'Refer a Friend • Get Rs. 250',

    // Navigation Tabs
    navCreations: 'Creations',
    navPearlBags: 'Pearl Bags',
    navPearlNecklaces: 'Pearl Necklaces',
    navMacrame: 'Macrame',
    navAccessories: 'Accessories',
    navTikTok: 'Follow on TikTok',
    navJournal: 'Follow on Instagram',
    navTrackOrder: 'Track Order',
    navMeetArtisan: 'Meet the Founder & Creator',
    navBestSellers: 'Best Sellers',
    navNewArrivals: 'New Arrivals',
    navAllPieces: 'All Creations',

    // Navbar Controls
    searchPlaceholder: 'Search handcrafted pearls & macrame...',
    searchTooltip: 'Search (Press /)',
    chatWhatsApp: 'DM WhatsApp',
    patronRewards: 'Rewards',
    referAndEarn: 'Refer & Earn',
    wishlistTitle: 'Wishlist',
    bagTitle: 'Shopping Bag',
    pts: 'pts',
    languageToggleTitle: 'नेपाली भाषामा हेर्नुहोस् (Switch to Nepali)',

    // Product Card
    addToBag: 'Add to bag',
    addedToBag: 'Added to Bag',
    soldOut: 'Sold Out',
    notifyMe: 'Notify Me',
    waitlisted: 'Waitlisted',
    quickView: 'Quick View',
    offPercent: 'OFF',
    soldCount: 'sold',
    reviewsCount: 'reviews',
    inStock: 'In Stock (Nepal)',
    inStockCount: 'available',

    // Product Spotlight
    guidedTourLauncher: '✨ Launch Guided Spotlight Tour (Clasp, Pearls & Knotting)',
    spotlightActive: 'Spotlight Active • Click to Exit',
    spotlightTitle: 'Craftsmanship Spotlight Tour',
    exitTour: 'Exit Tour',

    // Modals & Action
    preOrderWhatsApp: 'Pre-Order on WhatsApp',
    orderOnWhatsApp: 'Order via WhatsApp',
    quantity: 'Quantity:',
    materials: 'Materials:',
    materialsAndCraft: 'Materials & Craftsmanship',
    hoursToCraft: '9+ Hours Hand-Knotting',
    nepalCrafted: '100% Handcrafted in Nepal',

    // Footer
    joinCommunity: 'Join Our Growing Atelier Community',
    followInstagram: 'Follow @artified_np for Daily Drops & Behind-The-Scenes',
    communityDesc: 'Connect with 15,000+ customers across Nepal. Watch our Kathmandu creators weave pearl bags in real time, catch limited batch releases, and get custom sizing via direct message.',
    followOnInstagramBtn: 'Follow on Instagram',
    followOnTikTokBtn: 'Follow on TikTok',
    clientCare: 'Client Care',
    storeAndOrders: 'Store & Orders',
    trackStatusLive: 'Track Order Status Live',
    orderFaqs: 'Order FAQs & Policies (Shipping, Durability, Returns)',
    sizeGuide: '📐 Size & Fit Guide (Necklaces & Rings)',
    deliveryRates: '🚚 Delivery Rates & 77 Districts Timelines',
    easyExchange: '🔄 24-Hr Easy Exchange & Guarantee',
    directWhatsAppHelpdesk: 'Direct WhatsApp Helpdesk',
    directInstagramDm: 'Direct Instagram DM (@artified_np)',
    acceptedInNepal: 'Accepted In Nepal:',
    cod: 'Cash on Delivery (COD)',
    backToTop: 'Back to Top',
    meetTheArtisanBtn: '✨ Meet the Founder & Creator: Sahina Shrestha',
    meetTheArtisanDesc: 'The story, vision, and devotion behind Artified_np',
    rightsReserved: 'All rights reserved. Intricately Handcrafted in Nepal.'
  },
  ne: {
    // Brand & General
    brandName: 'Artified_np',
    brandTagline: '-मायाले हस्तनिर्मित कला',
    atelierLocation: 'काठमाडौं, नेपाल',
    pricingInNpr: 'मूल्य नेपाली रूपैयाँ (रु.) मा',
    currencyNpr: 'रु.',

    // Announcement Bar
    announcementStore: 'पसल: काठमाडौं, नेपाल',
    announcementText: 'काठमाडौं, नेपालबाट हस्तनिर्मित • २४ घण्टाभित्र सजिलो साटफेर • कोड TIKTOK10 प्रयोग गरी १०% छुट!',
    referFriendGet: 'साथीलाई सिफारिस गर्नुहोस् • रु. २५० पाउनुहोस्',

    // Navigation Tabs
    navCreations: 'सिर्जनाहरू',
    navPearlBags: 'मोतीका झोलाहरू',
    navPearlNecklaces: 'मोतीका मालाहरू',
    navMacrame: 'म्याक्रामे',
    navAccessories: 'एसेसरिज',
    navTikTok: 'टिकटक ट्रेन्डिङ',
    navJournal: 'इन्स्टाग्राम जर्नल',
    navTrackOrder: 'अर्डर ट्र्याक',
    navMeetArtisan: 'संस्थापक र सिर्जनाकर्तालाई भेट्नुहोस्',
    navBestSellers: 'धेरै रुचाइएका',
    navNewArrivals: 'नयाँ आगमन',
    navAllPieces: 'सबै सिर्जनाहरू',

    // Navbar Controls
    searchPlaceholder: 'हस्तनिर्मित मोती र म्याक्रामे खोज्नुहोस्...',
    searchTooltip: 'खोज्नुहोस् (/ थिच्नुहोस्)',
    chatWhatsApp: 'ह्वाट्सएप च्याट',
    patronRewards: 'रिवार्ड्स',
    referAndEarn: 'सिफारिस र कमाइ',
    wishlistTitle: 'मनपर्ने',
    bagTitle: 'झोला',
    pts: 'अङ्क',
    languageToggleTitle: 'Switch to English',

    // Product Card
    addToBag: 'झोलामा थप्नुहोस्',
    addedToBag: 'झोलामा थपियो',
    soldOut: 'सकियो',
    notifyMe: 'खबर गर्नुहोस्',
    waitlisted: 'पर्खाइ सूचीमा',
    quickView: 'छिटो हेर्नुहोस्',
    offPercent: 'छुट',
    soldCount: 'बिक्री भयो',
    reviewsCount: 'प्रतिक्रियाहरू',
    inStock: 'उपलब्ध छ (नेपाल)',
    inStockCount: 'प्रति बाँकी',

    // Product Spotlight
    guidedTourLauncher: '✨ हस्तकला अवलोकन सुरु गर्नुहोस् (क्ल्यास्प, मोती र गाँठो)',
    spotlightActive: 'अवलोकन जारी छ • बाहिर निस्कन थिच्नुहोस्',
    spotlightTitle: 'कलात्मक सूक्ष्म अवलोकन',
    exitTour: 'टुंग्याउनुहोस्',

    // Modals & Action
    preOrderWhatsApp: 'ह्वाट्सएपमा अर्डर गर्नुहोस्',
    orderOnWhatsApp: 'ह्वाट्सएप मार्फत अर्डर',
    quantity: 'परिमाण:',
    materials: 'सामग्रीहरू:',
    materialsAndCraft: 'सामग्री र हस्तकला विवरण',
    hoursToCraft: '९+ घण्टाको हातको गाँठो',
    nepalCrafted: '१००% नेपालमा हस्तनिर्मित',

    // Footer
    joinCommunity: 'हाम्रो बढ्दो कलात्मक समुदायमा जोडिनुहोस्',
    followInstagram: 'दैनिक नयाँ सिर्जनाहरूका लागि @artified_np फलो गर्नुहोस्',
    communityDesc: 'नेपालभरिका १५,०००+ ग्राहकहरूसँग जोडिनुहोस्। हाम्रा काठमाडौंका महिला सिर्जनाकर्ताहरूले मोतीका झोला बुनेको प्रत्यक्ष हेर्नुहोस् र आफ्नो रोजाइअनुसारको साइज अर्डर गर्नुहोस्।',
    followOnInstagramBtn: 'इन्स्टाग्राममा फलो गर्नुहोस्',
    followOnTikTokBtn: 'टिकटकमा फलो गर्नुहोस्',
    clientCare: 'ग्राहक सेवा र नीतिहरू',
    storeAndOrders: 'पसल र अर्डर सम्बन्धी',
    trackStatusLive: 'अर्डरको अवस्था प्रत्यक्ष ट्र्याक गर्नुहोस्',
    orderFaqs: 'अर्डर प्रश्नोत्तर र नीतिहरू (डेलिभरी, टिकाउपन, साटफेर)',
    sizeGuide: '📐 साइज र नाप गाइड (माला र औंठी)',
    deliveryRates: '🚚 ७७ जिल्लामा डेलिभरी दर र समय',
    easyExchange: '🔄 २४ घण्टाभित्र सजिलो साटफेर ग्यारेन्टी',
    directWhatsAppHelpdesk: 'प्रत्यक्ष ह्वाट्सएप सहायता',
    directInstagramDm: 'इन्स्टाग्राम प्रत्यक्ष सन्देश (@artified_np)',
    acceptedInNepal: 'नेपालमा स्वीकार्य भुक्तानीहरू:',
    cod: 'डेलिभरीमा नगद भुक्तानी (COD)',
    backToTop: 'माथि जानुहोस्',
    meetTheArtisanBtn: '✨ संस्थापक र सिर्जनाकर्ता: सहिना श्रेष्ठ',
    meetTheArtisanDesc: 'Artified_np पछाडिको कथा, दृष्टिकोण र समर्पण',
    rightsReserved: 'सर्वाधिकार सुरक्षित। नेपालमा श्रद्धापूर्वक हस्तनिर्मित।'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('artified_language');
      if (saved === 'ne' || saved === 'en') {
        return saved;
      }
    } catch {}
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('artified_language', lang);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ne' : 'en');
  };

  const t = (key: string, fallback?: string): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    if (dict[key]) {
      return dict[key];
    }
    const enDict = TRANSLATIONS.en;
    if (enDict[key]) {
      return enDict[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
