/**
 * Centralized Phone Validation Utility
 * Strictly enforces exactly 10 numeric digits.
 * No letters, spaces, +91, hyphens, or special characters.
 */

export const PHONE_REGEX = /^[0-9]{10}$/;

export const PHONE_ERROR_MESSAGES = {
  REQUIRED: "Mobile contact number is required.",
  INVALID: "Please enter a valid 10-digit phone number.",
  EMERGENCY_INVALID: "Emergency contact phone must be exactly 10 digits.",
} as const;

/**
 * Validates a required phone number (must be exactly 10 digits)
 */
export function isValidPhoneNumber(phone: unknown): boolean {
  if (typeof phone !== "string") return false;
  const trimmed = phone.trim();
  return PHONE_REGEX.test(trimmed);
}

/**
 * Validates an optional phone number.
 * Returns true if empty/undefined/null OR exactly 10 digits.
 * Returns false if entered but not 10 digits.
 */
export function isValidOptionalPhoneNumber(phone: unknown): boolean {
  if (phone === undefined || phone === null) return true;
  if (typeof phone !== "string") return false;
  const trimmed = phone.trim();
  if (trimmed === "") return true;
  return PHONE_REGEX.test(trimmed);
}

/**
 * Sanitizes phone input string by stripping surrounding whitespace
 */
export function sanitizePhoneNumber(phone: unknown): string {
  if (typeof phone !== "string") return "";
  return phone.trim();
}
