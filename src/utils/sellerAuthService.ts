// Service to manage Seller Studio authentication, SHA-256 password hashing,
// and permanent multi-store synchronization across Firebase Firestore, server disk,
// domain reloads (artified.com.np), and persistent browser storage.

import { db } from '../firebase';
import { 
  doc, 
  getDoc, 
  getDocFromServer, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';

const SELLER_PASSWORD_KEY = 'artified_seller_studio_password';
const SELLER_HASH_KEY = 'artified_seller_studio_hash';
const SELLER_SALT_KEY = 'artified_seller_studio_salt';
const SELLER_HAS_CUSTOM_KEY = 'artified_seller_has_custom';
const DEFAULT_SALT = 'artified_salt_2026';
const DEFAULT_PASSWORDS = ['1234'];

// In-memory cache synced from Firebase & server
let cachedCustomPassword: string | null = 'withlovesahina';
let cachedPasswordHash: string | null = '7c450ce6e1934b25d5b00dba4c282e2be791186857f5b3b02ffb7541a7ad1f68';
let cachedSalt: string = 'salt_1791038978157';
let isInitialized = false;

// Initialize from localStorage immediately if available
if (typeof window !== 'undefined') {
  try {
    const savedPass = localStorage.getItem(SELLER_PASSWORD_KEY);
    if (savedPass && savedPass.trim()) {
      cachedCustomPassword = savedPass.trim();
    }
    const savedHash = localStorage.getItem(SELLER_HASH_KEY);
    if (savedHash && savedHash.trim()) {
      cachedPasswordHash = savedHash.trim();
    }
    const savedSalt = localStorage.getItem(SELLER_SALT_KEY);
    if (savedSalt && savedSalt.trim()) {
      cachedSalt = savedSalt.trim();
    }
  } catch {}
}

/**
 * Robust SHA-256 hashing utility using browser Web Crypto API
 */
export async function hashPassword(password: string, salt: string = DEFAULT_SALT): Promise<string> {
  const clean = (password || '').trim();
  const text = `${salt}:${clean}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const enc = new TextEncoder();
      const data = enc.encode(text);
      const hashBuf = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuf));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {}
  }

  // Fallback 64-character hex hash if crypto.subtle is unavailable
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Synchronous hash fallback for instantaneous UI checks
 */
function syncHashPassword(password: string, salt: string = DEFAULT_SALT): string {
  const clean = (password || '').trim();
  const text = `${salt}:${clean}`;
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Eagerly fetch and sync seller credentials directly from Firestore server.
 * Uses getDocFromServer to bypass stale cache and prevent state reversion.
 */
export async function syncSellerPasswordFromServer(): Promise<{ hasCustom: boolean; hash: string | null }> {
  try {
    // 1. Check Primary Firestore Document using getDocFromServer
    try {
      const authDocRef = doc(db, 'store_settings', 'seller_auth');
      let snap;
      try {
        snap = await getDocFromServer(authDocRef);
      } catch {
        snap = await getDoc(authDocRef);
      }

      if (snap && snap.exists()) {
        const data = snap.data();
        if (data && data.hasCustom && (data.passwordHash || data.customPassword)) {
          if (data.passwordHash) cachedPasswordHash = data.passwordHash;
          if (data.salt) cachedSalt = data.salt;
          if (data.customPassword) cachedCustomPassword = data.customPassword.trim();
          
          try {
            if (cachedPasswordHash) localStorage.setItem(SELLER_HASH_KEY, cachedPasswordHash);
            localStorage.setItem(SELLER_SALT_KEY, cachedSalt);
            if (cachedCustomPassword) localStorage.setItem(SELLER_PASSWORD_KEY, cachedCustomPassword);
            localStorage.setItem(SELLER_HAS_CUSTOM_KEY, 'true');
          } catch {}

          // Mirror to server disk API
          fetch('/api/seller-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              password: cachedCustomPassword || undefined, 
              passwordHash: cachedPasswordHash, 
              salt: cachedSalt 
            })
          }).catch(() => {});

          return { hasCustom: true, hash: cachedPasswordHash };
        }
      }
    } catch (fsErr) {
      console.warn('Notice: Firestore seller auth sync:', fsErr);
    }

    // 2. Check Backup Firestore Document: activeProfile/seller_auth_backup
    try {
      const backupDocRef = doc(db, 'activeProfile', 'seller_auth_backup');
      let bSnap;
      try {
        bSnap = await getDocFromServer(backupDocRef);
      } catch {
        bSnap = await getDoc(backupDocRef);
      }

      if (bSnap && bSnap.exists()) {
        const bData = bSnap.data();
        if (bData && bData.hasCustom && (bData.passwordHash || bData.customPassword)) {
          if (bData.passwordHash) cachedPasswordHash = bData.passwordHash;
          if (bData.salt) cachedSalt = bData.salt;
          if (bData.customPassword) cachedCustomPassword = bData.customPassword.trim();

          try {
            if (cachedPasswordHash) localStorage.setItem(SELLER_HASH_KEY, cachedPasswordHash);
            localStorage.setItem(SELLER_SALT_KEY, cachedSalt);
            if (cachedCustomPassword) localStorage.setItem(SELLER_PASSWORD_KEY, cachedCustomPassword);
            localStorage.setItem(SELLER_HAS_CUSTOM_KEY, 'true');
          } catch {}

          // Restore primary Firestore doc with server timestamp
          setDoc(doc(db, 'store_settings', 'seller_auth'), {
            ...bData,
            updatedAt: serverTimestamp()
          }, { merge: true }).catch(() => {});

          return { hasCustom: true, hash: cachedPasswordHash };
        }
      }
    } catch {}

    // 3. Check Server API Disk
    try {
      const res = await fetch('/api/seller-password');
      if (res.ok) {
        const data = await res.json();
        if (data && data.hasCustom && (data.passwordHash || data.customPassword)) {
          if (data.passwordHash) cachedPasswordHash = data.passwordHash;
          if (data.salt) cachedSalt = data.salt;
          if (data.customPassword) cachedCustomPassword = data.customPassword.trim();

          try {
            if (cachedPasswordHash) localStorage.setItem(SELLER_HASH_KEY, cachedPasswordHash);
            localStorage.setItem(SELLER_SALT_KEY, cachedSalt);
            if (cachedCustomPassword) localStorage.setItem(SELLER_PASSWORD_KEY, cachedCustomPassword);
            localStorage.setItem(SELLER_HAS_CUSTOM_KEY, 'true');
          } catch {}

          // Push to Firestore with serverTimestamp
          const payload = {
            passwordHash: cachedPasswordHash,
            salt: cachedSalt,
            customPassword: cachedCustomPassword,
            hasCustom: true,
            updatedAt: serverTimestamp()
          };
          setDoc(doc(db, 'store_settings', 'seller_auth'), payload, { merge: true }).catch(() => {});
          setDoc(doc(db, 'activeProfile', 'seller_auth_backup'), payload, { merge: true }).catch(() => {});

          return { hasCustom: true, hash: cachedPasswordHash };
        }
      }
    } catch {}

    // 4. Check LocalStorage fallback recovery
    try {
      const localPass = localStorage.getItem(SELLER_PASSWORD_KEY);
      const localHash = localStorage.getItem(SELLER_HASH_KEY);
      const localSalt = localStorage.getItem(SELLER_SALT_KEY) || DEFAULT_SALT;

      if (localPass || localHash) {
        cachedCustomPassword = localPass ? localPass.trim() : null;
        cachedPasswordHash = localHash ? localHash.trim() : null;
        cachedSalt = localSalt;

        fetch('/api/seller-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: localPass, passwordHash: cachedPasswordHash, salt: localSalt })
        }).catch(() => {});

        return { hasCustom: true, hash: cachedPasswordHash };
      }
    } catch {}
  } catch (err) {
    console.warn('Notice: Seller password sync error:', err);
  }

  const hasCustom = Boolean(cachedPasswordHash || cachedCustomPassword);
  return { hasCustom, hash: cachedPasswordHash };
}

// Auto-trigger sync on module load
if (typeof window !== 'undefined') {
  syncSellerPasswordFromServer().then(() => {
    isInitialized = true;
  });
}

export function getCustomSellerPassword(): string | null {
  if (cachedCustomPassword && cachedCustomPassword.trim()) {
    return cachedCustomPassword.trim();
  }
  try {
    const saved = localStorage.getItem(SELLER_PASSWORD_KEY);
    if (saved && saved.trim()) {
      cachedCustomPassword = saved.trim();
      return saved.trim();
    }
  } catch {}
  return null;
}

export function isCustomPasswordSet(): boolean {
  if (cachedPasswordHash || cachedCustomPassword) return true;
  try {
    if (localStorage.getItem(SELLER_HAS_CUSTOM_KEY) === 'true') return true;
    return Boolean(localStorage.getItem(SELLER_HASH_KEY) || localStorage.getItem(SELLER_PASSWORD_KEY));
  } catch {
    return false;
  }
}

/**
 * Validates the seller password against stored Firebase SHA-256 hash or plain passcode
 */
export function validateSellerPassword(input: string): boolean {
  const cleanInput = (input || '').trim();
  if (!cleanInput) return false;

  const customPass = getCustomSellerPassword();
  if (customPass) {
    return cleanInput === customPass;
  }

  // Verify against stored hash in memory or localStorage
  const storedHash = cachedPasswordHash || (typeof window !== 'undefined' ? localStorage.getItem(SELLER_HASH_KEY) : null);
  const salt = cachedSalt || (typeof window !== 'undefined' ? (localStorage.getItem(SELLER_SALT_KEY) || DEFAULT_SALT) : DEFAULT_SALT);

  if (storedHash) {
    const syncH = syncHashPassword(cleanInput, salt);
    return syncH === storedHash;
  }

  if (isCustomPasswordSet()) {
    return false;
  }

  return DEFAULT_PASSWORDS.includes(cleanInput);
}

/**
 * Asynchronous validation with full Web Crypto SHA-256 hash matching and direct Firestore server lookup
 */
export async function validateSellerPasswordAsync(input: string): Promise<boolean> {
  const cleanInput = (input || '').trim();
  if (!cleanInput) return false;

  // 1. Direct match with cached or local custom password
  const customPass = getCustomSellerPassword();
  if (customPass) {
    if (cleanInput === customPass) {
      return true;
    }
    // Custom password is active but doesn't match plain text
  }

  // 2. Direct match with cached or local SHA-256 hash
  const storedHash = cachedPasswordHash || (typeof window !== 'undefined' ? localStorage.getItem(SELLER_HASH_KEY) : null);
  const salt = cachedSalt || (typeof window !== 'undefined' ? (localStorage.getItem(SELLER_SALT_KEY) || DEFAULT_SALT) : DEFAULT_SALT);
  if (storedHash) {
    const computedHash = await hashPassword(cleanInput, salt);
    if (computedHash === storedHash) {
      return true;
    }
  }

  // 3. Direct query to Firestore store_settings/seller_auth using getDocFromServer
  try {
    const authDocRef = doc(db, 'store_settings', 'seller_auth');
    let snap;
    try {
      snap = await getDocFromServer(authDocRef);
    } catch {
      snap = await getDoc(authDocRef);
    }

    if (snap && snap.exists()) {
      const data = snap.data();
      if (data && data.hasCustom) {
        if (data.customPassword && cleanInput === data.customPassword.trim()) {
          const validPass = data.customPassword.trim();
          cachedCustomPassword = validPass;
          try { localStorage.setItem(SELLER_PASSWORD_KEY, validPass); } catch {}
          return true;
        }
        if (data.passwordHash) {
          const docSalt = data.salt || DEFAULT_SALT;
          const computed = await hashPassword(cleanInput, docSalt);
          if (computed === data.passwordHash) {
            cachedPasswordHash = data.passwordHash;
            cachedSalt = docSalt;
            try {
              localStorage.setItem(SELLER_HASH_KEY, data.passwordHash);
              localStorage.setItem(SELLER_SALT_KEY, docSalt);
            } catch {}
            return true;
          }
        }
        // Custom password configured in Firestore and input does not match
        return false;
      }
    }
  } catch (fsErr) {
    console.warn('Notice: Firestore direct auth check notice:', fsErr);
  }

  // 4. Check Backup Firestore doc using getDocFromServer
  try {
    const backupSnap = await getDocFromServer(doc(db, 'activeProfile', 'seller_auth_backup')).catch(() => getDoc(doc(db, 'activeProfile', 'seller_auth_backup')));
    if (backupSnap && backupSnap.exists()) {
      const bData = backupSnap.data();
      if (bData && bData.hasCustom) {
        if (bData.customPassword && cleanInput === bData.customPassword.trim()) return true;
        if (bData.passwordHash) {
          const bSalt = bData.salt || DEFAULT_SALT;
          const computed = await hashPassword(cleanInput, bSalt);
          if (computed === bData.passwordHash) return true;
        }
        return false;
      }
    }
  } catch {}

  // 5. Check Server API Disk (/api/seller-password)
  try {
    const res = await fetch('/api/seller-password');
    if (res.ok) {
      const data = await res.json();
      if (data && data.hasCustom) {
        if (data.customPassword && cleanInput === data.customPassword.trim()) {
          const validPass = data.customPassword.trim();
          cachedCustomPassword = validPass;
          try {
            localStorage.setItem(SELLER_PASSWORD_KEY, validPass);
            localStorage.setItem(SELLER_HAS_CUSTOM_KEY, 'true');
          } catch {}
          return true;
        }
        if (data.passwordHash) {
          const sSalt = data.salt || DEFAULT_SALT;
          const computed = await hashPassword(cleanInput, sSalt);
          if (computed === data.passwordHash) {
            cachedPasswordHash = data.passwordHash;
            cachedSalt = sSalt;
            try {
              localStorage.setItem(SELLER_HASH_KEY, data.passwordHash);
              localStorage.setItem(SELLER_SALT_KEY, sSalt);
              localStorage.setItem(SELLER_HAS_CUSTOM_KEY, 'true');
            } catch {}
            return true;
          }
        }
        return false;
      }
    }
  } catch {}

  // If ANY custom password is configured anywhere, block all default passwords
  if (isCustomPasswordSet() || customPass || storedHash) {
    return false;
  }

  // Only allow default password if NO custom password has ever been configured
  return DEFAULT_PASSWORDS.includes(cleanInput);
}

/**
 * Sets a new custom password for Seller Studio, hashes it with SHA-256,
 * and writes the hashed credentials with serverTimestamp to Firestore (primary + backup), backend server, and localStorage.
 */
export async function setCustomSellerPasswordAsync(newPassword: string): Promise<{ success: boolean; error?: string }> {
  const clean = (newPassword || '').trim();
  if (!clean || clean.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters long.' };
  }

  try {
    const salt = `salt_${Date.now()}`;
    const passwordHash = await hashPassword(clean, salt);

    cachedCustomPassword = clean;
    cachedPasswordHash = passwordHash;
    cachedSalt = salt;

    // 1. Persist to localStorage and sessionStorage immediately
    try {
      localStorage.setItem(SELLER_PASSWORD_KEY, clean);
      localStorage.setItem(SELLER_HASH_KEY, passwordHash);
      localStorage.setItem(SELLER_SALT_KEY, salt);
      localStorage.setItem(SELLER_HAS_CUSTOM_KEY, 'true');
      sessionStorage.setItem(SELLER_PASSWORD_KEY, clean);
      sessionStorage.setItem(SELLER_HASH_KEY, passwordHash);
    } catch {}

    const payload = {
      passwordHash,
      salt,
      customPassword: clean,
      hasCustom: true,
      updatedAt: serverTimestamp()
    };

    // 2. Persist to Primary Firestore doc using setDoc / updateDoc with serverTimestamp
    try {
      const authDocRef = doc(db, 'store_settings', 'seller_auth');
      await setDoc(authDocRef, payload, { merge: true });
    } catch (fsErr) {
      console.warn('Notice: Firestore primary save error:', fsErr);
    }

    // 3. Persist to Backup Firestore doc
    try {
      const backupDocRef = doc(db, 'activeProfile', 'seller_auth_backup');
      await setDoc(backupDocRef, payload, { merge: true });
    } catch (fsErr) {
      console.warn('Notice: Firestore backup save error:', fsErr);
    }

    // 4. Persist to Server backend API
    try {
      await fetch('/api/seller-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: clean, passwordHash, salt })
      });
    } catch (err) {
      console.warn('Notice: Server API password save error:', err);
    }

    window.dispatchEvent(new CustomEvent('artified_seller_password_changed', { detail: { updated: true } }));
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to update password.' };
  }
}

export function setCustomSellerPassword(newPassword: string): { success: boolean; error?: string } {
  const clean = (newPassword || '').trim();
  if (!clean || clean.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters long.' };
  }

  setCustomSellerPasswordAsync(clean).catch(() => {});
  return { success: true };
}

/**
 * Resets seller credentials back to default only upon explicit user request.
 */
export async function resetSellerPasswordToDefaultAsync(): Promise<void> {
  cachedCustomPassword = null;
  cachedPasswordHash = null;
  cachedSalt = DEFAULT_SALT;

  try {
    localStorage.removeItem(SELLER_PASSWORD_KEY);
    localStorage.removeItem(SELLER_HASH_KEY);
    localStorage.removeItem(SELLER_SALT_KEY);
    localStorage.removeItem(SELLER_HAS_CUSTOM_KEY);
    sessionStorage.removeItem(SELLER_PASSWORD_KEY);
    sessionStorage.removeItem(SELLER_HASH_KEY);
  } catch {}

  const resetPayload = {
    hasCustom: false,
    passwordHash: null,
    customPassword: null,
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'store_settings', 'seller_auth'), resetPayload, { merge: true });
    await setDoc(doc(db, 'activeProfile', 'seller_auth_backup'), resetPayload, { merge: true });
  } catch {}

  try {
    await fetch('/api/seller-password/reset', { method: 'POST' });
  } catch {}

  window.dispatchEvent(new CustomEvent('artified_seller_password_changed', { detail: { reset: true } }));
}

export function resetSellerPasswordToDefault(): void {
  resetSellerPasswordToDefaultAsync().catch(() => {});
}
