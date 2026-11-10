import { Outlet } from "react-router";
import { PublicHeader } from "../components/layout/PublicHeader.tsx";
import { SiteFooter } from "../components/layout/SiteFooter.tsx";

/** Landing and other public pages (01). */
export default function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
