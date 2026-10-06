import { TrackedOrderData, OrderProductionPhase } from '../types';

export interface OrderNotification {
  id: string;
  orderId: string;
  customerName: string;
  previousPhase?: OrderProductionPhase;
  newPhase: OrderProductionPhase;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'shipped' | 'delivered' | 'info';
}

const NOTIFICATIONS_STORAGE_KEY = 'artified_order_notifications';
const LAST_KNOWN_PHASES_KEY = 'artified_order_last_phases';

/**
 * Retrieves all order status notifications from LocalStorage
 */
export function getStoredOrderNotifications(): OrderNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Error parsing order notifications from LocalStorage', e);
    return [];
  }
}

/**
 * Saves notifications list to LocalStorage
 */
export function saveOrderNotifications(notifications: OrderNotification[]) {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.warn('Error saving order notifications', e);
  }
}

/**
 * Checks for status change to 'out_for_delivery' (Shipped) or 'delivered' (Delivered)
 * and generates a browser notification in LocalStorage if a change occurred.
 */
export function recordOrderStatusChange(
  orderId: string,
  newPhase: OrderProductionPhase,
  customerName = 'Valued Customer'
): OrderNotification | null {
  const cleanId = orderId.startsWith('#') ? orderId : `#${orderId}`;
  
  // Read last known phase
  let lastPhasesMap: Record<string, OrderProductionPhase> = {};
  try {
    const rawPhases = localStorage.getItem(LAST_KNOWN_PHASES_KEY);
    if (rawPhases) {
      lastPhasesMap = JSON.parse(rawPhases);
    }
  } catch {
    lastPhasesMap = {};
  }

  const prevPhase = lastPhasesMap[cleanId];

  // Update known phase
  lastPhasesMap[cleanId] = newPhase;
  try {
    localStorage.setItem(LAST_KNOWN_PHASES_KEY, JSON.stringify(lastPhasesMap));
  } catch {}

  // If status is unchanged, don't generate duplicate notification
  if (prevPhase === newPhase) {
    return null;
  }

  let notification: OrderNotification | null = null;
  const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  if (newPhase === 'out_for_delivery') {
    notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      orderId: cleanId,
      customerName,
      previousPhase: prevPhase,
      newPhase,
      title: `📦 Order ${cleanId} has been Shipped!`,
      message: `Your handcrafted piece is now out for delivery in Kathmandu Valley with express courier rider.`,
      timestamp: `Today, ${nowStr}`,
      read: false,
      type: 'shipped'
    };
  } else if (newPhase === 'delivered') {
    notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      orderId: cleanId,
      customerName,
      previousPhase: prevPhase,
      newPhase,
      title: `🎉 Order ${cleanId} has been Delivered!`,
      message: `Delivered safely to your doorstep with 24-hr exchange guarantee & care guide. Enjoy your pearls!`,
      timestamp: `Today, ${nowStr}`,
      read: false,
      type: 'delivered'
    };
  }

  if (notification) {
    const existing = getStoredOrderNotifications();
    const updated = [notification, ...existing.filter((n) => n.id !== notification?.id)].slice(0, 30);
    saveOrderNotifications(updated);

    // Dispatch real-time custom event so toasts/modals can update instantly
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('artified_order_status_alert', {
          detail: notification
        })
      );
    }
  }

  return notification;
}

/**
 * Marks a specific notification or all notifications as read
 */
export function markNotificationsAsRead(orderId?: string) {
  const existing = getStoredOrderNotifications();
  const updated = existing.map((notif) => {
    if (!orderId || notif.orderId === orderId) {
      return { ...notif, read: true };
    }
    return notif;
  });
  saveOrderNotifications(updated);
}
