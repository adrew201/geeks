import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { Spinner } from "../../components/ui/Spinner.tsx";
import { formatMoney } from "../../lib/format-money.ts";
import type { Cents } from "../../types/api.ts";
import type { PaymentApproval } from "./api.ts";
import { mockReturnPath, safeApprovalUrl, shouldSimulateApproval } from "./approval.ts";

// 13D state 3 "Approval Link Generated" + the useful half of page 14, as one step:
// the order exists, so the payer is sent to PayPal straight away.
// Kept from 14: the amount, the order reference, an "Open PayPal to Approve" button (here a
// fallback if the automatic redirect is blocked) and the server-side-verification reassurance.
// Removed: the visible approval URL and Copy Link (the URL holds the order token), the
// WhatsApp share card (README cut-list #1), the VOD summary panel and "unlock" copy
// (decision 3), the 5 "Link Expired" state (expiry is shown on /pay/return instead).
// 14D injected class="spin" with no .spin rule; here the Spinner uses 13D's 0.8s spin.

const BLOCKED_AFTER_MS = 4000;

export interface PayPalApprovalProps {
  approval: PaymentApproval;
  amount: Cents;
  /** The URL failed the https/PayPal check: nothing was opened. */
  onUnsafeUrl: () => void;
}

export function PayPalApproval({ approval, amount, onUnsafeUrl }: PayPalApprovalProps) {
  const navigate = useNavigate();
  const started = useRef(false);
  const [blocked, setBlocked] = useState(false);

  // Decided per order: a mock order returns in-app; a real order goes to PayPal.
  const simulate = shouldSimulateApproval(approval.orderId);

  function go() {
    if (simulate) {
      navigate(mockReturnPath(approval.orderId));
      return;
    }
    const url = safeApprovalUrl(approval.approvalUrl);
    if (!url) {
      onUnsafeUrl();
      return;
    }
    window.location.assign(url.href);
  }

  useEffect(() => {
    // Once only (StrictMode runs effects twice in dev).
    if (started.current) return;
    started.current = true;
    if (!simulate && !safeApprovalUrl(approval.approvalUrl)) {
      onUnsafeUrl();
      return;
    }
    go();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for this order
  }, []);

  useEffect(() => {
    // Still here a few seconds later: the navigation was blocked or is slow.
    const timer = setTimeout(() => setBlocked(true), BLOCKED_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div role="status" className="flex flex-col items-center gap-3 px-2 py-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/14 text-primary">
        <Spinner size={24} speed="fast" label={null} />
      </div>
      <p className="text-15 font-bold">Taking you to PayPal…</p>
      <p className="max-w-[380px] text-12 text-fg-muted">
        Approve the payment of <strong className="text-fg">{formatMoney(amount)}</strong> on PayPal. You'll come
        straight back here, and we'll confirm it once PayPal verifies the payment.
      </p>
      <Badge tone="amber">Awaiting approval</Badge>
      <p className="text-11 text-fg-muted">
        Order reference <span className="font-mono text-fg-secondary">{approval.orderId}</span>
      </p>
      {blocked && (
        <Button variant="paypal" onClick={go}>
          <ExternalLink className="size-4" aria-hidden="true" />
          Open PayPal to Approve
        </Button>
      )}
      <p className="flex items-center gap-1.5 text-11 text-fg-muted">
        <ShieldCheck className="size-3.5 shrink-0 text-success" aria-hidden="true" />
        Nothing is recorded until Play2Pro verifies the payment with PayPal.
      </p>
    </div>
  );
}
