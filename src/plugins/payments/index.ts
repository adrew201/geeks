import type { FastifyPluginAsync } from "fastify";
import { createDonation, getDonationOrder } from "./donations.js";

const donationSchema = {
  body: {
    type: "object",
    required: ["gamerId", "amount"],
    additionalProperties: false,
    properties: {
      gamerId: { type: "string", format: "uuid" },
      // Integer cents; same limits as web/src/features/payments/donation-config.ts
      amount: { type: "integer", minimum: 100, maximum: 50_000 },
    },
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
    const { gamerId, amount } = req.body as { gamerId: string; amount: number };
    const order = await createDonation({ donorId: req.user.sub, gamerId, amountCents: amount });
    return reply.code(201).send(order);
  });

  // Polled by /pay/return. COMPLETED only after PayPal's capture, never because the payer came back.
  app.get("/orders/:id", { schema: orderSchema, preHandler: app.authenticate }, async (req) => {
    const { id } = req.params as { id: string };
    return getDonationOrder(id, req.user.sub);
  });
};

export default paymentsPlugin;
