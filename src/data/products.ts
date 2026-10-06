import { Product, DeliveryZone, Testimonial, TikTokReel, CraftStoryData, InstagramJournalItem } from '../types';
import { PRODUCT_REVIEWS_MAP, sanitizeReviewItem } from '../utils/productStats';
import SAVED_PRODUCTS from './products.json';
import SAVED_TIKTOK_REELS from './tiktok_reels.json';
import SAVED_INSTAGRAM_ITEMS from './instagram_journal.json';
import SAVED_CRAFT_STORY from './craft_story.json';

export const DEFAULT_INSTAGRAM_HANDLE = '@artified_np';
export const DEFAULT_INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/artified_np/';

export const DEFAULT_INSTAGRAM_ITEMS: InstagramJournalItem[] = (SAVED_INSTAGRAM_ITEMS as unknown as InstagramJournalItem[]);

export const DEFAULT_CRAFT_STORY: CraftStoryData = (SAVED_CRAFT_STORY as unknown as CraftStoryData);

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 'ktm_valley',
    name: 'Kathmandu Valley',
    area: 'Kathmandu, Lalitpur, Bhaktapur (Doorstep delivery)',
    fee: 120,
    estimatedDays: '1 to 2 days',
    description: 'Fast doorstep courier inside Kathmandu Valley (1 to 2 days)'
  },
  {
    id: 'outside_valley',
    name: 'Outside Valley',
    area: 'Pokhara, Chitwan, Butwal, Biratnagar, Dharan & all other districts across Nepal',
    fee: 250,
    estimatedDays: '3 to 7 days',
    description: 'Rs. 250 to 300 (may increase depending on weight/location), 3 to 7 days'
  }
];

export const PRODUCTS: Product[] = (SAVED_PRODUCTS as unknown as Product[]).map((p) => ({
  ...p,
  customReviews: p.customReviews || PRODUCT_REVIEWS_MAP[p.id] || []
}));

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    author: 'Aayushi Khadgi',
    location: 'Kathmandu, Nepal',
    rating: 4.8,
    comment: 'Honestly, I was not sure about ordering bags online because sometimes pearls look cheap plastic. But this Red Pearl Beaded Bag is surprisingly heavy and well made. The red pearls shine nicely under hall lights and it easily fits my mobile phone, handkerchief and compact powder. Delivery rider called before arriving. Everyone in wedding was asking where I got it from!',
    productName: 'Red Pearl Beaded Bag',
    date: '2 weeks ago',
    verifiedPurchase: true
  },
  {
    id: 't2',
    author: 'Prerana Shahi',
    location: 'Kathmandu, Nepal',
    rating: 4.7,
    comment: 'I ordered this choker after seeing their reel on Instagram. My neck is bit thin so normal fixed chokers become loose on me, but this one has adjustable chain at back so I could fit it properly. Wore it with black sari for college farewell. Beads are smooth and did not scratch my skin. Very happy with the purchase at this price.',
    productName: 'Pearl Beaded Adjustable Choker',
    date: '1 month ago',
    verifiedPurchase: true
  },
  {
    id: 't3',
    author: 'Bhawana Gurung',
    location: 'Kathmandu, Nepal',
    rating: 4.6,
    comment: 'I ordered the round pearl bag for my celebration. The seller packed it inside solid box with lots of bubble wrap and a soft pouch. The round shape is very unique and sturdy. It is slightly heavy in hand because of solid beads, but look is 100% royal.',
    productName: 'Round Pearl Bag',
    date: '3 weeks ago',
    verifiedPurchase: true
  }
];

export const TIKTOK_REELS: TikTokReel[] = (SAVED_TIKTOK_REELS as unknown as TikTokReel[]);

export const FAQS = [
  {
    q: 'How long does delivery take inside and outside Kathmandu Valley?',
    a: 'Kathmandu Valley: Rs. 120 (1 to 2 days doorstep delivery). Outside Valley: Rs. 250 to 300 (can increase depending on location/weight, 3 to 7 days delivery via courier).'
  },
  {
    q: 'How do I pay with eSewa, Khalti, or Cash on Delivery (COD)?',
    a: 'We offer Cash on Delivery (COD) within Kathmandu Valley and major cities. For eSewa and Khalti, you can scan our official QR code during checkout or transfer directly, and paste your transaction ID or send screenshot via WhatsApp.'
  },
  {
    q: 'Where is your store located and can I pick up in person?',
    a: 'Our store is located in Kathmandu, Nepal. You can visit us in Kathmandu to pick up your handcrafted pieces or order online for fast home delivery across Nepal with Cash on Delivery (COD).'
  },
  {
    q: 'How durable are the pearl bags? Will the beads break?',
    a: 'Our bags are crafted using commercial-grade reinforced transparent nylon monofilament with a tensile strength exceeding 15kg. The beads will not shatter under everyday use, and each anchor point is cross-tied four times for long-lasting structural durability.'
  },
  {
    q: 'What is your exchange and inspection policy?',
    a: 'We offer easy exchange within 24 hrs of delivery if there is any issue or if you need an adjustment. Simply contact our Kathmandu, Nepal team on WhatsApp with your Order ID for immediate support.'
  }
];
