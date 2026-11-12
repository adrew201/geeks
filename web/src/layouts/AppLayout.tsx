import { NavLink, Outlet } from "react-router";
import { BottomNav } from "../components/layout/BottomNav.tsx";
import { BrandLogo } from "../components/layout/BrandLogo.tsx";
import { APP_NAV, navAudienceFor } from "../components/layout/nav-config.ts";
import { Button } from "../components/ui/Button.tsx";
import { cn } from "../lib/cn.ts";
import { ROLE_LABELS, TIER_LABELS } from "../config/labels.ts";
import { useLogout } from "../features/auth/use-logout.ts";
import { useSession } from "../lib/session.ts";
import { ROLE } from "../types/api.ts";

// Signed-in shell, minimalist: one slim top bar with the logo, a centred row of text links
// from nav-config, and the account line with Log out. Mobile keeps the same bar (logo and
// Log out) plus the bottom tabs from the same config. Pages render their own <PageHeader>
// and <PageContainer>. Rendered inside <RequireAuth>, so a session exists; the nav follows
// its role. The token has no name or email (README §18), so the bar shows the account type
// and tier.

export default function AppLayout() {
  const session = useSession();
  const logout = useLogout();
  const nav = APP_NAV[navAudienceFor(session?.role ?? ROLE.GAMER)];
  const account = session ? `${ROLE_LABELS[session.role]} · ${TIER_LABELS[session.tier]}` : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 bg-bg/90 backdrop-blur-[8px]">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4 lg:px-8">
          <BrandLogo size="sm" />
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-8">
              {nav.sidebar.map(({ label, to }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        "text-13 font-medium transition-colors duration-200",
                        isActive ? "text-fg" : "text-fg-secondary hover:text-fg",
                      )
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="col-start-3 flex items-center justify-end gap-3">
            {account && <span className="hidden text-12 text-fg-muted sm:inline">{account}</span>}
            <Button variant="secondary" size="sm" onClick={logout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>
      <BottomNav items={nav.tabs} />
    </div>
  );
}
