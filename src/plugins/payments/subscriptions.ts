import type { Prisma, Role } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { cancelSubscription, createSubscription } from "./service.js";

// Subscriptions (README 15.2). Rabasa owns. The tier changes only in the verified webhook handlers
// below, never in the request that starts the subscription or in the browser's return page.

export type PlanName = "PAID_GAMER" | "COACH";

const PLAN_ENV: Record<PlanName, string> = {
  PAID_GAMER: "PAYPAL_PLAN_ID_PAID_GAMER",
  COACH: "PAYPAL_PLAN_ID_COACH",
};

/** The one plan each account type may buy. Anyone else is refused. */
const PLAN_FOR_ROLE: Partial<Record<Role, PlanName>> = { GAMER: "PAID_GAMER", COACH: "COACH" };

const webOrigin = () => process.env.WEB_ORIGIN ?? "http://localhost:5173";

/** Starts a subscription and returns the PayPal approval link. */
export async function startSubscription(user: { id: string; role: Role }, plan: PlanName) {
  if (PLAN_FOR_ROLE[user.role] !== plan) {
    throw new AppError(403, "FORBIDDEN_ROLE", "Your account type can't buy this plan");
  }
  // One open subscription at a time. APPROVAL_PENDING counts too, as the vault says (409).
  const open = await prisma.subscription.findFirst({
    where: { userId: user.id, status: { in: ["ACTIVE", "APPROVAL_PENDING"] } },
    select: { id: true },
  });
  if (open) throw new AppError(409, "CONFLICT", "You already have a subscription in progress or active");

  const planId = process.env[PLAN_ENV[plan]];
  if (!planId) throw new AppError(503, "PLAN_NOT_CONFIGURED", `${PLAN_ENV[plan]} is not set`);

  const created = await createSubscription({
    planId,
    customId: user.id,
    requestId: `subscription-${randomUUID()}`,
    returnUrl: `${webOrigin()}/pay/return`,
    cancelUrl: `${webOrigin()}/pay/return?cancelled=1`,
  });
  // PayPal's id is needed for the row, so the row is written after the PayPal call.
  await prisma.subscription.create({
    data: { userId: user.id, plan, paypalSubscriptionId: created.subscriptionId, status: "APPROVAL_PENDING" },
  });
  return created;
}

/** Asks PayPal to cancel the caller's active subscription. The tier flips on the CANCELLED webhook. */
export async function requestCancel(userId: string): Promise<{ subscriptionId: string }> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { paypalSubscriptionId: true },
  });
  if (!sub) throw new AppError(404, "NOT_FOUND", "No active subscription to cancel");
  await cancelSubscription(sub.paypalSubscriptionId, "Cancelled by the user");
  return { subscriptionId: sub.paypalSubscriptionId };
}

type SubscriptionResource = {
  id?: string;
  billing_info?: { next_billing_time?: string; last_payment?: { time?: string } };
};

type SubscriptionEvent = { id: string; resource?: unknown };

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** BILLING.SUBSCRIPTION.ACTIVATED: the subscription is live, so the user becomes PAID. Replays are harmless. */
export async function onSubscriptionActivated(tx: Prisma.TransactionClient, event: SubscriptionEvent): Promise<void> {
  const r = (event.resource ?? {}) as SubscriptionResource;
  const sub = r.id ? await tx.subscription.findUnique({ where: { paypalSubscriptionId: r.id } }) : null;
  if (!sub) return warnUnknown(event);

  await tx.subscription.update({
    where: { id: sub.id },
    data: {
      status: "ACTIVE",
      currentPeriodStart: parseDate(r.billing_info?.last_payment?.time),
      currentPeriodEnd: parseDate(r.billing_info?.next_billing_time),
    },
  });
  await tx.user.update({ where: { id: sub.userId }, data: { tier: "PAID" } });
}

/**
 * CANCELLED, EXPIRED or SUSPENDED: record the new status, then drop the user to FREE unless
 * another subscription of theirs is still ACTIVE.
 */
export async function onSubscriptionEnded(
  tx: Prisma.TransactionClient,
  event: SubscriptionEvent,
  status: "CANCELLED" | "EXPIRED" | "SUSPENDED",
): Promise<void> {
  const r = (event.resource ?? {}) as SubscriptionResource;
  const sub = r.id ? await tx.subscription.findUnique({ where: { paypalSubscriptionId: r.id } }) : null;
  if (!sub) return warnUnknown(event);

  await tx.subscription.update({ where: { id: sub.id }, data: { status } });
  const stillActive = await tx.subscription.count({ where: { userId: sub.userId, status: "ACTIVE" } });
  if (stillActive === 0) await tx.user.update({ where: { id: sub.userId }, data: { tier: "FREE" } });
}

/** Ids only, never the resource (payer data). Returning normally lets PayPal stop retrying. */
function warnUnknown(event: SubscriptionEvent): void {
  console.warn(`[webhook] subscription event ${event.id}: unknown PayPal subscription, nothing changed`);
}
