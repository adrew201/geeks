import { Navigate, Outlet, useLocation } from "react-router";
import { Lock } from "lucide-react";
import { PageContainer, PageHeader } from "../../components/layout/PageHeader.tsx";
import { ROUTES, homeRouteFor } from "../../components/layout/nav-config.ts";
import { ButtonLink } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { StatusPanel } from "../../components/ui/StatusPanel.tsx";
import { ROLE_LABELS } from "../../config/labels.ts";
import { useSession, wasSignedOutByUser } from "../../lib/session.ts";
import type { Role } from "../../types/api.ts";
import type { ReturnToState } from "./redirect.ts";

// Route guard, used as a layout route.
// - Signed out (or the token expired / was malformed): go to /login, remembering the page
//   so login can send the user back.
// - Signed in with the wrong role: a clear "not available for your account" state.
// UI only: the API enforces the same rules (README §18 requireAuth / requireRole).

export interface RequireAuthProps {
  /** Roles allowed through. Omit to allow any signed-in user. */
  roles?: readonly Role[];
}

export function RequireAuth({ roles }: RequireAuthProps) {
  const session = useSession();
  const location = useLocation();

  if (!session) {
    // After a deliberate logout there's no page to return to.
    const state: ReturnToState | undefined = wasSignedOutByUser()
      ? undefined
      : { from: { pathname: location.pathname, search: location.search, hash: location.hash } };
    return <Navigate to={ROUTES.login} replace state={state} />;
  }

  if (roles && !roles.includes(session.role)) {
    return <NotAvailable role={session.role} allowed={roles} />;
  }

  return <Outlet />;
}

function listRoles(roles: readonly Role[]): string {
  const names = roles.map((role) => ROLE_LABELS[role].toLowerCase());
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "");
}

function NotAvailable({ role, allowed }: { role: Role; allowed: readonly Role[] }) {
  return (
    <>
      <PageHeader title="Not available" />
      <PageContainer>
        <Card>
          <StatusPanel
            tone="warning"
            icon={<Lock />}
            title="Not available for your account"
            description={`This page is for ${listRoles(allowed)} accounts. You're signed in as a ${ROLE_LABELS[role].toLowerCase()}.`}
            actions={<ButtonLink to={homeRouteFor(role)}>Go to my home</ButtonLink>}
          />
        </Card>
      </PageContainer>
    </>
  );
}
