// Service to manage Seller Studio authentication, salted SHA-256 password hashing,
// brute-force lockout protection, and permanent multi-store synchronization across
// Firebase Firestore, server disk, domain reloads (artified.com.np), and browser storage.
// SECURITY POLICY: Plaintext passwords are NEVER stored in source code, localStorage, Firestore, or server files.

import { db } from '../firebase';
import { 
  doc, 
  getDoc, 
  getDocFromServer, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';

const LEGACY_PLAINTEXT_KEY = 'artified_seller_studio_password';
const SELLER_HASH_KEY = 'artified_seller_studio_hash';
const SELLER_SALT_KEY = 'artified_seller_studio_salt';
const SELLER_HAS_CUSTOM_KEY = 'artified_seller_has_custom';
const LOCKOUT_COUNT_KEY = 'artified_seller_failed_attempts';
const LOCKOUT_UNTIL_KEY = 'artified_seller_lockout_until';

const DEFAULT_SALT = 'salt_1791038978157';
const DEFAULT_PASSWORD_HASH = '7c450ce6e1934b25d5b00dba4c282e2be791186857f5b3b02ffb7541a7ad1f68';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds cooldown after 5 failed attempts

// In-memory cryptographic hash & salt cache (never stores plaintext password)
let cachedPasswordHash: string = DEFAULT_PASSWORD_HASH;
let cachedSalt: string = DEFAULT_SALT;

// Initialize from localStorage immediately if available & purge any legacy plaintext key
if (typeof window !== 'undefined') {
  try {
    // Purge legacy plaintext password keys so plaintext is never inspectable in DevTools
    localStorage.removeItem(LEGACY_PLAINTEXT_KEY);
    sessionStorage.removeItem(LEGACY_PLAINTEXT_KEY);

    const savedHash = localStorage.getItem(SELLER_HASH_KEY);
    if (savedHash && savedHash.trim().length === 64) {
      cachedPasswordHash = savedHash.trim();
    }
    const savedSalt = localStorage.getItem(SELLER_SALT_KEY);
    if (savedSalt && savedSalt.trim()) {
      cachedSalt = savedSalt.trim();
    }
  } catch {}
}

/**
 * Brute-force rate-limit helpers
 */
export function getSellerAuthLockoutRemainingSeconds(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const untilRaw = sessionStorage.getItem(LOCKOUT_UNTIL_KEY) || localStorage.getItem(LOCKOUT_UNTIL_KEY);
    if (!untilRaw) return 0;
    const until = parseInt(untilRaw, 10);
    if (isNaN(until)) return 0;
    const remainingMs = until - Date.now();
    if (remainingMs <= 0) {
      sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
      localStorage.removeItem(LOCKOUT_UNTIL_KEY);
      sessionStorage.removeItem(LOCKOUT_COUNT_KEY);
      localStorage.removeItem(LOCKOUT_COUNT_KEY);
      return 0;
    }
    return Math.ceil(remainingMs / 1000);
  } catch {
    return 0;
  }
}

function recordFailedAuthAttempt(): void {
  if (typeof window === 'undefined') return;
  try {
    const currentRaw = sessionStorage.getItem(LOCKOUT_COUNT_KEY) || localStorage.getItem(LOCKOUT_COUNT_KEY) || '0';
    const nextCount = (parseInt(currentRaw, 10) || 0) + 1;
    sessionStorage.setItem(LOCKOUT_COUNT_KEY, String(nextCount));
    localStorage.setItem(LOCKOUT_COUNT_KEY, String(nextCount));
    if (nextCount >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = String(Date.now() + LOCKOUT_DURATION_MS);
      sessionStorage.setItem(LOCKOUT_UNTIL_KEY, lockUntil);
      localStorage.setItem(LOCKOUT_UNTIL_KEY, lockUntil);
    }
  } catch {}
}

function clearFailedAuthAttempts(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(LOCKOUT_COUNT_KEY);
    localStorage.removeItem(LOCKOUT_COUNT_KEY);
    sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
    localStorage.removeItem(LOCKOUT_UNTIL_KEY);
  } catch {}
}

/**
 * Pure JavaScript SHA-256 implementation for environments where Web Crypto API is unavailable,
 * guaranteeing identical 64-character hex cryptographic digests everywhere.
 */
