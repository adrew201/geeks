import { Outlet } from "react-router";
import { AppSidebar, type SidebarUser } from "../components/layout/AppSidebar.tsx";
import { BottomNav } from "../components/layout/BottomNav.tsx";
import { BrandLogo } from "../components/layout/BrandLogo.tsx";
import { APP_NAV, type NavAudience } from "../components/layout/nav-config.ts";

// Signed-in shell. Desktop (≥1024px): 240px sidebar from nav-config. Mobile: sticky header
// (05M .mobile-header) + fixed bottom tabs from the same config. Pages render their own
// <PageHeader> and <PageContainer>.

export interface AppLayoutProps {
  audience: NavAudience;
  user?: SidebarUser;
}

export default function AppLayout({ audience, user }: AppLayoutProps) {
  const nav = APP_NAV[audience];
  return (
    <div className="flex min-h-dvh">
      <AppSidebar items={nav.sidebar} user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-header px-5 py-4 lg:hidden">
          <BrandLogo size="sm" />
        </header>
        <main className="flex-1 pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomNav items={nav.tabs} />
    </div>
  );
}
