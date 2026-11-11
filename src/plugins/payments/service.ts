// Rabasa owns. The ONLY place that talks to PayPal: other plugins call these functions
// (Obonyo's bounties use authorizeOrder / completeAuthorization / captureOrder /
// voidAuthorization / payout). Money is integer cents everywhere; it becomes "12.50"
// only at the PayPal call. Sandbox only. Vault: "Payments Service (PayPal)".
import { AppError } from "../../lib/errors.js";
import {
  approvalUrlFrom,
  centsToAmount,
  createPaypalClient,
  PaypalError,
  type PaypalClient,
} from "./paypal-client.js";

type Cents = number;
type Link = { rel: string; href: string };
type Config = { currency: string; webOrigin: string };
type Deps = { getPaypalEmail: (userId: string) => Promise<string | null> };

type OrderResponse = { id: string; links?: Link[] };
type CaptureResponse = {
  purchase_units?: { payments?: { captures?: { id: string; amount: { value: string } }[] } }[];
};
type AuthorizeResponse = {
  purchase_units?: { payments?: { authorizations?: { id: string; expiration_time: string }[] } }[];
};

/** Builds the payment functions around a PayPal client (a fake one in tests). */
export function makePayments(client: PaypalClient, cfg: Config, deps: Deps) {
  const returnUrl = `${cfg.webOrigin}/pay/return`;

  async function createCheckoutOrder(
    intent: "CAPTURE" | "AUTHORIZE",
    customId: string,
    amountCents: Cents,
    requestId: string,
  ): Promise<{ orderId: string; approvalUrl: string }> {
    const order = await client.request<OrderResponse>("POST", "/v2/checkout/orders", {
      requestId,
      body: {
        intent,
        purchase_units: [
          { custom_id: customId, amount: { currency_code: cfg.currency, value: centsToAmount(amountCents) } },
        ],
        payment_source: {
          paypal: {
            experience_context: { return_url: returnUrl, cancel_url: `${returnUrl}?cancelled=1` },
          },
        },
      },
    });
    if (!order?.id) throw new PaypalError("PayPal did not return an order id");
    return { orderId: order.id, approvalUrl: approvalUrlFrom(order.links) };
  }

  return {
    // Donations (intent CAPTURE). The ledger is written by the webhook handler on capture.
    createOrder: (i: { amountCents: Cents; gamerId: string; requestId: string }) =>
      createCheckoutOrder("CAPTURE", `donation:${i.gamerId}`, i.amountCents, i.requestId),

    async captureDonationOrder(orderId: string): Promise<{ captureId: string; amountCents: Cents }> {
      const res = await client.request<CaptureResponse>("POST", `/v2/checkout/orders/${orderId}/capture`, {
        requestId: `donation-capture:${orderId}`,
      });
      const capture = res?.purchase_units?.[0]?.payments?.captures?.[0];
      if (!capture) throw new PaypalError("PayPal did not return a capture for this order");
      return { captureId: capture.id, amountCents: Math.round(Number(capture.amount.value) * 100) };
    },

    // Bounty escrow (intent AUTHORIZE). Called by Obonyo.
    authorizeOrder: (i: { amountCents: Cents; bountyId: string; requestId: string }) =>
      createCheckoutOrder("AUTHORIZE", `bounty:${i.bountyId}`, i.amountCents, i.requestId),

    async completeAuthorization(orderId: string): Promise<{ authorizationId: string; expiresAt: string }> {
      const res = await client.request<AuthorizeResponse>("POST", `/v2/checkout/orders/${orderId}/authorize`, {
        requestId: `bounty-authorize:${orderId}`,
      });
      const auth = res?.purchase_units?.[0]?.payments?.authorizations?.[0];
      if (!auth) throw new PaypalError("PayPal did not return an authorization for this order");
      return { authorizationId: auth.id, expiresAt: auth.expiration_time };
    },

    /** Captures an AUTHORIZATION (bounty payout to escrow). Donations use captureDonationOrder. */
    async captureOrder(
      authorizationId: string,
      opts: { requestId?: string; finalCapture?: boolean } = {},
    ): Promise<{ captureId: string }> {
      const res = await client.request<{ id: string }>(
        "POST",
        `/v2/payments/authorizations/${authorizationId}/capture`,
        {
          requestId: opts.requestId ?? `bounty-capture:${authorizationId}`,
          body: { final_capture: opts.finalCapture ?? true },
        },
      );
      if (!res?.id) throw new PaypalError("PayPal did not return a capture id");
      return { captureId: res.id };
    },

    async voidAuthorization(authorizationId: string): Promise<void> {
      try {
        await client.request("POST", `/v2/payments/authorizations/${authorizationId}/void`);
      } catch (e) {
        // Voiding twice is harmless. The issue name comes from PayPal's void tutorial sample;
        // confirm it in the sandbox (vault: Payments Service, "Done when").
        if (e instanceof PaypalError && e.issues.includes("AUTHORIZATION_VOIDED")) return;
        throw e;
      }
    },

    async payout(i: {
      userId: string;
      amountCents: Cents;
      walletEntryId: string;
    }): Promise<{ payoutBatchId: string; payoutItemId?: string }> {
      const receiver = await deps.getPaypalEmail(i.userId);
      if (!receiver) {
        throw new AppError(422, "VALIDATION_ERROR", "Add a PayPal email to your profile before withdrawing");
      }
      const res = await client.request<{ batch_header?: { payout_batch_id?: string } }>(
        "POST",
        "/v1/payments/payouts",
        {
          requestId: `payout:${i.walletEntryId}`,
          body: {
            // Reusing a sender_batch_id is rejected for 30 days, so a retry cannot pay twice.
            sender_batch_header: { sender_batch_id: i.walletEntryId },
            items: [
              {
                recipient_type: "EMAIL",
                receiver,
                amount: { currency: cfg.currency, value: centsToAmount(i.amountCents) },
                sender_item_id: i.walletEntryId,
              },
            ],
          },
        },
      );
      const payoutBatchId = res?.batch_header?.payout_batch_id;
      if (!payoutBatchId) throw new PaypalError("PayPal did not return a payout batch id");
      return { payoutBatchId };
    },
  };
}

