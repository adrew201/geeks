// Rabasa owns. The only file that talks to PayPal; everything else calls these functions.
// Sandbox only: PAYPAL_API_BASE defaults to the sandbox host.


const apiBase = () => process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com";

/** A non-2xx answer from PayPal. `issue` is the first `details[].issue`, e.g. ORDER_ALREADY_CAPTURED. */
export class PaypalError extends Error {
  constructor(
    public readonly status: number,
    public readonly issue: string | undefined,
    public readonly debugId: string | undefined,
  ) {
    super(`PayPal ${status}${issue ? ` ${issue}` : ""}${debugId ? ` (debug_id ${debugId})` : ""}`);
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const { PAYPAL_CLIENT_ID: id, PAYPAL_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set");
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
  if (!res.ok || !json.access_token) throw new PaypalError(res.status, "AUTHENTICATION_FAILURE", undefined);
  // Refresh a minute early
  cachedToken = { value: json.access_token, expiresAt: Date.now() + ((json.expires_in ?? 300) - 60) * 1000 };
  return cachedToken.value;
}

async function paypal<T>(method: "GET" | "POST", path: string, body?: unknown, requestId?: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { details?: { issue?: string }[]; debug_id?: string };
  if (!res.ok) throw new PaypalError(res.status, json.details?.[0]?.issue, json.debug_id);
  return json;
}

const toValue = (cents: number) => (cents / 100).toFixed(2);
const toCents = (value: string) => Math.round(Number(value) * 100);

type OrderJson = {
  id: string;
  links?: { rel: string; href: string }[];
  purchase_units?: {
    payments?: { captures?: { id: string; status: string; amount: { value: string; currency_code: string } }[] };
  }[];
};

export type Capture = { captureId: string; status: string; amountCents: number; currency: string };

function firstCapture(order: OrderJson): Capture {
  const c = order.purchase_units?.[0]?.payments?.captures?.[0];
  if (!c) throw new Error(`PayPal order ${order.id} has no capture`);
  return { captureId: c.id, status: c.status, amountCents: toCents(c.amount.value), currency: c.amount.currency_code };
}

/**
 * Order for the payer to approve. CAPTURE (default) is a pay-now donation; AUTHORIZE is a bounty hold.
 * `customId` ties it to our record and `requestId` makes a retried create return the same order.
 */
export async function createOrder(input: {
  amountCents: number;
  currency: string;
  customId: string;
  requestId: string;
  returnUrl: string;
  cancelUrl: string;
  intent?: "CAPTURE" | "AUTHORIZE";
}): Promise<{ orderId: string; approvalUrl: string }> {
  const intent = input.intent ?? "CAPTURE";
  const order = await paypal<OrderJson>(
    "POST",
    "/v2/checkout/orders",
    {
      intent,
      purchase_units: [
        { custom_id: input.customId, amount: { currency_code: input.currency, value: toValue(input.amountCents) } },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Play2Pro",
            // PayPal's wording for "approve now, money moves later" is CONTINUE, not PAY_NOW.
            user_action: intent === "AUTHORIZE" ? "CONTINUE" : "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            return_url: input.returnUrl,
            cancel_url: input.cancelUrl,
          },
        },
      },
    },
    input.requestId,
  );
  const approvalUrl = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
  if (!approvalUrl) throw new Error(`PayPal order ${order.id} has no approval link`);
  return { orderId: order.id, approvalUrl };
}

/**
 * Captures an approved pay-now order. Already captured counts as success: the existing
 * capture is read back, so retries and duplicate webhooks are safe.
 */
