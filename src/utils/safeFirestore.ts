import { 
  setDoc as fsSetDoc, 
  updateDoc as fsUpdateDoc, 
  addDoc as fsAddDoc, 
  deleteDoc as fsDeleteDoc,
  onSnapshot as fsOnSnapshot,
  DocumentReference,
  CollectionReference,
  Query,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';

// Global flag to track if Firestore has run out of daily write quota
export let isFirestoreQuotaExceeded = false;

export function setFirestoreQuotaExceeded(val: boolean) {
  isFirestoreQuotaExceeded = val;
  try {
    (window as any).isFirestoreQuotaExceeded = val;
  } catch {}
}

// Automatically detect quota limit or oversized payload errors from exceptions
export function detectQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const isHardQuotaExceeded = 
    msg.includes('quota limit exceeded') || 
    msg.includes('quota exceeded') ||
    msg.includes('resource-exhausted') ||
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
      if (detectQuotaError(err)) {
        if (onError) onError(err);
      } else {
        if (onError) onError(err);
      }
    }
  );
}
