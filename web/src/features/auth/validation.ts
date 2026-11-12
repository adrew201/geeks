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

const DISPLAY_NAME_MAX = 60;

/** The API requires a display name of 1-60 characters. */
export function validateDisplayName(name: string): string | null {
  const value = name.trim();
  if (!value) return "Enter your name.";
  if (value.length > DISPLAY_NAME_MAX) return `Use ${DISPLAY_NAME_MAX} characters or fewer.`;
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

/** Same limits as the API (src/lib/age.ts): 13 to join, 18 to receive donations. */
export const MIN_SIGNUP_AGE = 13;
export const ADULT_AGE = 18;
export const DATE_OF_BIRTH_HINT = "Gamers must be 18 or older to receive donations.";

/** Whole years from a YYYY-MM-DD date of birth to today (UTC calendar dates). */
export function ageFrom(dateOfBirth: string, now = new Date()): number {
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  if (now.getUTCMonth() < dob.getUTCMonth() || (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/** Signup only. `value` is the YYYY-MM-DD string from <input type="date">. */
export function validateDateOfBirth(value: string): string | null {
  if (!value) return "Enter your date of birth.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) return "Enter a valid date of birth.";
  const age = ageFrom(value);
  if (age < 0 || age > 120) return "Enter a valid date of birth.";
  if (age < MIN_SIGNUP_AGE) return `You must be at least ${MIN_SIGNUP_AGE} to join Play2Pro.`;
  return null;
}

export const TERMS_REQUIRED = "Accept the Terms of Service and Privacy Policy to continue.";

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export function hasErrors<K extends string>(errors: FieldErrors<K>): boolean {
  return Object.values(errors).some(Boolean);
}
