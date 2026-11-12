import type { ReactNode } from "react";
import { Check, CircleAlert, CircleCheck, CircleMinus, CircleX, Clock, Clock10, LoaderCircle } from "lucide-react";
import { Badge } from "../../components/ui/Badge.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { StatusPanel, type StatusTone } from "../../components/ui/StatusPanel.tsx";
import type { Tone } from "../../components/ui/tone-styles.ts";
import { cn } from "../../lib/cn.ts";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/use-media-query.ts";
import type { PaymentView, PurposeCopy } from "./payment-view.ts";

// Page 15 repurposed: the generic "waiting for PayPal confirmation" card for every PayPal
// flow. Presentational; /pay/return owns the polling.
// 15D: 580px card, 80px status illustration with .pulse-ring (pulseExpand 2s) and a clock
//   icon with spin-slow (3s), badge + 22px title, 3-step vertical tracker with descriptions,
//   compact order summary, two actions, help text.
// 15M: 56px icon, no pulse ring, tracker without descriptions, labels DONE/ACTIVE/WAITING.
// Removed: "3. Content unlock" step and every unlock/VOD line (decision 3), "View Unlocked
// Footage (Screen 16)" (page 16 is cut), Help & Support / contact-support links (no support
// page exists). 15D state C permanently overwrote the refresh onclick; here each state
// renders its own actions.

interface ViewStyle {
  tone: StatusTone;
  icon: ReactNode;
  badge: { tone: Tone; label: string };
  title: string;
  pulse: boolean;
}

function viewStyle(view: PaymentView, copy: PurposeCopy): ViewStyle & { description: (recipient?: string) => string } {
  switch (view) {
    case "pending":
      return {
        tone: "info",
        icon: <Clock className="animate-spin-slow" />,
        badge: { tone: "amber", label: "Pending confirmation" },
        title: "Confirming your payment",
        description: () =>
          `You're back from PayPal. We're waiting for PayPal to confirm the payment before we record your ${copy.noun}.`,
        pulse: true,
      };
    case "checking":
      return {
        tone: "loading",
        icon: null,
        badge: { tone: "blue", label: "Checking status" },
        title: "Checking payment status",
        description: () => "Asking Play2Pro for PayPal's latest confirmation…",
        pulse: true,
      };
    case "confirmed":
      return {
        tone: "success",
        icon: <CircleCheck />,
        badge: { tone: "green", label: copy.confirmedBadge },
        title: copy.confirmedTitle,
        description: copy.confirmedDescription,
        pulse: false,
      };
    case "still-pending":
      return {
        tone: "warning",
        icon: <CircleAlert />,
        badge: { tone: "amber", label: "Still processing" },
        title: "Your payment is still being confirmed",
        description: () =>
          "PayPal hasn't confirmed it yet. This can take a couple of minutes depending on the payment network.",
        pulse: true,
      };
    case "failed":
      return {
        tone: "danger",
        icon: <CircleX />,
        badge: { tone: "red", label: "Payment failed" },
        title: "Payment could not be confirmed",
        description: () =>
          `PayPal or your payment provider declined the transaction, so no ${copy.noun} was recorded.`,
        pulse: false,
      };
    case "cancelled":
      return {
        tone: "neutral",
        icon: <CircleMinus />,
        badge: { tone: "slate", label: "Cancelled" },
        title: "Payment cancelled",
        description: () => `You cancelled on PayPal. No money was taken and no ${copy.noun} was recorded.`,
        pulse: false,
      };
    case "expired":
      return {
        tone: "neutral",
        icon: <Clock10 />,
        badge: { tone: "slate", label: "Expired" },
        title: "Payment session expired",
        description: () => "This payment timed out before it was approved. Start a new one to try again.",
        pulse: false,
      };
  }
}

type StepState = "done" | "active" | "waiting" | "failed";

function steps(view: PaymentView): [StepState, StepState, StepState] {
  switch (view) {
    case "confirmed":
      return ["done", "done", "done"];
    case "failed":
      return ["done", "failed", "waiting"];
    case "cancelled":
    case "expired":
      return ["failed", "waiting", "waiting"];
    default:
      return ["done", "active", "waiting"];
  }
}

const STEP_LABEL: Record<StepState, { desktop: string; mobile: string; className: string }> = {
  done: { desktop: "Completed", mobile: "Done", className: "text-success" },
  active: { desktop: "In progress", mobile: "Active", className: "text-primary" },
  waiting: { desktop: "Waiting", mobile: "Waiting", className: "text-fg-muted" },
  failed: { desktop: "Not completed", mobile: "Stopped", className: "text-danger" },
};

