// Clean embedded fallbacks registry
export const WORKSHOP_EMBEDDED_FALLBACKS: Record<string, string> = {};

export function getWorkshopEmbeddedFallback(urlOrPath?: string): string | null {
  if (!urlOrPath) return null;
  const cleanUrl = urlOrPath.trim();
  if (WORKSHOP_EMBEDDED_FALLBACKS[cleanUrl]) {
    return WORKSHOP_EMBEDDED_FALLBACKS[cleanUrl];
  }
  const filename = cleanUrl.replace(/^.*\//, "");
  if (WORKSHOP_EMBEDDED_FALLBACKS[filename]) {
    return WORKSHOP_EMBEDDED_FALLBACKS[filename];
  }
  return null;
}
