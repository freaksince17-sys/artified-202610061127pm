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

  // CRITICAL: Video files (.mp4, .mov, .webm, .m4v) require stable URLs
  // for HTTP 206 Byte-Range streaming. Appending dynamic Date.now() resets
  // the video decoder on every React render and causes videos not to play!
  const isVideo = /\.(mp4|mov|webm|m4v)($|\?)/i.test(url);
  if (isVideo) {
    if (!updatedAt) {
      // Remove any previously appended v=Date.now() query param if present
      return url.replace(/([?&])v=\d+/, '').replace(/\?$/, '');
    }
    const version = typeof updatedAt === 'number' ? updatedAt : new Date(updatedAt).getTime();
    if (isNaN(version)) return url;
    if (url.includes('v=')) {
      return url.replace(/([?&])v=[^&]*/, `$1v=${version}`);
    }
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${version}`;
  }

  const version = updatedAt
    ? typeof updatedAt === 'number'
      ? updatedAt
      : new Date(updatedAt).getTime()
    : undefined;

  // For non-video files without updatedAt, return as is (do not spam Date.now() on each render)
  if (!version) {
    return url;
  }

  // If url already has v= parameter, replace it
  if (url.includes('v=')) {
    return url.replace(/([?&])v=[^&]*/, `$1v=${version}`);
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${version}`;
}

/**
 * Returns alternative URL candidates for a given video URL
 * (handles encoded spaces '%20' vs literal ' ' vs '_', and case variations .mp4 / .MP4)
 */
export function getVideoAlternativeUrls(url: string | undefined | null): string[] {
  if (!url || typeof url !== 'string') return [];
  const results: string[] = [url];
  
  // Clean query params for variation analysis
  const [base, query] = url.split('?');
  const qSuffix = query ? `?${query}` : '';

  try {
    const decoded = decodeURI(base);
    if (decoded !== base) results.push(`${decoded}${qSuffix}`);

    const encoded = encodeURI(decoded);
    if (encoded !== base) results.push(`${encoded}${qSuffix}`);

    // Space vs underscore
    if (decoded.includes(' ')) {
      const under = decoded.replace(/ /g, '_');
      results.push(`${under}${qSuffix}`);
      results.push(`${encodeURI(under)}${qSuffix}`);
    }
    if (decoded.includes('_')) {
      const space = decoded.replace(/_/g, ' ');
      results.push(`${space}${qSuffix}`);
      results.push(`${encodeURI(space)}${qSuffix}`);
    }

    // .mp4 vs .MP4
    if (base.endsWith('.mp4')) {
      results.push(`${base.slice(0, -4)}.MP4${qSuffix}`);
    } else if (base.endsWith('.MP4')) {
      results.push(`${base.slice(0, -4)}.mp4${qSuffix}`);
    }

    // Strip timestamp prefix if any (e.g. pearl_bag_05_1791734288063.mp4 -> pearl_bag_05.mp4)
    const stripped = base.replace(/_\d+(\.[a-zA-Z0-9]+)$/, '$1');
    if (stripped !== base) {
      results.push(`${stripped}${qSuffix}`);
      const strippedDecoded = decodeURI(stripped);
      if (strippedDecoded.includes('_')) {
        results.push(`${strippedDecoded.replace(/_/g, ' ')}${qSuffix}`);
        results.push(`${encodeURI(strippedDecoded.replace(/_/g, ' '))}${qSuffix}`);
      }
    }
  } catch {}

  return Array.from(new Set(results));
}