export interface PaymentSummaryRow {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

export interface PaymentStatusProps {
  view: PaymentView;
  copy: PurposeCopy;
  recipientName?: string;
  /** Compact order summary rows (amount, order reference, ...). */
  summary: PaymentSummaryRow[];
  actions: ReactNode;
  /** Small text under the actions (safe-to-leave note, polling paused, check failed). */
  note?: ReactNode;
}

export function PaymentStatus({ view, copy, recipientName, summary, actions, note }: PaymentStatusProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const style = viewStyle(view, copy);
  const [approval, verification, final] = steps(view);
  const stepRows = [
    {
      title: "PayPal approval",
      state: approval,
      description:
        view === "cancelled"
          ? "The approval was cancelled on PayPal."
          : view === "expired"
            ? "The approval wasn't completed in time."
            : "You completed the approval step on PayPal.",
    },
    {
      title: "Payment verification",
      state: verification,
      description:
        view === "failed"
          ? "PayPal didn't confirm the payment."
          : "Play2Pro confirms the payment with PayPal before recording anything.",
    },
    { title: copy.finalStep, state: final, description: copy.finalStepDescription(recipientName) },
  ];

  return (
    <Card large padding="none" className="mx-auto w-full max-w-[580px] gap-0">
      <p className="sr-only" role="status">
        {style.title}
      </p>
      <StatusPanel
        layout="hero"
        tone={style.tone}
        icon={style.icon}
        // 15M has no pulse ring.
        pulse={style.pulse && isDesktop}
        eyebrow={<Badge tone={style.badge.tone}>{style.badge.label}</Badge>}
        title={style.title}
        description={style.description(recipientName)}
        className="px-5 pt-8 pb-2 lg:px-10 lg:pt-10"
      />

      <div className="flex flex-col gap-5 px-5 pt-4 pb-6 lg:px-10 lg:pb-10">
        <ol
          aria-label="Payment progress"
          className="flex flex-col gap-2 rounded-lg bg-inset p-4 lg:gap-4 lg:p-5"
        >
          {stepRows.map((step, index) => (
            <TrackerStep key={step.title} index={index + 1} {...step} />
          ))}
        </ol>

        <dl className="grid grid-cols-1 gap-2 rounded-lg bg-inset p-4 text-12 lg:grid-cols-2 lg:gap-4">
          {summary.map((row) => (
            <div key={row.label} className="flex justify-between gap-3 lg:flex-col lg:justify-start lg:gap-0.5">
              <dt className="text-fg-muted lg:text-10 lg:font-semibold lg:uppercase">{row.label}</dt>
              <dd className={cn("font-bold", row.mono && "font-mono")}>{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex w-full flex-col gap-2 lg:flex-row lg:gap-3 [&>*]:lg:flex-1">{actions}</div>
          {note && <div className="text-11 text-fg-muted">{note}</div>}
        </div>
      </div>
    </Card>
  );
}

function TrackerStep({
  index,
  title,
  state,
  description,
}: {
  index: number;
  title: string;
  state: StepState;
  description: string;
}) {
  const label = STEP_LABEL[state];
  return (
    <li className="flex items-start gap-3 border-t border-border pt-2 first:border-t-0 first:pt-0 lg:border-t-0 lg:pt-0">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-[22px] shrink-0 items-center justify-center rounded-full text-10 font-bold lg:size-8 lg:text-12",
          state === "done" && "bg-success/14 text-success",
          state === "active" && "bg-primary/14 text-primary",
          state === "waiting" && "border border-border bg-inset text-fg-muted",
          state === "failed" && "bg-danger/14 text-danger",
        )}
      >
        {state === "done" ? (
          <Check className="size-3 lg:size-4" />
        ) : state === "active" ? (
          <LoaderCircle className="size-3 animate-spin-slow lg:size-4" />
        ) : state === "failed" ? (
          <CircleX className="size-3 lg:size-4" />
        ) : (
          index
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-3">
          <span className={cn("text-12 font-bold lg:text-13", state === "waiting" && "text-fg-muted")}>
            {index}. {title}
          </span>
          <span className={cn("text-9 font-bold uppercase lg:text-10", label.className)}>
            <span className="lg:hidden">{label.mobile}</span>
            <span className="hidden lg:inline">{label.desktop}</span>
          </span>
        </div>
        {/* 15M drops the step descriptions. */}
        <p className="hidden text-12 text-fg-muted lg:block">{description}</p>
      </div>
    </li>
  );
}
