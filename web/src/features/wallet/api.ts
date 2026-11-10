import { api } from "../../lib/api-client.ts";
import type { WithdrawRequest } from "../../types/api.ts";

// README §14 (Rabasa): POST /api/v1/wallet/withdraw, owner + verified adult.
// The wallet itself is read from GET /api/v1/gamers/:id/dashboard (walletBalance +
// walletEntries, owner only), via features/dashboard/use-own-dashboard.ts.

/**
 * UNCONFIRMED response: README gives none. The client ignores the body and refetches the
 * dashboard, which shows the new negative WITHDRAWAL entry (README §15.4 step 2).
 * 403 NOT_VERIFIED_ADULT when the account isn't a verified adult (README §14 error example).
 */
export function requestWithdrawal(body: WithdrawRequest): Promise<unknown> {
  return api.post<unknown>("/api/v1/wallet/withdraw", body);
}
