import { Outlet } from "react-router";
import { LogOut } from "lucide-react";
import { AppSidebar } from "../components/layout/AppSidebar.tsx";
import { BottomNav } from "../components/layout/BottomNav.tsx";
import { BrandLogo } from "../components/layout/BrandLogo.tsx";
import { APP_NAV, navAudienceFor } from "../components/layout/nav-config.ts";
import { Button } from "../components/ui/Button.tsx";
import { ROLE_LABELS, TIER_LABELS } from "../config/labels.ts";
import { useLogout } from "../features/auth/use-logout.ts";
import { useSession } from "../lib/session.ts";
import { ROLE } from "../types/api.ts";

// Signed-in shell. Desktop (≥1024px): 240px sidebar from nav-config. Mobile: sticky header
// (05M .mobile-header) + fixed bottom tabs from the same config. Pages render their own
// <PageHeader> and <PageContainer>. Rendered inside <RequireAuth>, so a session exists;
// the nav follows its role. The token has no name or email (README §18), so the sidebar
// shows the account type and tier.

export default function AppLayout() {
  const session = useSession();
  const logout = useLogout();
  const nav = APP_NAV[navAudienceFor(session?.role ?? ROLE.GAMER)];
  const user = session
    ? { name: `${ROLE_LABELS[session.role]} account`, subtitle: TIER_LABELS[session.tier] }
    : undefined;

  return (
    <div className="flex min-h-dvh">
      <AppSidebar items={nav.sidebar} user={user} onLogout={logout} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-header px-5 py-4 lg:hidden">
          <BrandLogo size="sm" />
          <Button variant="ghost" size="icon" aria-label="Log out" onClick={logout}>
            <LogOut className="size-4" aria-hidden="true" />
          </Button>
        </header>
        <main className="flex-1 pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomNav items={nav.tabs} />
    </div>
  );
}
