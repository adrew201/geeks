// Age from a self-declared date of birth (collected at signup). A typed date proves nothing,
// so it only gates receiving donations; withdrawing still needs isVerifiedAdult.

/** Youngest age that can create an account. */
export const MIN_SIGNUP_AGE = 13;
/** Age at which a gamer may receive donations. */
export const ADULT_AGE = 18;

/** Whole years between `dob` and `now`, using calendar dates in UTC. */
export function ageOn(dob: Date, now: Date = new Date()): number {
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * True if the user may receive donations: verified adult, or a declared date of birth that
 * makes them 18 or older today.
 */
export function canReceiveDonations(user: { isVerifiedAdult: boolean; dateOfBirth: Date | null }, now = new Date()): boolean {
  if (user.isVerifiedAdult) return true;
  return user.dateOfBirth != null && ageOn(user.dateOfBirth, now) >= ADULT_AGE;
}
