import { Outlet } from "react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandLogo } from "../components/layout/BrandLogo.tsx";
import { ROUTES, homeRouteFor } from "../components/layout/nav-config.ts";
import { Badge } from "../components/ui/Badge.tsx";
import { ButtonLink } from "../components/ui/Button.tsx";
import { useSession } from "../lib/session.ts";

// 14D/15D focused payment header (.payment-nav-header: header bg, 20px 40px, bottom border)
// and a centred content area (14D .main-wrapper: 40px padding, 1040px grid).
// Used by the repurposed PayPal flow for donations, bounty funding and subscriptions (decision 2).
// The exit link goes to the user's home, not history back: after a PayPal return the
// previous history entry is PayPal itself.

export default function CheckoutLayout() {
  const session = useSession();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-header px-4 py-4 lg:px-10 lg:py-5">
        {/* Responsive display classes sit on wrappers: BrandLogo and Badge set inline-flex and
            cn() has no tailwind-merge, so `hidden` on them loses (same bug as PublicHeader). */}
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex lg:hidden">
            <BrandLogo size="sm" />
          </span>
          <span className="hidden lg:flex">
            <BrandLogo size="md" />
          </span>
          <span className="hidden sm:flex">
            <Badge tone="slate" icon={<ShieldCheck className="size-3" aria-hidden="true" />}>
              Secure payment
            </Badge>
          </span>
        </div>
        <ButtonLink to={session ? homeRouteFor(session.role) : ROUTES.home} variant="ghost" size="sm">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Exit
        </ButtonLink>
      </header>
      <main className="flex flex-1 justify-center p-4 lg:p-10">
        <div className="w-full max-w-[1040px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
