import { Outlet, useNavigate } from "react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandLogo } from "../components/layout/BrandLogo.tsx";
import { Badge } from "../components/ui/Badge.tsx";
import { Button } from "../components/ui/Button.tsx";

// 14D/15D focused payment header (.payment-nav-header: header bg, 20px 40px, bottom border)
// and a centred content area (14D .main-wrapper: 40px padding, 1040px grid).
// Used by the repurposed PayPal flow for donations, bounty funding and subscriptions (decision 2).

export default function CheckoutLayout() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-header px-4 py-4 lg:px-10 lg:py-5">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" className="lg:hidden" />
          <BrandLogo size="md" className="hidden lg:inline-flex" />
          <Badge tone="slate" icon={<ShieldCheck className="size-3" aria-hidden="true" />} className="hidden sm:inline-flex">
            Secure payment
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Button>
      </header>
      <main className="flex flex-1 justify-center p-4 lg:p-10">
        <div className="w-full max-w-[1040px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
