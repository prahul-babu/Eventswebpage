/**
 * Centralized Firestore Data Sanitizer
 * Recursively cleanses data objects before writing to Firestore.
 * - Completely removes any `undefined` keys (preventing Firestore setDoc crashes)
 * - Trims string values
 * - Cleans nested objects and arrays
 * - Preserves Date objects, FieldValues (serverTimestamp, etc.), Booleans, and Numbers
 */

export function sanitizeFirestoreData<T = any>(data: T): T {
  if (data === undefined || data === null) {
    return data;
  }

  // Handle primitives
  if (typeof data !== "object") {
    if (typeof data === "string") {
      return (data as any).trim();
    }
    return data;
  }

  // Handle Date objects
  if (data instanceof Date) {
    return data;
  }

  // Handle Arrays
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestoreData(item)) as unknown as T;
  }

  // Handle generic Objects / Maps
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      if (value === null) {
        cleaned[key] = null;
      } else if (typeof value === "object" && !(value instanceof Date) && typeof (value as any).isEqual !== "function") {
        cleaned[key] = sanitizeFirestoreData(value);
      } else if (typeof value === "string") {
        cleaned[key] = value.trim();
      } else {
        cleaned[key] = value;
      }
    }
  }

  return cleaned as T;
}
