// Decision 6: money is USD in integer cents everywhere; this is the only formatter.

export const DEFAULT_CURRENCY = "USD";

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string): Intl.NumberFormat {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", { style: "currency", currency });
    formatters.set(currency, formatter);
  }
  return formatter;
}

/** formatMoney(1250) → "$12.50". Negative cents render with a minus sign (wallet debits). */
export function formatMoney(cents: number, currency: string = DEFAULT_CURRENCY): string {
  if (!Number.isInteger(cents)) {
    if (import.meta.env.DEV) console.warn(`formatMoney expects integer cents, got ${cents}`);
    cents = Math.round(cents);
  }
  return formatterFor(currency).format(cents / 100);
}

/** Parse a user-typed dollar amount ("12.5") into integer cents (1250). Returns null if invalid. */
export function parseMoneyToCents(input: string): number | null {
  const trimmed = input.trim().replace(/^\$/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}