export async function captureCheckoutOrder(orderId: string, requestId: string): Promise<Capture> {
  try {
    return firstCapture(await paypal<OrderJson>("POST", `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {}, requestId));
  } catch (e) {
    if (e instanceof PaypalError && e.issue === "ORDER_ALREADY_CAPTURED") {
      return firstCapture(await paypal<OrderJson>("GET", `/v2/checkout/orders/${encodeURIComponent(orderId)}`));
    }
    throw e;
  }
}

// Bounty escrow (Obonyo calls these). Flow and PayPal answers: docs/escrow-sandbox-test.md.
// The sponsor approves an AUTHORIZE order; completeAuthorization then places the hold.

/** Step 1: the sponsor's approval link for a bounty hold. */
export async function authorizeOrder(input: {
  amountCents: number;
  bountyId: string;
  requestId: string;
  currency?: string;
  returnUrl?: string;
  cancelUrl?: string;
}): Promise<{ orderId: string; approvalUrl: string }> {
  return createOrder({
    amountCents: input.amountCents,
    currency: input.currency ?? process.env.PAYPAL_CURRENCY ?? "USD",
    customId: `bounty:${input.bountyId}`,
    requestId: input.requestId,
    returnUrl: input.returnUrl ?? `${process.env.WEB_ORIGIN ?? "http://localhost:5173"}/pay/return`,
    cancelUrl: input.cancelUrl ?? `${process.env.WEB_ORIGIN ?? "http://localhost:5173"}/pay/return?cancelled=1`,
    intent: "AUTHORIZE",
  });
}

/** Step 2, after CHECKOUT.ORDER.APPROVED: places the hold and returns the authorization to store. */
export async function completeAuthorization(
  orderId: string,
  requestId: string,
): Promise<{ authorizationId: string; expiresAt: string }> {
  const order = await paypal<OrderJson & {
    purchase_units?: { payments?: { authorizations?: { id: string; expiration_time?: string }[] } }[];
  }>("POST", `/v2/checkout/orders/${encodeURIComponent(orderId)}/authorize`, {}, requestId);
  const auth = order.purchase_units?.[0]?.payments?.authorizations?.[0];
  if (!auth?.id || !auth.expiration_time) throw new Error(`PayPal order ${orderId} has no authorization`);
  return { authorizationId: auth.id, expiresAt: auth.expiration_time };
}

/**
 * Step 3: takes the held money (final capture). Sandbox answer 422 AUTHORIZATION_ALREADY_CAPTURED
 * means an earlier call already took it: returned as `alreadyCaptured` with no captureId, so the
 * caller must keep the captureId it stored the first time. Don't call again after a void.
 */
export async function captureOrder(
  authorizationId: string,
  opts: { requestId: string; finalCapture?: boolean },
): Promise<{ captureId: string | null; alreadyCaptured: boolean }> {
  try {
    const capture = await paypal<{ id: string }>(
      "POST",
      `/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/capture`,
      { final_capture: opts.finalCapture ?? true },
      opts.requestId,
    );
    return { captureId: capture.id, alreadyCaptured: false };
  } catch (e) {
    if (e instanceof PaypalError && e.issue === "AUTHORIZATION_ALREADY_CAPTURED") {
      return { captureId: null, alreadyCaptured: true };
    }
    throw e;
  }
}

/**
 * Releases the hold (no winner, or expired). Sandbox answer 422 PREVIOUSLY_VOIDED means it is
 * already released: success. Capturing a voided hold fails with AUTHORIZATION_VOIDED.
 */
export async function voidAuthorization(authorizationId: string): Promise<void> {
  try {
    await paypal<unknown>("POST", `/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/void`, {});
  } catch (e) {
    if (e instanceof PaypalError && e.issue === "PREVIOUSLY_VOIDED") return;
    throw e;
  }
}

/**
 * Sends money to a PayPal account by email (Payouts API). `senderBatchId` must be unique:
 * PayPal rejects a repeat, so a retried request can't pay twice. Tested in sandbox:
 * the batch goes PENDING, then SUCCESS within about 10 seconds.
 */
export async function payout(input: {
  receiverEmail: string;
  amountCents: number;
  currency: string;
  senderBatchId: string;
  senderItemId: string;
  note: string;
}): Promise<{ payoutBatchId: string; batchStatus: string }> {
  const res = await paypal<{ batch_header?: { payout_batch_id?: string; batch_status?: string } }>("POST", "/v1/payments/payouts", {
    sender_batch_header: { sender_batch_id: input.senderBatchId, email_subject: "Your Play2Pro withdrawal" },
    items: [
      {
        recipient_type: "EMAIL",
        receiver: input.receiverEmail,
        amount: { value: toValue(input.amountCents), currency: input.currency },
        sender_item_id: input.senderItemId,
        note: input.note,
      },
    ],
  });
  const batch = res.batch_header;
  if (!batch?.payout_batch_id) throw new Error("PayPal payout response has no batch id");
  return { payoutBatchId: batch.payout_batch_id, batchStatus: batch.batch_status ?? "PENDING" };
}

/**
 * Creates a PayPal subscription (Billing API) and returns the approval link for the payer.
 * `customId` is our user id, a backup for matching the subscription back to a user.
 */
export async function createSubscription(input: {
  planId: string;
  customId: string;
  requestId: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ subscriptionId: string; approvalUrl: string }> {
  const sub = await paypal<{ id: string; links?: { rel: string; href: string }[] }>(
    "POST",
    "/v1/billing/subscriptions",
    {
      plan_id: input.planId,
      custom_id: input.customId,
      application_context: {
        brand_name: "Play2Pro",
        user_action: "SUBSCRIBE_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    },
    input.requestId,
  );
  const approvalUrl = sub.links?.find((l) => l.rel === "approve")?.href;
  if (!approvalUrl) throw new Error(`PayPal subscription ${sub.id} has no approval link`);
  return { subscriptionId: sub.id, approvalUrl };
}

/** Asks PayPal to cancel. Our tier changes only when the CANCELLED webhook arrives. */
export async function cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
  await paypal<unknown>("POST", `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, { reason });
}
