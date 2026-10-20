import { 
  setDoc as fsSetDoc, 
  updateDoc as fsUpdateDoc, 
  addDoc as fsAddDoc, 
  deleteDoc as fsDeleteDoc,
  getDoc as fsGetDoc,
  getDocs as fsGetDocs,
  onSnapshot as fsOnSnapshot,
  DocumentReference,
  CollectionReference,
  Query,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';

// Check persistent storage on startup so quota exceeded status survives page reloads
const TODAY_UTC_STRING = new Date().toISOString().slice(0, 10);
let initialQuotaExceeded = false;
try {
  if (typeof localStorage !== 'undefined') {
    const recordedDate = localStorage.getItem('artified_firestore_quota_exceeded_date');
    if (recordedDate === TODAY_UTC_STRING) {
      initialQuotaExceeded = true;
    } else if (recordedDate && recordedDate !== TODAY_UTC_STRING) {
      localStorage.removeItem('artified_firestore_quota_exceeded_date');
    }
  }
} catch {}

// Global flag to track if Firestore has run out of daily write/read quota
export let isFirestoreQuotaExceeded = initialQuotaExceeded;

export function setFirestoreQuotaExceeded(val: boolean) {
  isFirestoreQuotaExceeded = val;
  try {
    (window as any).isFirestoreQuotaExceeded = val;
    if (val && typeof localStorage !== 'undefined') {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem('artified_firestore_quota_exceeded_date', today);
    } else if (!val && typeof localStorage !== 'undefined') {
      localStorage.removeItem('artified_firestore_quota_exceeded_date');
    }
  } catch {}
}

// Automatically detect quota limit, resource exhaustion, or maximum backoff delay errors
export function detectQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const code = (err.code || err.Code || '').toLowerCase();
  const isHardQuotaExceeded = 
    code === 'resource-exhausted' ||
    msg.includes('quota limit exceeded') || 
    msg.includes('quota exceeded') ||
    msg.includes('resource-exhausted') ||
    msg.includes('free daily write units') ||
    msg.includes('free daily read units') ||
    msg.includes('maximum backoff delay') ||
    msg.includes('prevent overloading the backend') ||
    (msg.includes('quota') && msg.includes('exceeded'));

  if (isHardQuotaExceeded) {
    setFirestoreQuotaExceeded(true);
    return true;
  }
  return false;
}

/**
 * Recursively strips `undefined` properties from objects and arrays so Firestore writes never throw
 * "Unsupported field value: undefined" on optional fields or nested array items.
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined || value === null) return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (typeof value === 'object' && !(value instanceof Date) && typeof (value as any).toDate !== 'function' && !(value as any)._methodName) {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v !== undefined) {
        cleaned[k] = stripUndefinedDeep(v);
      }
    }
    return cleaned as T;
  }
  return value;
}

/**
 * Safe, quota-aware wrapper for Firestore setDoc
 */
export async function safeSetDoc(ref: any, data: any, options?: any): Promise<void> {
  if (isFirestoreQuotaExceeded) {
    return; // Silently bypass write to prevent console spam
  }
  const cleanData = stripUndefinedDeep(data);
  try {
    if (options) {
      await fsSetDoc(ref, cleanData, options);
    } else {
      await fsSetDoc(ref, cleanData);
    }
  } catch (err: any) {
    if (!detectQuotaError(err)) {
      throw err;
    }
  }
}

/**
 * Safe, quota-aware wrapper for Firestore updateDoc
 */
export async function safeUpdateDoc(ref: any, data: any): Promise<void> {
  if (isFirestoreQuotaExceeded) {
    return;
  }
  const cleanData = stripUndefinedDeep(data);
  try {
    await fsUpdateDoc(ref, cleanData);
  } catch (err: any) {
    if (!detectQuotaError(err)) {
      throw err;
    }
  }
}

/**
 * Safe, quota-aware wrapper for Firestore addDoc
 */
export async function safeAddDoc(ref: any, data: any): Promise<any> {
  if (isFirestoreQuotaExceeded) {
    return { id: `local-fallback-${Date.now()}` };
  }
  const cleanData = stripUndefinedDeep(data);
  try {
    return await fsAddDoc(ref, cleanData);
  } catch (err: any) {
    if (detectQuotaError(err)) {
      return { id: `local-fallback-${Date.now()}` };
    }
    throw err;
  }
}

/**
 * Safe, quota-aware wrapper for Firestore deleteDoc
 */
export async function safeDeleteDoc(ref: any): Promise<void> {
  if (isFirestoreQuotaExceeded) {
    return;
  }
  try {
    await fsDeleteDoc(ref);
  } catch (err: any) {
    if (!detectQuotaError(err)) {
      throw err;
    }
  }
}

/**
 * Detects benign gRPC stream cancellation timeouts (e.g. idle disconnects) that are automatically re-established by Firebase
 */
export function isBenignStreamCancellationError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const code = err.code || err.Code;
  return (
    code === 'cancelled' ||
    code === 1 ||
    msg.includes('cancelled') ||
    msg.includes('disconnecting idle stream') ||
    msg.includes('timed out waiting for new targets')
  );
}

/**
 * Safe, quota-aware wrapper for Firestore onSnapshot
 */
export function safeOnSnapshot(
  target: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): () => void {
  if (isFirestoreQuotaExceeded) {
    // If quota is already known to be exceeded, trigger the error callback immediately to switch to server cache
    if (onError) {
      setTimeout(() => onError(new Error('Quota limit exceeded (pre-emptive)')), 0);
    }
    return () => {};
  }

  return fsOnSnapshot(
    target,
    (snap: any) => {
      onNext(snap);
    },
    (err: any) => {
      if (isBenignStreamCancellationError(err)) {
        // Silently swallow benign stream disconnects since Firebase SDK auto-reconnects
        return;
      }
      if (detectQuotaError(err)) {
        if (onError) onError(err);
      } else {
        if (onError) onError(err);
      }
    }
  );
}

/**
 * Safe, quota-aware wrapper for Firestore writeBatch.commit()
 */
export async function safeCommitBatch(batch: any): Promise<boolean> {
  if (isFirestoreQuotaExceeded || !batch) {
    return false;
  }
  try {
    await batch.commit();
    return true;
  } catch (err: any) {
    detectQuotaError(err);
    return false;
  }
}

/**
 * Safe, quota-aware wrapper for Firestore getDoc
 */
export async function safeGetDoc(ref: any): Promise<any> {
  if (isFirestoreQuotaExceeded) {
    return { exists: () => false, data: () => null };
  }
  try {
    return await fsGetDoc(ref);
  } catch (err: any) {
    detectQuotaError(err);
    return { exists: () => false, data: () => null };
  }
}

/**
 * Safe, quota-aware wrapper for Firestore getDocs
 */
export async function safeGetDocs(queryOrRef: any): Promise<any> {
  if (isFirestoreQuotaExceeded) {
    return { empty: true, docs: [], forEach: () => {} };
  }
  try {
    return await fsGetDocs(queryOrRef);
  } catch (err: any) {
    detectQuotaError(err);
    return { empty: true, docs: [], forEach: () => {} };
  }
}
