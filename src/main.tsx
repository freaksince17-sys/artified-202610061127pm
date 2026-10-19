import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Purge old service workers and caches that held old workshop media
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister();
      }
    }).catch(() => {});
  }
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        if (name.includes('artified-firebase-storage-assets') || name.includes('artified-workshop') || name.includes('workshops')) {
          caches.delete(name);
        }
      }
    }).catch(() => {});
  }
  // Silence internal @firebase/firestore SDK connection timeout logs
  const origError = console.error;
  const origWarn = console.warn;
  const isFirestoreNetworkNotice = (args: any[]) => {
    return args.some((arg) => {
      const str = typeof arg === 'string' ? arg : arg && (arg as any).message ? (arg as any).message : String(arg);
      const lower = str.toLowerCase();
      return (
        lower.includes('could not reach cloud firestore backend') ||
        lower.includes('backend didn’t respond') ||
        lower.includes('backend didnt respond') ||
        lower.includes('offline mode')
      );
    });
  };

  console.error = (...args: any[]) => {
    if (isFirestoreNetworkNotice(args)) return;
    origError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    if (isFirestoreNetworkNotice(args)) return;
    origWarn.apply(console, args);
  };

  // Silence non-fatal Firestore network connection timeout notices
  window.addEventListener('unhandledrejection', (event) => {
    if (event && event.reason) {
      const msg = (event.reason.message || String(event.reason)).toLowerCase();
      if (
        msg.includes('could not reach cloud firestore backend') ||
        msg.includes('backend didn’t respond') ||
        msg.includes('backend didnt respond') ||
        msg.includes('offline mode') ||
        msg.includes('quota limit exceeded') ||
        msg.includes('resource-exhausted')
      ) {
        event.preventDefault(); // Prevent error bubbling
      }
    }
  });
}

// Universal cleanup for legacy storage keys and any occurrences of 'chikamugal' or unwanted 5th instagram item
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key);
        if (val && /chikamugal/i.test(val)) {
          const cleaned = val.replace(/chikamugal,?\s*kathmandu/gi, 'Kathmandu, Nepal')
                             .replace(/chikamugal/gi, 'Kathmandu, Nepal');
          localStorage.setItem(key, cleaned);
        }
      }
    }

    // Purge unwanted 5th item ig-1791099498584
    const savedIg = localStorage.getItem('artified_instagram_journal_items');
    if (savedIg) {
      const parsed = JSON.parse(savedIg);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((item: any) => item.id !== 'ig-1791099498584');
        if (filtered.length !== parsed.length) {
          localStorage.setItem('artified_instagram_journal_items', JSON.stringify(filtered));
        }
      }
    }
    const deletedIds = JSON.parse(localStorage.getItem('artified_instagram_deleted_ids') || '[]');
    if (!deletedIds.includes('ig-1791099498584')) {
      deletedIds.push('ig-1791099498584');
      localStorage.setItem('artified_instagram_deleted_ids', JSON.stringify(deletedIds));
    }

    // Purge legacy mock workshop groups and media cache
    [
      'artified_custom_workshop_groups_v8',
      'artified_custom_workshop_groups_v7',
      'artified_custom_workshop_groups_v6',
      'artified_custom_workshop_media_v8',
      'artified_custom_workshop_media_v7',
      'artified_custom_workshop_media_v6'
    ].forEach((k) => localStorage.removeItem(k));
  }
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
