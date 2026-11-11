import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { payout, PaypalError } from "./service.js";

// Wallet view and withdrawals (README 15.4). The balance is the sum of the user's WalletEntry rows;
// there is no stored balance. A withdrawal writes a negative WITHDRAWAL row first, then asks PayPal
// to pay out. A failed payout adds a REVERSAL row that puts the money back, at most once.

const currency = () => process.env.PAYPAL_CURRENCY ?? "USD";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function balanceOf(db: Prisma.TransactionClient | typeof prisma, userId: string): Promise<number> {
  const sum = await db.walletEntry.aggregate({ where: { userId }, _sum: { amountCents: true } });
  return sum._sum.amountCents ?? 0;
}

/** The signed-in user's own wallet. */
export async function getWallet(userId: string) {
  const [balanceCents, pending, entries] = await Promise.all([
    balanceOf(prisma, userId),
    prisma.walletEntry.aggregate({
      where: { userId, kind: "WITHDRAWAL", payoutStatus: "PENDING" },
      _sum: { amountCents: true },
    }),
    prisma.walletEntry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return {
    balanceCents,
    pendingWithdrawalCents: -(pending._sum.amountCents ?? 0),
    entries: entries.map((e) => ({
      id: e.id,
      kind: e.kind,
      amount: e.amountCents, // signed cents, the field name the web app's WalletEntry uses
      currency: e.currency,
      paypalRef: e.paypalRef,
      payoutStatus: e.payoutStatus,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

/**
 * Withdraws to the PayPal email stored on the user (never one sent in the request, so a stolen
 * login can't redirect money). The caller has already checked the user is a verified adult.
 */
export async function withdraw(userId: string, amountCents: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { paypalEmail: true } });
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "Log in to continue");
  if (!user.paypalEmail) {
    throw new AppError(400, "PAYPAL_EMAIL_REQUIRED", "Link a PayPal account before withdrawing");
  }

  // One withdrawal per user at a time: the advisory lock makes a double click wait, then see the
  // new balance. (A row lock would need raw SQL naming the users table.)
  const entry = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`withdraw:${userId}`}))`;
    const balance = await balanceOf(tx, userId);
    if (amountCents > balance) {
      throw new AppError(400, "INSUFFICIENT_FUNDS", "That's more than your wallet balance");
    }
    return tx.walletEntry.create({
      data: { userId, kind: "WITHDRAWAL", amountCents: -amountCents, currency: currency(), payoutStatus: "PENDING" },
    });
  });

  try {
    const result = await payout({
      receiverEmail: user.paypalEmail,
      amountCents,
      currency: entry.currency,
      senderBatchId: `withdrawal-${entry.id}`,
      senderItemId: entry.id,
      note: "Play2Pro wallet withdrawal",
    });
    await prisma.walletEntry.update({ where: { id: entry.id }, data: { payoutBatchId: result.payoutBatchId } });
    return { withdrawalId: entry.id, amount: amountCents, status: "PENDING" as const, payoutBatchId: result.payoutBatchId };
  } catch (e) {
    // Only a clear refusal from PayPal returns the money now. On a timeout or network error the
    // payout may still have gone through, so the entry stays PENDING and the payout webhook decides.
    if (e instanceof PaypalError && e.status >= 400 && e.status < 500) {
      await prisma.$transaction((tx) => reverseWithdrawal(tx, entry.id));
      throw Object.assign(new AppError(502, "PAYOUT_FAILED", "PayPal refused the payout. Your balance is unchanged."), { cause: e });
    }
    return { withdrawalId: entry.id, amount: amountCents, status: "PENDING" as const, payoutBatchId: null };
  }
}

/** Marks a withdrawal PAID (PAYMENT.PAYOUTS-ITEM.SUCCEEDED). */
export async function markWithdrawalPaid(tx: Prisma.TransactionClient, entryId: string, payoutItemId: string): Promise<void> {
  if (!UUID.test(entryId)) return;
  await tx.walletEntry.updateMany({
    where: { id: entryId, kind: "WITHDRAWAL", payoutStatus: "PENDING" },
    data: { payoutStatus: "PAID", payoutItemId },
  });
}

/**
 * Puts a failed or returned withdrawal back in the wallet: status FAILED plus a +amount REVERSAL.
 * Only the call that moves the entry out of PENDING or PAID writes the REVERSAL, so it happens once.
 */
export async function reverseWithdrawal(tx: Prisma.TransactionClient, entryId: string, payoutItemId?: string): Promise<boolean> {
  if (!UUID.test(entryId)) return false;
  const entry = await tx.walletEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.kind !== "WITHDRAWAL") return false;
  const claimed = await tx.walletEntry.updateMany({
    where: { id: entryId, payoutStatus: { in: ["PENDING", "PAID"] } },
    data: { payoutStatus: "FAILED", ...(payoutItemId ? { payoutItemId } : {}) },
  });
  if (claimed.count !== 1) return false;
  await tx.walletEntry.create({
    data: {
      userId: entry.userId,
      kind: "REVERSAL",
      amountCents: -entry.amountCents,
      currency: entry.currency,
      paypalRef: entry.id, // with the (paypalRef, kind) unique index, one REVERSAL per withdrawal
      note: "Withdrawal returned to wallet",
    },
  });
  return true;
}
