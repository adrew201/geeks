import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, CreditCard, ShieldCheck, UserX } from "lucide-react";
import { Button } from "../../components/ui/Button.tsx";
import { Modal } from "../../components/ui/Modal.tsx";
import { StatusPanel } from "../../components/ui/StatusPanel.tsx";
import { formatMoney } from "../../lib/format-money.ts";
import { ApiError } from "../../lib/api-client.ts";
import { API_ERROR_CODE, type Cents } from "../../types/api.ts";
import { classifyCheckoutError, isAbort, type PaymentApproval } from "./api.ts";
import { saveCheckoutContext, type CheckoutContext } from "./approval.ts";
import { PayPalApproval } from "./PayPalApproval.tsx";

// Page 13 repurposed (decision 2): the generic "start a PayPal checkout" modal for donations
// now, bounty funding and subscriptions later. Callers supply the body (what's being paid
// for) and createOrder(); this owns the 13D states as real ones:
//   1 Default Modal       → "form"
//   2 Creating Order      → "creating" (13D .spinner, 0.8s)
//   3 Approval Generated  → "redirecting" (PayPalApproval sends the payer to PayPal)
//   4 Order Failed        → "failed", with Try Again
// plus "ineligible" (403 NOT_VERIFIED_ADULT). 401 hands off to onUnauthenticated.
// Desktop = 13D centred 560px modal (modalSlideUp 0.3s); mobile = 13M bottom sheet
// (sheetSlideUp 0.3s); both via components/ui/Modal. Unlike 13D, Close and Cancel close.
// Kept: order summary box, PayPal method row, "Continue with PayPal", security note.
// Removed: the VOD summary card, "INSTANT ACCESS" badge and unlock copy (decision 3); the
// "Platform Processing Fee" line (README §15.1 takes the fee from the gamer, not the payer;
// 13M had no fee line either); the Terms/Privacy footer links (no such pages yet).

type Phase =
  | { kind: "form" }
  | { kind: "creating" }
  | { kind: "redirecting"; approval: PaymentApproval }
  /** `invalid`: the API rejected the details (400), so retrying the same request can't help. */
  | { kind: "failed"; message: string; invalid?: boolean }
  | { kind: "ineligible" };

export interface SummaryLine {
  label: string;
  amount: Cents;
}

export interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  /** What's being paid for (recipient card, amount picker, ...). */
  children: ReactNode;
  /** Order summary; the total is their sum. Hidden while no amount is chosen. */
  lines: SummaryLine[] | null;
  /** False disables "Continue with PayPal" (e.g. no valid amount yet). */
  canSubmit: boolean;
  /** Creates the order on our backend. */
  createOrder: (signal: AbortSignal) => Promise<PaymentApproval>;
  /** Stored for /pay/return once the order id is known. */
  checkout: Omit<CheckoutContext, "orderId" | "amount">;
  /** The API said 401: the caller sends the user to log in. */
  onUnauthenticated: () => void;
  /** Shown for 403 NOT_VERIFIED_ADULT. */
  ineligibleMessage: string;
  /** Title for 403 NOT_VERIFIED_ADULT. Default: "Can't receive payments yet" (donation recipient). */
  ineligibleTitle?: string;
}

export function PaymentModal(props: PaymentModalProps) {
  // Mounted per opening, so every visit starts at "form".
  return props.open ? <OpenPaymentModal {...props} /> : null;
}

