import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, DeliveryZone, OrderDetails, TikTokReel, CraftStoryData, InstagramJournalItem, ProductReviewItem, SortOption } from '../types';
import { 
  DELIVERY_ZONES, 
  PRODUCTS, 
  reconcileProductCatalog,
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
  getDocs,
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
import { sanitizeReviewItem, getProductReviews, getProductAverageRating, isProductBestSeller, calculateDiscountPercent, calculateTotalSold } from '../utils/productStats';
import { deleteProductReviewFromFirestore } from '../services/reviewService';

import { buildTrackedOrderFromOrderDetails, syncTrackedOrdersFromServer, syncOrdersFromFirestore, getAllOrdersForSeller } from '../data/trackingData';
import { saveOrderToFirestore } from '../services/orderTrackingService';
import {
  trackConfirmedOrderSalesInFirestore,
  calculateCatalogTotalCreationsSold,
  syncConfirmedSalesOrdersFromFirestore,
  applyVerifiedSalesToProducts,
  mergeSalesHistoryRecords,
  SalesHistoryRecord
} from '../services/productSalesService';
import { 
  triggerRestockNotifications, 
  getCustomerRestockAlerts, 
  dismissCustomerRestockAlert, 
  RestockAlertItem 
} from '../utils/waitlistService';
import { ArtisanProfileData, getArtisanProfile, saveArtisanProfile, fetchArtisanProfileFromServer } from '../data/artisanProfile';
import { sanitizeInstagramItemsList } from '../utils/instagramSanitizer';

export type AppNavTab = 'home' | 'artisan' | 'workshops' | 'tiktok' | 'journal' | 'track' | 'orders';

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
  setQuickViewProduct: React.Dispatch<React.SetStateAction<Product | null>>;
  activeReel: TikTokReel | null;
  setActiveReel: (reel: TikTokReel | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
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
  dbSyncedPrices: Record<string, number>;
  syncSingleProductToCloud: (productToSync: Product) => Promise<boolean>;
  forceRefreshCatalogFromDB: () => Promise<void>;
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
  totalCreationsSold: number;
  recordOnlineOrderSales: (items: CartItem[], orderId?: string) => Promise<void>;
  trackOrderSalesInFirestore: (order: any) => Promise<void>;
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
  directPurchaseItem: CartItem | null;
  setDirectPurchaseItem: (item: CartItem | null) => void;
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
  const [sortBy, setSortBy] = useState<SortOption>('featured');
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

  // Refer a Friend Community Rewards State (Seller can hide or show - strictly OFF by default)
  const [isReferralOpen, setIsReferralOpen] = useState<boolean>(false);
  const [isReferralVisible, setIsReferralVisible] = useState<boolean>(() => {
    try {
      // Check version 2 key first
      const v2 = localStorage.getItem('artified_referral_visible_v2');
      if (v2 !== null) {
        return v2 === 'true';
      }
      // If only legacy key exists, clean it up so it never forces 'on'
      localStorage.removeItem('artified_referral_visible');
      localStorage.setItem('artified_referral_visible_v2', 'false');
      return false;
    } catch {
      return false;
    }
  });

  const toggleReferralVisibility = () => {
    setIsReferralVisible((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('artified_referral_visible_v2', String(next));
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
  const [directPurchaseItem, setDirectPurchaseItem] = useState<CartItem | null>(null);

  const openAccountModal = (tab: 'rewards' | 'history' | 'tiers' | 'profile' = 'rewards') => {
    setAccountModalTab(tab);
    setIsAccountModalOpen(true);
  };


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

  // Track database-synced prices per product for live sync status detection in Seller Catalog Manager
  const [dbSyncedPrices, setDbSyncedPrices] = useState<Record<string, number>>({});

  // Fetch initial data from backend server database (products, reels, Instagram journal & settings)
  useEffect(() => {
    // 1. Persistent Product Catalog Hydration & Real-time Sync (Cloud Firestore)
    let unsubscribeProducts: (() => void) | null = null;
    try {
      unsubscribeProducts = onSnapshot(collection(db, 'products'), (snap) => {
        if (!snap.empty) {
          const cloudProducts: Product[] = [];
          const cloudPrices: Record<string, number> = {};
          snap.forEach((d: any) => {
            const data = d.data() as Product;
            if (data && data.id && data.title) {
              const cleaned = sanitizeProduct(data);
              cloudProducts.push(cleaned);
              if (typeof cleaned.price === 'number') {
                cloudPrices[cleaned.id] = cleaned.price;
              }
            }
          });

          setDbSyncedPrices((prev) => ({ ...prev, ...cloudPrices }));
          if (cloudProducts.length > 0) {
            setProducts((prev) => reconcileProductCatalog(cloudProducts, prev));
            setIsCloudSynced(true);
            setSyncStatusText('🟢 Synced with Cloud Firestore (artified-staging)');
          }
        }
      }, (err) => {
        console.warn('Notice: Firestore product snapshot listener:', err);
      });
    } catch (fsErr) {
      console.warn('Notice: Firestore product query setup:', fsErr);
    }

    const hydrateCatalog = async () => {
      // If Firestore collection was empty or offline, hydrate from /api/products or static /products.json
      // Append cache-busting timestamp or version query parameter to force bypass of stale browser caches
      try {
        let items: Product[] | null = null;
        const ts = Date.now();
        try {
          const res = await fetch(`/api/products?t=${ts}`, { cache: 'no-store' });
          if (res.ok) {
            items = await res.json();
          }
        } catch {}

        if (!items || !Array.isArray(items) || items.length === 0) {
          try {
            const staticRes = await fetch(`/products.json?v=${ts}`, { cache: 'no-store' });
            if (staticRes.ok) {
              items = await staticRes.json();
            }
          } catch {}
        }

        if (Array.isArray(items) && items.length > 0) {
          setProducts((prev) => reconcileProductCatalog(items, prev));
        }
      } catch {}
    };

    hydrateCatalog();

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

    // 4. Hydrate Instagram Settings from server disk & localStorage
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

    // 5. Hydrate Craft Story from server disk & localStorage
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

    // 6. Hydrate Artisan Profile from repository & server disk
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

    // 8. Synchronize live orders from Firestore for real-time tracking across devices
    syncOrdersFromFirestore().catch(() => {});

    return () => {
      if (unsubscribeProducts) unsubscribeProducts();
    };
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
        if (tab && ['home', 'artisan', 'workshops', 'tiktok', 'journal', 'track', 'orders'].includes(tab)) {
          return tab as AppNavTab;
        }
        const hash = window.location.hash.replace('#', '').toLowerCase();
        if (hash && ['home', 'artisan', 'workshops', 'tiktok', 'journal', 'track', 'orders'].includes(hash)) {
          return hash as AppNavTab;
        }
      }
    } catch {}
    return 'home';
  });

  // Social Media Showcase Tab State ('tiktok' | 'journal')
  const [activeSocialTab, setActiveSocialTab] = useState<'tiktok' | 'journal'>('tiktok');

  // Products State - Guaranteed all 33 products loaded immediately with authoritative prices reconciled
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const priceListVersion = localStorage.getItem('artified_price_list_v2026');
      if (priceListVersion !== 'true') {
        localStorage.removeItem('artified_products_custom');
        localStorage.setItem('artified_price_list_v2026', 'true');
      }

      const saved = localStorage.getItem('artified_products_v3') || localStorage.getItem('artified_products_custom');
      let baseList = PRODUCTS;
      if (saved) {
        if (saved.length > 800000) {
          localStorage.removeItem('artified_products_v3');
          localStorage.removeItem('artified_products_custom');
        } else {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            baseList = reconcileProductCatalog(parsed, PRODUCTS);
          }
        }
      }

      // Hydrate custom reviews from dedicated lightweight store
      const reviewsDictRaw = localStorage.getItem('artified_custom_reviews_v1');
      if (reviewsDictRaw) {
        try {
          const reviewsDict = JSON.parse(reviewsDictRaw);
          baseList = baseList.map(p => {
            const pReviews = reviewsDict[p.id];
            if (Array.isArray(pReviews) && pReviews.length > 0) {
              const existingCustom = p.customReviews || [];
              const cleanExisting = existingCustom.filter(cr => !pReviews.some((pr: any) => pr.id === cr.id));
              return {
                ...p,
                customReviews: [...pReviews, ...cleanExisting]
              };
            }
            return p;
          });
        } catch {}
      }

      // Hydrate verified sales counts from sales_history & lightweight ledger so refresh never reverts sales
      baseList = applyVerifiedSalesToProducts(baseList);

      return baseList.map(sanitizeProduct);
    } catch {}
    return applyVerifiedSalesToProducts(PRODUCTS).map(sanitizeProduct);
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

  // Dynamically Filtered & Sorted Products based on selected Category, Search, and SortOption
  const filteredProducts = React.useMemo(() => {
    let result = [...products];

    // Filter by search query strictly matching product title (name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q)
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

    // Sort by requested options
    if (sortBy === 'rating-desc') {
      result.sort((a, b) => {
        const ratingA = getProductAverageRating(a);
        const ratingB = getProductAverageRating(b);
        if (Math.abs(ratingB - ratingA) >= 0.001) {
          return ratingB - ratingA;
        }
        // If average ratings are equal, products with more reviews rank higher
        const countA = getProductReviews(a).length;
        const countB = getProductReviews(b).length;
        if (countB !== countA) {
          return countB - countA;
        }
        return a.title.localeCompare(b.title);
      });
    } else if (sortBy === 'discount-desc') {
      result.sort((a, b) => {
        const discA = calculateDiscountPercent(a);
        const discB = calculateDiscountPercent(b);
        if (discB !== discA) return discB - discA;
        return a.price - b.price;
      });
    } else if (sortBy === 'newest') {
      result.sort((a, b) => {
        if (a.isNewArrival === b.isNewArrival) return a.title.localeCompare(b.title);
        return a.isNewArrival ? -1 : 1;
      });
    } else if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name-asc') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'name-desc') {
      result.sort((a, b) => b.title.localeCompare(a.title));
    } else {
      result.sort((a, b) => {
        const soldA = calculateTotalSold(a);
        const soldB = calculateTotalSold(b);
        if (soldB !== soldA) return soldB - soldA;
        return a.title.localeCompare(b.title);
      });
    }

    return result;
  }, [products, selectedCategory, searchQuery, sortBy, bestsellerThreshold]);

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

  // Listen for sales increments triggered by order confirmation/completion in Order Progress Manager or Checkout
  useEffect(() => {
    const handleSalesIncremented = (e: Event) => {
      const custom = e as CustomEvent<{
        orderId?: string;
        productQuantities?: Record<string, number>;
        verifiedSalesByProduct?: Record<string, number>;
      }>;
      const quantities = custom.detail?.productQuantities || {};
      const verifiedByProd = custom.detail?.verifiedSalesByProduct || {};
      if (Object.keys(quantities).length === 0 && Object.keys(verifiedByProd).length === 0) return;

      setProducts((prev) => {
        const updated = applyVerifiedSalesToProducts(
          prev.map((prod) => {
            const addedQty = quantities[prod.id] || 0;
            const verifiedOnline = verifiedByProd[prod.id] || 0;
            if (addedQty > 0 || verifiedOnline > (prod.onlineSalesCount || 0)) {
              const baseSold = prod.soldCount !== undefined ? prod.soldCount : 54;
              const nextOnline = Math.max((prod.onlineSalesCount || 0) + addedQty, verifiedOnline);
              const nextTotal = Math.max(prod.totalSold || 0, baseSold + nextOnline);
              return {
                ...prod,
                soldCount: baseSold,
                onlineSalesCount: nextOnline,
                totalSold: nextTotal,
                isBestSeller: nextTotal >= bestsellerThreshold || prod.isBestSeller
              };
            }
            return prod;
          }),
          verifiedByProd,
          bestsellerThreshold
        );

        setQuickViewProduct((qv) => {
          if (!qv) return null;
          return updated.find((p) => p.id === qv.id) || qv;
        });

        return updated;
      });
    };

    window.addEventListener('artified_sales_incremented', handleSalesIncremented);
    return () => window.removeEventListener('artified_sales_incremented', handleSalesIncremented);
  }, [bestsellerThreshold]);

  // Total creations sold across the entire store catalog
  const totalCreationsSold = React.useMemo(() => calculateCatalogTotalCreationsSold(products), [products]);

  // Track confirmed order sales in Firestore per product document (idempotent per orderId)
  const trackOrderSalesInFirestore = async (order: any) => {
    if (!order) return;
    await trackConfirmedOrderSalesInFirestore(order, products);
  };

  // Record genuine live online sales when an order is submitted or confirmed
  const recordOnlineOrderSales = async (items: CartItem[], orderId?: string) => {
    try {
      const effectiveOrderId = orderId || `SALE-${Date.now()}`;
      await trackConfirmedOrderSalesInFirestore(
        {
          orderId: effectiveOrderId,
          customerName: 'Customer',
          phone: '',
          deliveryAddress: '',
          deliveryZoneName: '',
          paymentMethodText: 'Online Order',
          paymentStatus: 'Order confirmed and paid',
          currentPhase: 'confirmed',
          progressPercentage: 25,
          orderPlacedDate: 'Just now',
          estimatedDeliveryDate: '1-2 business days',
          artisanName: 'Sahina Shrestha',
          artisanRole: 'Founder and Creator',
          studioLocation: 'Artified Workshop, Kathmandu, Nepal',
          liveCraftNotes: '',
          milestones: [],
          total: items.reduce((s, i) => s + i.product.price * i.quantity, 0),
          items: items.map((i) => ({
            productId: i.product.id,
            title: i.product.title,
            image: i.product.images?.[0] || '',
            quantity: i.quantity,
            price: i.product.price
          }))
        },
        products
      );
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
      setQuickViewProduct((prev) => (prev && prev.id === productId ? updatedProducts.find(p => p.id === productId) || prev : prev));

      try {
        const dictRaw = localStorage.getItem('artified_custom_reviews_v1');
        const dict = dictRaw ? JSON.parse(dictRaw) : {};
        const currentProd = dict[productId] || [];
        const cleanProd = currentProd.filter((r: any) => r.id !== sanitized.id && `${r.author}_${r.comment}` !== `${sanitized.author}_${sanitized.comment}`);
        dict[productId] = [sanitized, ...cleanProd];
        localStorage.setItem('artified_custom_reviews_v1', JSON.stringify(dict));
      } catch {}

      try {
        localStorage.setItem('artified_products_v3', JSON.stringify(updatedProducts));
      } catch {}

      // Dual-write to Server Express database (/api/reviews) immediately
      try {
        const prod = products.find(p => p.id === productId);
        fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...sanitized,
            productId,
            productTitle: prod?.title || ''
          })
        }).catch(() => {});
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
      await deleteProductReviewFromFirestore(reviewId);

      const updatedProducts = products.map((prod) => {
        if (prod.id === productId || prod.customReviews?.some(r => r.id === reviewId)) {
          const existingCustom = (prod.customReviews || []).filter((r) => r.id !== reviewId);
          return {
            ...prod,
            customReviews: [...existingCustom, { id: reviewId, isDeleted: true } as any]
          };
        }
        return prod;
      });

      setProducts(updatedProducts);
      setQuickViewProduct((prev) => (prev && (prev.id === productId || prev.customReviews?.some(r => r.id === reviewId)) ? updatedProducts.find(p => p.id === prev.id) || prev : prev));

      try {
        const dictRaw = localStorage.getItem('artified_custom_reviews_v1');
        if (dictRaw) {
          const dict = JSON.parse(dictRaw);
          if (dict[productId]) {
            dict[productId] = dict[productId].filter((r: any) => r.id !== reviewId);
            localStorage.setItem('artified_custom_reviews_v1', JSON.stringify(dict));
          }
        }
      } catch {}

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

  // 2. Repository-driven content hydration & Real-time Firestore sales count listener
  useEffect(() => {
    setSyncStatusText('🟢 Catalog Ready (Repository & Local Database)');
    setIsDataSyncing(false);

    // Sync and verify sales_history from server & Firestore, and reconcile confirmed orders
    syncConfirmedSalesOrdersFromFirestore(getAllOrdersForSeller(), products).catch(() => {});

    // Real-time listener on Firestore `sales_history` collection to verify total sold count across sessions
    const unsubSalesHistory = onSnapshot(
      collection(db, 'sales_history'),
      (snap) => {
        if (snap.empty) return;
        const cloudRecords: SalesHistoryRecord[] = [];
        snap.forEach((docSnap: any) => {
          const d = docSnap.data();
          if (d && (d.productId || docSnap.id)) {
            cloudRecords.push({
              id: d.id || docSnap.id,
              productId: d.productId,
              productTitle: d.productTitle || '',
              orderId: d.orderId || '',
              quantity: Math.max(1, Number(d.quantity) || 1),
              timestamp: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
              createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
              status: 'completed'
            });
          }
        });
        if (cloudRecords.length > 0) {
          const { verifiedSalesByProduct } = mergeSalesHistoryRecords(cloudRecords);
          setProducts((prev) => {
            const updated = applyVerifiedSalesToProducts(prev, verifiedSalesByProduct, bestsellerThreshold);
            setQuickViewProduct((qv) => {
              if (!qv) return null;
              return updated.find((p) => p.id === qv.id) || qv;
            });
            return updated;
          });
        }
      },
      () => {}
    );

    // Real-time listener on Firestore products collection so totalSold / onlineSalesCount updates dynamically across all browsers
    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        if (snap.empty) return;
        const cloudMap = new Map<string, Partial<Product>>();
        snap.forEach((docSnap: any) => {
          const data = docSnap.data() as Partial<Product>;
          if (data && (data.id || docSnap.id)) {
            cloudMap.set(data.id || docSnap.id, data);
          }
        });
        if (cloudMap.size === 0) return;

        setProducts((prev) => {
          let changed = false;
          const updated = prev.map((prod) => {
            const cloud = cloudMap.get(prod.id);
            if (!cloud) return prod;

            const baseSold =
              cloud.soldCount !== undefined && Number(cloud.soldCount) > (prod.soldCount || 0)
                ? Number(cloud.soldCount)
                : prod.soldCount !== undefined
                ? prod.soldCount
                : 54;
            const mergedOnline = Math.max(prod.onlineSalesCount || 0, Number(cloud.onlineSalesCount) || 0);
            const mergedTotal = Math.max(
              prod.totalSold || 0,
              Number(cloud.totalSold) || 0,
              baseSold + mergedOnline
            );
            const prevCalc = calculateTotalSold(prod);

            if (
              mergedTotal !== prevCalc ||
              mergedOnline !== (prod.onlineSalesCount || 0) ||
              baseSold !== (prod.soldCount !== undefined ? prod.soldCount : 54)
            ) {
              changed = true;
              return {
                ...prod,
                soldCount: baseSold,
                onlineSalesCount: mergedOnline,
                totalSold: mergedTotal,
                isBestSeller: mergedTotal >= bestsellerThreshold || prod.isBestSeller
              };
            }
            return prod;
          });

          if (changed) {
            const verifiedUpdated = applyVerifiedSalesToProducts(updated, undefined, bestsellerThreshold);
            setQuickViewProduct((qv) => {
              if (!qv) return null;
              return verifiedUpdated.find((p) => p.id === qv.id) || qv;
            });
            return verifiedUpdated;
          }
          return prev;
        });
      },
      () => {}
    );

    // Hydrate TikTok reels from server JSON disk
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

    // Hydrate Craft Story from server JSON disk
    fetch('/api/craft-story')
      .then((res) => res.json())
      .then((story) => {
        if (story && (story.title || story.videoUrl)) {
          setCraftStory((prev) => ({ ...prev, ...story }));
          try {
            localStorage.setItem('artified_craft_story', JSON.stringify({ ...DEFAULT_CRAFT_STORY, ...story }));
          } catch {}
        }
      })
      .catch(() => {});

    // Hydrate Instagram Journal from server JSON disk
    fetch('/api/instagram-journal')
      .then((res) => res.json())
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          setInstagramItems(items);
          try {
            localStorage.setItem('artified_instagram_journal_items', JSON.stringify(items));
          } catch {}
        }
      })
      .catch(() => {});

    // Hydrate Instagram Settings from server JSON disk
    fetch('/api/instagram-settings')
      .then((res) => res.json())
      .then((settings) => {
        if (settings?.handle) {
          setInstagramHandle(settings.handle);
          try { localStorage.setItem('artified_instagram_handle', settings.handle); } catch {}
        }
        if (settings?.profileUrl) {
          setInstagramProfileUrl(settings.profileUrl);
          try { localStorage.setItem('artified_instagram_profile_url', settings.profileUrl); } catch {}
        }
      })
      .catch(() => {});

    return () => {
      try {
        unsubSalesHistory();
        unsubProducts();
      } catch {}
    };
  }, [bestsellerThreshold]);

  const forceSyncAllToCloud = async () => {
    setSyncStatusText('Saving all edits to Cloud Firestore (artified-staging)...');
    try {
      // 1. Batch sync all products to Cloud Firestore
      const batch = writeBatch(db);
      const newPrices: Record<string, number> = {};
      products.forEach((p) => {
        const prodRef = doc(db, 'products', p.id);
        batch.set(prodRef, p, { merge: true });
        if (typeof p.price === 'number') {
          newPrices[p.id] = p.price;
        }
      });
      await batch.commit();

      setDbSyncedPrices((prev) => ({ ...prev, ...newPrices }));

      // 2. Also save to server JSON disk with cache-busting version query param
      const ts = Date.now();
      await fetch(`/api/products?v=${ts}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(products),
      });

      try {
        localStorage.setItem('artified_products_custom', JSON.stringify(products));
      } catch {}

      setIsCloudSynced(true);
      setSyncStatusText('🟢 All pieces permanently saved to Cloud Firestore (artified-staging)!');
    } catch (err) {
      console.error('Failed to save to Cloud Firestore', err);
      setSyncStatusText('⚠️ Saved locally, cloud sync retry needed');
    }
  };

  const forceRefreshCatalogFromDB = async (): Promise<void> => {
    setSyncStatusText('Clearing local cache and fetching fresh product catalog from Cloud Firestore...');
    try {
      // 1. Clear local storage cache
      localStorage.removeItem('artified_products_custom');

      // 2. Fetch fresh documents directly from Cloud Firestore collection `products`
      const snap = await getDocs(collection(db, 'products'));
      const freshCloudProducts: Product[] = [];
      const freshPrices: Record<string, number> = {};

      if (!snap.empty) {
        snap.forEach((d) => {
          const data = d.data() as Product;
          if (data && data.id && data.title) {
            const cleaned = sanitizeProduct(data);
            freshCloudProducts.push(cleaned);
            if (typeof cleaned.price === 'number') {
              freshPrices[cleaned.id] = cleaned.price;
            }
          }
        });
      }

      // 3. Fallback/Bypass fetch to server API with cache-busting timestamp
      const ts = Date.now();
      let serverItems: Product[] | null = null;
      try {
        const res = await fetch(`/api/products?t=${ts}`, { cache: 'no-store' });
        if (res.ok) serverItems = await res.json();
      } catch {}

      const mergedList = freshCloudProducts.length > 0 
        ? freshCloudProducts 
        : (serverItems && Array.isArray(serverItems) && serverItems.length > 0 ? serverItems : PRODUCTS);

      setProducts(mergedList);
      setDbSyncedPrices(freshPrices);

      try {
        localStorage.setItem('artified_products_custom', JSON.stringify(mergedList));
      } catch {}

      setIsCloudSynced(true);
      setSyncStatusText('🟢 Force refreshed entire catalog from Cloud Firestore database!');
    } catch (err) {
      console.error('Error force refreshing catalog from Firestore:', err);
      setSyncStatusText('⚠️ Cache refresh warning: check network connection');
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
    const nowIso = new Date().toISOString();
    const cleanedProduct: Product = sanitizeProduct({ 
      ...updated, 
      images: cleanImages,
      updatedAt: nowIso
    });

    // 2. Optimistic UI update & Local Storage
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

    // 3. Permanent Cloud Firestore save
    try {
      const prodRef = doc(db, 'products', cleanedProduct.id);
      await setDoc(prodRef, cleanedProduct, { merge: true });
      setDbSyncedPrices((prev) => ({
        ...prev,
        [cleanedProduct.id]: cleanedProduct.price
      }));
      setIsCloudSynced(true);
      setSyncStatusText(`🟢 Saved "${cleanedProduct.title}" to Cloud Firestore`);
    } catch (cloudErr) {
      console.warn('Notice: Firestore save error, saved locally:', cloudErr);
    }

    if (quickViewProduct?.id === cleanedProduct.id) {
      setQuickViewProduct(cleanedProduct);
    }

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
    const nowIso = new Date().toISOString();
    const cleanedProduct: Product = sanitizeProduct({ 
      ...newProduct, 
      images: cleanImages,
      updatedAt: nowIso
    });

    setProducts((prev) => {
      const next = [cleanedProduct, ...prev];
      try {
        localStorage.setItem('artified_products_custom', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save custom products', e);
      }
      const ts = Date.now();
      fetch(`/api/products?v=${ts}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {});
      return next;
    });

    // Permanent Cloud Firestore save
    try {
      const prodRef = doc(db, 'products', cleanedProduct.id);
      await setDoc(prodRef, cleanedProduct, { merge: true });
      setDbSyncedPrices((prev) => ({
        ...prev,
        [cleanedProduct.id]: cleanedProduct.price
      }));
      setIsCloudSynced(true);
      setSyncStatusText(`🟢 Added "${cleanedProduct.title}" to Cloud Firestore`);
    } catch (cloudErr) {
      console.warn('Notice: Firestore add error, saved locally:', cloudErr);
    }
  };

  const syncSingleProductToCloud = async (productToSync: Product): Promise<boolean> => {
    try {
      const nowIso = new Date().toISOString();
      const cleanedProduct: Product = sanitizeProduct({ 
        ...productToSync, 
        updatedAt: nowIso
      });

      // 1. Permanent Cloud Firestore save
      const prodRef = doc(db, 'products', cleanedProduct.id);
      await setDoc(prodRef, cleanedProduct, { merge: true });

      // 2. Update local dbSyncedPrices map
      setDbSyncedPrices((prev) => ({
        ...prev,
        [cleanedProduct.id]: cleanedProduct.price
      }));

      // 3. Save to server JSON disk with cache-busting version query param
      const ts = Date.now();
      const updatedList = products.map((p) => (p.id === cleanedProduct.id ? cleanedProduct : p));
      fetch(`/api/products?v=${ts}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedList),
      }).catch(() => {});

      try {
        localStorage.setItem('artified_products_custom', JSON.stringify(updatedList));
      } catch {}

      setIsCloudSynced(true);
      setSyncStatusText(`🟢 Synced "${cleanedProduct.title}" (NPR ${cleanedProduct.price}) to Cloud Firestore`);
      return true;
    } catch (err) {
      console.warn('Notice: Firestore single product sync error:', err);
      return false;
    }
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
          const updated = { ...p, isNewArrival: isNew, updatedAt: new Date().toISOString() };
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
        const prodRef = doc(db, 'products', p.id);
        batch.set(prodRef, { isNewArrival: isNew, updatedAt: p.updatedAt }, { merge: true });
      });
      await batch.commit();
    } catch (cloudErr) {
      console.warn('Notice: Firestore batch update error:', cloudErr);
    }
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

    // Delete from Cloud Firestore
    try {
      const prodRef = doc(db, 'products', id);
      await deleteDoc(prodRef);
      setSyncStatusText('🟢 Deleted piece from Cloud Firestore');
    } catch (cloudErr) {
      console.warn('Notice: Firestore delete error:', cloudErr);
    }

    if (quickViewProduct?.id === id) {
      setQuickViewProduct(null);
    }
  };


  const resetProductsToDefault = async () => {
    try {
      localStorage.removeItem('artified_products_custom');
      localStorage.setItem('artified_products_custom', JSON.stringify(PRODUCTS));
    } catch (e) {
      console.warn('Failed to remove custom products', e);
    }
    setProducts(PRODUCTS);
    try {
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(PRODUCTS),
      }).catch(() => {});
      const batch = writeBatch(db);
      PRODUCTS.forEach((p) => {
        const prodRef = doc(db, 'products', p.id);
        batch.set(prodRef, p, { merge: true });
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
  };

  const deleteInstagramItem = async (id: string) => {
    // Record in deleted IDs list so it is never resurrected
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
  };

  const deleteAllInstagramItems = async () => {
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

  useEffect(() => {
    const handleOrderDeletedEvent = (e: Event) => {
      const ce = e as CustomEvent<any>;
      if (ce.detail?.deletedAll) {
        setCompletedOrderState(null);
        setTrackingOrderId('');
      } else if (ce.detail?.deleted && ce.detail?.orderId) {
        const delNorm = ce.detail.orderId.replace(/[#\s-]/g, '').toUpperCase();
        setCompletedOrderState((prev) => {
          if (prev && prev.orderId.replace(/[#\s-]/g, '').toUpperCase() === delNorm) {
            return null;
          }
          return prev;
        });
        setTrackingOrderId((prev) => {
          if (prev && prev.replace(/[#\s-]/g, '').toUpperCase() === delNorm) {
            return '';
          }
          return prev;
        });
      }
    };
    window.addEventListener('artified_order_updated', handleOrderDeletedEvent);
    return () => window.removeEventListener('artified_order_updated', handleOrderDeletedEvent);
  }, []);

  const setCompletedOrder = (order: OrderDetails | null) => {
    setCompletedOrderState(order);
    if (order) {
      try {
        const lightweightOrder: OrderDetails = {
          ...order,
          paymentScreenshot: undefined,
          items: (order.items || []).map((item) => ({
            ...item,
            product: item.product ? { ...item.product, images: [] } : item.product
          }))
        };
        const updated = [
          { ...lightweightOrder, generation: 6, purgeEpochId: 'artified_clean_slate_v6' } as any
        ];
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
    if (orderId && orderId.trim()) {
      setTrackingOrderId(orderId.trim());
    } else {
      setTrackingOrderId('');
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
    // Treat as a direct purchase of a specific item, not adding to cart
    const tempItem: CartItem = {
      id: `quick-${product.id}-${Date.now()}`,
      product,
      quantity,
      customizationNote: customizationNote?.trim() || undefined,
      selectedColorOrStyle: selectedColorOrStyle?.trim() || undefined,
    };
    
    // Set a temporary checkout item or just pass this to checkout modal
    setCompletedOrder(null); // Reset
    setQuickViewProduct(null);
    setIsCartOpen(false);
    
    // We need a way to pass this temp item to CheckoutModal
    // Let's create a temporary state for direct purchase
    setDirectPurchaseItem(tempItem);
    
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
      setPromoSuccess(`10% discount voucher applied (-NPR ${calculatedDiscount.toLocaleString()})`);
      setPromoError(null);
    } else if (clean === 'NEPALFIRST' || clean === 'BAROQUE250') {
      const calculatedDiscount = Math.min(subtotal, 250);
      setDiscount(calculatedDiscount);
      setPromoCode(clean);
      setPromoSuccess(`Special member voucher applied (-NPR 250)`);
      setPromoError(null);
    } else if (clean === 'PEARL100') {
      const calculatedDiscount = Math.min(subtotal, 100);
      setDiscount(calculatedDiscount);
      setPromoCode(clean);
      setPromoSuccess(`Loyalty voucher applied (-NPR 100)`);
      setPromoError(null);
    } else if (clean === 'ATELIER500') {
      const calculatedDiscount = Math.min(subtotal, 500);
      setDiscount(calculatedDiscount);
      setPromoCode(clean);
      setPromoSuccess(`VIP Atelier voucher applied (-NPR 500)`);
      setPromoError(null);
    } else if (clean === 'FREEGIFT') {
      setGiftPackaging(true);
      setDiscount(GIFT_PACKAGING_COST);
      setPromoCode(clean);
      setPromoSuccess(`Complimentary Luxury Gift Wrap voucher applied! (Saved NPR 150)`);
      setPromoError(null);
    } else if (clean === 'WELCOME50') {
      const calculatedDiscount = Math.min(subtotal, 50);
      setDiscount(calculatedDiscount);
      setPromoCode(clean);
      setPromoSuccess(`Welcome voucher applied (-NPR 50)`);
      setPromoError(null);
    } else if (clean === 'REFER250' || clean.startsWith('REFER')) {
      const calculatedDiscount = Math.min(subtotal, 250);
      setDiscount(calculatedDiscount);
      setPromoCode(clean);
      setPromoSuccess(`🎁 Referral Reward voucher applied (-NPR 250)`);
      setPromoError(null);
    } else if (clean === 'FRIEND10' || clean.startsWith('ART-')) {
      const calculatedDiscount = Math.round(subtotal * 0.1);
      setDiscount(calculatedDiscount);
      setPromoCode(clean);
      setPromoSuccess(`🎉 Friend Invitation voucher applied (10% OFF: -NPR ${calculatedDiscount.toLocaleString()})`);
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
  const total = Math.max(0, subtotal + deliveryFee - discount);

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
        discount,
        total,
        selectedDeliveryZone,
        setSelectedDeliveryZone,
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
        sortBy,
        setSortBy,
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
        dbSyncedPrices,
        syncSingleProductToCloud,
        forceRefreshCatalogFromDB,
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
        totalCreationsSold,
        recordOnlineOrderSales,
        trackOrderSalesInFirestore,
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
        directPurchaseItem,
        setDirectPurchaseItem,
        giftPackagingFee: giftPackaging ? GIFT_PACKAGING_COST : 0,
        giftPackaging,
        setGiftPackaging,
        giftMessage,
        setGiftMessage,
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
