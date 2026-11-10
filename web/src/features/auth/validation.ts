// Client-side checks for the 02 forms. The API validates again; these only save a round trip.

/**
 * 02D's hint said "Must be at least 8 characters with 1 number." while its error said
 * "Password must be at least 8 characters." (docs/ui-audit.md §10). One rule, one message:
 * the hint and the error both show this text.
 */
export const PASSWORD_RULE = "Must be at least 8 characters with 1 number.";
const PASSWORD_MIN_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(value)) return "Enter a valid email address, like alex@example.com.";
  return null;
}

/** Signup only. Login just needs a non-empty password, so older accounts can still log in. */
export function validateNewPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH || !/\d/.test(password)) return PASSWORD_RULE;
  return null;
}

export function validateLoginPassword(password: string): string | null {
  return password ? null : "Enter your password.";
}

export const TERMS_REQUIRED = "Accept the Terms of Service and Privacy Policy to continue.";

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export function hasErrors<K extends string>(errors: FieldErrors<K>): boolean {
  return Object.values(errors).some(Boolean);
}
