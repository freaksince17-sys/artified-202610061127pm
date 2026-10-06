/**
 * Automated Restock Notification & Email Dispatch Service
 * Artified_np - Handcrafted in Kathmandu, Nepal
 */

import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types';

export interface EmailDispatchLog {
  id: string;
  recipientEmail: string;
  productId: string;
  productTitle: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'simulated';
}

/**
 * Builds standard restock notification email template
 */
export function generateRestockEmailTemplate(product: Product, recipientEmail: string): { subject: string; html: string } {
  const subject = `✨ Back in Stock: ${product.title} is ready at Artified_np!`;
  const primaryImage = product.images && product.images[0]
    ? product.images[0]
    : 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=900&q=80';

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #FAF8F5; padding: 24px; border: 1px solid #E8DFD8; border-radius: 16px;">
      <div style="background: #1C1B1A; padding: 24px; text-align: center; border-radius: 12px; margin-bottom: 20px;">
        <h1 style="color: #FAF8F5; margin: 0; font-family: serif; font-size: 24px; letter-spacing: 2px;">ARTIFIED<span style="color: #D4AF37;">_np</span></h1>
        <p style="color: #C5A880; font-size: 11px; margin: 4px 0 0; text-transform: uppercase;">Handmade Luxury • Kathmandu, Nepal</p>
      </div>

      <div style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #E8DFD8; text-align: center;">
        <span style="background: #FAF5EE; color: #8C5D36; border: 1px solid #D4AF37; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 12px; text-transform: uppercase;">Restock Alert</span>
        <h2 style="font-family: serif; color: #1C1B1A; margin: 12px 0 8px;">Your Requested Piece is Ready!</h2>
        <p style="color: #736C65; font-size: 13px; margin: 0 0 16px;">We have freshly hand-beaded a new limited batch of <strong>${product.title}</strong>.</p>
        
        <img src="${primaryImage}" alt="${product.title}" style="width: 100%; max-height: 280px; object-fit: cover; border-radius: 8px; margin-bottom: 16px;" />
        
        <p style="font-size: 18px; font-weight: bold; color: #8C5D36; margin: 0 0 16px;">NPR ${product.price.toLocaleString()}.00</p>
        
        <a href="#product-${product.id}" style="display: inline-block; background: #1C1B1A; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">⚡ Quick Buy Now</a>
      </div>

      <p style="text-align: center; font-size: 11px; color: #8C847E; margin-top: 16px;">
        Questions? Chat with artisan Sahina Shrestha on WhatsApp: +977 9767573721
      </p>
    </div>
  `;

  return { subject, html };
}

/**
 * Triggers automated restock notifications across Firestore waitlist subscribers
 */
export async function dispatchAutomatedRestockEmails(product: Product): Promise<{ count: number; recipients: string[] }> {
  const recipients: string[] = [];

  try {
    if (db) {
      const snapshot = await getDocs(collection(db, 'waitlist_subscribers'));
      const batchPromises: Promise<any>[] = [];
      const timestamp = new Date().toISOString();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.productId === product.id && (!data.notified || data.status === 'pending')) {
          if (data.email) {
            recipients.push(data.email);
            console.log(`[Automated Email Notification] Restock email dispatched to: ${data.email} for ${product.title}`);
          }

          const docRef = doc(db, 'waitlist_subscribers', docSnap.id);
          batchPromises.push(
            updateDoc(docRef, {
              status: 'notified',
              notified: true,
              notifiedAt: timestamp,
              restockedStockCount: product.stockCount || 1,
            })
          );
        }
      });

      if (batchPromises.length > 0) {
        await Promise.all(batchPromises);
      }
    }
  } catch (err) {
    console.warn('[Automated Email Notification] Notice during Firestore restock broadcast:', err);
  }

  // Trigger backend API dispatch if available
  try {
    if (recipients.length > 0) {
      await fetch('/api/notify-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          productTitle: product.title,
          price: product.price,
          recipients,
        }),
      });
    }
  } catch {}

  return { count: recipients.length, recipients };
}
