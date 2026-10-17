/**
 * Content Synchronization & Environment Policy
 * 
 * Enforces strict decoupling between development / AI Studio edits and the live production
 * website (www.artified.com.np).
 * 
 * Policy:
 * 1. CMS Content (Artisan profile, workshop details, product catalog, reels, craft stories,
 *    and Instagram journal) is strictly Repository-Driven / Git-Authoritative.
 * 2. Edits made in AI Studio or development are saved to the repository files (src/data/*.json,
 *    public/) via local server APIs and localStorage.
 * 3. Changes MUST NEVER sync automatically to www.artified.com.np via shared Firestore listeners.
 * 4. Changes ONLY become visible on www.artified.com.np when the user commits and pushes to GitHub.
 * 5. Visitor actions (orders, order tracking, waitlist signups, reviews) continue to use their
 *    respective transactional persistence services.
 */

export const isProductionSite = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host === 'artified.com.np' ||
    host === 'www.artified.com.np' ||
    host.endsWith('.artified.com.np')
  );
};

/**
 * Returns false. CMS content is git-based and repository-driven, never live-synced
 * via a shared Firestore across environments.
 */
export const shouldSyncContentWithFirestore = (): boolean => {
  return false;
};
