// Pure wallet rules (page 08 reworked per decision 3). No React, so they can be read and
// tested in one place. README §13: balance = SUM(amount) of the user's WalletEntry rows;
// a withdrawal is a negative WITHDRAWAL entry when requested; a failed payout writes a
// positive REVERSAL entry.

import type { Tone } from "../../components/ui/tone-styles.ts";
import { WALLET_ENTRY_KIND, type Cents, type WalletEntry, type WalletEntryKind } from "../../types/api.ts";

export interface KindMeta {
  label: string;
  tone: Tone;
  /** One line for the transaction detail modal. */
  description: string;
}

export const WALLET_KIND_META: Record<WalletEntryKind, KindMeta> = {
  DONATION: { label: "Donation", tone: "blue", description: "A fan donated through PayPal push-to-pay." },
  BOUNTY: { label: "Bounty", tone: "violet", description: "Reward for a bounty you won, paid from the sponsor's held funds." },
  AD_SHARE: { label: "Ad share", tone: "blue", description: "Your share of ad revenue." },
  WITHDRAWAL: { label: "Withdrawal", tone: "slate", description: "Paid out to your PayPal account." },
  FEE: { label: "Fee", tone: "slate", description: "Play2Pro platform fee." },
  REVERSAL: { label: "Reversal", tone: "amber", description: "A payout failed, so the amount came back to your wallet." },
};

/** Kinds that count as earnings (the "where your earnings come from" breakdown). */
export const EARNING_KINDS: WalletEntryKind[] = [
  WALLET_ENTRY_KIND.DONATION,
  WALLET_ENTRY_KIND.BOUNTY,
  WALLET_ENTRY_KIND.AD_SHARE,
];

/** Unknown kinds from the API fall back to a neutral label instead of crashing. */
export function kindMeta(kind: string): KindMeta {
  return WALLET_KIND_META[kind as WalletEntryKind] ?? { label: kind, tone: "slate", description: "" };
}

/** "09 Nov 2026, 02:30 PM" (transaction details). */
export const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/* ------------------------------ periods ------------------------------ */

export const WALLET_PERIODS = [
  { value: "30d", label: "30 days", days: 30 },
  { value: "6m", label: "6 months", days: 183 },
  { value: "all", label: "All time", days: null },
] as const;

export type WalletPeriod = (typeof WALLET_PERIODS)[number]["value"];

export function entriesInPeriod(entries: WalletEntry[], period: WalletPeriod, now = Date.now()): WalletEntry[] {
  const days = WALLET_PERIODS.find((option) => option.value === period)?.days ?? null;
  if (days === null) return entries;
  const since = now - days * 86_400_000;
  return entries.filter((entry) => Date.parse(entry.createdAt) >= since);
}

/** Newest first, as the transactions table and the dashboard widget show them. */
export function newestFirst(entries: WalletEntry[]): WalletEntry[] {
  return [...entries].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/* ------------------------------ totals ------------------------------ */

export interface WalletTotals {
  /** Gross credits from donations, bounties and ad share. */
  earned: Cents;
  /** Withdrawals net of reversals (a failed payout cancels its withdrawal). */
  withdrawn: Cents;
  fees: Cents;
  count: number;
}

export function walletTotals(entries: WalletEntry[]): WalletTotals {
  let earned = 0;
  let withdrawn = 0;
  let fees = 0;
  for (const entry of entries) {
    if (EARNING_KINDS.includes(entry.kind)) earned += entry.amount;
    else if (entry.kind === WALLET_ENTRY_KIND.WITHDRAWAL || entry.kind === WALLET_ENTRY_KIND.REVERSAL) withdrawn -= entry.amount;
    else if (entry.kind === WALLET_ENTRY_KIND.FEE) fees -= entry.amount;
  }
  return { earned, withdrawn: Math.max(0, withdrawn), fees, count: entries.length };
}

export function sumBalance(entries: WalletEntry[]): Cents {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

/* ------------------------------ chart series ------------------------------ */

export interface BalancePoint {
  date: Date;
  /** Dollars, for the chart axis. */
  balance: number;
  label: string;
}

/**
 * Running balance after each entry, oldest first. Always computed over the full ledger so
 * the line is the real balance; `since` only trims which points are drawn.
 */
export function balanceSeries(entries: WalletEntry[], since: number | null): BalancePoint[] {
  const sorted = [...entries].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  let running = 0;
  const points: BalancePoint[] = [];
  for (const entry of sorted) {
    running += entry.amount;
    const time = Date.parse(entry.createdAt);
    if (since !== null && time < since) continue;
    points.push({ date: new Date(time), balance: running / 100, label: kindMeta(entry.kind).label });
  }
  return points;
}

export interface SourcePoint {
  source: string;
  /** Dollars. */
  amount: number;
}

/** Earnings per source, largest first; sources with nothing are left out. */
export function earningsBySource(entries: WalletEntry[]): SourcePoint[] {
  return EARNING_KINDS.map((kind) => ({
    source: WALLET_KIND_META[kind].label,
    amount: entries.filter((entry) => entry.kind === kind).reduce((sum, entry) => sum + entry.amount, 0) / 100,
  }))
    .filter((point) => point.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function periodStart(period: WalletPeriod, now = Date.now()): number | null {
  const days = WALLET_PERIODS.find((option) => option.value === period)?.days ?? null;
  return days === null ? null : now - days * 86_400_000;
}

/* ------------------------------ withdraw ------------------------------ */

/** Mock-only floor too; UNCONFIRMED minimum (README gives none). PayPal Payouts accepts $1. */
export const MIN_WITHDRAWAL: Cents = 100;

export function withdrawError(amount: Cents | null, balance: Cents): string | null {
  if (amount === null) return "Enter an amount like 25 or 25.50.";
  if (amount < MIN_WITHDRAWAL) return "The minimum withdrawal is $1.00.";
  if (amount > balance) return "That's more than your available balance.";
  return null;
}