// ---- Live wiring: built on first use, from the environment ----

let live: ReturnType<typeof makePayments> | undefined;
let liveClient: PaypalClient | undefined;

function setup() {
  if (!live || !liveClient) {
    const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new AppError(500, "INTERNAL", "PayPal credentials are not configured");
    }
    liveClient = createPaypalClient({
      clientId: PAYPAL_CLIENT_ID,
      clientSecret: PAYPAL_CLIENT_SECRET,
      apiBase: process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com",
    });
    live = makePayments(
      liveClient,
      {
        currency: process.env.PAYPAL_CURRENCY ?? "USD",
        webOrigin: (process.env.WEB_ORIGIN ?? "http://localhost:5173").split(",")[0].trim(),
      },
      {
        getPaypalEmail: async (userId) => {
          const { prisma } = await import("../../lib/prisma.js"); // loaded lazily: needs DATABASE_URL
          const user = await prisma.user.findUnique({ where: { id: userId } });
          return user?.paypalEmail ?? null;
        },
      },
    );
  }
  return { pay: live, client: liveClient };
}

export const getAccessToken = () => setup().client.getAccessToken();
export const createOrder = (...a: Parameters<ReturnType<typeof makePayments>["createOrder"]>) =>
  setup().pay.createOrder(...a);
export const captureDonationOrder = (orderId: string) => setup().pay.captureDonationOrder(orderId);
export const authorizeOrder = (...a: Parameters<ReturnType<typeof makePayments>["authorizeOrder"]>) =>
  setup().pay.authorizeOrder(...a);
export const completeAuthorization = (orderId: string) => setup().pay.completeAuthorization(orderId);
export const captureOrder = (...a: Parameters<ReturnType<typeof makePayments>["captureOrder"]>) =>
  setup().pay.captureOrder(...a);
export const voidAuthorization = (authorizationId: string) => setup().pay.voidAuthorization(authorizationId);
export const payout = (...a: Parameters<ReturnType<typeof makePayments>["payout"]>) => setup().pay.payout(...a);
