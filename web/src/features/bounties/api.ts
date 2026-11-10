import { api } from "../../lib/api-client.ts";
import type {
  ApiBounty,
  Bounty,
  ConfirmBountyRequest,
  CreateBountyRequest,
  CreateBountyResponse,
  CreateSubmissionRequest,
} from "../../types/api.ts";
import type { PaymentApproval } from "../payments/api.ts";
import { toBounty } from "./bounty-status.ts";

// Endpoint list and UNCONFIRMED markers: the Bounties block in types/api.ts.
// The client never calls PayPal and never decides that money moved: the bounty status from
// the API does (README §15.3).

const BASE = "/api/v1/bounties";
const bountyUrl = (id: string) => `${BASE}/${encodeURIComponent(id)}`;

export async function fetchBounties(signal?: AbortSignal): Promise<Bounty[]> {
  const list = await api.get<ApiBounty[]>(BASE, { signal });
  return list.map(toBounty);
}

/** UNCONFIRMED endpoint. */
export async function fetchBounty(id: string, signal?: AbortSignal): Promise<Bounty> {
  return toBounty(await api.get<ApiBounty>(bountyUrl(id), { signal }));
}

/**
 * Creates the bounty; the backend creates a PayPal order with intent AUTHORIZE. Returns the
 * PaymentApproval the Step 5 checkout needs. Never log the approval URL (it holds the token).
 */
export async function createBounty(body: CreateBountyRequest, signal?: AbortSignal): Promise<PaymentApproval> {
  const response = await api.post<CreateBountyResponse>(BASE, body, { signal });
  const orderId = response.orderId ?? payPalToken(response.approvalUrl);
  if (!orderId) throw new Error("The bounty response had no PayPal order reference.");
  return { approvalUrl: response.approvalUrl, orderId };
}

/** PayPal approval links carry the order id as `token`. */
function payPalToken(approvalUrl: string): string | null {
  try {
    return new URL(approvalUrl).searchParams.get("token");
  } catch {
    return null;
  }
}

export function submitEntry(bountyId: string, body: CreateSubmissionRequest): Promise<unknown> {
  return api.post(`${bountyUrl(bountyId)}/submissions`, body);
}

/** README §14 route; body UNCONFIRMED. A 2xx means "sent", not "paid". */
export function confirmWinner(bountyId: string, body: ConfirmBountyRequest): Promise<unknown> {
  return api.post(`${bountyUrl(bountyId)}/confirm`, body);
}

/** UNCONFIRMED endpoint. */
export function rejectEntry(bountyId: string, submissionId: string): Promise<unknown> {
  return api.post(`${bountyUrl(bountyId)}/submissions/${encodeURIComponent(submissionId)}/reject`);
}
