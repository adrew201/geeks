import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Check, Gem, RefreshCw } from "lucide-react";
import { PageContainer, PageHeader } from "../../components/layout/PageHeader.tsx";
import { ROUTES } from "../../components/layout/nav-config.ts";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { cn } from "../../lib/cn.ts";
import { formatMoney } from "../../lib/format-money.ts";
import { useSession } from "../../lib/session.ts";
import { PAYMENT_PURPOSE, ROLE } from "../../types/api.ts";
import { refreshSession } from "../auth/api.ts";
import type { ReturnToState } from "../auth/redirect.ts";
import { PaymentModal } from "../payments/PaymentModal.tsx";
import { startSubscription } from "./api.ts";
import { TIERS, TIER_ORDER, currentTierId, purchaseBlocker, type TierInfo } from "./plans.ts";

// /upgrade: the subscription tiers (Free Gamer, Pro Gamer, Coach Pro). Subscribing opens the
// shared PaymentModal: POST /subscriptions → PayPal approval → /pay/return, which polls until
// the verified ACTIVATED webhook makes the account PAID. Tiers and perks: plans.ts.

export default function UpgradePage() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [buying, setBuying] = useState<TierInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const current = currentTierId(session);

  useEffect(() => {
    document.title = "Plans · Play2Pro";
  }, []);

  function sendToLogin() {
    const state: ReturnToState = { from: { pathname: location.pathname, search: location.search, hash: location.hash } };
    navigate(ROUTES.login, { state });
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await refreshSession();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Plans"
        description="Upgrade through PayPal. Your plan switches on as soon as PayPal confirms the subscription."
        actions={
          <Button variant="ghost" size="sm" onClick={refresh} loading={refreshing} disabled={refreshing}>
            {!refreshing && <RefreshCw className="size-3.5" aria-hidden="true" />}
            Refresh my plan
          </Button>
        }
      />
      <PageContainer>
        {session?.role === ROLE.SPONSOR && (
          <Card>
            <p className="text-13 text-fg-secondary">
              Sponsor accounts don't need a plan: fund bounties directly from Discover. The plans below are for gamers
              and coaches.
            </p>
          </Card>
        )}
        <ul className="grid gap-4 md:grid-cols-3">
          {TIER_ORDER.map((id) => {
            const tier = TIERS[id];
            const isCurrent = current === id;
            const blocker = purchaseBlocker(tier, session);
            return (
              <li key={id}>
                <Card
                  large
                  className={cn("h-full", isCurrent && "border-primary", tier.plan === null && "opacity-95")}
                  aria-current={isCurrent ? "true" : undefined}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-18 font-bold">{tier.name}</h2>
                      <p className="text-12 text-fg-muted">{tier.audience}</p>
                    </div>
                    {isCurrent ? (
                      <Badge tone="blue" size="sm">
                        Current plan
                      </Badge>
                    ) : tier.plan ? (
                      <Badge tone="violet" size="sm" icon={<Gem className="size-3" aria-hidden="true" />}>
                        Paid
                      </Badge>
                    ) : null}
                  </div>

                  <p className="font-display text-28 font-extrabold">
                    {tier.priceCents === 0 ? "Free" : formatMoney(tier.priceCents)}
                    {tier.priceCents > 0 && <span className="text-13 font-medium text-fg-muted"> / month</span>}
                  </p>

                  <ul className="flex flex-1 flex-col gap-2">
                    {tier.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2 text-13 text-fg-secondary">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
                        {perk}
                      </li>
                    ))}
                  </ul>

                  {tier.plan === null ? (
                    <p className="text-12 text-fg-muted">Every gamer account starts here.</p>
                  ) : isCurrent ? (
                    <p className="text-12 text-success">Active. Billed monthly through PayPal.</p>
                  ) : blocker ? (
                    <p className="text-12 text-fg-muted">{blocker}</p>
                  ) : (
                    <Button variant="paypal" fullWidth onClick={() => (session ? setBuying(tier) : sendToLogin())}>
                      Subscribe with PayPal
                    </Button>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
        <p className="text-11 text-fg-muted">
          Cancel any time from PayPal. Paid perks stay until PayPal ends the subscription.
        </p>
      </PageContainer>

      {buying?.plan && (
        <PaymentModal
          open
          onClose={() => setBuying(null)}
          icon={<Gem className="size-5 text-primary" aria-hidden="true" />}
          title={`Subscribe to ${buying.name}`}
          description="You'll approve a monthly subscription on PayPal, then come straight back here."
          lines={[{ label: `${buying.name} (monthly)`, amount: buying.priceCents }]}
          canSubmit
          createOrder={(signal) => startSubscription(buying.plan!, signal)}
          checkout={{
            purpose: PAYMENT_PURPOSE.SUBSCRIPTION,
            recipientName: buying.name,
            returnPath: ROUTES.upgrade,
            returnLabel: "Back to Plans",
            retryPath: ROUTES.upgrade,
          }}
          onUnauthenticated={sendToLogin}
          ineligibleMessage="Your account can't buy this plan."
        >
          <ul className="flex flex-col gap-1.5 rounded-lg bg-inset p-4">
            {buying.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-2 text-12 text-fg-secondary">
                <Check className="mt-0.5 size-3 shrink-0 text-success" aria-hidden="true" />
                {perk}
              </li>
            ))}
          </ul>
        </PaymentModal>
      )}
    </>
  );
}
