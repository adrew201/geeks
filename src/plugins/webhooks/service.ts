import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

/** A verified PayPal webhook event. Only the fields the route relies on are typed. */
export type PaypalEvent = {
  id: string;
  event_type: string;
  resource_type?: string;
  summary?: string;
  resource?: Record<string, unknown>;
};

export type EventStatus = "RECEIVED" | "PROCESSED" | "FAILED" | "IGNORED";

export function isPaypalEvent(value: unknown): value is PaypalEvent {
  const v = value as Partial<PaypalEvent> | null;
  return typeof v?.id === "string" && v.id.length > 0 && typeof v.event_type === "string";
}

/**
 * Records a verified event. Returns true if the caller should handle it now:
 * a new event, or one whose earlier attempt FAILED. Repeats of PROCESSED,
 * IGNORED or in-flight (RECEIVED) events return false.
 */
export async function claimEvent(event: PaypalEvent): Promise<boolean> {
  try {
    await prisma.paypalWebhookEvent.create({
      data: {
        eventId: event.id,
        eventType: event.event_type,
        resourceType: event.resource_type ?? "unknown",
        summary: event.summary ?? null,
        rawPayload: event as unknown as Prisma.InputJsonValue,
        status: "RECEIVED",
        signatureValid: true,
      },
    });
    return true;
  } catch (e) {
    if ((e as { code?: string }).code !== "P2002") throw e;
  }
  // Seen before. Flip FAILED -> RECEIVED in one statement so two concurrent retries can't both run.
  const { count } = await prisma.paypalWebhookEvent.updateMany({
    where: { eventId: event.id, status: "FAILED" },
    data: { status: "RECEIVED" },
  });
  return count === 1;
}

export async function markEvent(eventId: string, status: Exclude<EventStatus, "RECEIVED">): Promise<void> {
  await prisma.paypalWebhookEvent.update({ where: { eventId }, data: { status } });
}
