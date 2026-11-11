import type { FastifyPluginAsync } from "fastify";
import { verifyPaypalSignature } from "./verify.js";
import { isPaypalEvent, recordAndHandle } from "./service.js";
import { makeHandlers } from "./handlers.js";

// Mock events from PayPal's webhook simulator are signed with this literal webhook ID.
// Accepted outside production only, so the Render deploy rejects them.
const SIMULATOR_WEBHOOK_ID = "WEBHOOK_ID";

const fail = (code: string, message: string) => ({ error: { code, message } });

const webhooksPlugin: FastifyPluginAsync = async (app) => {
  // Defaults match .env.example
  const handlers = makeHandlers({
    donationFeeBps: Number(process.env.DONATION_FEE_BPS ?? 500),
    donationFeeBpsPaidGamer: Number(process.env.DONATION_FEE_BPS_PAID_GAMER ?? 250),
    bountyCommissionBps: Number(process.env.BOUNTY_COMMISSION_BPS ?? 1000),
  });

  // The signature covers the body exactly as PayPal sent it, so keep the raw bytes.
  // Scoped to this plugin: other plugins keep the default JSON parser.
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => done(null, body));

  app.post("/webhooks/paypal", async (req, reply) => {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      req.log.error("PAYPAL_WEBHOOK_ID is not set: rejecting all PayPal webhooks");
      return reply.code(500).send(fail("WEBHOOK_NOT_CONFIGURED", "Webhook verification is not configured"));
    }
    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
      return reply.code(400).send(fail("INVALID_WEBHOOK", "Expected a JSON body"));
    }

    const webhookIds = process.env.NODE_ENV === "production" ? [webhookId] : [webhookId, SIMULATOR_WEBHOOK_ID];
    let verified: boolean;
    try {
      verified = await verifyPaypalSignature({ headers: req.headers, rawBody, webhookIds });
    } catch (err) {
      req.log.error({ err }, "PayPal webhook cert fetch failed");
      return reply.code(500).send(fail("WEBHOOK_VERIFY_ERROR", "Could not verify webhook"));
    }
    if (!verified) {
      // Not stored: unverified events must not claim an event ID before the real one arrives.
      req.log.warn({ transmissionId: req.headers["paypal-transmission-id"] }, "Rejected PayPal webhook: bad signature");
      return reply.code(400).send(fail("INVALID_SIGNATURE", "Webhook signature verification failed"));
    }

    let event: unknown;
    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return reply.code(400).send(fail("INVALID_WEBHOOK", "Body is not valid JSON"));
    }
    if (!isPaypalEvent(event)) {
      return reply.code(400).send(fail("INVALID_WEBHOOK", "Missing event id or event_type"));
    }

    const log = req.log.child({ eventId: event.id, eventType: event.event_type });
    try {
      const outcome = await recordAndHandle(event, handlers[event.event_type]);
      log.info({ outcome }, "PayPal webhook");
    } catch (err) {
      // The event row rolled back with the handler, so PayPal's retry runs it again.
      log.error({ err }, "PayPal webhook handler failed");
      return reply.code(500).send(fail("WEBHOOK_HANDLER_FAILED", "Handler failed"));
    }
    return reply.code(200).send({ received: true });
  });
};

export default webhooksPlugin;
