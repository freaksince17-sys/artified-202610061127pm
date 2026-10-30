import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, DeliveryZone, OrderDetails, TikTokReel, CraftStoryData, InstagramJournalItem, ProductReviewItem, SortOption } from '../types';
import { 
  DELIVERY_ZONES, 
  PRODUCTS, 
  reconcileProductCatalog,
  selectBestProductImages,
  CATALOG_BUILD_VERSION,
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
  safeOnSnapshot as onSnapshot,
  isFirestoreQuotaExceeded,
  detectQuotaError,
  safeCommitBatch
} from '../utils/safeFirestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import { compressImage } from '../utils/imageCompressor';
import { sanitizeForFirestore } from '../utils/firestoreSanitizer';
import { sanitizeReviewItem, getProductReviews, getProductAverageRating, isProductBestSeller, calculateDiscountPercent, calculateTotalSold, invalidateReviewsCache } from '../utils/productStats';
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
import { getSellerPaymentSettings } from '../data/paymentSettings';
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
  adjustProductStockCount: (id: string, delta: number) => Promise<void>;
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
  const inventoryCount = typeof prod.inventoryCount === 'number' && !isNaN(prod.inventoryCount) ? Math.max(0, prod.inventoryCount) : stockCount;
  const safePrice = typeof prod.price === 'number' && !isNaN(prod.price) && prod.price > 0 ? prod.price : 1500;

  return {
    ...prod,
    price: safePrice,
    inStock,
    stockCount,
    inventoryCount,
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
  const [sortBy, setSortBy] = useState<SortOption>('newest');
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
  const lastLocalProductEditRef = React.useRef<Record<string, number>>({});
  const pendingCloudProductsRef = React.useRef<Map<string, Product>>(new Map());
  const persistDebounceTimerRef = React.useRef<number | null>(null);
  const isModalEditingRef = React.useRef<boolean>(false);

  // Fetch initial data from backend server database (products, reels, Instagram journal & settings)
  useEffect(() => {
    // 1. Persistent Product Catalog Hydration & Real-time Sync (Cloud Firestore)
    let unsubscribeProducts: (() => void) | null = null;
    let unsubscribeSalesHistory: (() => void) | null = null;
    let unsubscribeReviews: (() => void) | null = null;

    try {
      unsubscribeProducts = onSnapshot(collection(db, 'products'), (snap) => {
        if (!snap.empty) {
          const now = Date.now();
          const cloudProducts: Product[] = [];
          const cloudPrices: Record<string, number> = {};
          const cloudMap = new Map<string, any>();

          snap.forEach((d: any) => {
            const data = d.data();
            const pid = data?.id || d.id;
            if (pid && now - (lastLocalProductEditRef.current[pid] || 0) < 5000) {
              return;
            }
            if (data && pid) {
              cloudMap.set(pid, { ...data, id: pid });
              const baseProd = PRODUCTS.find((p) => p.id === pid);
              const bestImages = selectBestProductImages(data.images, baseProd?.images, true);
              const mergedProd = {
                ...(baseProd || {}),
                ...data,
                id: pid,
                images: bestImages,
                title: data.title || baseProd?.title || 'Handmade Craft',
                category: data.category || baseProd?.category || 'pearl-bags',
                price: typeof data.price === 'number' && data.price > 0 ? data.price : (baseProd?.price || 1500),
                onlineSalesCount: typeof data.onlineSalesCount === 'number' ? data.onlineSalesCount : (baseProd?.onlineSalesCount || 0),
                soldCount: typeof data.soldCount === 'number' ? data.soldCount : (baseProd?.soldCount !== undefined ? baseProd.soldCount : 0),
                totalSold: typeof data.totalSold === 'number' ? data.totalSold : ((typeof data.soldCount === 'number' ? data.soldCount : (baseProd?.soldCount || 0)) + (typeof data.onlineSalesCount === 'number' ? data.onlineSalesCount : (baseProd?.onlineSalesCount || 0)))
              };
              const cleaned = sanitizeProduct(mergedProd as Product);
              cloudProducts.push(cleaned);
              if (typeof cleaned.price === 'number' && cleaned.price > 0) {
                cloudPrices[cleaned.id] = cleaned.price;
              }
            }
          });

          if (Object.keys(cloudPrices).length > 0) {
            setDbSyncedPrices((prev) => {
              let hasDiff = false;
              for (const k of Object.keys(cloudPrices)) {
                if (prev[k] !== cloudPrices[k]) {
                  hasDiff = true;
                  break;
                }
              }
              return hasDiff ? { ...prev, ...cloudPrices } : prev;
            });
          }

          if (cloudProducts.length > 0) {
            setProducts((prev) => {
              const reconciled = reconcileProductCatalog(cloudProducts, prev);
              try {
                const overrides: Record<string, any> = {};
                reconciled.forEach((p) => {
                  overrides[p.id] = {
                    soldCount: p.soldCount,
                    onlineSalesCount: p.onlineSalesCount,
                    totalSold: p.totalSold,
                    price: p.price,
                    originalPrice: p.originalPrice,
                    stockCount: p.stockCount,
                    inventoryCount: p.inventoryCount,
                    inStock: p.inStock,
                    updatedAt: p.updatedAt
                  };
                });
                localStorage.setItem('artified_cloud_live_overrides_v1', JSON.stringify(overrides));
              } catch {}
              return reconciled;
            });
            setQuickViewProduct((prevQuick) => {
              if (!prevQuick) return prevQuick;
              const found = cloudMap.get(prevQuick.id);
              if (found) {
                return {
                  ...prevQuick,
                  ...found,
                  images: selectBestProductImages(found.images, prevQuick.images, true),
                  onlineSalesCount: typeof found.onlineSalesCount === 'number' ? found.onlineSalesCount : prevQuick.onlineSalesCount,
                  totalSold: typeof found.totalSold === 'number' ? found.totalSold : prevQuick.totalSold,
                  soldCount: typeof found.soldCount === 'number' ? found.soldCount : prevQuick.soldCount
                };
              }
              return prevQuick;
            });
          }
        }
      }, (err) => {
        detectQuotaError(err);
        console.warn('Notice: Firestore product snapshot listener:', err);
      });
    } catch (fsErr) {
      detectQuotaError(fsErr);
      console.warn('Notice: Firestore product query setup:', fsErr);
    }

    // Real-time Firestore listener on sales_history to sync verified sales counts
    try {
      unsubscribeSalesHistory = onSnapshot(collection(db, 'sales_history'), (snap) => {
        if (!snap.empty) {
          const cloudSales: SalesHistoryRecord[] = [];
          snap.forEach((docSnap: any) => {
            const d = docSnap.data();
            if (d && (d.productId || docSnap.id)) {
              cloudSales.push({
                id: d.id || docSnap.id,
                productId: d.productId,
                productTitle: d.productTitle || '',
                category: d.category || '',
                orderId: d.orderId || '',
                quantity: Math.max(1, Number(d.quantity) || 1),
                unitPrice: Number(d.unitPrice) || undefined,
                revenue: Number(d.revenue) || undefined,
                timestamp: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
                createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
                status: 'completed'
              });
            }
          });
          if (cloudSales.length > 0) {
            const { verifiedSalesByProduct } = mergeSalesHistoryRecords(cloudSales, PRODUCTS);
            setProducts((prev) => applyVerifiedSalesToProducts(prev, verifiedSalesByProduct));
            setQuickViewProduct((prevQuick) => {
              if (!prevQuick) return prevQuick;
              const addSales = verifiedSalesByProduct[prevQuick.id];
              if (typeof addSales === 'number' && addSales > 0) {
                const base = prevQuick.soldCount !== undefined ? prevQuick.soldCount : 0;
                const newOnline = Math.max(prevQuick.onlineSalesCount || 0, addSales);
                const newTotal = base + newOnline;
                return { ...prevQuick, onlineSalesCount: newOnline, totalSold: newTotal };
              }
              return prevQuick;
            });
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('artified_sales_incremented', {
                  detail: { productQuantities: {}, verifiedSalesByProduct }
                })
              );
            }
          }
        }
      }, (err) => {
        detectQuotaError(err);
      });
    } catch {}

    // Real-time Firestore listener on product_reviews to instantly sync reviews across all browsers
    try {
      unsubscribeReviews = onSnapshot(collection(db, 'product_reviews'), (snap) => {
        if (!snap.empty) {
          const revList: any[] = [];
          snap.forEach((docSnap: any) => {
            const d = docSnap.data();
            if (d && d.author && d.comment) {
              revList.push({ ...d, id: d.id || docSnap.id });
            }
          });
          if (revList.length > 0) {
            const byProd: Record<string, any[]> = {};
            for (const r of revList) {
              const pid = r.productId;
              if (pid) {
                if (!byProd[pid]) byProd[pid] = [];
                byProd[pid].push(r);
              }
            }
            setProducts((prev) => {
              const delRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('artified_deleted_review_ids') : null;
              const delSet = new Set<string>(delRaw ? JSON.parse(delRaw) : []);
              return prev.map((p) => {
                const prodRevs = byProd[p.id];
                if (!prodRevs || prodRevs.length === 0) return p;
                const existing = p.customReviews || [];
                const tombstones = existing.filter((r: any) => r && r.isDeleted);
                tombstones.forEach((t: any) => {
                  if (t.id) delSet.add(String(t.id).trim());
                  if (t.author) delSet.add(`${p.id}::${String(t.author).trim().toLowerCase()}`);
                });
                const seenIds = new Set<string>();
                const seenSigs = new Set<string>();
                const merged: any[] = [];
                for (const r of [...prodRevs, ...existing]) {
                  if (!r || !r.id || !r.author || !r.comment || r.isDeleted) continue;
                  const cId = String(r.id).trim();
                  const al = String(r.author).trim().toLowerCase();
                  if (delSet.has(cId) || delSet.has(`${p.id}::${al}`)) continue;
                  const sig = `${al}_${String(r.comment).trim().toLowerCase()}`;
                  if (!seenIds.has(cId) && !seenSigs.has(sig)) {
                    seenIds.add(cId);
                    seenSigs.add(sig);
                    merged.push(r);
                  }
                }
                return { ...p, customReviews: [...merged, ...tombstones] };
              });
            });
            invalidateReviewsCache();
          }
        }
      }, (err) => {
        detectQuotaError(err);
      });
    } catch {}

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
      if (unsubscribeSalesHistory) unsubscribeSalesHistory();
      if (unsubscribeReviews) unsubscribeReviews();
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

  // Products State - Guaranteed all products loaded immediately with authoritative prices reconciled
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const storedBuildVersion = localStorage.getItem('artified_catalog_build_version');
      if (storedBuildVersion !== CATALOG_BUILD_VERSION) {
        // Automatic cache purge on new release deployment:
        // Discard stale product & review caches from previous releases so Royal & Classic each have their exact 1 review
        localStorage.removeItem('artified_products_custom');
        localStorage.removeItem('artified_products_v3');
        localStorage.removeItem('artified_deleted_review_ids');
        localStorage.removeItem('artified_custom_reviews_v1');
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('artified_reviews_')) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
        } catch {}
        localStorage.setItem('artified_catalog_build_version', CATALOG_BUILD_VERSION);
      }

      const saved = localStorage.getItem('artified_products_v3') || localStorage.getItem('artified_products_custom');
      let baseList = PRODUCTS;
      if (saved) {
        if (saved.length > 800000) {
          localStorage.removeItem('artified_products_v3');
          localStorage.removeItem('artified_products_custom');
        } else {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              baseList = reconcileProductCatalog(parsed, PRODUCTS);
            }
          } catch {}
        }
      }

      // Hydrate live Cloud Firestore overrides synchronously on boot so soldCount/price never flashes an older value
      const liveOverridesRaw = localStorage.getItem('artified_cloud_live_overrides_v1');
      if (liveOverridesRaw) {
        try {
          const liveOverrides = JSON.parse(liveOverridesRaw);
          if (liveOverrides && typeof liveOverrides === 'object') {
            baseList = baseList.map((p) => {
              const ov = liveOverrides[p.id];
              if (!ov) return p;
              return {
                ...p,
                soldCount: typeof ov.soldCount === 'number' ? ov.soldCount : p.soldCount,
                onlineSalesCount: typeof ov.onlineSalesCount === 'number' ? Math.max(p.onlineSalesCount || 0, ov.onlineSalesCount) : p.onlineSalesCount,
                totalSold: typeof ov.totalSold === 'number' ? ov.totalSold : p.totalSold,
                price: typeof ov.price === 'number' && ov.price > 0 ? ov.price : p.price,
                originalPrice: typeof ov.originalPrice === 'number' ? ov.originalPrice : p.originalPrice,
                stockCount: typeof ov.stockCount === 'number' ? ov.stockCount : p.stockCount,
                inventoryCount: typeof ov.inventoryCount === 'number' ? ov.inventoryCount : p.inventoryCount,
                inStock: typeof ov.inStock === 'boolean' ? ov.inStock : p.inStock
              };
            });
          }
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
        // Priority 1: New Arrival status
        const isNewA = a.isNewArrival ? 1 : 0;
        const isNewB = b.isNewArrival ? 1 : 0;
        if (isNewB !== isNewA) {
          return isNewB - isNewA;
        }

        // Priority 2: Creation or update ISO date/timestamp
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        if (timeB !== timeA) {
          return timeB - timeA;
        }

        // Priority 3: Timestamp embedded in product ID (e.g. art-1793343690587-...)
        const matchA = a.id?.match(/^art-(\d+)/);
        const matchB = b.id?.match(/^art-(\d+)/);
        if (matchA && matchB) {
          const numA = parseInt(matchA[1], 10);
          const numB = parseInt(matchB[1], 10);
          if (numB !== numA) return numB - numA;
        } else if (matchB) {
          return 1;
        } else if (matchA) {
          return -1;
        }

        return a.title.localeCompare(b.title);
      });
    } else if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name-asc') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'name-desc') {
      result.sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortBy === 'featured') {
      // Best Seller: most sold item shown first
      result.sort((a, b) => {
        const soldA = calculateTotalSold(a);
        const soldB = calculateTotalSold(b);
        if (soldB !== soldA) return soldB - soldA;
        return a.title.localeCompare(b.title);
      });
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
        const nowIso = new Date().toISOString();
        const updated = prev.map((prod) => {
          const addedQty = quantities[prod.id] || 0;
          const prevOnline = prod.onlineSalesCount || 0;
          const verifiedOnline = verifiedByProd[prod.id] || 0;
          const nextOnline = Math.max(prevOnline + addedQty, verifiedOnline);
          const newlySold = Math.max(0, nextOnline - prevOnline);

          if (newlySold > 0 || addedQty > 0 || verifiedOnline > prevOnline) {
            const baseSold = prod.soldCount !== undefined ? prod.soldCount : 0;
            const nextTotal = baseSold + nextOnline;
            const currentStock = typeof prod.stockCount === 'number' ? prod.stockCount : (prod.inventoryCount ?? 8);
            const nextStock = Math.max(0, currentStock - (newlySold > 0 ? newlySold : addedQty));
            lastLocalProductEditRef.current[prod.id] = Date.now();
            return {
              ...prod,
              soldCount: baseSold,
              onlineSalesCount: nextOnline,
              totalSold: nextTotal,
              stockCount: nextStock,
              inventoryCount: nextStock,
              inStock: nextStock > 0,
              updatedAt: nowIso,
              isBestSeller: nextTotal >= bestsellerThreshold || prod.isBestSeller
            };
          }
          return prod;
        });

        latestProductsRef.current = updated;
        window.setTimeout(() => {
          try {
            const serialized = JSON.stringify(updated);
            localStorage.setItem('artified_products_custom', serialized);
            localStorage.setItem('artified_products_v3', serialized);
            fetch('/api/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: serialized
            }).catch(() => {});
          } catch {}
        }, 0);

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
      invalidateReviewsCache();
      const updatedProducts = products.map((prod) => {
        if (prod.id === productId) {
          const existingReviews = (prod.customReviews || []).filter(
            (r) => r.id !== sanitized.id && r.id !== `${productId}::all_cleared` && r.id !== 'all_cleared'
          );
          const nextCustom = [sanitized, ...existingReviews];
          const visibleCount = nextCustom.filter((r: any) => !r.isDeleted).length;
          return {
            ...prod,
            reviewsCount: Math.max(1, visibleCount),
            customReviews: nextCustom,
            updatedAt: new Date().toISOString()
          };
        }
        return prod;
      });

      setProducts(updatedProducts);
      setQuickViewProduct((prev) => (prev && prev.id === productId ? updatedProducts.find(p => p.id === productId) || prev : prev));

      try {
        // Unblock if this product or author was previously cleared/deleted
        const delRaw = localStorage.getItem('artified_deleted_review_ids');
        if (delRaw) {
          const delList: string[] = JSON.parse(delRaw);
          if (Array.isArray(delList)) {
            const authorKey = `${productId}::${sanitized.author.trim().toLowerCase()}`;
            const clearKey = `${productId}::all_cleared`;
            const nextDel = delList.filter((k) => k !== sanitized.id && k !== authorKey && k !== clearKey);
            localStorage.setItem('artified_deleted_review_ids', JSON.stringify(nextDel));
          }
        }

        const dictRaw = localStorage.getItem('artified_custom_reviews_v1');
        const dict = dictRaw ? JSON.parse(dictRaw) : {};
        const currentProd = dict[productId] || [];
        const cleanProd = currentProd.filter((r: any) => r.id !== sanitized.id && `${r.author}_${r.comment}` !== `${sanitized.author}_${sanitized.comment}`);
        dict[productId] = [sanitized, ...cleanProd];
        localStorage.setItem('artified_custom_reviews_v1', JSON.stringify(dict));
        invalidateReviewsCache();
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
          await setDoc(prodRef, sanitizeForFirestore({ customReviews: current.customReviews, reviewsCount: current.reviewsCount }), { merge: true });
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
      invalidateReviewsCache();
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
      invalidateReviewsCache();
      try {
        localStorage.setItem('artified_products_v3', JSON.stringify(updatedProducts));
      } catch {}

      // Sync Firestore (only customReviews so product images/fields are never overwritten)
      try {
        const prodRef = doc(db, 'products', currentProductId);
        const current = updatedProducts.find((p) => p.id === currentProductId);
        if (current) await setDoc(prodRef, sanitizeForFirestore({ customReviews: current.customReviews }), { merge: true });

        if (isMovingProduct) {
          const targetRef = doc(db, 'products', targetProductId);
          const targetProd = updatedProducts.find((p) => p.id === targetProductId);
          if (targetProd) await setDoc(targetRef, sanitizeForFirestore({ customReviews: targetProd.customReviews }), { merge: true });
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
      const targetProd = products.find((p) => p.id === productId);
      const currentReviewsBeforeDelete = targetProd ? getProductReviews(targetProd) : [];
      const matchingReview = currentReviewsBeforeDelete.find((r) => r.id === reviewId);

      await deleteProductReviewFromFirestore(reviewId);
      invalidateReviewsCache();

      try {
        const dictRaw = localStorage.getItem('artified_custom_reviews_v1');
        if (dictRaw) {
          const dict = JSON.parse(dictRaw);
          if (dict[productId]) {
            dict[productId] = dict[productId].filter((r: any) => r.id !== reviewId && (!matchingReview || r.author !== matchingReview.author));
            localStorage.setItem('artified_custom_reviews_v1', JSON.stringify(dict));
          }
        }

        const delRaw = localStorage.getItem('artified_deleted_review_ids');
        const delList: string[] = delRaw ? JSON.parse(delRaw) : [];
        const addKey = (k: string) => {
          if (k && !delList.includes(k)) delList.push(k);
        };
        addKey(reviewId);
        if (matchingReview?.author) {
          addKey(`${productId}::${matchingReview.author.trim().toLowerCase()}`);
        }
        localStorage.setItem('artified_deleted_review_ids', JSON.stringify(delList));
        localStorage.removeItem(`artified_reviews_${productId}`);
        invalidateReviewsCache();
      } catch {}

      lastLocalProductEditRef.current[productId] = Date.now();
      const nowIso = new Date().toISOString();
      const nextReviewsCount = Math.max(0, currentReviewsBeforeDelete.length - 1);

      const updatedProducts = products.map((prod) => {
        if (prod.id === productId || prod.customReviews?.some(r => r.id === reviewId)) {
          const existingCustom = (prod.customReviews || []).filter(
            (r) => r.id !== reviewId && (!matchingReview || r.author !== matchingReview.author)
          );
          const newTombstones: any[] = [
            { id: reviewId, author: matchingReview?.author || '', isDeleted: true }
          ];
          return {
            ...prod,
            reviewsCount: nextReviewsCount,
            customReviews: [...existingCustom, ...newTombstones],
            updatedAt: nowIso
          };
        }
        return prod;
      });

      latestProductsRef.current = updatedProducts;
      setProducts(updatedProducts);
      setQuickViewProduct((prev) => (prev && (prev.id === productId || prev.customReviews?.some(r => r.id === reviewId)) ? updatedProducts.find(p => p.id === prev.id) || prev : prev));

      try {
        const serialized = JSON.stringify(updatedProducts);
        localStorage.setItem('artified_products_v3', serialized);
        localStorage.setItem('artified_products_custom', serialized);
      } catch {}

      try {
        fetch(`/api/products?v=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedProducts),
        }).catch(() => {});
      } catch {}

      try {
        const prodRef = doc(db, 'products', productId);
        const current = updatedProducts.find((p) => p.id === productId);
        if (current) {
          await setDoc(
            prodRef,
            sanitizeForFirestore({
              customReviews: current.customReviews,
              reviewsCount: current.reviewsCount,
              updatedAt: nowIso
            }),
            { merge: true }
          );
        }
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
      if (isFirestoreQuotaExceeded) return;
      try {
        await getDocFromServer(doc(db, 'test', 'connection')).catch((e) => {
          detectQuotaError(e);
        });
      } catch (e) {
        detectQuotaError(e);
      }
    }
    testConnection();
  }, []);

  // 2. Repository-driven content hydration & Real-time Firestore sales count listener
  useEffect(() => {
    setSyncStatusText('🟢 Catalog Ready (Repository & Local Database)');
    setIsDataSyncing(false);

    // Sync and verify sales_history from server & Firestore, and reconcile confirmed orders
    if (!isFirestoreQuotaExceeded) {
      syncConfirmedSalesOrdersFromFirestore(getAllOrdersForSeller(), products).catch((e) => {
        detectQuotaError(e);
      });
    }

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
      (err) => {
        detectQuotaError(err);
      }
    );

    // Real-time cross-browser polling loop so Chrome purchases update Edge live without causing unnecessary re-renders
    const triggerCrossBrowserSync = async () => {
      // Skip background polling while user is actively scrolling/editing in Catalog Manager or Product Editor
      if (isModalEditingRef.current) return;
      const now = Date.now();
      const anyRecentEdit = Object.values(lastLocalProductEditRef.current).some((ts) => now - ts < 6000);
      if (anyRecentEdit) return;

      try {
        if (!isFirestoreQuotaExceeded) {
          await syncOrdersFromFirestore().catch((e) => { detectQuotaError(e); });
          await syncConfirmedSalesOrdersFromFirestore(getAllOrdersForSeller(), products).catch((e) => { detectQuotaError(e); });
        }
        const res = await fetch(`/api/products?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const serverProducts = await res.json();
          if (Array.isArray(serverProducts) && serverProducts.length > 0) {
            setProducts((prev) => {
              let changed = false;
              const checkNow = Date.now();
              const updated = prev.map((prod) => {
                if (checkNow - (lastLocalProductEditRef.current[prod.id] || 0) < 6000) {
                  return prod;
                }
                const sp = serverProducts.find((p: any) => p.id === prod.id);
                if (!sp) return prod;
                const spOnline = Number(sp.onlineSalesCount) || 0;
                const baseSold = prod.soldCount !== undefined ? Number(prod.soldCount) : 0;
                const spTotal = baseSold + spOnline;
                const mergedOnline = Math.max(prod.onlineSalesCount || 0, spOnline);
                const mergedTotal = baseSold + mergedOnline;

                const spUpdatedTime = sp.updatedAt ? new Date(sp.updatedAt).getTime() : 0;
                const prodUpdatedTime = prod.updatedAt ? new Date(prod.updatedAt).getTime() : 0;
                const spInv = typeof sp.stockCount === 'number' ? sp.stockCount : (typeof sp.inventoryCount === 'number' ? sp.inventoryCount : (prod.stockCount ?? 8));
                const nextStock = spUpdatedTime > prodUpdatedTime ? Math.max(0, spInv) : prod.stockCount;
                const nextInStock = spUpdatedTime > prodUpdatedTime ? (sp.inStock !== undefined ? Boolean(sp.inStock && nextStock > 0) : nextStock > 0) : prod.inStock;
                const nextBestSeller = mergedTotal >= bestsellerThreshold || Boolean(prod.isBestSeller);

                if (
                  mergedOnline !== (prod.onlineSalesCount || 0) ||
                  mergedTotal !== (prod.totalSold ?? (baseSold + (prod.onlineSalesCount || 0))) ||
                  nextStock !== prod.stockCount ||
                  nextInStock !== prod.inStock ||
                  nextBestSeller !== Boolean(prod.isBestSeller)
                ) {
                  changed = true;
                  return {
                    ...prod,
                    onlineSalesCount: mergedOnline,
                    totalSold: mergedTotal,
                    inventoryCount: nextStock,
                    stockCount: nextStock,
                    inStock: nextInStock,
                    updatedAt: spUpdatedTime > prodUpdatedTime ? sp.updatedAt : prod.updatedAt,
                    isBestSeller: nextBestSeller
                  };
                }
                return prod;
              });

              if (changed) {
                window.setTimeout(() => {
                  try {
                    localStorage.setItem('artified_products_v3', JSON.stringify(updated));
                  } catch {}
                }, 0);
                setQuickViewProduct((qv) => (qv ? updated.find((p) => p.id === qv.id) || qv : null));
                return updated;
              }
              return prev;
            });
          }
        }
      } catch {}
    };

    // Custom event listener for sales increments across incognito & browser tabs
    const handleSalesIncremented = (evt: Event) => {
      const customEvt = evt as CustomEvent;
      const verifiedMap = customEvt.detail?.verifiedSalesByProduct;
      if (verifiedMap && typeof verifiedMap === 'object') {
        setProducts((prev) => {
          const updated = applyVerifiedSalesToProducts(prev, verifiedMap, bestsellerThreshold);
          if (updated === prev) return prev;
          window.setTimeout(() => {
            try {
              localStorage.setItem('artified_products_v3', JSON.stringify(updated));
            } catch {}
          }, 0);
          setQuickViewProduct((qv) => (qv ? updated.find((p) => p.id === qv.id) || qv : null));
          return updated;
        });
      }
    };
    window.addEventListener('artified_sales_incremented', handleSalesIncremented);

    // Setup BroadcastChannel for zero-latency multi-window & cross-tab sync
    let syncChannel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        syncChannel = new BroadcastChannel('artified_sync_channel');
        syncChannel.onmessage = (msg) => {
          if (msg.data?.type === 'RELOAD_SALES' || msg.data?.type === 'ORDER_PLACED') {
            triggerCrossBrowserSync();
          }
        };
      } catch {}
    }

    const syncIntervalId = window.setInterval(triggerCrossBrowserSync, 25000);
    window.addEventListener('focus', triggerCrossBrowserSync);

    return () => {
      try {
        window.clearInterval(syncIntervalId);
        window.removeEventListener('focus', triggerCrossBrowserSync);
        window.removeEventListener('artified_sales_incremented', handleSalesIncremented);
        if (syncChannel) {
          syncChannel.close();
        }
        unsubSalesHistory();
      } catch {}
    };
  }, [bestsellerThreshold]);

  const forceSyncAllToCloud = async () => {
    setIsDataSyncing(true);
    setSyncStatusText('Saving all products, stock, sales & orders...');
    try {
      if (persistDebounceTimerRef.current) {
        window.clearTimeout(persistDebounceTimerRef.current);
        persistDebounceTimerRef.current = null;
      }
      pendingCloudProductsRef.current.clear();

      const currentProducts = latestProductsRef.current;
      const allOrdersList = getAllOrdersForSeller();
      const trackedOrdersMap: Record<string, any> = {};
      allOrdersList.forEach((o) => {
        if (o && o.orderId) {
          const norm = o.orderId.replace(/[#\s]/g, '').toUpperCase();
          trackedOrdersMap[norm] = o;
        }
      });

      try {
        const serialized = JSON.stringify(currentProducts);
        localStorage.setItem('artified_products_custom', serialized);
        localStorage.setItem('artified_products_v3', serialized);
      } catch {}

      const newPrices: Record<string, number> = {};
      currentProducts.forEach((p) => {
        if (typeof p.price === 'number') {
          newPrices[p.id] = p.price;
        }
      });
      setDbSyncedPrices((prev) => ({ ...prev, ...newPrices }));

      // 1. Single fast local repository write (persists products, orders, reels, instagram, craft story, payment settings & profile to both runtime & src/data + public)
      const repoSavePromise = fetch('/api/save-all-to-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: currentProducts,
          trackedOrders: trackedOrdersMap,
          reels,
          instagramItems,
          craftStory,
          artisanProfile,
          paymentSettings: getSellerPaymentSettings()
        })
      }).catch(() => {});

      // 2. Kick off Firestore batch sync in background so UI never stalls on remote network latency
      if (!isFirestoreQuotaExceeded) {
        Promise.resolve().then(async () => {
          try {
            if (isFirestoreQuotaExceeded) return;
            const batch = writeBatch(db);
            currentProducts.forEach((p) => {
              const prodRef = doc(db, 'products', p.id);
              batch.set(prodRef, sanitizeForFirestore(p), { merge: true });
            });
            await safeCommitBatch(batch);
          } catch (e) {
            detectQuotaError(e);
            console.warn('Background Firestore batch sync warning:', e);
          }
        });
      }

      await repoSavePromise;

      setIsCloudSynced(true);
      setSyncStatusText('🟢 All products, stock, sales & orders saved to Repository & Cloud!');
    } catch (err) {
      console.error('Failed to save to Repository & Cloud', err);
      setSyncStatusText('🟢 Saved to Repository & local database');
    } finally {
      setIsDataSyncing(false);
    }
  };

  const forceRefreshCatalogFromDB = async (): Promise<void> => {
    setSyncStatusText('Clearing local cache and fetching fresh product catalog from Cloud Firestore...');
    try {
      // 1. Clear local storage cache
      localStorage.removeItem('artified_products_custom');
      localStorage.removeItem('artified_products_v3');

      // 2. Fetch fresh documents directly from Cloud Firestore collection `products`
      const freshCloudProducts: Product[] = [];
      const freshPrices: Record<string, number> = {};

      if (!isFirestoreQuotaExceeded) {
        try {
          const snap = await getDocs(collection(db, 'products'));
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
        } catch (e) {
          detectQuotaError(e);
        }
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
        const serialized = JSON.stringify(mergedList);
        localStorage.setItem('artified_products_custom', serialized);
        localStorage.setItem('artified_products_v3', serialized);
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

  // Keep ref in sync so background polling pauses while Catalog Manager or Product Editor is open
  useEffect(() => {
    isModalEditingRef.current = Boolean(isCatalogListOpen || isSellerModalOpen);
  }, [isCatalogListOpen, isSellerModalOpen]);

  const latestProductsRef = React.useRef<Product[]>(products);
  useEffect(() => {
    latestProductsRef.current = products;
  }, [products]);

  const scheduleBackgroundCatalogPersistence = () => {
    if (persistDebounceTimerRef.current) {
      window.clearTimeout(persistDebounceTimerRef.current);
    }
    persistDebounceTimerRef.current = window.setTimeout(async () => {
      persistDebounceTimerRef.current = null;
      const currentList = latestProductsRef.current;
      const dirtyEntries = Array.from(pendingCloudProductsRef.current.values());
      pendingCloudProductsRef.current.clear();

      try {
        const serialized = JSON.stringify(currentList);
        localStorage.setItem('artified_products_custom', serialized);
        localStorage.setItem('artified_products_v3', serialized);
        fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: serialized,
        }).catch(() => {});
      } catch {}

      for (const prod of dirtyEntries) {
        try {
          if (!isFirestoreQuotaExceeded) {
            const prodRef = doc(db, 'products', prod.id);
            await setDoc(prodRef, sanitizeForFirestore(prod), { merge: true }).catch((err) => {
              detectQuotaError(err);
            });
          }
        } catch (err) {
          detectQuotaError(err);
        }
      }
    }, 320);
  };

  const setIsSellerMode = (val: boolean) => {
    if (!val && isSellerMode) {
      // Automatically save all products, stock counts, sales counts, and orders when exiting & locking Seller Mode
      forceSyncAllToCloud().catch(() => {});
    }
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
    lastLocalProductEditRef.current[updated.id] = Date.now();
    // 1. Optimize images only if uncompressed base64 (> 180KB)
    const cleanImages = await Promise.all(
      updated.images.map(async (img) => {
        if (img.startsWith('data:image/') && img.length > 240000) {
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

    const previous = latestProductsRef.current.find((p) => p.id === cleanedProduct.id);
    const wasOutOfStock = previous 
      ? (previous.inStock === false || (typeof previous.stockCount === 'number' && previous.stockCount <= 0))
      : false;
    const isNowInStock = cleanedProduct.inStock === true && (typeof cleanedProduct.stockCount === 'number' ? cleanedProduct.stockCount > 0 : true);

    // 2. Instant pure in-memory UI update (no synchronous JSON.stringify blocking)
    setProducts((prev) => {
      const next = prev.map((p) => (p.id === cleanedProduct.id ? cleanedProduct : p));
      latestProductsRef.current = next;
      return next;
    });

    if (quickViewProduct?.id === cleanedProduct.id) {
      setQuickViewProduct(cleanedProduct);
    }

    // 3. Debounced background save to localStorage, Express API, and Cloud Firestore
    pendingCloudProductsRef.current.set(cleanedProduct.id, cleanedProduct);
    scheduleBackgroundCatalogPersistence();

    setDbSyncedPrices((prev) =>
      prev[cleanedProduct.id] === cleanedProduct.price
        ? prev
        : { ...prev, [cleanedProduct.id]: cleanedProduct.price }
    );

    // 4. If product was previously out-of-stock and is now marked restocked, trigger waitlist notifications in Firestore
    if (wasOutOfStock && isNowInStock) {
      triggerRestockNotifications(cleanedProduct.id, cleanedProduct.title, cleanedProduct.stockCount || 1).catch((err) => {
        console.warn('Notice: Restock notification trigger:', err);
      });
    }
  };

  const addProduct = async (newProduct: Product) => {
    lastLocalProductEditRef.current[newProduct.id] = Date.now();
    // 1. Optimize images if any large base64
    const cleanImages = await Promise.all(
      newProduct.images.map(async (img) => {
        if (img.startsWith('data:image/') && img.length > 240000) {
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
      latestProductsRef.current = next;
      return next;
    });

    pendingCloudProductsRef.current.set(cleanedProduct.id, cleanedProduct);
    scheduleBackgroundCatalogPersistence();

    setDbSyncedPrices((prev) => ({
      ...prev,
      [cleanedProduct.id]: cleanedProduct.price
    }));
  };

  const syncSingleProductToCloud = async (productToSync: Product): Promise<boolean> => {
    try {
      lastLocalProductEditRef.current[productToSync.id] = Date.now();
      const nowIso = new Date().toISOString();
      const cleanedProduct: Product = sanitizeProduct({ 
        ...productToSync, 
        updatedAt: nowIso
      });

      // 1. Permanent Cloud Firestore save
      const prodRef = doc(db, 'products', cleanedProduct.id);
      await setDoc(prodRef, cleanedProduct, { merge: true });

      // 2. Update local dbSyncedPrices map
      setDbSyncedPrices((prev) =>
        prev[cleanedProduct.id] === cleanedProduct.price
          ? prev
          : { ...prev, [cleanedProduct.id]: cleanedProduct.price }
      );

      // 3. Save to server JSON disk with cache-busting version query param
      const ts = Date.now();
      const updatedList = latestProductsRef.current.map((p) => (p.id === cleanedProduct.id ? cleanedProduct : p));
      fetch(`/api/products?v=${ts}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedList),
      }).catch(() => {});

      try {
        localStorage.setItem('artified_products_custom', JSON.stringify(updatedList));
      } catch {}

      return true;
    } catch (err) {
      console.warn('Notice: Firestore single product sync error:', err);
      return false;
    }
  };

  const duplicateProduct = async (id: string) => {
    const existing = latestProductsRef.current.find((p) => p.id === id);
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
    lastLocalProductEditRef.current[id] = Date.now();
    const nowIso = new Date().toISOString();
    let updatedTarget: Product | null = null;
    let wasOutOfStock = false;

    setProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        wasOutOfStock = !p.inStock || (typeof p.stockCount === 'number' && p.stockCount <= 0);
        const newInStock = !p.inStock;
        const newCount = newInStock ? (p.stockCount > 0 ? p.stockCount : 3) : 0;
        const updated: Product = {
          ...p,
          inStock: newInStock,
          stockCount: newCount,
          inventoryCount: newCount,
          updatedAt: nowIso
        };
        updatedTarget = updated;
        return updated;
      });
      latestProductsRef.current = next;
      return next;
    });

    if (updatedTarget) {
      const finalProd = updatedTarget as Product;
      setQuickViewProduct((qv) => (qv && qv.id === id ? finalProd : qv));
      setEditingProduct((ep) => (ep && ep.id === id ? finalProd : ep));
      pendingCloudProductsRef.current.set(finalProd.id, finalProd);
      scheduleBackgroundCatalogPersistence();

      if (wasOutOfStock && finalProd.inStock && finalProd.stockCount > 0) {
        triggerRestockNotifications(finalProd.id, finalProd.title, finalProd.stockCount).catch(() => {});
      }
    }
  };

  const adjustProductStockCount = async (id: string, delta: number) => {
    lastLocalProductEditRef.current[id] = Date.now();
    const nowIso = new Date().toISOString();
    let updatedTarget: Product | null = null;
    let wasOutOfStock = false;

    setProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        const currentCount = p.inStock === false ? 0 : (typeof p.stockCount === 'number' ? Math.max(0, p.stockCount) : 0);
        wasOutOfStock = !p.inStock || currentCount <= 0;
        const nextCount = Math.max(0, currentCount + delta);
        const nextInStock = nextCount > 0;
        const updated: Product = {
          ...p,
          inStock: nextInStock,
          stockCount: nextCount,
          inventoryCount: nextCount,
          updatedAt: nowIso
        };
        updatedTarget = updated;
        return updated;
      });
      latestProductsRef.current = next;
      return next;
    });

    if (updatedTarget) {
      const finalProd = updatedTarget as Product;
      setQuickViewProduct((qv) => (qv && qv.id === id ? finalProd : qv));
      setEditingProduct((ep) => (ep && ep.id === id ? finalProd : ep));

      pendingCloudProductsRef.current.set(finalProd.id, finalProd);
      scheduleBackgroundCatalogPersistence();

      if (wasOutOfStock && finalProd.inStock && finalProd.stockCount > 0) {
        triggerRestockNotifications(finalProd.id, finalProd.title, finalProd.stockCount).catch(() => {});
      }
    }
  };

  const toggleProductNewArrival = async (id: string) => {
    lastLocalProductEditRef.current[id] = Date.now();
    const nowIso = new Date().toISOString();
    let updatedTarget: Product | null = null;

    setProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        const updated: Product = {
          ...p,
          isNewArrival: !p.isNewArrival,
          updatedAt: nowIso
        };
        updatedTarget = updated;
        return updated;
      });
      latestProductsRef.current = next;
      return next;
    });

    if (updatedTarget) {
      const finalProd = updatedTarget as Product;
      setQuickViewProduct((qv) => (qv && qv.id === id ? finalProd : qv));
      setEditingProduct((ep) => (ep && ep.id === id ? finalProd : ep));
      pendingCloudProductsRef.current.set(finalProd.id, finalProd);
      scheduleBackgroundCatalogPersistence();
    }
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
        adjustProductStockCount,
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
