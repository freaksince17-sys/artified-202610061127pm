/**
 * Appends a cache-busting timestamp/version parameter to Firebase & workshop media URLs
 * ensuring browsers and service workers always fetch the latest content
 * when a seller updates or replaces workshop media.
 */
export function getCacheBustedUrl(
  url: string | undefined | null,
  updatedAt?: string | number
): string {
  if (!url || typeof url !== 'string') return '';
  
  // Do not append parameters to base64 data URLs or Blob URLs
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  const version = updatedAt
    ? typeof updatedAt === 'number'
      ? updatedAt
      : new Date(updatedAt).getTime()
    : Date.now();

  // If url already has v= parameter, replace it
  if (url.includes('v=')) {
    return url.replace(/([?&])v=[^&]*/, `$1v=${version}`);
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${version}`;
}
