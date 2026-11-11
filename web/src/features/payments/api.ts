import { api, ApiError } from "../../lib/api-client.ts";
import {
  API_ERROR_CODE,
  PAYMENT_ORDER_STATUS,
  type DonationRequest,
  type DonationResponse,
  type PaymentOrder,
} from "../../types/api.ts";

// Rabasa's API:
//   POST /api/v1/donations          any user    { recipientId, amountCents, message? } → { donationId, orderId, approvalUrl }
//   POST /api/v1/donations/capture  donor only  { orderId }, called once on /pay/return after PayPal
//   GET  /api/v1/orders/:id         UNCONFIRMED (see PaymentOrder in types/api.ts)
// Never log the approval URL or the response: the URL carries the PayPal order token.

/** What every PayPal checkout start returns. Subscriptions map `subscriptionId` onto `orderId`. */
export interface PaymentApproval {
  approvalUrl: string;
  orderId: string;
}

export function createDonation(body: DonationRequest, signal?: AbortSignal): Promise<DonationResponse> {
  return api.post<DonationResponse>("/api/v1/donations", body, { signal });
}

/**
 * The payer is back from PayPal: ask the API to capture the donation. The API only credits the
 * gamer from PayPal's capture result, never because this call was made, and a repeat is harmless.
 */
export function captureDonation(orderId: string, signal?: AbortSignal): Promise<unknown> {
  return api.post<unknown>("/api/v1/donations/capture", { orderId }, { signal });
}

/** UNCONFIRMED endpoint. Change the path here only. */
export function fetchOrder(orderId: string, signal?: AbortSignal): Promise<PaymentOrder> {
  return api.get<PaymentOrder>(`/api/v1/orders/${encodeURIComponent(orderId)}`, { signal });
}

export type OrderOutcome = "pending" | "confirmed" | "failed" | "cancelled" | "expired";

/**
 * Backend order status → what the payer sees. Only COMPLETED is success; anything unknown
 * (including CREATED / APPROVED, i.e. "back from PayPal but not captured") stays pending.
 */
export function orderOutcome(status: PaymentOrder["status"]): OrderOutcome {
  switch (status) {
    case PAYMENT_ORDER_STATUS.COMPLETED:
      return "confirmed";
    case PAYMENT_ORDER_STATUS.FAILED:
      return "failed";
    case PAYMENT_ORDER_STATUS.CANCELLED:
      return "cancelled";
    case PAYMENT_ORDER_STATUS.EXPIRED:
      return "expired";
    default:
      return "pending";
  }
}

export type CheckoutFailure = "unauthenticated" | "ineligible" | "failed";

/** How the payment modal reacts to a failed checkout start. */
export function classifyCheckoutError(error: unknown): CheckoutFailure {
  if (error instanceof ApiError) {
    if (error.code === API_ERROR_CODE.UNAUTHENTICATED || error.status === 401) return "unauthenticated";
    if (error.code === API_ERROR_CODE.NOT_VERIFIED_ADULT) return "ineligible";
  }
  return "failed";
}

export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.code === API_ERROR_CODE.NOT_FOUND);
}

export function isUnauthenticated(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.code === API_ERROR_CODE.UNAUTHENTICATED);
}
