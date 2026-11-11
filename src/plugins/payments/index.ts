import type { FastifyPluginAsync } from "fastify";
import { captureDonation, createDonation, getDonationOrder } from "./donations.js";
import { getWallet, withdraw } from "./wallet.js";
import { requireVerifiedAdult } from "../../middleware/guards.js";

const withdrawSchema = {
  body: {
    type: "object",
    required: ["amount"],
    additionalProperties: false,
    // Integer cents, at least $1. The upper limit is the wallet balance, checked in withdraw().
    properties: { amount: { type: "integer", minimum: 100 } },
  },
} as const;

// Body per Rabasa's handoff: recipientId is the recipient's User id.
const donationSchema = {
  body: {
    type: "object",
    required: ["recipientId", "amountCents"],
    additionalProperties: false,
    properties: {
      recipientId: { type: "string", format: "uuid" },
      // Integer cents; same limits as web/src/features/payments/donation-config.ts
      amountCents: { type: "integer", minimum: 100, maximum: 50_000 },
      message: { type: "string", maxLength: 280 },
    },
  },
} as const;

const captureSchema = {
  body: {
    type: "object",
    required: ["orderId"],
    additionalProperties: false,
    properties: { orderId: { type: "string", pattern: "^[A-Za-z0-9-]{1,64}$" } },
  },
} as const;

const orderSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", pattern: "^[A-Za-z0-9-]{1,64}$" } },
  },
} as const;

const paymentsPlugin: FastifyPluginAsync = async (app) => {
  // Any signed-in user can donate; the recipient must be a verified adult (checked in createDonation).
  app.post("/donations", { schema: donationSchema, preHandler: app.authenticate }, async (req, reply) => {
    const { recipientId, amountCents, message } = req.body as { recipientId: string; amountCents: number; message?: string };
    const order = await createDonation({ donorId: req.user.sub, recipientId, amountCents, message });
    return reply.code(201).send(order);
  });

  // Called by /pay/return once the payer is back from PayPal (Rabasa's return route). Donor only.
  // Safe to call more than once; the CHECKOUT.ORDER.APPROVED webhook does the same as a backup.
  app.post("/donations/capture", { schema: captureSchema, preHandler: app.authenticate }, async (req) => {
    const { orderId } = req.body as { orderId: string };
    return captureDonation(orderId, req.user.sub);
  });

  // Polled by /pay/return. COMPLETED only after PayPal's capture, never because the payer came back.
  app.get("/orders/:id", { schema: orderSchema, preHandler: app.authenticate }, async (req) => {
    const { id } = req.params as { id: string };
    return getDonationOrder(id, req.user.sub);
  });

  // Own wallet only: there is no :userId, the user comes from the token.
  app.get("/wallet", { preHandler: app.authenticate }, async (req) => getWallet(req.user.sub));

  // README 18: withdrawing needs a verified adult. Money goes to the PayPal email stored on the user.
  app.post(
    "/wallet/withdraw",
    { schema: withdrawSchema, preHandler: [app.authenticate, requireVerifiedAdult()] },
    async (req, reply) => {
      const { amount } = req.body as { amount: number };
      return reply.code(201).send(await withdraw(req.user.sub, amount));
    },
  );
};

export default paymentsPlugin;
