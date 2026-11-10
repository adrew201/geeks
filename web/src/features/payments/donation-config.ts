import type { Cents } from "../../types/api.ts";

// Donation amounts in integer cents (decision 6, USD). README sets no limits; these are
// client-side guards only (assumed, confirm with Rabasa). The API must validate too.
export const DONATION_PRESETS: readonly Cents[] = [500, 1000, 2500, 5000];
export const DONATION_DEFAULT: Cents = 1000;
export const DONATION_MIN: Cents = 100;
export const DONATION_MAX: Cents = 50_000;
