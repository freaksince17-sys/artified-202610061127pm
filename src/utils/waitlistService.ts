import { 
  collection, 
  doc, 
  getDocs 
} from 'firebase/firestore';
import {
  safeAddDoc as addDoc,
  safeSetDoc as setDoc,
  safeUpdateDoc as updateDoc,
  safeOnSnapshot as onSnapshot
} from './safeFirestore';
import { db } from '../firebase';

export interface WaitlistEntry {
  id?: string;
  productId: string;
  productTitle: string;
  email: string;
  phone?: string;
  requestedAt: string;
  status: 'pending' | 'notified';
  notified: boolean;
  notifiedAt?: string;
  restockedStockCount?: number;
}

export interface RestockAlertItem {
  id: string;
  productId: string;
  productTitle: string;
  restockedStockCount: number;
  timestamp: string;
  read?: boolean;
}

const LOCAL_WAITLIST_KEY = 'artified_restock_waitlists';
const LOCAL_RESTOCK_ALERTS_KEY = 'artified_customer_restock_alerts';

/**
 * Checks if the user is already on the local waitlist for this product
 */
export function getLocalWaitlistedProductIds(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_WAITLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Subscribes a user email (and optional WhatsApp phone) to the restock waitlist
 * Saved both in Firestore and LocalStorage
 */
export async function subscribeToRestockWaitlist(
  productId: string,
  productTitle: string,
  email: string,
  phone?: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Please provide a valid email address.' };
  }

  const requestedAt = new Date().toISOString();
  const entry: WaitlistEntry = {
    productId,
    productTitle,
    email: cleanEmail,
    phone: phone?.trim() || undefined,
    requestedAt,
    status: 'pending',
    notified: false
  };

  try {
    // 1. Save to Firestore
    if (db) {
      const docRef = await addDoc(collection(db, 'waitlist_subscribers'), entry);
      entry.id = docRef.id;
    }
  } catch (err) {
    console.warn('Firestore write notice (saved locally as fallback):', err);
  }

  // 2. Save locally so UI is immediately responsive and persistent
  try {
    const existing = getLocalWaitlistedProductIds();
    if (!existing.includes(productId)) {
      localStorage.setItem(LOCAL_WAITLIST_KEY, JSON.stringify([...existing, productId]));
    }
  } catch {}

  // 3. Dispatch event to update local badge counters
  window.dispatchEvent(new CustomEvent('artified_waitlist_updated', { detail: { productId } }));

  return { 
    success: true, 
    message: `You're on the list! We will email ${cleanEmail} as soon as this item is restocked.` 
  };
}

export function isProductWaitlisted(productId: string): boolean {
  return getLocalWaitlistedProductIds().includes(productId);
}

/**
 * Automatically triggers notifications once an item is marked as restocked by the seller.
 * Updates all matching pending requests in Firestore and alerts customer sessions.
 */
export async function triggerRestockNotifications(
  productId: string,
  productTitle: string,
  newStockCount: number
): Promise<{ notifiedCount: number; emails: string[] }> {
  const notifiedEmails: string[] = [];
  let notifiedCount = 0;

  try {
    if (db) {
      const snapshot = await getDocs(collection(db, 'waitlist_subscribers'));
      const updatePromises: Promise<any>[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as WaitlistEntry;
        if (data.productId === productId && (!data.notified || data.status === 'pending')) {
          notifiedCount++;
          if (data.email) notifiedEmails.push(data.email);

          const docRef = doc(db, 'waitlist_subscribers', docSnap.id);
          updatePromises.push(
            updateDoc(docRef, {
              status: 'notified',
              notified: true,
              notifiedAt: new Date().toISOString(),
              restockedStockCount: newStockCount
            })
          );
        }
      });

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }
    }
  } catch (err) {
    console.warn('Notice: Firestore restock notification update:', err);
  }

  // Record customer alert in local storage so customer sees celebratory in-app restock notification
  try {
    const alertId = `restock_${productId}_${Date.now()}`;
    const newAlert: RestockAlertItem = {
      id: alertId,
      productId,
      productTitle,
      restockedStockCount: newStockCount,
      timestamp: new Date().toISOString(),
      read: false
    };

    const existingAlerts = getCustomerRestockAlerts();
    const updatedAlerts = [newAlert, ...existingAlerts.filter((a) => a.productId !== productId)].slice(0, 10);
    localStorage.setItem(LOCAL_RESTOCK_ALERTS_KEY, JSON.stringify(updatedAlerts));
  } catch {}

  // Remove from user's local pending waitlist if they requested it
  try {
    const existing = getLocalWaitlistedProductIds();
    const filtered = existing.filter((id) => id !== productId);
    localStorage.setItem(LOCAL_WAITLIST_KEY, JSON.stringify(filtered));
  } catch {}

  // Trigger backend email broadcast if subscribers were found
  if (notifiedEmails.length > 0) {
    try {
      fetch('/api/notify-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          productTitle,
          recipients: notifiedEmails,
        }),
      }).catch(() => {});
    } catch {}
  }

  // Dispatch real-time global event
  window.dispatchEvent(
    new CustomEvent('artified_restock_triggered', {
      detail: {
        productId,
        productTitle,
        notifiedCount,
        emails: notifiedEmails,
        stockCount: newStockCount
      }
    })
  );

  return { notifiedCount, emails: notifiedEmails };
}

/**
 * Returns stored in-app restock alerts for the customer
 */
export function getCustomerRestockAlerts(): RestockAlertItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_RESTOCK_ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Dismisses an in-app restock alert
 */
export function dismissCustomerRestockAlert(alertId: string): void {
  try {
    const existing = getCustomerRestockAlerts();
    const next = existing.filter((a) => a.id !== alertId);
    localStorage.setItem(LOCAL_RESTOCK_ALERTS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('artified_restock_alerts_updated'));
  } catch {}
}

/**
 * Subscribes in real-time to waitlist subscriber counts per product from Firestore
 */
export function subscribeToWaitlistCounts(
  onCounts: (countsByProduct: Record<string, number>) => void
): () => void {
  if (!db) {
    onCounts({});
    return () => {};
  }

  const unsubscribe = onSnapshot(
    collection(db, 'waitlist_subscribers'),
    (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data() as WaitlistEntry;
        if (data.productId && (!data.notified || data.status === 'pending')) {
          counts[data.productId] = (counts[data.productId] || 0) + 1;
        }
      });
      onCounts(counts);
    },
    (err) => {
      console.warn('Notice: waitlist subscriber listener notice:', err);
    }
  );

  return unsubscribe;
}
