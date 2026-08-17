/**
 * Centralized Email Validation Utility
 */

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const EMAIL_ERROR_MESSAGES = {
  REQUIRED: "Email address is required.",
  INVALID: "Please enter a valid email address.",
  DOMAIN_RESTRICTED: "Please use your official @apollouniversity.edu.in email.",
} as const;

/**
 * Validates a required email address
 */
export function isValidEmail(email: unknown): boolean {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  if (!trimmed) return false;
  return EMAIL_REGEX.test(trimmed);
}

/**
 * Validates an optional email address.
 * Returns true if empty/undefined/null OR valid email format.
 */
export function isValidOptionalEmail(email: unknown): boolean {
  if (email === undefined || email === null) return true;
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed === "") return true;
  return EMAIL_REGEX.test(trimmed);
}
