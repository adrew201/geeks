import type { Location } from "react-router";
import { homeRouteFor } from "../../components/layout/nav-config.ts";
import type { Role } from "../../types/api.ts";

/** Router state the guard leaves on /login so we can send the user back afterwards. */
export interface ReturnToState {
  from?: Pick<Location, "pathname" | "search" | "hash">;
}

/**
 * After login: back to the page the guard bounced them from, otherwise their role's home.
 * Only same-app paths are honoured.
 */
export function postLoginPath(role: Role, state: unknown): string {
  const from = (state as ReturnToState | null)?.from;
  if (from && from.pathname.startsWith("/") && !from.pathname.startsWith("//")) {
    return `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`;
  }
  return homeRouteFor(role);
}