function OpenPaymentModal({
  onClose,
  title,
  description,
  icon,
  children,
  lines,
  canSubmit,
  createOrder,
  checkout,
  onUnauthenticated,
  ineligibleMessage,
  ineligibleTitle = "Can't receive payments yet",
}: PaymentModalProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const controllerRef = useRef<AbortController | null>(null);
  const total = lines?.reduce((sum, line) => sum + line.amount, 0) ?? 0;

  // Closing mid-request abandons it.
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function submit() {
    if (!canSubmit || !lines) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setPhase({ kind: "creating" });
    try {
      const approval = await createOrder(controller.signal);
      saveCheckoutContext({ ...checkout, orderId: approval.orderId, amount: total });
      setPhase({ kind: "redirecting", approval });
    } catch (error) {
      if (isAbort(error)) return;
      const failure = classifyCheckoutError(error);
      if (failure === "unauthenticated") {
        onUnauthenticated();
        return;
      }
      if (failure === "ineligible") {
        setPhase({ kind: "ineligible" });
        return;
      }
      // A 400 explains itself (e.g. a bounty deadline past the backend's cap): show it.
      const validation = error instanceof ApiError && error.code === API_ERROR_CODE.VALIDATION_ERROR;
      setPhase(
        validation
          ? { kind: "failed", message: error.message, invalid: true }
          : { kind: "failed", message: "We couldn't start a PayPal checkout. Check your connection and try again." },
      );
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <>
          {icon}
          {title}
        </>
      }
      description={description}
      size="lg"
      // 13D state 2 says "Please do not close this window" while the order is created.
      dismissible={phase.kind !== "creating"}
      footer={
        phase.kind === "form" && (
          <>
            <Button variant="paypal" size="lg" fullWidth disabled={!canSubmit} onClick={submit}>
              <ArrowRight className="size-4" aria-hidden="true" />
              Continue with PayPal
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-11 text-fg-muted">
              <ShieldCheck className="size-3.5 shrink-0 text-success" aria-hidden="true" />
              Your payment is processed securely by PayPal.
            </p>
            <Button variant="ghost" size="sm" className="self-center" onClick={onClose}>
              Cancel
            </Button>
          </>
        )
      }
    >
      <PhaseBody
        phase={phase}
        total={total}
        lines={lines}
        onSubmit={submit}
        onBack={() => setPhase({ kind: "form" })}
        onClose={onClose}
        onUnsafeUrl={() =>
          setPhase({
            kind: "failed",
            message: "PayPal returned a link we couldn't verify, so we didn't open it. Please try again.",
          })
        }
        ineligibleMessage={ineligibleMessage}
        ineligibleTitle={ineligibleTitle}
      >
        {children}
      </PhaseBody>
    </Modal>
  );
}

interface PhaseBodyProps {
  phase: Phase;
  total: Cents;
  lines: SummaryLine[] | null;
  onSubmit: () => void;
  onBack: () => void;
  onClose: () => void;
  onUnsafeUrl: () => void;
  ineligibleMessage: string;
  ineligibleTitle: string;
  children: ReactNode;
}

function PhaseBody({
  phase,
  total,
  lines,
  onSubmit,
  onBack,
  onClose,
  onUnsafeUrl,
  ineligibleMessage,
  ineligibleTitle,
  children,
}: PhaseBodyProps) {
  switch (phase.kind) {
    case "creating":
      return (
        <StatusPanel
          tone="loading"
          title="Creating PayPal order…"
          description="Requesting a secure checkout from Play2Pro. Please don't close this window."
        />
      );
    case "redirecting":
      return (
        <PayPalApproval
          approval={phase.approval}
          amount={total}
          onUnsafeUrl={onUnsafeUrl}
        />
      );
    case "failed":
      return (
        <StatusPanel
          tone="danger"
          title={phase.invalid ? "Check the details" : "Order creation failed"}
          description={phase.message}
          actions={
            phase.invalid ? (
              // Closing returns to the page's form, where the details can be fixed.
              <Button onClick={onClose}>Edit details</Button>
            ) : (
              <>
                <Button variant="secondary" onClick={onBack}>
                  Back
                </Button>
                <Button onClick={onSubmit}>Try again</Button>
              </>
            )
          }
        />
      );
    case "ineligible":
      return (
        <StatusPanel
          tone="warning"
          icon={<UserX />}
          title={ineligibleTitle}
          description={ineligibleMessage}
          actions={
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          }
        />
      );
    case "form":
      return (
        <>
          {children}
          {lines && <OrderSummary lines={lines} total={total} />}
          <div className="flex items-center justify-between rounded-lg border border-primary/35 bg-paypal-ink/10 px-4 py-3.5 text-13 font-bold">
            <span className="flex items-center gap-2.5">
              <CreditCard className="size-[18px] text-primary" aria-hidden="true" />
              Payment method
            </span>
            <span className="text-primary">PayPal</span>
          </div>
        </>
      );
  }
}

/** 13D .order-summary-box (13M order total card). */
function OrderSummary({ lines, total }: { lines: SummaryLine[]; total: Cents }) {
  return (
    <div className="rounded-lg border border-border bg-inset p-4">
      <p className="mb-3 text-12 font-bold uppercase tracking-[0.5px] text-fg-secondary">Order summary</p>
      {lines.map((line) => (
        <div key={line.label} className="mb-2 flex items-center justify-between text-13 text-fg-secondary">
          <span>{line.label}</span>
          <span>{formatMoney(line.amount)}</span>
        </div>
      ))}
      <div className="mt-2 flex items-center justify-between border-t border-border pt-2.5 text-15 font-extrabold">
        <span>Total</span>
        <span className="font-display text-22 text-success">{formatMoney(total)}</span>
      </div>
    </div>
  );
}
