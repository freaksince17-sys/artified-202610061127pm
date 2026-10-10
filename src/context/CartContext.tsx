import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, DeliveryZone, OrderDetails, TikTokReel, CraftStoryData, InstagramJournalItem, ProductReviewItem } from '../types';
import { 
  DELIVERY_ZONES, 
  PRODUCTS, 
  TIKTOK_REELS, 
  DEFAULT_CRAFT_STORY,
  DEFAULT_INSTAGRAM_ITEMS,
  DEFAULT_INSTAGRAM_HANDLE,
  DEFAULT_INSTAGRAM_PROFILE_URL
} from '../data/products';
import { db, auth } from '../firebase';
import { 
  User, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  writeBatch,
  getDocFromServer 
} from 'firebase/firestore';
import {
  safeSetDoc as setDoc,
  safeDeleteDoc as deleteDoc,
  safeOnSnapshot as onSnapshot
} from '../utils/safeFirestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import { compressImage } from '../utils/imageCompressor';
import { sanitizeForFirestore } from '../utils/firestoreSanitizer';
import { sanitizeReviewItem, getProductReviews, isProductBestSeller } from '../utils/productStats';
import { getLoyaltyAccount, earnPurchasePoints } from '../data/loyaltyData';
import { LoyaltyAccount } from '../types';
import { buildTrackedOrderFromOrderDetails, syncTrackedOrdersFromServer } from '../data/trackingData';
import { saveOrderToFirestore, seedDemoOrdersToFirestore } from '../services/orderTrackingService';
import { 
  triggerRestockNotifications, 
  getCustomerRestockAlerts, 
  dismissCustomerRestockAlert, 
  RestockAlertItem 
} from '../utils/waitlistService';
import { ArtisanProfileData, getArtisanProfile, saveArtisanProfile, fetchArtisanProfileFromServer } from '../data/artisanProfile';
import { sanitizeInstagramItemsList } from '../utils/instagramSanitizer';

