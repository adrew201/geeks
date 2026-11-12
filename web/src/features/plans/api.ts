import { api } from "../../lib/api-client.ts";
import type { SubscriptionPlan, SubscriptionRequest, SubscriptionResponse } from "../../types/api.ts";
import type { PaymentApproval } from "../payments/api.ts";

// POST /api/v1/subscriptions (Rabasa): { plan } → { approvalUrl, subscriptionId }.
// The tier changes only when PayPal's verified BILLING.SUBSCRIPTION.ACTIVATED webhook arrives;
// /pay/return polls GET /orders/<subscriptionId> until then. Never log the approval URL.

/** Starts a subscription. The subscription id doubles as the order id for /pay/return. */
export async function startSubscription(plan: SubscriptionPlan, signal?: AbortSignal): Promise<PaymentApproval> {
  const body: SubscriptionRequest = { plan };
  const res = await api.post<SubscriptionResponse>("/api/v1/subscriptions", body, { signal });
  return { approvalUrl: res.approvalUrl, orderId: res.subscriptionId };
}
