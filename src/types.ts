export interface ArtisanalSpotlightPoint {
  id: string;
  title: string;
  tag: string; // e.g. "Pearl Grade", "Clasp Quality", "Hand-Knotting", "Tensile Wire", "Base Structure"
  description: string;
  specHighlight?: string; // e.g. "Grade AAA Mirror Luster", "18k Champagne Gold Plated", "15kg Tensile Strength"
  x: number; // percentage coordinate 0-100 on photo
  y: number; // percentage coordinate 0-100 on photo
}

export interface Product {
  id: string;
  title: string;
  subtitle: string;
  category: 'pearl-bags' | 'pearl-necklaces' | 'macrame' | 'accessories' | 'custom-beaded';
  price: number; // In NPR (Rs.)
  originalPrice?: number; // In NPR (Rs.)
  rating: number;
  reviewsCount: number;
  soldCount?: number;
  onlineSalesCount?: number;
  customReviews?: ProductReviewItem[];
  isHandmade: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  inStock: boolean;
  stockCount: number;
  leadTime: string; // e.g. "Handmade to order: 2–4 business days"
  materials: string[];
  dimensions: string;
  weight?: string;
  description: string;
  stylingTip?: string;
  careNotes: string[];
  images: string[];
  tags: string[];
  spotlights?: ArtisanalSpotlightPoint[];
}

export interface CartItem {
  id: string; // unique item id (product.id + customization hash)
  product: Product;
  quantity: number;
  customizationNote?: string;
  selectedColorOrStyle?: string;
}

export interface DeliveryZone {
  id: 'ktm_valley' | 'inside_ring_road' | 'outside_ring_road' | 'outside_valley';
  name: string;
  area: string;
  fee: number; // in NPR
  estimatedDays: string;
  description: string;
}

export type PaymentMethod = 'cod' | 'fonepay' | 'esewa' | 'khalti';

export interface OrderDetails {
  orderId: string;
  items: CartItem[];
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  landmark?: string;
  deliveryZone: DeliveryZone;
  paymentMethod: PaymentMethod;
  giftPackaging: boolean;
  giftMessage?: string;
  recipientName?: string;
  senderName?: string;
  orderNote?: string;
  subtotal: number;
  deliveryFee: number;
  giftPackagingFee: number;
  discount: number;
  total: number;
  transactionId?: string;
  paymentScreenshot?: string;
  createdAt: string;
  earnedLoyaltyPoints?: number;
}

export type LoyaltyTier = 'Pearl Bronze' | 'Silver Baroque' | 'Gold Sovereign';

export interface LoyaltyTransaction {
  id: string;
  type: 'earn' | 'redeem' | 'welcome' | 'bonus';
  points: number;
  description: string;
  orderId?: string;
  date: string;
}

export interface LoyaltyRewardVoucher {
  id: string;
  code: string;
  title: string;
  pointsCost: number;
  discountAmount: number;
  description: string;
  type: 'discount' | 'free_gift_wrap';
}

export interface LoyaltyAccount {
  customerId: string;
  customerName: string;
  phone: string;
  email: string;
  pointsBalance: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  history: LoyaltyTransaction[];
  claimedVouchers: string[];
}

export interface ProductReviewItem {
  id: string;
  author: string;
  location: string;
  rating: number;
  date: string;
  verified: boolean;
  comment: string;
}

export interface Testimonial {
  id: string;
  author: string;
  location: string;
  rating: number;
  comment: string;
  productName: string;
  date: string;
  verifiedPurchase: boolean;
  image?: string;
}

export interface TikTokReel {
  id: string;
  title: string;
  handle: string;
  views: string;
  likes: string;
  showViews?: boolean; // Toggle whether to display view count on video
  showLikes?: boolean; // Toggle whether to display like count on video
  thumbnail: string;
  videoUrl?: string; // Direct TikTok video URL (e.g. https://www.tiktok.com/@artified_np/video/...)
  videoCaption: string;
  featuredProductName?: string;
  featuredProductId?: string;
}

