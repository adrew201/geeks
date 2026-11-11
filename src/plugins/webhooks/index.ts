import type { FastifyPluginAsync } from "fastify";
import { verifyPaypalSignature } from "./verify.js";
import { claimEvent, isPaypalEvent, markEvent } from "./service.js";
import { handlers } from "./handlers.js";

// Mock events from PayPal's webhook simulator are signed with this literal webhook ID.
// Accepted outside production only, so the Render deploy rejects them.
const SIMULATOR_WEBHOOK_ID = "WEBHOOK_ID";

const fail = (code: string, message: string) => ({ error: { code, message } });

const webhooksPlugin: FastifyPluginAsync = async (app) => {
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
    if (!(await claimEvent(event))) {
      log.info("Duplicate PayPal webhook, skipped");
      return reply.code(200).send({ received: true });
    }

    const handler = handlers[event.event_type];
    if (!handler) {
      await markEvent(event.id, "IGNORED");
      return reply.code(200).send({ received: true });
    }
    try {
      await handler(event);
    } catch (err) {
      log.error({ err }, "PayPal webhook handler failed");
      await markEvent(event.id, "FAILED");
      // Non-2xx makes PayPal retry; the retry re-runs the handler because the status is FAILED.
      return reply.code(500).send(fail("WEBHOOK_HANDLER_FAILED", "Handler failed"));
    }
    await markEvent(event.id, "PROCESSED");
    return reply.code(200).send({ received: true });
  });
};

export default webhooksPlugin;
