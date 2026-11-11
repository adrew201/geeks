// Rabasa owns. One entry per PayPal event type, e.g. "BILLING.SUBSCRIPTION.ACTIVATED".
// Only verified, first-time (or previously FAILED) events reach these.
// Throw to make PayPal retry; event types with no entry are recorded as IGNORED.
import type { PaypalEvent } from "./service.js";

export type WebhookHandler = (event: PaypalEvent) => Promise<void>;

export const handlers: Partial<Record<string, WebhookHandler>> = {};
