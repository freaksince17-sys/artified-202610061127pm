import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  onAuthStateChanged, 
  onIdTokenChanged, 
  User 
} from 'firebase/auth';
import { auth } from '../firebase';
import { 
  syncSellerPasswordFromServer, 
  validateSellerPasswordAsync, 
  isCustomPasswordSet,
  getCustomSellerPassword,
  hashPassword
} from '../utils/sellerAuthService';

export interface AuthPersistenceState {
  user: User | null;
  isAuthReady: boolean;
  isAuthenticated: boolean;
  hasCustomSellerPassword: boolean;
  lastTokenRefresh: number | null;
  verifyPasswordHash: (inputPass: string) => Promise<boolean>;
  refreshAuthAndCredentials: () => Promise<void>;
}

/**
 * useAuthPersistence Hook
 * 
 * Monitors Firebase Auth authentication state and token refresh cycles.
 * Guarantees that token refresh cycles, network re-connections, and session renewals
 * do not reset Seller Studio custom password hashes or state to default values.
 */
export function useAuthPersistence(): AuthPersistenceState {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [hasCustomSellerPassword, setHasCustomSellerPassword] = useState<boolean>(() => isCustomPasswordSet());
  const [lastTokenRefresh, setLastTokenRefresh] = useState<number | null>(null);
  
  // Guard against concurrent execution during rapid token refresh cycles
  const isSyncingRef = useRef(false);

  const refreshAuthAndCredentials = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      // 1. Sync & verify Seller Studio password from Firestore server
      const { hasCustom } = await syncSellerPasswordFromServer();
      setHasCustomSellerPassword(hasCustom);
    } catch (err) {
      console.warn('Notice: useAuthPersistence sync notice:', err);
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // 1. Monitor primary Auth State change
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      // Re-verify credential integrity upon sign-in / state change
      refreshAuthAndCredentials();
    });

    // 2. Monitor Token Refresh cycles (Firebase Auth hourly refresh & token rotation)
    const unsubscribeToken = onIdTokenChanged(auth, async (refreshedUser) => {
      setUser(refreshedUser);
      setLastTokenRefresh(Date.now());
      // Crucial: Re-assert that custom password state and hashes remain preserved
      await refreshAuthAndCredentials();
    });

    // 3. Listen to local password change events
    const handlePasswordChange = () => {
      setHasCustomSellerPassword(isCustomPasswordSet());
    };
    window.addEventListener('artified_seller_password_changed', handlePasswordChange);

    // Initial mount sync
    refreshAuthAndCredentials();

    return () => {
      unsubscribeAuth();
      unsubscribeToken();
      window.removeEventListener('artified_seller_password_changed', handlePasswordChange);
    };
  }, [refreshAuthAndCredentials]);

  const verifyPasswordHash = useCallback(async (inputPass: string): Promise<boolean> => {
    return await validateSellerPasswordAsync(inputPass);
  }, []);

  return {
    user,
    isAuthReady,
    isAuthenticated: Boolean(user),
    hasCustomSellerPassword,
    lastTokenRefresh,
    verifyPasswordHash,
    refreshAuthAndCredentials
  };
}
