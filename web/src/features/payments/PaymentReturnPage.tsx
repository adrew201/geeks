import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import { ArrowLeft, Flame, RefreshCw, SearchX } from "lucide-react";
import { ROUTES } from "../../components/layout/nav-config.ts";
import { Button, ButtonLink } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { StatusPanel } from "../../components/ui/StatusPanel.tsx";
import { formatMoney } from "../../lib/format-money.ts";
import { PAYMENT_PURPOSE, PAYPAL_RETURN_PARAM } from "../../types/api.ts";
import { loadCheckoutContext } from "./approval.ts";
import { PaymentStatus, type PaymentSummaryRow } from "./PaymentStatus.tsx";
import { PURPOSE_COPY, isTerminal, paymentView } from "./payment-view.ts";
import { useOrderStatus } from "./use-order-status.ts";

// /pay/return: PayPal's return (and cancel) URL. Page 15 states A–G, driven by the backend
// order status (GET /orders/:id, UNCONFIRMED). Coming back from PayPal proves nothing, so the
// page starts PENDING and only shows success once the backend reports COMPLETED.
// Behind RequireAuth: a signed-out payer logs in and lands back here with the same query.

export default function PaymentReturnPage() {
  const [params] = useSearchParams();
  const orderId = params.get(PAYPAL_RETURN_PARAM.ORDER_ID) ?? params.get(PAYPAL_RETURN_PARAM.TOKEN);
  const cancelledHint = params.has(PAYPAL_RETURN_PARAM.CANCELLED);

  useEffect(() => {
    document.title = "Payment status · Play2Pro";
  }, []);

  if (!orderId) {
    return (
      <Card large className="mx-auto w-full max-w-[580px]">
        <StatusPanel
          tone="neutral"
          icon={<SearchX />}
          title="No payment to check"
          description="This link doesn't include a payment reference. If you just paid, open the page from the PayPal return link again."
          actions={<ButtonLink to={ROUTES.arena}>Go to Arena</ButtonLink>}
        />
      </Card>
    );
  }

  // Keyed so a different order id starts from a clean state.
  return <OrderReturn key={orderId} orderId={orderId} cancelledHint={cancelledHint} />;
}

function OrderReturn({ orderId, cancelledHint }: { orderId: string; cancelledHint: boolean }) {
  const status = useOrderStatus(orderId, { once: cancelledHint });
  const context = useMemo(() => loadCheckoutContext(orderId), [orderId]);
  const view = paymentView(status, cancelledHint);

  const purpose = status.order?.purpose ?? context?.purpose ?? PAYMENT_PURPOSE.DONATION;
  const copy = PURPOSE_COPY[purpose] ?? PURPOSE_COPY[PAYMENT_PURPOSE.DONATION];
  const recipientName = status.order?.gamerTag ?? context?.recipientName;
  const amount = status.order?.amount ?? context?.amount;
  const returnPath = context?.returnPath;
  const retryPath = context?.retryPath ?? returnPath;

  if (status.notFound) {
    return (
      <Card large className="mx-auto w-full max-w-[580px]">
        <StatusPanel
          tone="neutral"
          icon={<SearchX />}
          title="We couldn't find this payment"
          description={
            <>
              No order matches reference <span className="font-mono">{orderId}</span> on your account. If PayPal
              took money, keep this reference.
            </>
          }
          actions={<ButtonLink to={returnPath ?? ROUTES.arena}>Go back</ButtonLink>}
        />
      </Card>
    );
  }

  const summary: PaymentSummaryRow[] = [];
  if (recipientName) summary.push({ label: purpose === PAYMENT_PURPOSE.DONATION ? "Gamer" : "For", value: recipientName });
  if (amount !== undefined) summary.push({ label: "Amount", value: <span className="text-success">{formatMoney(amount)}</span> });
  summary.push({ label: "Order reference", value: orderId, mono: true });
  summary.push({ label: "Payment provider", value: "PayPal" });

  const back = (label: string, variant: "secondary" | "success" = "secondary") => (
    <ButtonLink to={returnPath ?? ROUTES.arena} variant={variant}>
      {returnPath ? <ArrowLeft className="size-3.5" aria-hidden="true" /> : <Flame className="size-3.5" aria-hidden="true" />}
      {label}
    </ButtonLink>
  );
  const backLabel = returnPath ? (recipientName ? `Back to ${recipientName}'s Gamer ID` : "Back to Gamer ID") : "Go to Arena";

  let actions;
  let note;
  if (view === "confirmed") {
    actions = back(backLabel, "success");
  } else if (isTerminal(view)) {
    actions = (
      <>
        {retryPath && (
          <ButtonLink to={retryPath}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
            {view === "expired" ? "Create new payment" : copy.restartLabel}
          </ButtonLink>
        )}
        {back(backLabel)}
      </>
    );
  } else {
    actions = (
      <>
        <Button onClick={status.refresh} loading={view === "checking"} disabled={view === "checking"}>
          {view !== "checking" && <RefreshCw className="size-3.5" aria-hidden="true" />}
          Refresh payment status
        </Button>
        {back(backLabel)}
      </>
    );
    note = (
      <div className="flex flex-col gap-1" aria-live="polite">
        {status.checkFailed && <p className="text-warning">We couldn't reach Play2Pro on the last check. Retrying…</p>}
        {status.polling ? (
          <p>Checking automatically every few seconds. You can safely leave; your payment is still processed.</p>
        ) : (
          <p>Automatic checks have paused. Use Refresh to check again.</p>
        )}
        {view === "still-pending" && (
          <p>
            Taking longer than expected? Keep your order reference <span className="font-mono">{orderId}</span>.
          </p>
        )}
      </div>
    );
  }

  return (
    <PaymentStatus view={view} copy={copy} recipientName={recipientName} summary={summary} actions={actions} note={note} />
  );
}
