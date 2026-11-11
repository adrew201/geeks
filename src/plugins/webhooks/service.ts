import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { WebhookHandler } from "./handlers.js";

/** A verified PayPal webhook event. Only the fields the route relies on are typed. */
export type PaypalEvent = {
  id: string;
  event_type: string;
  resource_type?: string;
  summary?: string;
  resource?: Record<string, unknown>;
};

export type Outcome = "PROCESSED" | "IGNORED" | "DUPLICATE";

// Handlers write through the same transaction; give PayPal calls inside them room.
const TX_TIMEOUT_MS = 15_000;

export function isPaypalEvent(value: unknown): value is PaypalEvent {
  const v = value as Partial<PaypalEvent> | null;
  return typeof v?.id === "string" && v.id.length > 0 && typeof v.event_type === "string";
}

/** Wraps a handler error so it isn't mistaken for a duplicate-event P2002 from the insert. */
class HandlerFailed extends Error {
  constructor(public readonly original: unknown) {
    super("Webhook handler failed");
  }
}

/**
 * Stores a verified event and runs its handler in one transaction.
 * A repeat event ID hits the unique index and returns DUPLICATE without running the handler.
 * If the handler throws, the event row rolls back with it and the original error is rethrown,
 * so PayPal's retry starts clean.
 */
export async function recordAndHandle(event: PaypalEvent, handler: WebhookHandler | undefined): Promise<Outcome> {
  const status = handler ? "PROCESSED" : "IGNORED";
  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.paypalWebhookEvent.create({
          data: {
            eventId: event.id,
            eventType: event.event_type,
            resourceType: event.resource_type ?? "unknown",
            summary: event.summary ?? null,
            rawPayload: event as unknown as Prisma.InputJsonValue,
            status,
            signatureValid: true,
          },
        });
        if (!handler) return;
        try {
          await handler(tx, event);
        } catch (e) {
          throw new HandlerFailed(e);
        }
      },
      { timeout: TX_TIMEOUT_MS },
    );
    return status;
  } catch (e) {
    if (e instanceof HandlerFailed) throw e.original;
    if ((e as { code?: string }).code === "P2002") return "DUPLICATE";
    throw e;
  }
}
