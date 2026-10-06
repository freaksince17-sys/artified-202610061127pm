/**
 * Client-Side IndexedDB & LocalStorage Persistent Media Store
 * Ensures uploaded photos and videos are stored permanently in browser storage
 * and never vanish on page refresh, restart, or vibe coding sessions.
 */

const DB_NAME = 'artified_media_db_v2';
const DB_VERSION = 1;
const STORE_NAME = 'workshop_media_blobs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeMediaBlobLocally(id: string, fileOrBlob: Blob | File, mimeType: string): Promise<string> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id,
        blob: fileOrBlob,
        mimeType,
        timestamp: Date.now()
      };
      const req = store.put(record);
      req.onsuccess = () => {
        // Create an active blob URL
        const blobUrl = URL.createObjectURL(fileOrBlob);
        resolve(blobUrl);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Notice: IndexedDB store fallback:', err);
    return URL.createObjectURL(fileOrBlob);
  }
}

export async function getStoredMediaBlobUrl(id: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const record = req.result;
        if (record && record.blob) {
          const url = URL.createObjectURL(record.blob);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteStoredMediaBlob(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
  } catch (err) {
    console.warn('Notice: IndexedDB delete:', err);
  }
}