export type AppNavTab = 'home' | 'artisan' | 'workshops' | 'tiktok' | 'journal' | 'craft' | 'craft-journal' | 'track' | 'orders';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, customizationNote?: string, selectedColorOrStyle?: string) => void;
  quickBuy: (product: Product, quantity?: number, customizationNote?: string, selectedColorOrStyle?: string) => void;
  lastAddedItem: { product: Product; quantity: number; color?: string; timestamp: number } | null;
  clearLastAddedItem: () => void;
  cartAnimationKey: number;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, newQty: number) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  deliveryFee: number;
  giftPackagingFee: number;
  discount: number;
  total: number;
  selectedDeliveryZone: DeliveryZone;
  setSelectedDeliveryZone: (zone: DeliveryZone) => void;
  giftPackaging: boolean;
  setGiftPackaging: (val: boolean) => void;
  giftMessage: string;
  setGiftMessage: (val: string) => void;
  orderNote: string;
  setOrderNote: (val: string) => void;
  promoCode: string;
  promoError: string | null;
  promoSuccess: string | null;
  applyPromoCode: (code: string) => void;
  removePromoCode: () => void;
  // Refer a Friend Community Rewards
  isReferralOpen: boolean;
  setIsReferralOpen: (val: boolean) => void;
  openReferralModal: () => void;
  isReferralVisible: boolean;
  setIsReferralVisible: (val: boolean) => void;
  toggleReferralVisibility: () => void;
  // Size Guide Modal
  isSizeGuideOpen: boolean;
  setIsSizeGuideOpen: (val: boolean) => void;
  openSizeGuideModal: (tab?: 'necklaces' | 'rings' | 'bags') => void;
  sizeGuideDefaultTab: 'necklaces' | 'rings' | 'bags';
  // Order FAQs Modal
  isOrderFAQsOpen: boolean;
  setIsOrderFAQsOpen: (val: boolean) => void;
  openOrderFAQsModal: () => void;
  // Meet the Artisan Modal & Master Profile State
  isMeetArtisanOpen: boolean;
  setIsMeetArtisanOpen: (val: boolean) => void;
  openMeetArtisanModal: () => void;
  artisanProfile: ArtisanProfileData;
  updateArtisanProfile: (profile: ArtisanProfileData) => Promise<void>;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  isWishlistOpen: boolean;
  setIsWishlistOpen: (open: boolean) => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  // Multi-Device Customer Authentication & Cloud Wishlist Sync
  currentUser: User | null;
  isUserLoggedIn: boolean;
  loginWithGoogle: () => Promise<void>;
  logoutUser: () => Promise<void>;
  isWishlistCloudSynced: boolean;
  quickViewProduct: Product | null;
  setQuickViewProduct: (product: Product | null) => void;
  activeReel: TikTokReel | null;
  setActiveReel: (reel: TikTokReel | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  completedOrder: OrderDetails | null;
  setCompletedOrder: (order: OrderDetails | null) => void;
  isTrackerOpen: boolean;
  setIsTrackerOpen: (open: boolean) => void;
  trackingOrderId: string;
  setTrackingOrderId: (id: string) => void;
  openTracker: (orderId?: string) => void;
  isOrderManagerOpen: boolean;
  setIsOrderManagerOpen: (val: boolean) => void;
  openOrderManager: (orderId?: string) => void;
  // Customer Account & Loyalty Points Dashboard
  isAccountModalOpen: boolean;
  setIsAccountModalOpen: (val: boolean) => void;
  openAccountModal: (tab?: 'rewards' | 'history' | 'tiers' | 'profile') => void;
  accountModalTab: 'rewards' | 'history' | 'tiers' | 'profile';
  setAccountModalTab: (tab: 'rewards' | 'history' | 'tiers' | 'profile') => void;
  loyaltyPointsBalance: number;
  loyaltyAccount: LoyaltyAccount;
  // Product Comparison Feature
  compareProducts: Product[];
  isCompareOpen: boolean;
  setIsCompareOpen: (val: boolean) => void;
  toggleCompareProduct: (product: Product) => void;
  isProductCompared: (id: string) => boolean;
  clearCompare: () => void;
  openCompareModal: () => void;
  // Seller / Atelier Mode (Invisible to regular buyers)
  products: Product[];
  updateProduct: (updated: Product) => Promise<void>;
  addProduct: (newProduct: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  resetProductsToDefault: () => Promise<void>;
  isSellerMode: boolean;
  setIsSellerMode: (val: boolean) => void;
  isSellerAuthModalOpen: boolean;
  setIsSellerAuthModalOpen: (val: boolean) => void;
  isSellerModalOpen: boolean;
  setIsSellerModalOpen: (val: boolean) => void;
  isCatalogListOpen: boolean;
  setIsCatalogListOpen: (val: boolean) => void;
  editingProduct: Product | null;
  setEditingProduct: (product: Product | null) => void;
  openProductEditor: (product?: Product | null) => void;
  duplicateProduct: (id: string) => Promise<void>;
  toggleProductStock: (id: string) => Promise<void>;
  toggleProductNewArrival: (id: string) => Promise<void>;
  batchSetNewArrival: (ids: string[], isNew: boolean) => Promise<void>;
  // Restock Waitlist Notifications & In-App Alerts
  restockAlerts: RestockAlertItem[];
  dismissRestockAlert: (alertId: string) => void;
  lastRestockNotice: string | null;
  setLastRestockNotice: (notice: string | null) => void;
  // TikTok Reels Management
  reels: TikTokReel[];
  isTikTokManagerOpen: boolean;
  setIsTikTokManagerOpen: (val: boolean) => void;
  editingReel: TikTokReel | null;
  setEditingReel: (reel: TikTokReel | null) => void;
  openTikTokEditor: (reel?: TikTokReel | null) => void;
  updateReel: (reel: TikTokReel) => Promise<void>;
  addReel: (reel: TikTokReel) => Promise<void>;
  deleteReel: (id: string) => Promise<void>;
  // Craft Story & Making Video
  craftStory: CraftStoryData;
  updateCraftStory: (newData: CraftStoryData) => Promise<void>;
  isCraftStoryModalOpen: boolean;
  setIsCraftStoryModalOpen: (val: boolean) => void;
  // Instagram Journal & Handle Management
  instagramItems: InstagramJournalItem[];
  instagramHandle: string;
  instagramProfileUrl: string;
  isInstagramManagerOpen: boolean;
  setIsInstagramManagerOpen: (val: boolean) => void;
  editingInstagramItem: InstagramJournalItem | null;
  setEditingInstagramItem: (item: InstagramJournalItem | null) => void;
  openInstagramEditor: (item?: InstagramJournalItem | null) => void;
  updateInstagramItem: (item: InstagramJournalItem) => Promise<void>;
  addInstagramItem: (item: InstagramJournalItem) => Promise<void>;
  deleteInstagramItem: (id: string) => Promise<void>;
  deleteAllInstagramItems: () => Promise<void>;
  updateInstagramSettings: (handle: string, profileUrl?: string) => Promise<void>;
  // Main Application Multi-Tab Horizontal Navigation
  activeNavTab: AppNavTab;
  setActiveNavTab: (tab: AppNavTab) => void;
  // Social Media Showcase Tab
  activeSocialTab: 'tiktok' | 'journal';
  setActiveSocialTab: (tab: 'tiktok' | 'journal') => void;
  // Real-time Cloud Sync
  isCloudSynced: boolean;
  syncStatusText: string;
  isDataSyncing: boolean;
  forceSyncAllToCloud: () => Promise<void>;
  triggerCloudSync: () => Promise<void>;
  // Product Card Image Display Mode (contain = full piece visible without cropping, cover = edge-to-edge fill)
  productImageFit: 'contain' | 'cover';
  setProductImageFit: (fit: 'contain' | 'cover') => void;
  // Google Drive Cloud Sync Modal State
  isGoogleDriveOpen: boolean;
  setIsGoogleDriveOpen: (val: boolean) => void;
  // GitHub Import Modal State
  isGitHubImportOpen: boolean;
  setIsGitHubImportOpen: (val: boolean) => void;
  // Website Export Modal State
  isWebsiteExportOpen: boolean;
  setIsWebsiteExportOpen: (val: boolean) => void;
  // Automated Monthly Bestseller Threshold & Live Online Sales Tracking
  bestsellerThreshold: number;
  setBestsellerThreshold: (val: number) => void;
  recordOnlineOrderSales: (items: CartItem[]) => Promise<void>;
  addProductReview: (productId: string, review: ProductReviewItem) => Promise<void>;
  updateProductReview: (currentProductId: string, reviewId: string, updatedReview: ProductReviewItem, newProductId?: string) => Promise<void>;
  deleteProductReview: (productId: string, reviewId: string) => Promise<void>;
  // Customer Reviews Manager (Seller Studio)
  isReviewsManagerOpen: boolean;
  setIsReviewsManagerOpen: (val: boolean) => void;
  reviewsManagerProductId: string | null;
  setReviewsManagerProductId: (id: string | null) => void;
  openReviewsManager: (productId?: string | null) => void;
  // Product Navigation & Filtered Products Collection
  filteredProducts: Product[];
  navigateProduct: (direction: 'next' | 'prev') => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const GIFT_PACKAGING_COST = 150; // NPR

// Category-appropriate default fallbacks if an image is completely missing or broken
const CATEGORY_FALLBACKS: Record<string, string> = {
  'pearl-bags': 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=900&q=80',
  'pearl-necklaces': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80',
  'macrame': 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=80',
  'accessories': 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?auto=format&fit=crop&w=900&q=80',
  'custom-beaded': 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=80',
};

// Helper to sanitize product images and stock counts
const sanitizeProduct = (prod: Product): Product => {
  const fallback = CATEGORY_FALLBACKS[prod.category] || CATEGORY_FALLBACKS['pearl-bags'];
  
  const cleanImages = (prod.images || [])
    .map((img) => {
      if (typeof img === 'string' && img.startsWith('/uploads/')) {
        return fallback;
      }
      return img;
    })
    .filter((img) => typeof img === 'string' && img.trim() !== '');

  // Preserve explicit out-of-stock if explicitly set by seller, otherwise default to in-stock
  const explicitOutOfStock = prod.inStock === false && prod.stockCount === 0;
  const inStock = explicitOutOfStock ? false : (prod.inStock !== false);
  const stockCount = inStock ? (typeof prod.stockCount === 'number' && prod.stockCount > 0 ? prod.stockCount : 8) : 0;

  return {
    ...prod,
    inStock,
    stockCount,
    images: cleanImages.length > 0 ? cleanImages : [fallback]
  };
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('artified_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('artified_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedDeliveryZone, setSelectedDeliveryZone] = useState<DeliveryZone>(DELIVERY_ZONES[0]);
  const [giftPackaging, setGiftPackaging] = useState<boolean>(false);
  const [giftMessage, setGiftMessage] = useState<string>('');
  const [orderNote, setOrderNote] = useState<string>('');
  const [promoCode, setPromoCode] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState<boolean>(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState<boolean>(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string>('');
  const [isOrderManagerOpen, setIsOrderManagerOpen] = useState<boolean>(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [activeReel, setActiveReel] = useState<TikTokReel | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [completedOrder, setCompletedOrderState] = useState<OrderDetails | null>(null);

  // Smooth Non-Intrusive Add-to-Cart Visual Feedback State
  const [lastAddedItem, setLastAddedItem] = useState<{
    product: Product;
    quantity: number;
    color?: string;
    timestamp: number;
  } | null>(null);
  const [cartAnimationKey, setCartAnimationKey] = useState<number>(0);

  const clearLastAddedItem = () => setLastAddedItem(null);
  
  // Product Comparison Feature State
  const [compareProducts, setCompareProducts] = useState<Product[]>(() => {
    try {
      const saved = sessionStorage.getItem('artified_compare_products');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);

  // Refer a Friend Community Rewards State (Seller can hide or show)
  const [isReferralOpen, setIsReferralOpen] = useState<boolean>(false);
  const [isReferralVisible, setIsReferralVisible] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('artified_referral_visible');
      return stored !== null ? stored !== 'false' : true;
    } catch {
      return true;
    }
  });

  const toggleReferralVisibility = () => {
    setIsReferralVisible((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('artified_referral_visible', String(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  const openReferralModal = () => setIsReferralOpen(true);

  // Size Guide Modal State
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState<boolean>(false);
  const [sizeGuideDefaultTab, setSizeGuideDefaultTab] = useState<'necklaces' | 'rings' | 'bags'>('necklaces');
  const openSizeGuideModal = (tab: 'necklaces' | 'rings' | 'bags' = 'necklaces') => {
    setSizeGuideDefaultTab(tab);
    setIsSizeGuideOpen(true);
  };

  // Order FAQs Modal State
  const [isOrderFAQsOpen, setIsOrderFAQsOpen] = useState<boolean>(false);
  const openOrderFAQsModal = () => setIsOrderFAQsOpen(true);

  // Meet the Artisan Navigation (slides directly to Meet the Artisan tab in swipe deck)
  const [isMeetArtisanOpen, setIsMeetArtisanOpen] = useState<boolean>(false);
  const openMeetArtisanModal = () => {
    setActiveNavTab('artisan');
    setIsMeetArtisanOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleCompareProduct = (product: Product) => {
    setCompareProducts((prev) => {
      let updated: Product[];
      if (prev.some((p) => p.id === product.id)) {
        updated = prev.filter((p) => p.id !== product.id);
      } else {
        if (prev.length >= 2) {
          // Replace second item to maintain 2 items side-by-side
          updated = [prev[0], product];
        } else {
          updated = [...prev, product];
        }
      }
      try {
        sessionStorage.setItem('artified_compare_products', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const isProductCompared = (id: string) => compareProducts.some((p) => p.id === id);

  const clearCompare = () => {
    setCompareProducts([]);
    try {
      sessionStorage.removeItem('artified_compare_products');
    } catch {}
  };

  const openCompareModal = () => {
    setIsCompareOpen(true);
  };

  // URL Shared Wishlist and Referral hydration
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sharedWishlist = params.get('wishlist');
      if (sharedWishlist) {
        const ids = sharedWishlist.split(',').map((s) => s.trim()).filter(Boolean);
        if (ids.length > 0) {
          setWishlist((prev) => Array.from(new Set([...prev, ...ids])));
          setIsWishlistOpen(true);
        }
      }
      const refCode = params.get('ref');
      if (refCode) {
        // Automatically reward the referred friend with 10% off
        applyPromoCode('FRIEND10');
      }
    } catch {}
  }, []);

  // Restock Waitlist Notifications & In-App Alerts State
  const [restockAlerts, setRestockAlerts] = useState<RestockAlertItem[]>(() => getCustomerRestockAlerts());
  const [lastRestockNotice, setLastRestockNotice] = useState<string | null>(null);

  const dismissRestockAlert = (alertId: string) => {
    dismissCustomerRestockAlert(alertId);
    setRestockAlerts(getCustomerRestockAlerts());
  };

  useEffect(() => {
    const handleRestockAlertsUpdated = () => {
      setRestockAlerts(getCustomerRestockAlerts());
    };
    const handleRestockTriggered = (e: Event) => {
      const custom = e as CustomEvent<{ productTitle: string; notifiedCount: number; stockCount: number }>;
      if (custom.detail) {
        setRestockAlerts(getCustomerRestockAlerts());
        if (custom.detail.notifiedCount > 0) {
          setLastRestockNotice(`🔔 Restock alert sent to ${custom.detail.notifiedCount} waiting customer${custom.detail.notifiedCount > 1 ? 's' : ''} in Firestore for ${custom.detail.productTitle}!`);
          setTimeout(() => setLastRestockNotice(null), 5000);
        }
      }
    };
    window.addEventListener('artified_restock_alerts_updated', handleRestockAlertsUpdated);
    window.addEventListener('artified_restock_triggered', handleRestockTriggered);
    return () => {
      window.removeEventListener('artified_restock_alerts_updated', handleRestockAlertsUpdated);
      window.removeEventListener('artified_restock_triggered', handleRestockTriggered);
    };
  }, []);

  // Multi-Device Customer Authentication State & Firestore Wishlist Sync
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isWishlistCloudSynced, setIsWishlistCloudSynced] = useState<boolean>(false);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // When logged in, listen to the user's Firestore Wishlist
        const wishlistDocRef = doc(db, 'user_wishlists', user.uid);
        const unsubscribeWishlist = onSnapshot(
          wishlistDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const cloudData = snapshot.data();
              const cloudIds: string[] = Array.isArray(cloudData.productIds) ? cloudData.productIds : [];
              
              setWishlist((currentLocal) => {
                // Merge cloud items with any local items
                const merged = Array.from(new Set([...cloudIds, ...currentLocal]));
                try {
                  localStorage.setItem('artified_wishlist', JSON.stringify(merged));
                } catch {}

                // If local had extra items not in cloud, sync merged list back to cloud
                if (merged.length > cloudIds.length) {
                  setDoc(wishlistDocRef, {
                    userId: user.uid,
                    productIds: merged,
                    updatedAt: new Date().toISOString()
                  }, { merge: true }).catch(() => {});
                }

                return merged;
              });
              setIsWishlistCloudSynced(true);
            } else {
              // Doc doesn't exist yet in cloud: push local wishlist to Firestore
              setWishlist((currentLocal) => {
                if (currentLocal.length > 0) {
                  setDoc(wishlistDocRef, {
                    userId: user.uid,
                    productIds: currentLocal,
                    updatedAt: new Date().toISOString()
                  }, { merge: true }).catch(() => {});
                }
                return currentLocal;
              });
              setIsWishlistCloudSynced(true);
            }
          },
          (error) => {
            console.warn('Firestore user wishlist subscription notice:', error);
            setIsWishlistCloudSynced(false);
          }
        );

        return () => {
          unsubscribeWishlist();
        };
      } else {
        setIsWishlistCloudSynced(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Failed to sign in with Google:', err);
      throw err;
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(auth);
      setIsWishlistCloudSynced(false);
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  // Save wishlist to localStorage on updates
  useEffect(() => {
    try {
      localStorage.setItem('artified_wishlist', JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  // Customer Loyalty & Account Modal State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [accountModalTab, setAccountModalTab] = useState<'rewards' | 'history' | 'tiers' | 'profile'>('rewards');
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount>(() => getLoyaltyAccount());
  const [loyaltyPointsBalance, setLoyaltyPointsBalance] = useState<number>(() => getLoyaltyAccount().pointsBalance);

  const openAccountModal = (tab: 'rewards' | 'history' | 'tiers' | 'profile' = 'rewards') => {
    setAccountModalTab(tab);
    setIsAccountModalOpen(true);
  };

  useEffect(() => {
    const handleLoyaltyChange = () => {
      const fresh = getLoyaltyAccount();
      setLoyaltyAccount(fresh);
      setLoyaltyPointsBalance(fresh.pointsBalance);
    };
    window.addEventListener('artified_loyalty_updated', handleLoyaltyChange);
    return () => window.removeEventListener('artified_loyalty_updated', handleLoyaltyChange);
  }, []);

  // Known local cover images for TikTok reels in /public/tiktok_videos
  const KNOWN_LOCAL_TIKTOK_COVERS: Record<string, string> = {
    '7363984155060817160': '/tiktok_videos/7363984155060817160_cover.jpg',
    '7625655459537603860': '/tiktok_videos/7625655459537603860_cover.jpg',
    '7495598629625842952': '/tiktok_videos/7495598629625842952_cover.jpg',
    '7453859527411125512': '/tiktok_videos/7453859527411125512_cover.jpg',
  };

  const sanitizeTikTokReelsList = (list: TikTokReel[]): TikTokReel[] => {
    return list.map((r, i) => {
      const defaultReel = TIKTOK_REELS[i % TIKTOK_REELS.length];
      const ttId = r.videoUrl?.match(/\/video\/(\d+)/)?.[1] || defaultReel.videoUrl?.match(/\/video\/(\d+)/)?.[1];
      
      const isBadThumb = !r.thumbnail ||
        r.thumbnail.includes('/api/proxy-thumbnail') ||
        r.thumbnail.includes('tiktokcdn') ||
        r.thumbnail.includes('photo-1584917865442-de89df76afd3');

      let cleanThumbnail = r.thumbnail;
      if (isBadThumb) {
        if (ttId && KNOWN_LOCAL_TIKTOK_COVERS[ttId]) {
          cleanThumbnail = KNOWN_LOCAL_TIKTOK_COVERS[ttId];
        } else {
          cleanThumbnail = defaultReel.thumbnail;
        }
      }

      const cleanVideoUrl = (!r.videoUrl || (r.videoUrl.includes('@artified_np') && !r.videoUrl.includes('/video/')))
        ? defaultReel.videoUrl
        : r.videoUrl;

      return {
        ...r,
        thumbnail: cleanThumbnail,
        videoUrl: cleanVideoUrl
      };
    });
  };

  // TikTok Reels State - Guaranteed 4 viral reels from TIKTOK_REELS with self-healing thumbnails
  const [reels, setReels] = useState<TikTokReel[]>(() => {
    try {
      const saved = localStorage.getItem('artified_tiktok_reels');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= TIKTOK_REELS.length) {
          const sanitized = sanitizeTikTokReelsList(parsed);
          try {
            localStorage.setItem('artified_tiktok_reels', JSON.stringify(sanitized));
          } catch {}
          return sanitized;
        }
      }
    } catch {}
    const defaultSanitized = sanitizeTikTokReelsList(TIKTOK_REELS);
    try {
      localStorage.setItem('artified_tiktok_reels', JSON.stringify(defaultSanitized));
    } catch {}
    return defaultSanitized;
  });
  const [isTikTokManagerOpen, setIsTikTokManagerOpen] = useState<boolean>(false);
  const [editingReel, setEditingReel] = useState<TikTokReel | null>(null);

  const openTikTokEditor = (reel?: TikTokReel | null) => {
    setEditingReel(reel || null);
    setIsTikTokManagerOpen(true);
  };

  // Instagram Journal & Profile Handle State
  // Instagram Journal & Profile Handle State (Locked-State Pattern against default fallbacks)
  const [instagramItems, setInstagramItems] = useState<InstagramJournalItem[]>(() => {
    try {
      const deletedIds = JSON.parse(localStorage.getItem('artified_instagram_deleted_ids') || '["ig-1791099498584"]');
      const saved = localStorage.getItem('artified_instagram_journal_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((it: any) => it.id !== 'ig-1791099498584' && !deletedIds.includes(it.id));
          const sanitized = sanitizeInstagramItemsList(filtered);
          try {
            localStorage.setItem('artified_instagram_journal_items', JSON.stringify(sanitized));
          } catch {}
          return sanitized;
        }
      }
    } catch {}
    const deletedIds = ['ig-1791099498584'];
    return sanitizeInstagramItemsList(DEFAULT_INSTAGRAM_ITEMS.filter((it) => !deletedIds.includes(it.id)));
  });

  const [instagramHandle, setInstagramHandle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('artified_instagram_handle');
      if (saved) return saved;
    } catch {}
    return DEFAULT_INSTAGRAM_HANDLE;
  });

  const [instagramProfileUrl, setInstagramProfileUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('artified_instagram_profile_url');
      if (saved) return saved;
    } catch {}
    return DEFAULT_INSTAGRAM_PROFILE_URL;
  });

  // Fetch initial data from backend server database (products, reels, Instagram journal & settings)
  useEffect(() => {
    // 1. Hydrate Products from server disk (always ensure complete 33 products are loaded)
    fetch('/api/products')
      .then((res) => res.json())
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          let shouldAdopt = false;
          try {
            const localCustom = localStorage.getItem('artified_products_custom');
            if (!localCustom) {
              shouldAdopt = true;
            } else {
              const parsed = JSON.parse(localCustom);
              if (!Array.isArray(parsed) || parsed.length < items.length) {
                shouldAdopt = true;
              }
            }
          } catch {
            shouldAdopt = true;
          }

          if (shouldAdopt) {
            setProducts(items);
            try {
              localStorage.setItem('artified_products_custom', JSON.stringify(items));
            } catch {}
          }
        }
      })
      .catch(() => {});

    // 2. Hydrate TikTok Reels from server disk
    fetch('/api/tiktok-reels')
      .then((res) => res.json())
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          const cleanServerItems = sanitizeTikTokReelsList(items);
          let shouldAdopt = false;
          try {
            const localSaved = localStorage.getItem('artified_tiktok_reels');
            if (!localSaved) {
              shouldAdopt = true;
            } else {
              const parsed = JSON.parse(localSaved);
              if (!Array.isArray(parsed) || parsed.length < cleanServerItems.length) {
                shouldAdopt = true;
              } else {
                // If any item in local storage still has a bad/expired thumbnail or orange handbag, force adopt clean server items!
                const hasBadThumbs = parsed.some(
                  (p: TikTokReel) =>
                    !p.thumbnail ||
                    p.thumbnail.includes('/api/proxy-thumbnail') ||
                    p.thumbnail.includes('tiktokcdn') ||
                    p.thumbnail.includes('photo-1584917865442-de89df76afd3')
                );
                if (hasBadThumbs) {
                  shouldAdopt = true;
                }
              }
            }
          } catch {
            shouldAdopt = true;
          }

          if (shouldAdopt) {
            setReels(cleanServerItems);
            try {
              localStorage.setItem('artified_tiktok_reels', JSON.stringify(cleanServerItems));
            } catch {}
          }
        }
      })
      .catch(() => {});

    // 3. Hydrate Instagram Journal items directly from server disk and Firestore
    fetch('/api/instagram-journal')
      .then((res) => res.json())
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          const deletedIds: string[] = (() => {
            try {
              return JSON.parse(localStorage.getItem('artified_instagram_deleted_ids') || '["ig-1791099498584"]');
            } catch {
              return ['ig-1791099498584'];
            }
          })();
          const filtered = items.filter((it: any) => it.id !== 'ig-1791099498584' && !deletedIds.includes(it.id));
          const sanitized = sanitizeInstagramItemsList(filtered);
          setInstagramItems(sanitized);
          try {
            localStorage.setItem('artified_instagram_journal_items', JSON.stringify(sanitized));
          } catch {}
        }
      })
      .catch(() => {});

    // 4. Hydrate Instagram Settings from Firestore and server disk
    try {
      const igDocRef = doc(db, 'store_settings', 'instagram');
      getDoc(igDocRef).then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.handle) setInstagramHandle(data.handle);
          if (data?.profileUrl) setInstagramProfileUrl(data.profileUrl);
        }
      }).catch(() => {});

      onSnapshot(igDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.handle) setInstagramHandle(data.handle);
          if (data?.profileUrl) setInstagramProfileUrl(data.profileUrl);
        }
      }, () => {});
    } catch {}

    fetch('/api/instagram-settings')
      .then((res) => res.json())
      .then((settings) => {
        let localHandle = '';
        let localUrl = '';
        try {
          localHandle = localStorage.getItem('artified_instagram_handle') || '';
          localUrl = localStorage.getItem('artified_instagram_profile_url') || '';
        } catch {}

        if (localHandle && localHandle.trim()) {
          setInstagramHandle(localHandle);
          if (localUrl) setInstagramProfileUrl(localUrl);
        } else if (settings?.handle && settings?.profileUrl) {
          setInstagramHandle(settings.handle);
          setInstagramProfileUrl(settings.profileUrl);
        }
      })
      .catch(() => {});

    // 5. Hydrate Craft Story from Firestore and server disk
    try {
      const storyDocRef = doc(db, 'store_settings', 'craft_story');
      getDoc(storyDocRef).then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.title) {
            setCraftStory((prev) => ({ ...prev, ...data }));
          }
        }
      }).catch(() => {});
    } catch {}

    fetch('/api/craft-story')
      .then((res) => res.json())
      .then((story) => {
        if (story && typeof story === 'object' && story.title) {
          setCraftStory((prev) => ({ ...prev, ...story }));
          try {
            localStorage.setItem('artified_craft_story', JSON.stringify(story));
          } catch {}
        }
      })
      .catch(() => {});

    // 6. Hydrate Artisan Profile from Firestore & server disk
    try {
      const artisanDocRef = doc(db, 'activeProfile', 'sahina_shrestha');
      onSnapshot(artisanDocRef, (snap) => {
        if (snap.exists()) {
          const remoteData = snap.data() as ArtisanProfileData;
          if (remoteData && remoteData.artisanName) {
            setArtisanProfile((prev) => ({
              ...prev,
              ...remoteData,
              avatarUrl: remoteData.avatarUrl || prev.avatarUrl
            }));
          }
        }
      }, () => {});
    } catch {}

    fetchArtisanProfileFromServer().then((profile) => {
      if (profile) setArtisanProfile(profile);
    }).catch(() => {});

    // 7. Hydrate Tracked Orders from server disk
    fetch('/api/tracked-orders')
      .then((res) => res.json())
      .then((ordersMap) => {
        if (ordersMap && typeof ordersMap === 'object') {
          syncTrackedOrdersFromServer(ordersMap);
        }
      })
      .catch(() => {});

    // 8. Seed demo orders to Firestore for real-time tracking sync
    seedDemoOrdersToFirestore().catch(() => {});
  }, []);

  const [artisanProfile, setArtisanProfile] = useState<ArtisanProfileData>(() => getArtisanProfile());

  const updateArtisanProfile = async (newProfile: ArtisanProfileData) => {
    setArtisanProfile(newProfile);
    await saveArtisanProfile(newProfile);
  };

  useEffect(() => {
    const handleArtisanUpdate = (e: Event) => {
      const ce = e as CustomEvent<ArtisanProfileData>;
      if (ce.detail) {
        setArtisanProfile(ce.detail);
      }
    };
    window.addEventListener('artified_artisan_updated', handleArtisanUpdate);
    return () => window.removeEventListener('artified_artisan_updated', handleArtisanUpdate);
  }, []);

  const [isInstagramManagerOpen, setIsInstagramManagerOpen] = useState<boolean>(false);
  const [editingInstagramItem, setEditingInstagramItem] = useState<InstagramJournalItem | null>(null);

  const openInstagramEditor = (item?: InstagramJournalItem | null) => {
    setEditingInstagramItem(item || null);
    setIsInstagramManagerOpen(true);
  };

  // Craft Story & Making Video State
  const [craftStory, setCraftStory] = useState<CraftStoryData>(() => {
    try {
      const saved = localStorage.getItem('artified_craft_story');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.videoUrl || parsed.title)) {
          return { ...DEFAULT_CRAFT_STORY, ...parsed };
        }
      }
    } catch {}
    return DEFAULT_CRAFT_STORY;
  });
  const [isCraftStoryModalOpen, setIsCraftStoryModalOpen] = useState<boolean>(false);

  // Main Application Multi-Tab Horizontal Navigation
  const [activeNavTab, setActiveNavTab] = useState<AppNavTab>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab') || params.get('section');
        if (tab && ['home', 'artisan', 'workshops', 'tiktok', 'journal', 'craft', 'track', 'orders'].includes(tab)) {
          return tab as AppNavTab;
        }
        const hash = window.location.hash.replace('#', '').toLowerCase();
        if (hash && ['home', 'artisan', 'workshops', 'tiktok', 'journal', 'craft', 'track', 'orders'].includes(hash)) {
          return hash as AppNavTab;
        }
      }
    } catch {}
    return 'home';
  });

  // Social Media Showcase Tab State ('tiktok' | 'journal')
  const [activeSocialTab, setActiveSocialTab] = useState<'tiktok' | 'journal'>('tiktok');

  // Products State - Guaranteed all 33 products loaded immediately without flickering default items
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('artified_products_custom');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= PRODUCTS.length) {
          return parsed.map(sanitizeProduct);
        }
      }
    } catch {}
    return PRODUCTS.map(sanitizeProduct);
  });

  // Google Search & Direct Link Hydration (?product=id or ?category=id)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const prodParam = params.get('product') || params.get('p');
      if (prodParam && products.length > 0 && !quickViewProduct) {
        const found = products.find(
          (p) => p.id === prodParam || p.id.toLowerCase() === prodParam.toLowerCase()
        );
        if (found) {
          setQuickViewProduct(found);
        }
      }

      const catParam = params.get('category') || params.get('cat');
      if (catParam) {
        setSelectedCategory(catParam);
      }
    } catch {}
  }, [products]);

  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);
  const [syncStatusText, setSyncStatusText] = useState<string>('Live Cloud Storage Ready');
  const [isDataSyncing, setIsDataSyncing] = useState<boolean>(false);

  // Product Image Fit Mode (contain = whole piece visible, cover = fill box)
  const [productImageFit, setProductImageFitState] = useState<'contain' | 'cover'>(() => {
    try {
      const saved = localStorage.getItem('artified_product_image_fit');
      if (saved === 'contain' || saved === 'cover') return saved;
    } catch {}
    return 'contain';
  });

  const setProductImageFit = (fit: 'contain' | 'cover') => {
    setProductImageFitState(fit);
    try {
      localStorage.setItem('artified_product_image_fit', fit);
    } catch {}
  };

  const [isGoogleDriveOpen, setIsGoogleDriveOpen] = useState<boolean>(false);
  const [isGitHubImportOpen, setIsGitHubImportOpen] = useState<boolean>(false);
  const [isWebsiteExportOpen, setIsWebsiteExportOpen] = useState<boolean>(false);

  // Monthly Bestseller Threshold (set by seller in Seller Studio)
  const [bestsellerThreshold, setBestsellerThresholdState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('artified_bestseller_threshold');
      if (saved) return Number(saved) || 50;
    } catch {}
    return 50;
  });

  const setBestsellerThreshold = async (val: number) => {
    const num = Math.max(1, Number(val) || 50);
    setBestsellerThresholdState(num);
    try {
      localStorage.setItem('artified_bestseller_threshold', String(num));
    } catch {}

    try {
      const generalDocRef = doc(db, 'store_settings', 'general');
      await setDoc(generalDocRef, { bestsellerThreshold: num }, { merge: true });
    } catch (err) {
      console.warn('Could not sync bestsellerThreshold to cloud:', err);
    }
  };

  // Customer Reviews Manager State (Seller Studio Access)
  const [isReviewsManagerOpen, setIsReviewsManagerOpen] = useState<boolean>(false);
  const [reviewsManagerProductId, setReviewsManagerProductId] = useState<string | null>(null);

  const openReviewsManager = (productId?: string | null) => {
    setReviewsManagerProductId(productId || null);
    setIsReviewsManagerOpen(true);
  };

  // Dynamically Filtered Products based on selected Category and Search
  const filteredProducts = React.useMemo(() => {
    let result = [...products];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.materials.some((m) => m.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (selectedCategory === 'pearl-bags') {
      result = result.filter((p) => p.category === 'pearl-bags');
    } else if (selectedCategory === 'pearl-necklaces') {
      result = result.filter((p) => p.category === 'pearl-necklaces');
    } else if (selectedCategory === 'macrame') {
      result = result.filter((p) => p.category === 'macrame');
    } else if (selectedCategory === 'accessories') {
      result = result.filter((p) => p.category === 'accessories');
    } else if (selectedCategory === 'new-arrivals') {
      result = result.filter((p) => p.isNewArrival);
    } else if (selectedCategory === 'best-sellers') {
      result = result.filter((p) => p.isBestSeller || isProductBestSeller(p, bestsellerThreshold));
    }

    return result;
  }, [products, selectedCategory, searchQuery, bestsellerThreshold]);

  // Navigate left or right between products within the active collection
  const navigateProduct = (direction: 'next' | 'prev') => {
    if (filteredProducts.length === 0) return;
    const currentIndex = quickViewProduct 
      ? filteredProducts.findIndex((p) => p.id === quickViewProduct.id)
      : -1;
    let nextIndex = 0;
    if (currentIndex === -1) {
      nextIndex = direction === 'next' ? 0 : filteredProducts.length - 1;
    } else {
      if (direction === 'next') {
        nextIndex = (currentIndex + 1) % filteredProducts.length;
      } else {
        nextIndex = (currentIndex - 1 + filteredProducts.length) % filteredProducts.length;
      }
    }
    setQuickViewProduct(filteredProducts[nextIndex]);
  };

  // Record genuine live online sales when an order is submitted
  const recordOnlineOrderSales = async (items: CartItem[]) => {
    try {
      const updatedProducts = products.map((prod) => {
        const matchingItem = items.find((item) => item.product.id === prod.id);
        if (matchingItem) {
          const prevOnline = prod.onlineSalesCount || 0;
          return {
            ...prod,
            onlineSalesCount: prevOnline + matchingItem.quantity
          };
        }
        return prod;
      });

      setProducts(updatedProducts);
      try {
        localStorage.setItem('artified_products_v3', JSON.stringify(updatedProducts));
      } catch {}

      // Real-time Cloud Firestore sync
      try {
        const batch = writeBatch(db);
        for (const item of items) {
          const prodRef = doc(db, 'products', item.product.id);
          const current = updatedProducts.find((p) => p.id === item.product.id);
          if (current) {
            batch.set(prodRef, current, { merge: true });
          }
        }
        await batch.commit();
      } catch (cloudErr) {
        console.warn('Online sales logged locally:', cloudErr);
      }
    } catch (e) {
      console.error('Error logging online sales:', e);
    }
  };

  // Add customer review to a product
  const addProductReview = async (productId: string, review: ProductReviewItem) => {
    try {
      const sanitized = sanitizeReviewItem(review);
      const updatedProducts = products.map((prod) => {
        if (prod.id === productId) {
          const existingReviews = prod.customReviews || [];
          return {
            ...prod,
            customReviews: [sanitized, ...existingReviews.filter((r) => r.id !== sanitized.id)]
          };
        }
        return prod;
      });

      setProducts(updatedProducts);
      try {
        localStorage.setItem('artified_products_v3', JSON.stringify(updatedProducts));
      } catch {}

      try {
        const prodRef = doc(db, 'products', productId);
        const current = updatedProducts.find((p) => p.id === productId);
        if (current) {
          await setDoc(prodRef, current, { merge: true });
        }
      } catch (cloudErr) {
        console.warn('Review saved locally:', cloudErr);
      }
    } catch (e) {
      console.error('Error saving review:', e);
    }
  };

  // Edit an existing customer review (author, location, comment, rating, date, and product reassignment)
  const updateProductReview = async (
    currentProductId: string,
    reviewId: string,
    updatedReview: ProductReviewItem,
    newProductId?: string
  ) => {
    try {
      const sanitized = sanitizeReviewItem(updatedReview);
      const targetProductId = (newProductId || currentProductId).trim();
      const isMovingProduct = targetProductId !== currentProductId;

      const updatedProducts = products.map((prod) => {
        if (isMovingProduct) {
          // 1. Remove from current product
          if (prod.id === currentProductId) {
            const existingCustom = (prod.customReviews || []).filter((r) => r.id !== reviewId);
            return {
              ...prod,
              customReviews: [...existingCustom, { ...sanitized, id: reviewId, isDeleted: true } as any]
            };
          }
          // 2. Add to new target product
          if (prod.id === targetProductId) {
            const existing = (prod.customReviews || []).filter((r) => r.id !== reviewId);
            return {
              ...prod,
              customReviews: [sanitized, ...existing]
            };
          }
          return prod;
        }

        // Updating in the same product
        if (prod.id === currentProductId) {
          const existingCustom = prod.customReviews || [];
          const exists = existingCustom.some((r) => r.id === reviewId);
          let newCustom: ProductReviewItem[];
          if (exists) {
            newCustom = existingCustom.map((r) => (r.id === reviewId ? sanitized : r));
          } else {
            // First time editing a curated review: add override
            newCustom = [sanitized, ...existingCustom];
          }
          return {
            ...prod,
            customReviews: newCustom
          };
        }

        return prod;
      });

      setProducts(updatedProducts);
      try {
        localStorage.setItem('artified_products_v3', JSON.stringify(updatedProducts));
      } catch {}

      // Sync Firestore
      try {
        const prodRef = doc(db, 'products', currentProductId);
        const current = updatedProducts.find((p) => p.id === currentProductId);
        if (current) await setDoc(prodRef, current, { merge: true });

        if (isMovingProduct) {
          const targetRef = doc(db, 'products', targetProductId);
          const targetProd = updatedProducts.find((p) => p.id === targetProductId);
          if (targetProd) await setDoc(targetRef, targetProd, { merge: true });
        }
      } catch (cloudErr) {
        console.warn('Review update saved locally:', cloudErr);
      }
    } catch (e) {
      console.error('Error updating review:', e);
    }
  };

  // Delete a review (or hide curated default)
  const deleteProductReview = async (productId: string, reviewId: string) => {
    try {
      const updatedProducts = products.map((prod) => {
        if (prod.id === productId) {
          const existingCustom = (prod.customReviews || []).filter((r) => r.id !== reviewId);
          return {
            ...prod,
            customReviews: [...existingCustom, { id: reviewId, isDeleted: true } as any]
          };
        }
        return prod;
      });

      setProducts(updatedProducts);
      try {
        localStorage.setItem('artified_products_v3', JSON.stringify(updatedProducts));
      } catch {}

      try {
        const prodRef = doc(db, 'products', productId);
        const current = updatedProducts.find((p) => p.id === productId);
        if (current) await setDoc(prodRef, current, { merge: true });
      } catch (cloudErr) {
        console.warn('Review delete saved locally:', cloudErr);
      }
    } catch (e) {
      console.error('Error deleting review:', e);
    }
  };

  // 1. Initial connection test to Firestore
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection')).catch(() => {});
      } catch {}
    }
    testConnection();
  }, []);

  // 2. Real-time Firestore synchronization listener
  useEffect(() => {
    const productsCol = collection(db, 'products');

    const unsubscribe = onSnapshot(
      productsCol,
      async (snapshot) => {
        if (!snapshot.empty) {
          const cloudProducts: Product[] = [];
          snapshot.forEach((docSnap: any) => {
            cloudProducts.push(sanitizeProduct(docSnap.data() as Product));
          });

          // Safeguard: only replace local/server products if cloud has at least as many pieces
          if (cloudProducts.length >= products.length || cloudProducts.length >= 30) {
            const sorted = [...cloudProducts].map(sanitizeProduct).sort((a, b) => {
              const idxA = PRODUCTS.findIndex((p) => p.id === a.id);
              const idxB = PRODUCTS.findIndex((p) => p.id === b.id);
              if (idxA !== -1 && idxB !== -1) return idxA - idxB;
              if (idxA !== -1) return -1;
              if (idxB !== -1) return 1;
              return a.title.localeCompare(b.title);
            });

            setProducts(sorted);
            try {
              localStorage.setItem('artified_products_custom', JSON.stringify(sorted));
            } catch {}
          }
          setIsCloudSynced(true);
          setIsDataSyncing(false);
          setSyncStatusText('🟢 Live Cloud Synced across all devices');
        } else {
          // If Firestore is empty or quota-limited, use local/server catalog
          setSyncStatusText('🟢 Catalog Ready (Server & Local Storage)');
          let seedList: Product[] = PRODUCTS;
          try {
            const localRaw = localStorage.getItem('artified_products_custom');
            if (localRaw) {
              const parsed = JSON.parse(localRaw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                seedList = parsed;
              }
            }
          } catch {}
          setProducts(seedList);
          setIsCloudSynced(false);
        }
      },
      (error) => {
        console.warn('Firestore onSnapshot products notice (using local & server catalog due to cloud quota):', error);
        setSyncStatusText('🟢 Catalog Ready (Server & Local Storage)');
        setIsCloudSynced(false);

        // Fall back gracefully to server products, local cache, or default products
        fetch('/api/products')
          .then((res) => res.json())
          .then((items) => {
            if (Array.isArray(items) && items.length > 0) {
              setProducts(items);
              try {
                localStorage.setItem('artified_products_custom', JSON.stringify(items));
              } catch {}
            }
          })
          .catch(() => {
            try {
              const localRaw = localStorage.getItem('artified_products_custom');
              if (localRaw) {
                const parsed = JSON.parse(localRaw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setProducts(parsed);
                  return;
                }
              }
            } catch {}
            setProducts(PRODUCTS);
          });
      }
    );

    return () => unsubscribe();
  }, []);

  // 3. Real-time TikTok Reels Firestore sync
  useEffect(() => {
    const reelsCol = collection(db, 'tiktok_reels');
    const unsubscribe = onSnapshot(
      reelsCol,
      async (snapshot) => {
        const cloudReels: TikTokReel[] = [];
        snapshot.forEach((docSnap: any) => {
          cloudReels.push(docSnap.data() as TikTokReel);
        });
        if (cloudReels.length > 0) {
          setReels(cloudReels);
          try {
            localStorage.setItem('artified_tiktok_reels', JSON.stringify(cloudReels));
          } catch {}
        }
      },
      (err) => {
        console.warn('TikTok reels onSnapshot notice (persisting via local & server database):', err);
        fetch('/api/tiktok-reels')
          .then((res) => res.json())
          .then((items) => {
            if (Array.isArray(items) && items.length > 0) {
              setReels(items);
              try {
                localStorage.setItem('artified_tiktok_reels', JSON.stringify(items));
              } catch {}
            }
          })
          .catch(() => {});
      }
    );

    return () => unsubscribe();
  }, []);

  // 4. Real-time Craft Story Firestore sync
  useEffect(() => {
    const craftDocRef = doc(db, 'store_settings', 'craft_story');
    const unsubscribe = onSnapshot(
      craftDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as CraftStoryData;
          setCraftStory((prev) => ({ ...prev, ...data }));
          try {
            localStorage.setItem('artified_craft_story', JSON.stringify({ ...DEFAULT_CRAFT_STORY, ...data }));
          } catch {}
        }
      },
      (err) => {
        console.warn('Craft story onSnapshot error:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // 5. Real-time Instagram Journal Firestore sync with locked-state reconciliation
  useEffect(() => {
    const igCol = collection(db, 'instagram_journal');
    const unsubscribe = onSnapshot(
      igCol,
      async (snapshot) => {
        const deletedIds: string[] = (() => {
          try {
            return JSON.parse(localStorage.getItem('artified_instagram_deleted_ids') || '["ig-1791099498584"]');
          } catch {
            return ['ig-1791099498584'];
          }
        })();

        if (!snapshot.empty) {
          const cloudItems: InstagramJournalItem[] = [];
          snapshot.forEach((docSnap: any) => {
            const data = docSnap.data() as InstagramJournalItem;
            if (data.id === 'ig-1791099498584' || docSnap.id === 'ig-1791099498584') {
              // Asynchronously clean up from Firestore
              deleteDoc(doc(db, 'instagram_journal', docSnap.id)).catch(() => {});
              return;
            }
            if (!deletedIds.includes(data.id) && !deletedIds.includes(docSnap.id)) {
              cloudItems.push(data);
            }
          });
          
          if (cloudItems.length > 0) {
            // Read local saved items to reconcile
            let localItems: InstagramJournalItem[] = [];
            try {
              const localSaved = localStorage.getItem('artified_instagram_journal_items');
              if (localSaved) {
                const parsed = JSON.parse(localSaved);
                if (Array.isArray(parsed)) {
                  localItems = parsed.filter((it: any) => it.id !== 'ig-1791099498584' && !deletedIds.includes(it.id));
                }
              }
            } catch {}

            // Reconcile: user customized/locked metadata takes absolute precedence
            const reconciledMap = new Map<string, InstagramJournalItem>();
            
            // 1. Add cloud items first
            cloudItems.forEach((cItem) => {
              if (cItem.id !== 'ig-1791099498584' && !deletedIds.includes(cItem.id)) {
                reconciledMap.set(cItem.id, cItem);
              }
            });

            // 2. Overlay local locked/customized items so user edits are never reverted
            localItems.forEach((lItem) => {
              if (lItem.id !== 'ig-1791099498584' && !deletedIds.includes(lItem.id)) {
                const existingCloud = reconciledMap.get(lItem.id);
                if (lItem.isLocked || !existingCloud) {
                  reconciledMap.set(lItem.id, { ...(existingCloud || {}), ...lItem });
                } else if (lItem.postUrl && lItem.postUrl !== 'https://www.instagram.com/artified_np/') {
                  reconciledMap.set(lItem.id, { ...existingCloud, ...lItem });
                }
              }
            });

            const signatureVideos = [
              '/instagram_videos/DdjhhazvaRr.mp4',
              '/instagram_videos/DdMRgKdP4HK.mp4',
              '/instagram_videos/DdIUMC4BqFr.mp4',
              '/instagram_videos/DY6OqqfPyJu.mp4'
            ];
            const signatureCovers = [
              '/instagram_videos/DdjhhazvaRr_cover.jpg',
              '/instagram_videos/DdMRgKdP4HK_cover.jpg',
              '/instagram_videos/DdIUMC4BqFr_cover.jpg',
              '/instagram_videos/DY6OqqfPyJu_cover.jpg'
            ];

            const reconciledList = Array.from(reconciledMap.values())
              .filter((it) => it.id !== 'ig-1791099498584' && !deletedIds.includes(it.id))
              .map((it, idx) => {
                const assignedVid = signatureVideos[idx % signatureVideos.length];
                const assignedCover = signatureCovers[idx % signatureCovers.length];

                let finalVid = it.videoUrl?.trim();
                if (!finalVid) {
                  finalVid = assignedVid;
                }

                let finalCover = it.thumbnail?.trim();
                if (!finalCover) {
                  finalCover = assignedCover;
                }

                return { ...it, videoUrl: finalVid, thumbnail: finalCover };
              });
            if (reconciledList.length > 0) {
              setInstagramItems(reconciledList);
              try {
                localStorage.setItem('artified_instagram_journal_items', JSON.stringify(reconciledList));
                localStorage.setItem('artified_instagram_locked', 'true');
              } catch {}
            }
          }
        } else {
          // If Firestore is empty or quota-limited, use local/saved items
          let existingLocal: InstagramJournalItem[] = [];
          try {
            const saved = localStorage.getItem('artified_instagram_journal_items');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                existingLocal = parsed.filter((it: any) => it.id !== 'ig-1791099498584' && !deletedIds.includes(it.id));
              }
            }
          } catch {}

          const listToSeed = existingLocal.length > 0 
            ? existingLocal 
            : DEFAULT_INSTAGRAM_ITEMS.filter((it) => it.id !== 'ig-1791099498584' && !deletedIds.includes(it.id));
          setInstagramItems(listToSeed);
        }
      },
      (err) => {
        console.warn('Instagram journal onSnapshot notice (persisting via local & server database):', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // 6. Real-time Instagram Profile Settings Firestore sync
  useEffect(() => {
    const igSettingsRef = doc(db, 'store_settings', 'instagram');
    const unsubscribe = onSnapshot(
      igSettingsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data?.handle) {
            setInstagramHandle(data.handle);
            try { localStorage.setItem('artified_instagram_handle', data.handle); } catch {}
          }
          if (data?.profileUrl) {
            setInstagramProfileUrl(data.profileUrl);
            try { localStorage.setItem('artified_instagram_profile_url', data.profileUrl); } catch {}
          }
        }
      },
      (err) => {
        console.warn('Instagram settings onSnapshot error:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // 7. Real-time General Settings (bestsellerThreshold) Firestore sync
  useEffect(() => {
    const generalSettingsRef = doc(db, 'store_settings', 'general');
    const unsubscribe = onSnapshot(
      generalSettingsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data?.bestsellerThreshold) {
            const num = Number(data.bestsellerThreshold);
            if (!isNaN(num) && num > 0) {
              setBestsellerThresholdState(num);
              try { localStorage.setItem('artified_bestseller_threshold', String(num)); } catch {}
            }
          }
        }
      },
      (err) => {
        console.warn('General settings onSnapshot error:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  const forceSyncAllToCloud = async () => {
    setSyncStatusText('Pushing all local edits to cloud...');
    try {
      const batch = writeBatch(db);
      for (const p of products) {
        // Compress any base64 images if needed
        const optimizedImages = await Promise.all(
          p.images.map(async (img) => {
            if (img.startsWith('data:image/')) {
              return await compressImage(img, 1000, 1000, 0.82);
            }
            return img;
          })
        );
        const cleanedProduct = { ...p, images: optimizedImages };
        batch.set(doc(db, 'products', p.id), cleanedProduct);
      }
      await batch.commit();
      setIsCloudSynced(true);
      setSyncStatusText('🟢 Live Cloud Synced across all devices');
    } catch (err) {
      console.error('Failed to force sync to cloud', err);
      handleFirestoreError(err, OperationType.WRITE, 'products');
    }
  };

  // Seller / Atelier Mode State - Starts securely locked by default for all visitors & website reloads
  const [isSellerMode, setIsSellerModeState] = useState<boolean>(false);
  const [isSellerAuthModalOpen, setIsSellerAuthModalOpen] = useState<boolean>(false);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState<boolean>(false);
  const [isCatalogListOpen, setIsCatalogListOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Check URL parameters for explicit seller access trigger (opens password prompt instead of auto-unlocking)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Clear any old permanent auto-unlock flags from localStorage to protect the live site
        localStorage.removeItem('artified_seller_mode');
        localStorage.removeItem('artified_seller_session');
        localStorage.removeItem('artified_seller_session_token');

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('seller') === 'true' || urlParams.get('admin') === 'true' || urlParams.get('atelier') === 'admin') {
          // Open password modal so the user must authenticate securely with their password
          setIsSellerAuthModalOpen(true);
        }
      } catch {}
    }
  }, []);

  const setIsSellerMode = (val: boolean) => {
    setIsSellerModeState(val);
    if (typeof window !== 'undefined') {
      try {
        if (val) {
          sessionStorage.setItem('artified_seller_session', 'active');
        } else {
          sessionStorage.removeItem('artified_seller_session');
          localStorage.removeItem('artified_seller_mode');
          localStorage.removeItem('artified_seller_session');
          localStorage.removeItem('artified_seller_session_token');
        }
      } catch {}
    }
  };

  const updateProduct = async (updated: Product) => {
    // 1. Optimize images if any base64
    const cleanImages = await Promise.all(
      updated.images.map(async (img) => {
        if (img.startsWith('data:image/')) {
          return await compressImage(img, 1000, 1000, 0.82);
        }
        return img;
      })
    );
    const cleanedProduct: Product = sanitizeProduct({ ...updated, images: cleanImages });

    // 2. Optimistic UI update
    setProducts((prev) => {
      const next = prev.map((p) => (p.id === cleanedProduct.id ? cleanedProduct : p));
      try {
        localStorage.setItem('artified_products_custom', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save custom products', e);
      }
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {});
      return next;
    });

    if (quickViewProduct?.id === cleanedProduct.id) {
      setQuickViewProduct(cleanedProduct);
    }

    // 3. Write to Cloud Firestore in background without blocking UI
    try {
      const docRef = doc(db, 'products', cleanedProduct.id);
      setDoc(docRef, sanitizeForFirestore(cleanedProduct)).catch(() => {});
    } catch {}

    // 4. If product was previously out-of-stock and is now marked restocked, trigger waitlist notifications in Firestore
    const previous = products.find((p) => p.id === cleanedProduct.id);
    const wasOutOfStock = previous 
      ? (previous.inStock === false || (typeof previous.stockCount === 'number' && previous.stockCount <= 0))
      : false;
    const isNowInStock = cleanedProduct.inStock === true && (typeof cleanedProduct.stockCount === 'number' ? cleanedProduct.stockCount > 0 : true);

    if (wasOutOfStock && isNowInStock) {
      triggerRestockNotifications(cleanedProduct.id, cleanedProduct.title, cleanedProduct.stockCount || 1).catch((err) => {
        console.warn('Notice: Restock notification trigger:', err);
      });
    }
  };

  const addProduct = async (newProduct: Product) => {
    // 1. Optimize images if any base64
    const cleanImages = await Promise.all(
      newProduct.images.map(async (img) => {
        if (img.startsWith('data:image/')) {
          return await compressImage(img, 1000, 1000, 0.82);
        }
        return img;
      })
    );
    const cleanedProduct: Product = sanitizeProduct({ ...newProduct, images: cleanImages });

    setProducts((prev) => {
      const next = [cleanedProduct, ...prev];
      try {
        localStorage.setItem('artified_products_custom', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save custom products', e);
      }
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {});
      return next;
    });

    try {
      const docRef = doc(db, 'products', cleanedProduct.id);
      setDoc(docRef, sanitizeForFirestore(cleanedProduct)).catch(() => {});
    } catch {}
  };

  const duplicateProduct = async (id: string) => {
    const existing = products.find((p) => p.id === id);
    if (!existing) return;

    const cloned: Product = {
      ...existing,
      id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `${existing.title} (Copy)`,
      isNewArrival: true,
      reviewsCount: 0,
      stockCount: 3,
    };

    await addProduct(cloned);
  };

  const toggleProductStock = async (id: string) => {
    const existing = products.find((p) => p.id === id);
    if (!existing) return;

    const newInStock = !existing.inStock;
    const updated: Product = {
      ...existing,
      inStock: newInStock,
      stockCount: newInStock ? (existing.stockCount > 0 ? existing.stockCount : 3) : 0,
    };

    await updateProduct(updated);
  };

  const toggleProductNewArrival = async (id: string) => {
    const existing = products.find((p) => p.id === id);
    if (!existing) return;

    const updated: Product = {
      ...existing,
      isNewArrival: !existing.isNewArrival,
    };

    await updateProduct(updated);
  };

  const batchSetNewArrival = async (ids: string[], isNew: boolean) => {
    if (ids.length === 0) return;
    const targetSet = new Set(ids);
    const updatedBatch: Product[] = [];

    setProducts((prev) => {
      const next = prev.map((p) => {
        if (targetSet.has(p.id)) {
          const updated = { ...p, isNewArrival: isNew };
          updatedBatch.push(updated);
          return updated;
        }
        return p;
      });
      try {
        localStorage.setItem('artified_products_custom', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save custom products', e);
      }
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {});
      return next;
    });

    try {
      const batch = writeBatch(db);
      updatedBatch.forEach((p) => {
        batch.set(doc(db, 'products', p.id), sanitizeProduct(p));
      });
      batch.commit().catch(() => {});
    } catch {}
  };

  const deleteProduct = async (id: string) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem('artified_products_custom', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save custom products', e);
      }
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {});
      return next;
    });

    if (quickViewProduct?.id === id) {
      setQuickViewProduct(null);
    }

    try {
      const docRef = doc(db, 'products', id);
      deleteDoc(docRef).catch(() => {});
    } catch {}
  };

  const resetProductsToDefault = async () => {
    try {
      localStorage.removeItem('artified_products_custom');
    } catch (e) {
      console.warn('Failed to remove custom products', e);
    }
    setProducts(PRODUCTS);

    try {
      const batch = writeBatch(db);
      PRODUCTS.forEach((p) => {
        batch.set(doc(db, 'products', p.id), p);
      });
      batch.commit().catch(() => {});
    } catch {}
  };

  const openProductEditor = (product?: Product | null) => {
    setEditingProduct(product || null);
    setIsSellerModalOpen(true);
  };

  const updateReel = async (updated: TikTokReel) => {
    setReels((prev) => {
      const next = prev.map((r) => (r.id === updated.id ? updated : r));
      try {
        localStorage.setItem('artified_tiktok_reels', JSON.stringify(next));
      } catch {}
      fetch('/api/tiktok-reels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {});
      return next;
    });

    try {
      const docRef = doc(db, 'tiktok_reels', updated.id);
      setDoc(docRef, sanitizeForFirestore(updated)).catch(() => {});
    } catch {}
  };

  const addReel = async (newReel: TikTokReel) => {
    setReels((prev) => {
      const next = [newReel, ...prev];
      try {
        localStorage.setItem('artified_tiktok_reels', JSON.stringify(next));
      } catch {}
      fetch('/api/tiktok-reels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {});
      return next;
    });

    try {
      const docRef = doc(db, 'tiktok_reels', newReel.id);
      setDoc(docRef, sanitizeForFirestore(newReel)).catch(() => {});
    } catch {}
  };

  const deleteReel = async (id: string) => {
    setReels((prev) => {
      const next = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem('artified_tiktok_reels', JSON.stringify(next));
      } catch {}
      fetch('/api/tiktok-reels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {});
      return next;
    });

    try {
      const docRef = doc(db, 'tiktok_reels', id);
      deleteDoc(docRef).catch(() => {});
    } catch {}
  };

  const updateCraftStory = async (newData: CraftStoryData) => {
    setCraftStory(newData);
    try {
      localStorage.setItem('artified_craft_story', JSON.stringify(newData));
    } catch {}

    fetch('/api/craft-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newData),
    }).catch(() => {});

    try {
      const craftDocRef = doc(db, 'store_settings', 'craft_story');
      setDoc(craftDocRef, sanitizeForFirestore(newData), { merge: true }).catch(() => {});
    } catch {}
  };

  const cleanInstagramItemForFirestore = (item: InstagramJournalItem): Record<string, any> => {
    const docData: Record<string, any> = {
      id: item.id,
      title: item.title || '',
      caption: item.caption || '',
      thumbnail: item.thumbnail || '',
      postUrl: item.postUrl || '',
      handle: item.handle || '@artified_np',
    };
    if (item.videoUrl && item.videoUrl.trim()) {
      docData.videoUrl = item.videoUrl.trim();
    }
    if (item.date) {
      docData.date = item.date;
    }
    if (item.likes) {
      docData.likes = item.likes;
    }
    if (item.views) {
      docData.views = item.views;
    }
    if (item.comments) {
      docData.comments = item.comments;
    }
    if (item.showLikes !== undefined) {
      docData.showLikes = item.showLikes;
    }
    if (item.showViews !== undefined) {
      docData.showViews = item.showViews;
    }
    if (item.taggedProductId && item.taggedProductId.trim()) {
      docData.taggedProductId = item.taggedProductId.trim();
      docData.taggedProductName = item.taggedProductName || '';
      docData.taggedProductPrice = Number(item.taggedProductPrice) || 0;
    }
    if (item.isLocked !== undefined) {
      docData.isLocked = item.isLocked;
    }
    return docData;
  };

  const updateInstagramItem = async (updated: InstagramJournalItem) => {
    const cleaned = cleanInstagramItemForFirestore(updated) as InstagramJournalItem;
    setInstagramItems((prev) => {
      const next = prev.map((item) => (item.id === updated.id ? cleaned : item));
      try {
        localStorage.setItem('artified_instagram_journal_items', JSON.stringify(next));
        localStorage.setItem('artified_instagram_custom_saved', 'true');
        localStorage.setItem('artified_instagram_locked', 'true');
        fetch('/api/instagram-journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next)
        }).catch(() => {});
      } catch {}
      return next;
    });

    try {
      const docRef = doc(db, 'instagram_journal', updated.id);
      setDoc(docRef, sanitizeForFirestore(cleaned)).catch(() => {});
    } catch {}
  };

  const addInstagramItem = async (newItem: InstagramJournalItem) => {
    const cleaned = cleanInstagramItemForFirestore(newItem) as InstagramJournalItem;
    setInstagramItems((prev) => {
      const next = [cleaned, ...prev];
      try {
        localStorage.setItem('artified_instagram_journal_items', JSON.stringify(next));
        localStorage.setItem('artified_instagram_custom_saved', 'true');
        localStorage.setItem('artified_instagram_locked', 'true');
        fetch('/api/instagram-journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next)
        }).catch(() => {});
      } catch {}
      return next;
    });

    try {
      const docRef = doc(db, 'instagram_journal', newItem.id);
      setDoc(docRef, sanitizeForFirestore(cleaned)).catch(() => {});
    } catch {}
  };

  const deleteInstagramItem = async (id: string) => {
    // Record in deleted IDs list so it is never resurrected from any stale snapshot or network response
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('artified_instagram_deleted_ids') || '["ig-1791099498584"]');
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('artified_instagram_deleted_ids', JSON.stringify(deletedIds));
      }
    } catch {}

    setInstagramItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('artified_instagram_journal_items', JSON.stringify(next));
        localStorage.setItem('artified_instagram_custom_saved', 'true');
        fetch('/api/instagram-journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next)
        }).catch(() => {});
      } catch {}
      return next;
    });

    try {
      const docRef = doc(db, 'instagram_journal', id);
      deleteDoc(docRef).catch(() => {});
    } catch {}
  };

  const deleteAllInstagramItems = async () => {
    const current = [...instagramItems];
    setInstagramItems([]);
    try {
      localStorage.setItem('artified_instagram_journal_items', JSON.stringify([]));
      localStorage.setItem('artified_instagram_cleared_v4', 'true');
      localStorage.setItem('artified_instagram_custom_saved', 'true');
      fetch('/api/instagram-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([])
      }).catch(() => {});
    } catch {}

    try {
      for (const item of current) {
        const docRef = doc(db, 'instagram_journal', item.id);
        await deleteDoc(docRef).catch(() => {});
      }
    } catch (err) {
      console.warn('Notice: Firestore deleteAll skipped:', err);
    }
  };

  const updateInstagramSettings = async (handle: string, profileUrl?: string) => {
    const cleanHandle = handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`;
    const cleanUrl = profileUrl?.trim() || `https://www.instagram.com/${cleanHandle.replace('@', '')}/`;

    setInstagramHandle(cleanHandle);
    setInstagramProfileUrl(cleanUrl);

    try {
      localStorage.setItem('artified_instagram_handle', cleanHandle);
      localStorage.setItem('artified_instagram_profile_url', cleanUrl);
      fetch('/api/instagram-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: cleanHandle, profileUrl: cleanUrl })
      }).catch(() => {});
    } catch {}

    try {
      const docRef = doc(db, 'store_settings', 'instagram');
      setDoc(docRef, { handle: cleanHandle, profileUrl: cleanUrl }, { merge: true }).catch(() => {});
    } catch {}

    // Synchronize with artisanProfile if it differs
    if (artisanProfile && artisanProfile.instagramHandle !== cleanHandle) {
      const syncedProfile = { ...artisanProfile, instagramHandle: cleanHandle };
      setArtisanProfile(syncedProfile);
      saveArtisanProfile(syncedProfile).catch(() => {});
    }
  };

  // Keyboard shortcut listener for Seller Mode (Alt + Shift + S or Ctrl + Shift + S)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.altKey || e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        if (isSellerMode) {
          setIsSellerMode(false);
        } else {
          setIsSellerAuthModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isSellerMode]);

  const setCompletedOrder = (order: OrderDetails | null) => {
    setCompletedOrderState(order);
    if (order) {
      try {
        const existingRaw = localStorage.getItem('artified_orders');
        const existing: OrderDetails[] = existingRaw ? JSON.parse(existingRaw) : [];
        // Prepend new order
        const updated = [order, ...existing.filter((o) => o.orderId !== order.orderId)];
        localStorage.setItem('artified_orders', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist order to storage', e);
      }

      // Automatically construct and sync tracked order to Firestore
      try {
        const tracked = buildTrackedOrderFromOrderDetails(order);
        saveOrderToFirestore(tracked).catch(() => {});
      } catch (e) {
        console.warn('Notice: Firestore tracked order initialization:', e);
      }
    }
  };

  const openTracker = (orderId?: string) => {
    if (orderId) {
      setTrackingOrderId(orderId);
    } else if (!trackingOrderId && completedOrder?.orderId) {
      setTrackingOrderId(completedOrder.orderId);
    }
    setIsTrackerOpen(true);
  };

  const openOrderManager = (orderId?: string) => {
    if (orderId) {
      setTrackingOrderId(orderId);
    }
    setIsOrderManagerOpen(true);
  };

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('artified_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  // Sync wishlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('artified_wishlist', JSON.stringify(wishlist));
    } catch (e) {
      console.warn('Failed to save wishlist to localStorage', e);
    }
  }, [wishlist]);

  const addToCart = (
    product: Product,
    quantity = 1,
    customizationNote?: string,
    selectedColorOrStyle?: string
  ) => {
    setCart((prev) => {
      const noteHash = (customizationNote || '').trim().toLowerCase();
      const styleHash = (selectedColorOrStyle || '').trim().toLowerCase();
      const itemId = `${product.id}-${noteHash}-${styleHash}`;

      const existingIndex = prev.findIndex((item) => item.id === itemId);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity,
        };
        return next;
      } else {
        return [
          ...prev,
          {
            id: itemId,
            product,
            quantity,
            customizationNote: customizationNote?.trim() || undefined,
            selectedColorOrStyle: selectedColorOrStyle?.trim() || undefined,
          },
        ];
      }
    });

    // Trigger smooth, non-intrusive visual feedback & cart badge animation
    setLastAddedItem({
      product,
      quantity,
      color: selectedColorOrStyle?.trim(),
      timestamp: Date.now()
    });
    setCartAnimationKey((k) => k + 1);
  };

  const quickBuy = (
    product: Product,
    quantity = 1,
    customizationNote?: string,
    selectedColorOrStyle?: string
  ) => {
    setCart((prev) => {
      const noteHash = (customizationNote || '').trim().toLowerCase();
      const styleHash = (selectedColorOrStyle || '').trim().toLowerCase();
      const itemId = `${product.id}-${noteHash}-${styleHash}`;

      const existingIndex = prev.findIndex((item) => item.id === itemId);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: Math.max(next[existingIndex].quantity, quantity),
        };
        return next;
      } else {
        return [
          ...prev,
          {
            id: itemId,
            product,
            quantity,
            customizationNote: customizationNote?.trim() || undefined,
            selectedColorOrStyle: selectedColorOrStyle?.trim() || undefined,
          },
        ];
      }
    });
    setQuickViewProduct(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity: Math.min(newQty, 10) } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setGiftPackaging(false);
    setGiftMessage('');
    setOrderNote('');
    setDiscount(0);
    setPromoCode('');
    setPromoError(null);
    setPromoSuccess(null);
  };

  const toggleWishlist = async (productId: string) => {
    let nextWishlist: string[] = [];
    setWishlist((prev) => {
      nextWishlist = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      try {
        localStorage.setItem('artified_wishlist', JSON.stringify(nextWishlist));
      } catch {}
      return nextWishlist;
    });

    if (currentUser) {
      try {
        const docRef = doc(db, 'user_wishlists', currentUser.uid);
        await setDoc(docRef, {
          userId: currentUser.uid,
          productIds: nextWishlist,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setIsWishlistCloudSynced(true);
      } catch (err) {
        console.warn('Notice: Wishlist local update:', err);
      }
    }
  };

  const isWishlisted = (productId: string) => wishlist.includes(productId);

  const applyPromoCode = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setPromoError('Please enter a voucher code');
      return;
    }
    if (clean === 'ARTIFIED10' || clean === 'TIKTOK10') {
      const calculatedDiscount = Math.round(subtotal * 0.1);
      setDiscount(calculatedDiscount);
      setPromoCode(clean);
      setPromoSuccess(`10% discount voucher applied (-Rs. ${calculatedDiscount.toLocaleString()})`);
      setPromoError(null);
    } else if (clean === 'NEPALFIRST' || clean === 'BAROQUE250') {
      const calculatedDiscount = Math.min(subtotal, 250);
      setDiscount(calculatedDiscount);
      setPromoCode(clean);
      setPromoSuccess(`Special member voucher applied (-Rs. 250)`);
      setPromoError(null);
    } else if (clean === 'PEARL100') {
      const calculatedDiscount = Math.min(subtotal, 100);
      setDiscount(calculatedDiscount);
      setPromoCode(clean);
      setPromoSuccess(`Loyalty voucher applied (-Rs. 100)`);
      setPromoError(null);
    } else if (clean === 'ATELIER500') {
      const calculatedDiscount = Math.min(subtotal, 500);
      setDiscount(calculatedDiscount);
      setPromoCode(clean);
      setPromoSuccess(`VIP Atelier voucher applied (-Rs. 500)`);
      setPromoError(null);
    } else if (clean === 'FREEGIFT') {
      setGiftPackaging(true);
      setDiscount(GIFT_PACKAGING_COST);
      setPromoCode(clean);
      setPromoSuccess(`Complimentary Luxury Gift Wrap voucher applied! (Saved Rs. 150)`);
      setPromoError(null);
    } else if (clean === 'WELCOME50') {
      const calculatedDiscount = Math.min(subtotal, 50);
      setDiscount(calculatedDiscount);
      setPromoCode(clean);
      setPromoSuccess(`Welcome voucher applied (-Rs. 50)`);
      setPromoError(null);
    } else if (clean === 'REFER250' || clean.startsWith('REFER')) {
      const calculatedDiscount = Math.min(subtotal, 250);
      setDiscount(calculatedDiscount);
      setPromoCode(clean);
      setPromoSuccess(`🎁 Referral Reward voucher applied (-Rs. 250)`);
      setPromoError(null);
    } else if (clean === 'FRIEND10' || clean.startsWith('ART-')) {
      const calculatedDiscount = Math.round(subtotal * 0.1);
      setDiscount(calculatedDiscount);
      setPromoCode(clean);
      setPromoSuccess(`🎉 Friend Invitation voucher applied (10% OFF: -Rs. ${calculatedDiscount.toLocaleString()})`);
      setPromoError(null);
    } else {
      setPromoError('Invalid promo code. Try "TIKTOK10", "PEARL100", or redeem points in Rewards');
      setPromoSuccess(null);
    }
  };

  const removePromoCode = () => {
    setPromoCode('');
    setDiscount(0);
    setPromoError(null);
    setPromoSuccess(null);
  };

  // Calculations
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const deliveryFee = cart.length > 0 ? selectedDeliveryZone.fee : 0;
  const giftPackagingFee = giftPackaging && cart.length > 0 ? GIFT_PACKAGING_COST : 0;
  const total = Math.max(0, subtotal + deliveryFee + giftPackagingFee - discount);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        quickBuy,
        lastAddedItem,
        clearLastAddedItem,
        cartAnimationKey,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        subtotal,
        deliveryFee,
        giftPackagingFee,
        discount,
        total,
        selectedDeliveryZone,
        setSelectedDeliveryZone,
        giftPackaging,
        setGiftPackaging,
        giftMessage,
        setGiftMessage,
        orderNote,
        setOrderNote,
        promoCode,
        promoError,
        promoSuccess,
        applyPromoCode,
        removePromoCode,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        isWishlistOpen,
        setIsWishlistOpen,
        wishlist,
        toggleWishlist,
        isWishlisted,
        // Multi-Device Customer Authentication & Cloud Wishlist Sync
        currentUser,
        isUserLoggedIn: !!currentUser,
        loginWithGoogle,
        logoutUser,
        isWishlistCloudSynced,
        quickViewProduct,
        setQuickViewProduct,
        activeReel,
        setActiveReel,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        completedOrder,
        setCompletedOrder,
        isTrackerOpen,
        setIsTrackerOpen,
        trackingOrderId,
        setTrackingOrderId,
        openTracker,
        isOrderManagerOpen,
        setIsOrderManagerOpen,
        openOrderManager,
        // Customer Account & Loyalty Points Dashboard
        isAccountModalOpen,
        setIsAccountModalOpen,
        openAccountModal,
        accountModalTab,
        setAccountModalTab,
        loyaltyPointsBalance,
        loyaltyAccount,
        // Seller Mode & Products
        products,
        updateProduct,
        addProduct,
        deleteProduct,
        resetProductsToDefault,
        isSellerMode,
        setIsSellerMode,
        isSellerAuthModalOpen,
        setIsSellerAuthModalOpen,
        isSellerModalOpen,
        setIsSellerModalOpen,
        isCatalogListOpen,
        setIsCatalogListOpen,
        editingProduct,
        setEditingProduct,
        openProductEditor,
        duplicateProduct,
        toggleProductStock,
        toggleProductNewArrival,
        batchSetNewArrival,
        // Restock Waitlist Notifications & In-App Alerts
        restockAlerts,
        dismissRestockAlert,
        lastRestockNotice,
        setLastRestockNotice,
        // TikTok Reels
        reels,
        isTikTokManagerOpen,
        setIsTikTokManagerOpen,
        editingReel,
        setEditingReel,
        openTikTokEditor,
        updateReel,
        addReel,
        deleteReel,
        // Craft Story & Making Video
        craftStory,
        updateCraftStory,
        isCraftStoryModalOpen,
        setIsCraftStoryModalOpen,
        // Instagram Journal & Handle Management
        instagramItems,
        instagramHandle,
        instagramProfileUrl,
        isInstagramManagerOpen,
        setIsInstagramManagerOpen,
        editingInstagramItem,
        setEditingInstagramItem,
        openInstagramEditor,
        updateInstagramItem,
        addInstagramItem,
        deleteInstagramItem,
        deleteAllInstagramItems,
        updateInstagramSettings,
        // Main Application Multi-Tab Horizontal Navigation
        activeNavTab,
        setActiveNavTab,
        // Social Media Showcase Tab
        activeSocialTab,
        setActiveSocialTab,
        // Real-time Cloud Sync
        isCloudSynced,
        syncStatusText,
        isDataSyncing,
        forceSyncAllToCloud,
        triggerCloudSync: forceSyncAllToCloud,
        // Product Card Image Display Mode
        productImageFit,
        setProductImageFit,
        // Google Drive Cloud Sync
        isGoogleDriveOpen,
        setIsGoogleDriveOpen,
        // GitHub Import
        isGitHubImportOpen,
        setIsGitHubImportOpen,
        // Website Export
        isWebsiteExportOpen,
        setIsWebsiteExportOpen,
        // Monthly Bestseller Threshold and Sales Tracking
        bestsellerThreshold,
        setBestsellerThreshold,
        recordOnlineOrderSales,
        addProductReview,
        updateProductReview,
        deleteProductReview,
        // Customer Reviews Manager (Seller Studio)
        isReviewsManagerOpen,
        setIsReviewsManagerOpen,
        reviewsManagerProductId,
        setReviewsManagerProductId,
        openReviewsManager,
        // Product Navigation & Filtered Products Collection
        filteredProducts,
        navigateProduct,
        // Refer a Friend Community Rewards
        isReferralOpen,
        setIsReferralOpen,
        openReferralModal,
        isReferralVisible,
        setIsReferralVisible,
        toggleReferralVisibility,
        // Size Guide Modal
        isSizeGuideOpen,
        setIsSizeGuideOpen,
        openSizeGuideModal,
        sizeGuideDefaultTab,
        // Order FAQs Modal
        isOrderFAQsOpen,
        setIsOrderFAQsOpen,
        openOrderFAQsModal,
        // Meet the Artisan Modal & Master Profile State
        isMeetArtisanOpen,
        setIsMeetArtisanOpen,
        openMeetArtisanModal,
        artisanProfile,
        updateArtisanProfile,
        // Product Comparison Feature
        compareProducts,
        isCompareOpen,
        setIsCompareOpen,
        toggleCompareProduct,
        isProductCompared,
        clearCompare,
        openCompareModal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
