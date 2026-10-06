/**
 * Recursively removes keys with `undefined` values from an object before sending to Firestore.
 * Firestore throws an error if any field in a document is explicitly `undefined`.
 */
export const sanitizeForFirestore = <T>(data: T): T => {
  if (data === undefined || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }

  return data;
};
