import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { createOrder, type Capture } from "./service.js";

// Donation flow (README 15.1). The fee is fixed when the donation is created; the wallet is
// credited only from a PayPal capture (capture response or verified webhook), never from the client.

const currency = () => process.env.PAYPAL_CURRENCY ?? "USD";
const webOrigin = () => process.env.WEB_ORIGIN ?? "http://localhost:5173";

function feeBps(recipientTier: "FREE" | "PAID"): number {
  return recipientTier === "PAID"
    ? Number(process.env.DONATION_FEE_BPS_PAID_GAMER ?? 250)
    : Number(process.env.DONATION_FEE_BPS ?? 500);
}

/** `gamerId` may be the recipient's GamerProfile id (what the web app sends) or their user id. */
export async function createDonation(input: { donorId: string; gamerId: string; amountCents: number }) {
  const recipient = await prisma.user.findFirst({
    where: { role: "GAMER", OR: [{ id: input.gamerId }, { profile: { id: input.gamerId } }] },
    select: { id: true, tier: true, isVerifiedAdult: true },
  });
  if (!recipient) throw new AppError(404, "GAMER_NOT_FOUND", "Gamer not found");
  if (recipient.id === input.donorId) throw new AppError(400, "CANNOT_DONATE_TO_SELF", "You can't donate to yourself");
  // README 18: receiving donations needs a verified adult. The check is on the recipient, not the donor.
  if (!recipient.isVerifiedAdult) {
    throw new AppError(403, "NOT_VERIFIED_ADULT", "This gamer can't receive donations yet");
  }

  // Round the fee down, in the gamer's favour.
  const feeCents = Math.floor((input.amountCents * feeBps(recipient.tier)) / 10_000);
  const donation = await prisma.donation.create({
    data: {
      donorId: input.donorId,
      recipientGamerId: recipient.id,
      amountCents: input.amountCents,
      feeCents,
      netCents: input.amountCents - feeCents,
      currency: currency(),
    },
  });

  let order: { orderId: string; approvalUrl: string };
  try {
    order = await createOrder({
      amountCents: input.amountCents,
      currency: donation.currency,
      customId: donation.id,
      requestId: `donation-${donation.id}`,
      returnUrl: `${webOrigin()}/pay/return`,
      cancelUrl: `${webOrigin()}/pay/return?cancelled=1`,
    });
  } catch (e) {
    await prisma.donation.update({ where: { id: donation.id }, data: { status: "FAILED" } });
    throw Object.assign(new AppError(502, "PAYPAL_UNAVAILABLE", "PayPal didn't respond, please try again"), { cause: e });
  }
  await prisma.donation.update({ where: { id: donation.id }, data: { paypalOrderId: order.orderId } });
  return order;
}

/**
 * Credits the gamer for a completed capture: +amount DONATION and -fee FEE (README 15.1),
 * both keyed by the capture ID. Safe to call twice: only the call that moves the donation
 * out of PENDING writes ledger rows.
 * Returns false if there is nothing to do (unknown donation, already done, capture not COMPLETED).
 */
export async function completeDonation(
  tx: Prisma.TransactionClient,
  donationId: string,
  capture: Capture,
  log: { error: (obj: object, msg: string) => void } = console,
): Promise<boolean> {
  if (capture.status !== "COMPLETED") return false; // e.g. PENDING: wait for PAYMENT.CAPTURE.COMPLETED
  const donation = await tx.donation.findUnique({ where: { id: donationId } });
  if (!donation || donation.status !== "PENDING") return false;

  if (capture.amountCents !== donation.amountCents || capture.currency !== donation.currency) {
    // Money moved but not what we asked for: don't credit, flag for a human.
    log.error({ donationId, capture }, "Donation capture amount mismatch");
    await tx.donation.updateMany({ where: { id: donationId, status: "PENDING" }, data: { status: "FAILED" } });
    return false;
  }

  const claimed = await tx.donation.updateMany({
    where: { id: donationId, status: "PENDING" },
    data: { status: "COMPLETED", paypalCaptureId: capture.captureId, completedAt: new Date() },
  });
  if (claimed.count !== 1) return false;

  const base = { userId: donation.recipientGamerId, currency: donation.currency, paypalRef: capture.captureId, donationId };
  await tx.walletEntry.create({ data: { ...base, kind: "DONATION", amountCents: donation.amountCents } });
  if (donation.feeCents > 0) {
    await tx.walletEntry.create({ data: { ...base, kind: "FEE", amountCents: -donation.feeCents } });
  }
  return true;
}

export async function failDonation(tx: Prisma.TransactionClient, donationId: string): Promise<void> {
  await tx.donation.updateMany({ where: { id: donationId, status: "PENDING" }, data: { status: "FAILED" } });
}

/** Status for the /pay/return page. Only the donor or the recipient may read it. */
export async function getDonationOrder(orderId: string, userId: string) {
  const d = await prisma.donation.findUnique({
    where: { paypalOrderId: orderId },
    include: { recipient: { select: { profile: { select: { id: true, gamerTag: true } } } } },
  });
  if (!d || (d.donorId !== userId && d.recipientGamerId !== userId)) {
    throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
  }
  return {
    orderId,
    status: d.status, // PENDING | COMPLETED | FAILED
    amount: d.amountCents,
    purpose: "DONATION" as const,
    gamerId: d.recipient.profile?.id ?? d.recipientGamerId,
    gamerTag: d.recipient.profile?.gamerTag,
    createdAt: d.createdAt.toISOString(),
  };
}
