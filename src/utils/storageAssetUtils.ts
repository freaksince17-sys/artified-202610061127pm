/**
 * Storage Utility for Critical UI Assets & Firebase Storage
 * 
 * Provides robust cache-busting, version management, and fallback resolution
 * for Firebase Storage URLs, background images, and high-priority UI visual assets.
 * Guarantees that users always receive the latest non-corrupted version of images
 * across browser caches, CDN edges, and page reloads.
 */

// Global registry of asset version timestamps to prevent cache collisions
const ASSET_VERSION_REGISTRY = new Map<string, string>();

/**
 * Checks if a given URL originates from Firebase Storage
 */
export function isFirebaseStorageUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('storage.googleapis.com') ||
    url.includes('firebaseapp.com')
  );
}

/**
 * Generates a consistent, unique cache-busting version string
 */
export function generateAssetVersionId(prefix: string = 'v'): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${ts}_${rand}`;
}

/**
 * Appends or updates a cache-busting timestamp or version identifier
 * to any asset URL (especially Firebase Storage URLs) without corrupting
 * existing query parameters like `alt=media` or `token=...`.
 * 
 * @param url The raw image or storage asset URL
 * @param version Optional custom version tag, hash, or timestamp (defaults to current minute/timestamp)
 * @returns Clean, cache-busted asset URL
 */
export function getFreshAssetUrl(url?: string, version?: string | number): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Data URIs, inline SVGs, and blob URLs don't need cache busting
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  try {
    // Determine the version string to apply
    let vString: string;
    if (version !== undefined && version !== null && String(version).trim()) {
      vString = String(version).trim();
    } else if (ASSET_VERSION_REGISTRY.has(trimmed)) {
      vString = ASSET_VERSION_REGISTRY.get(trimmed)!;
    } else {
      // Default to hourly/session bucketed version or timestamp for non-cached URLs
      const now = new Date();
      vString = `${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}_${Math.floor(now.getTime() / 60000)}`;
      ASSET_VERSION_REGISTRY.set(trimmed, vString);
    }

    // Handle relative or absolute URLs safely
    const isAbsolute = trimmed.startsWith('http://') || trimmed.startsWith('https://');
    const base = isAbsolute ? trimmed : `https://artified.local${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
    const urlObj = new URL(base);

    // Set cache buster while preserving all other params (alt, token, etc.)
    urlObj.searchParams.set('v', vString);

    if (isAbsolute) {
      return urlObj.toString();
    } else {
      return `${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
    }
  } catch {
    // Fallback simple string concatenation
    const sep = trimmed.includes('?') ? '&' : '?';
    const v = version ? String(version) : String(Date.now());
    return `${trimmed}${sep}v=${encodeURIComponent(v)}`;
  }
}

/**
 * Dedicated utility for critical UI background images (hero banners, section backdrops, modal backgrounds).
 * Handles Firebase Storage assets, local public images, and provides high-fidelity fallbacks.
 * 
 * @param url The target background image URL
 * @param options Configuration for versioning and fallback
 */
export function getOptimizedBackgroundUrl(
  url?: string, 
  options: {
    version?: string;
    timestamp?: number | string;
    fallback?: string;
  } = {}
): string {
  const fallbackUrl = options.fallback || '/artisan_avatar.png';
  if (!url || typeof url !== 'string' || !url.trim()) {
    return getFreshAssetUrl(fallbackUrl, options.version || options.timestamp);
  }

  const clean = url.trim();

  // Avoid known broken placeholder services
  if (clean.includes('via.placeholder') || clean.includes('placehold.co')) {
    return getFreshAssetUrl(fallbackUrl, options.version || options.timestamp);
  }

  const ver = options.version || (options.timestamp ? String(options.timestamp) : undefined);
  return getFreshAssetUrl(clean, ver);
}

/**
 * Returns a fresh, version-controlled URL for the Artisan portrait
 * to ensure that live edits and photo uploads reflect immediately without browser caching.
 */
export function getFreshArtisanAvatarUrl(avatarUrl?: string, lastUpdated?: string): string {
  const base = avatarUrl && avatarUrl.trim() ? avatarUrl.trim() : '/artisan_avatar.png';
  if (base.startsWith('data:') || base.startsWith('blob:')) {
    return base;
  }
  const version = lastUpdated ? `ts_${new Date(lastUpdated).getTime()}` : `artisan_${Date.now()}`;
  return getFreshAssetUrl(base, version);
}

/**
 * Generates a cache-busted URL for Instagram reel thumbnails
 * by appending a unique timestamp or version identifier to prevent stale/default states.
 */
export function getCacheBustedThumbnailUrl(
  thumbnailUrl?: string,
  customIdentifier?: string | number
): string {
  if (!thumbnailUrl || typeof thumbnailUrl !== 'string' || !thumbnailUrl.trim()) {
    return getFreshAssetUrl('/instagram_videos/DdjhhazvaRr_cover.jpg', customIdentifier);
  }

  const trimmed = thumbnailUrl.trim();
  // Data URIs and Blob URLs don't need cache busting
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  const versionTag = customIdentifier 
    ? String(customIdentifier) 
    : `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  return getFreshAssetUrl(trimmed, versionTag);
}

/**
 * Registers an updated asset version to force cache refresh across the entire app
 */
export function registerAssetUpdate(assetKey: string, newVersion?: string): void {
  const ver = newVersion || generateAssetVersionId();
  ASSET_VERSION_REGISTRY.set(assetKey, ver);
}
