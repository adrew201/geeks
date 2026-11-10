import { formatMoney, parseMoneyToCents } from "../../lib/format-money.ts";
import type { Cents } from "../../types/api.ts";

/** Validates a typed dollar amount against the bounds. Returns cents or an error message. */
export function checkAmount(input: string, min: Cents, max: Cents): { cents: Cents | null; error: string | null } {
  if (input.trim() === "") return { cents: null, error: null };
  const cents = parseMoneyToCents(input);
  if (cents === null) return { cents: null, error: "Enter an amount like 15 or 15.50." };
  if (cents < min) return { cents: null, error: `The minimum is ${formatMoney(min)}.` };
  if (cents > max) return { cents: null, error: `The maximum is ${formatMoney(max)}.` };
  return { cents, error: null };
}