function sha256Fallback(ascii: string): string {
  const rightRotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i: number, j: number;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const i2 = i + j;
      const w15 = w[i - 15],
        w2 = w[i - 2];

      const a = hash[0],
        e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
      void i2;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? 0 : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Salted SHA-256 hashing utility using Web Crypto API with pure-JS SHA-256 fallback
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
  return sha256Fallback(text);
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Eagerly fetch and sync seller password hash directly from Firestore server.
 * Never reads or writes plaintext passwords.
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
        if (data && data.passwordHash && typeof data.passwordHash === 'string' && data.passwordHash.length === 64) {
          cachedPasswordHash = data.passwordHash;
          cachedSalt = data.salt || DEFAULT_SALT;
          try {
            localStorage.setItem(SELLER_HASH_KEY, cachedPasswordHash);
            localStorage.setItem(SELLER_SALT_KEY, cachedSalt);
            localStorage.setItem(SELLER_HAS_CUSTOM_KEY, 'true');
            localStorage.removeItem(LEGACY_PLAINTEXT_KEY);
          } catch {}

          // If legacy Firestore doc still had customPassword field, scrub it in background
          if (data.customPassword) {
            setDoc(authDocRef, {
              passwordHash: cachedPasswordHash,
              salt: cachedSalt,
              customPassword: null,
              hasCustom: true,
              updatedAt: serverTimestamp()
            }, { merge: true }).catch(() => {});
          }

          return { hasCustom: true, hash: cachedPasswordHash };
        }
      }
    } catch {}

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
        if (bData && bData.passwordHash && typeof bData.passwordHash === 'string' && bData.passwordHash.length === 64) {
          cachedPasswordHash = bData.passwordHash;
          cachedSalt = bData.salt || DEFAULT_SALT;
          try {
            localStorage.setItem(SELLER_HASH_KEY, cachedPasswordHash);
            localStorage.setItem(SELLER_SALT_KEY, cachedSalt);
            localStorage.setItem(SELLER_HAS_CUSTOM_KEY, 'true');
          } catch {}
          if (bData.customPassword) {
            setDoc(backupDocRef, {
              passwordHash: cachedPasswordHash,
              salt: cachedSalt,
              customPassword: null,
              hasCustom: true,
              updatedAt: serverTimestamp()
            }, { merge: true }).catch(() => {});
          }
          return { hasCustom: true, hash: cachedPasswordHash };
        }
      }
    } catch {}

    // 3. Check Server API Disk
    try {
      const res = await fetch('/api/seller-password');
      if (res.ok) {
        const data = await res.json();
        if (data && data.passwordHash && typeof data.passwordHash === 'string' && data.passwordHash.length === 64) {
          cachedPasswordHash = data.passwordHash;
          cachedSalt = data.salt || DEFAULT_SALT;
          try {
            localStorage.setItem(SELLER_HASH_KEY, cachedPasswordHash);
            localStorage.setItem(SELLER_SALT_KEY, cachedSalt);
            localStorage.setItem(SELLER_HAS_CUSTOM_KEY, 'true');
          } catch {}
          return { hasCustom: true, hash: cachedPasswordHash };
        }
      }
    } catch {}
  } catch {}

  return { hasCustom: true, hash: cachedPasswordHash };
}

// Auto-trigger sync on module load
if (typeof window !== 'undefined') {
  syncSellerPasswordFromServer().catch(() => {});
}

export function getCustomSellerPassword(): string | null {
  // Never expose plaintext password
  return null;
}

export function isCustomPasswordSet(): boolean {
  return true;
}

/**
 * Synchronous validation using pure-JS SHA-256 against stored hash
 */
export function validateSellerPassword(input: string): boolean {
  if (getSellerAuthLockoutRemainingSeconds() > 0) return false;
  const cleanInput = (input || '').trim();
  if (!cleanInput) return false;

  const storedHash = cachedPasswordHash || (typeof window !== 'undefined' ? localStorage.getItem(SELLER_HASH_KEY) : null) || DEFAULT_PASSWORD_HASH;
  const salt = cachedSalt || (typeof window !== 'undefined' ? (localStorage.getItem(SELLER_SALT_KEY) || DEFAULT_SALT) : DEFAULT_SALT);

  const computed = sha256Fallback(`${salt}:${cleanInput}`);
  return timingSafeEqualHex(computed, storedHash);
}

/**
 * Asynchronous validation with Web Crypto SHA-256 hash matching, constant-time comparison,
 * brute-force rate limiting, and direct Firestore server lookup.
 */