export interface InstagramJournalItem {
  id: string;
  title: string;
  handle?: string;
  caption: string;
  thumbnail: string;
  videoUrl?: string;
  postUrl: string;
  likes?: string;
  views?: string;
  showViews?: boolean;
  showLikes?: boolean;
  date?: string;
  comments?: string;
  taggedProductId?: string;
  taggedProductName?: string;
  taggedProductPrice?: number;
  isLocked?: boolean;
}

export type OrderProductionPhase = 
  | 'confirmed'
  | 'handcrafting_and_packaging'
  | 'out_for_delivery'
  | 'delivered'
  | 'beading_in_progress'
  | 'quality_and_packaging';

export interface TrackingMilestone {
  stage: OrderProductionPhase;
  label: string;
  description: string;
  timestamp: string;
  location: string;
  completed: boolean;
  current: boolean;
}

export interface TrackedOrderData {
  orderId: string;
  customerName: string;
  phone: string;
  deliveryAddress: string;
  deliveryZoneName: string;
  paymentMethodText: string;
  paymentStatus: string;
  items: Array<{
    title: string;
    image: string;
    quantity: number;
    price: number;
    customization?: string;
  }>;
  total: number;
  orderPlacedDate: string;
  estimatedDeliveryDate: string;
  currentPhase: OrderProductionPhase;
  progressPercentage: number;
  artisanName: string;
  artisanRole: string;
  studioLocation: string;
  courierPartner?: string;
  consignmentCode?: string;
  riderName?: string;
  riderPhone?: string;
  liveCraftNotes: string;
  milestones: TrackingMilestone[];
}

export interface CraftStoryData {
  badge: string;
  title: string;
  paragraph1: string;
  paragraph2: string;
  stat1Number: string;
  stat1Label: string;
  stat2Number: string;
  stat2Label: string;
  image1: string;
  image2: string;
  videoUrl?: string; // Optional TikTok craft / making video URL
  videoButtonLabel?: string;
  pillar1Title: string;
  pillar1Desc: string;
  pillar2Title: string;
  pillar2Desc: string;
  pillar3Title: string;
  pillar3Desc: string;
}

export interface CraftArticle {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string[];
  category: 'Craft Techniques' | 'Nepali Heritage' | 'Care Guides' | 'Bridal & Styling';
  author: string;
  authorRole: string;
  publishedDate: string;
  readTime: string;
  coverImage: string;
  featuredProductId?: string;
  featuredProductTitle?: string;
  tags: string[];
  seoKeywords: string[];
  viewsCount?: number;
}

export interface ReferralRewardData {
  referralCode: string;
  referralLink: string;
  friendsInvited: number;
  successfulPurchases: number;
  rewardCode: string;
  rewardDiscountAmount: number;
  friendDiscountPercent: number;
  hasClaimedReward: boolean;
}

export interface WorkshopMediaItem {
  id: string;
  groupId?: 'macrame' | 'wastepipe-sunflower' | 'pearl-bag' | string;
  type: 'image' | 'video';
  title: string;
  workshopTitle: string;
  batchName?: string;
  date: string;
  location: string;
  url: string;
  thumbnailUrl: string;
  caption: string;
  craftTechnique: string;
  attendeesCount?: number;
  instructor: string;
  featured?: boolean;
  aspectRatio?: 'vertical' | 'square' | 'horizontal';
  tags: string[];
  duration?: string;
  likes?: string;
  views?: string;
  whatsappMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkshopGroup {
  id: string;
  groupKey: 'macrame' | 'wastepipe-sunflower' | 'pearl-bag' | string;
  title: string;
  badge: string;
  date: string;
  location: string;
  instructor: string;
  attendeesCount: number;
  tagline: string;
  description: string;
  keyTechniques: string[];
  items: WorkshopMediaItem[];
  whatsappMessage?: string;
}

export interface WorkshopEventSummary {
  id: string;
  title: string;
  batchName: string;
  date: string;
  location: string;
  description: string;
  technique: string;
  attendeesCount: number;
  photosCount: number;
  videosCount: number;
  coverImage: string;
  status: 'completed' | 'upcoming';
  nextBatchDate?: string;
}