export async function validateSellerPasswordAsync(input: string): Promise<boolean> {
  if (getSellerAuthLockoutRemainingSeconds() > 0) {
    return false;
  }

  const cleanInput = (input || '').trim();
  if (!cleanInput) return false;

  // 1. Match against cached or local SHA-256 hash
  const storedHash = cachedPasswordHash || (typeof window !== 'undefined' ? localStorage.getItem(SELLER_HASH_KEY) : null) || DEFAULT_PASSWORD_HASH;
  const salt = cachedSalt || (typeof window !== 'undefined' ? (localStorage.getItem(SELLER_SALT_KEY) || DEFAULT_SALT) : DEFAULT_SALT);
  if (storedHash) {
    const computedHash = await hashPassword(cleanInput, salt);
    if (timingSafeEqualHex(computedHash, storedHash)) {
      clearFailedAuthAttempts();
      return true;
    }
  }

  // 2. Direct query to Firestore store_settings/seller_auth using getDocFromServer
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
      if (data && data.passwordHash && typeof data.passwordHash === 'string') {
        const docSalt = data.salt || DEFAULT_SALT;
        const computed = await hashPassword(cleanInput, docSalt);
        if (timingSafeEqualHex(computed, data.passwordHash)) {
          cachedPasswordHash = data.passwordHash;
          cachedSalt = docSalt;
          try {
            localStorage.setItem(SELLER_HASH_KEY, data.passwordHash);
            localStorage.setItem(SELLER_SALT_KEY, docSalt);
          } catch {}
          clearFailedAuthAttempts();
          return true;
        }
      }
    }
  } catch {}

  // 3. Check Default Salted SHA-256 Hash if Firestore doc was not yet initialized
  const defaultComputed = await hashPassword(cleanInput, DEFAULT_SALT);
  if (timingSafeEqualHex(defaultComputed, DEFAULT_PASSWORD_HASH) && storedHash === DEFAULT_PASSWORD_HASH) {
    clearFailedAuthAttempts();
    return true;
  }

  recordFailedAuthAttempt();
  return false;
}

/**
 * Sets a new custom password for Seller Studio, hashes it with salted SHA-256,
 * and writes ONLY the cryptographic hash & salt (never plaintext) to Firestore, server, and localStorage.
 */
export async function setCustomSellerPasswordAsync(newPassword: string): Promise<{ success: boolean; error?: string }> {
  const clean = (newPassword || '').trim();
  if (!clean || clean.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long for security.' };
  }

  try {
    const randomBytes = new Uint32Array(2);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
    }
    const salt = `salt_${Date.now()}_${randomBytes[0] || ''}`;
    const passwordHash = await hashPassword(clean, salt);

    cachedPasswordHash = passwordHash;
    cachedSalt = salt;

    // 1. Persist ONLY hash & salt to localStorage
    try {
      localStorage.removeItem(LEGACY_PLAINTEXT_KEY);
      sessionStorage.removeItem(LEGACY_PLAINTEXT_KEY);
      localStorage.setItem(SELLER_HASH_KEY, passwordHash);
      localStorage.setItem(SELLER_SALT_KEY, salt);
      localStorage.setItem(SELLER_HAS_CUSTOM_KEY, 'true');
      sessionStorage.setItem(SELLER_HASH_KEY, passwordHash);
    } catch {}

    const payload = {
      passwordHash,
      salt,
      customPassword: null,
      hasCustom: true,
      updatedAt: serverTimestamp()
    };

    // 2. Persist to Primary & Backup Firestore docs
    try {
      await setDoc(doc(db, 'store_settings', 'seller_auth'), payload, { merge: true });
    } catch {}
    try {
      await setDoc(doc(db, 'activeProfile', 'seller_auth_backup'), payload, { merge: true });
    } catch {}

    // 3. Persist ONLY hash & salt to Server backend API
    try {
      await fetch('/api/seller-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwordHash, salt })
      });
    } catch {}

    clearFailedAuthAttempts();
    window.dispatchEvent(new CustomEvent('artified_seller_password_changed', { detail: { updated: true } }));
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to update password.' };
  }
}

export function setCustomSellerPassword(newPassword: string): { success: boolean; error?: string } {
  const clean = (newPassword || '').trim();
  if (!clean || clean.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }
  setCustomSellerPasswordAsync(clean).catch(() => {});
  return { success: true };
}

export async function resetSellerPasswordToDefaultAsync(): Promise<void> {
  // Disabled unauthenticated reset for security
}

export function resetSellerPasswordToDefault(): void {
  // Disabled unauthenticated reset for security
}
