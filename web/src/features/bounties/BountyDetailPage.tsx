import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useParams } from "react-router";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CircleCheck,
  Clock,
  Clock10,
  ExternalLink,
  Lock,
  RefreshCw,
  SearchX,
  Sparkles,
  Trophy,
  UserX,
  X,
} from "lucide-react";
import { PageContainer, PageHeader } from "../../components/layout/PageHeader.tsx";
import { ROUTES } from "../../components/layout/nav-config.ts";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button, ButtonLink } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { Field, Input, Textarea } from "../../components/ui/Field.tsx";
import { Modal } from "../../components/ui/Modal.tsx";
import { Skeleton } from "../../components/ui/Skeleton.tsx";
import { Spinner } from "../../components/ui/Spinner.tsx";
import { StatusPanel } from "../../components/ui/StatusPanel.tsx";
import { useToast } from "../../components/ui/use-toast.ts";
import { gameName } from "../../config/games.ts";
import { ApiError } from "../../lib/api-client.ts";
import { formatMoney } from "../../lib/format-money.ts";
import { useSession } from "../../lib/session.ts";
import {
  API_ERROR_CODE,
  BOUNTY_STATUS,
  ROLE,
  SUBMISSION_STATUS,
  type Bounty,
  type BountySubmission,
} from "../../types/api.ts";
import { isAbort, isNotFound } from "../payments/api.ts";
import { confirmWinner, fetchBounty, rejectEntry, submitEntry } from "./api.ts";
import { BOUNTY_STATUS_BADGE, BOUNTY_TYPE_LABEL, formatDeadline, isAiChecking, isLive } from "./bounty-status.ts";

// /bounties/:id (GAMER or SPONSOR, routes.tsx). GET /bounties/:id is UNCONFIRMED.
// - Gamer: submit a clip link (POST /bounties/:id/submissions), then follow their entry:
//   AI checking → AI result ready (advisory) → sponsor decision.
// - Sponsor who created it: review entries. The AI result is ADVISORY; Confirm and Reject sit
//   behind confirmation dialogs. Confirm only asks the backend to capture and pay out: the UI
//   says "paid" only once the bounty status is COMPLETED (README §15.3).
//   README §14 also lets a coach confirm; coaches can't reach this page yet (decision 7 nav).
// - Any other sponsor: read-only.
// Layout follows 07D (form card left, pipeline + AI results right; stacked on mobile), with
// the 07D vertical timeline and violet AI results card. No bounty design exists (decision 4).

/** Poll while the AI or the payout is pending. 30 × 4s = 2 minutes, then manual refresh. */
const POLL_MS = 4_000;
const MAX_POLLS = 30;

type DetailResult = { run: number; bounty: Bounty | null; error: unknown };

export default function BountyDetailPage() {
  const { id = "" } = useParams();
  // Keyed so another bounty starts from a clean state.
  return <BountyDetail key={id} id={id} />;
}

function BountyDetail({ id }: { id: string }) {
  const session = useSession();
  const userId = session?.userId ?? "";
  const [run, setRun] = useState(0);
  const [polls, setPolls] = useState(0);
  const [result, setResult] = useState<DetailResult | null>(null);
  /** Confirm returned 2xx but the API hasn't reflected it yet. Display only; never "paid". */
  const [sentWinnerId, setSentWinnerId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchBounty(id, controller.signal).then(
      (bounty) => setResult({ run, bounty, error: null }),
      (error: unknown) => {
        if (isAbort(error)) return;
        // Keep showing the last good data if a background check fails.
        setResult((previous) => ({ run, bounty: previous?.bounty ?? null, error }));
      },
    );
    return () => controller.abort();
  }, [id, run]);

  const bounty = result?.bounty ?? null;
  const waiting = bounty !== null && isWaiting(bounty, userId, sentWinnerId);

  useEffect(() => {
    if (!waiting || polls >= MAX_POLLS || result?.run !== run) return;
    const timer = setTimeout(() => {
      setPolls((count) => count + 1);
      setRun((value) => value + 1);
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [waiting, polls, result, run]);

  const refresh = useCallback(() => {
    setPolls(0);
    setRun((value) => value + 1);
  }, []);

  useEffect(() => {
    if (bounty) document.title = `${bounty.title} · Bounties · Play2Pro`;
  }, [bounty]);

  const back = (
    <ButtonLink to={ROUTES.bounties} variant="ghost" size="sm" className="-ml-3 mb-1">
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      Bounties
    </ButtonLink>
  );

  if (!result) {
    return (
      <>
        <PageHeader eyebrow={back} title={<Skeleton className="h-6 w-56" />} />
        <PageContainer>
          <Card aria-busy="true">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </Card>
        </PageContainer>
      </>
    );
  }

  if (!bounty) {
    const missing = isNotFound(result.error);
    return (
      <>
        <PageHeader eyebrow={back} title="Bounty" />
        <PageContainer>
          <Card>
            {missing ? (
              <StatusPanel
                tone="neutral"
                icon={<SearchX />}
                title="Bounty not found"
                description="It may have been removed, or the link is wrong."
                actions={<ButtonLink to={ROUTES.bounties}>See open bounties</ButtonLink>}
              />
            ) : (
              <StatusPanel
                tone="danger"
                title="Couldn't load this bounty"
                description={errorMessage(result.error)}
                actions={
                  <Button variant="secondary" onClick={refresh}>
                    <RefreshCw className="size-3.5" aria-hidden="true" />
                    Try again
                  </Button>
                }
              />
            )}
          </Card>
        </PageContainer>
      </>
    );
  }

  const isCreator = session?.role === ROLE.SPONSOR && bounty.creatorId === userId;
  const status = BOUNTY_STATUS_BADGE[bounty.status];
  const ownEntry = bounty.submissions.find((submission) => submission.gamerId === userId) ?? null;

  let roleSection: ReactNode = null;
  if (session?.role === ROLE.GAMER) {
    if (ownEntry) roleSection = <OwnEntry bounty={bounty} entry={ownEntry} />;
    else if (isLive(bounty)) roleSection = <SubmitForm bountyId={bounty.id} onSubmitted={refresh} />;
  } else if (isCreator) {
    roleSection = (
      <ReviewPanel
        bounty={bounty}
        sentWinnerId={sentWinnerId}
        onConfirmed={(submissionId) => {
          setSentWinnerId(submissionId);
          refresh();
        }}
        onRejected={refresh}
      />
    );
  } else if (session?.role === ROLE.SPONSOR) {
    roleSection = (
      <Card>
        <StatusPanel
          tone="warning"
          icon={<Lock />}
          title="Only the bounty's sponsor can review entries"
          description="You can view this bounty, but confirming or rejecting entries is limited to the sponsor who created it."
        />
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={back}
        title={bounty.title}
        actions={
          <>
            <Badge tone={status.tone}>{status.label}</Badge>
            <Button variant="secondary" size="sm" onClick={refresh}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Refresh
            </Button>
          </>
        }
      />
      <PageContainer>
        <BountyBanner bounty={bounty} isCreator={isCreator} />
        <div className="grid items-start gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <BountySummary bounty={bounty} />
            {roleSection}
          </div>
          <HowItWorks className="lg:col-span-5" />
        </div>
        {(result.error !== null || (waiting && polls >= MAX_POLLS)) && (
          <p className="text-center text-11 text-fg-muted" aria-live="polite">
            {result.error !== null
              ? "We couldn't reach Play2Pro on the last check. Showing the latest data we have."
              : "Automatic checks have paused. Use Refresh to check again."}
          </p>
        )}
      </PageContainer>
    </>
  );
}

/** Something the backend still has to finish that this viewer is watching. */
function isWaiting(bounty: Bounty, userId: string, sentWinnerId: string | null): boolean {
  if (bounty.status === BOUNTY_STATUS.DRAFT || bounty.status === BOUNTY_STATUS.AWAITING_APPROVAL) {
    return bounty.creatorId === userId;
  }
  if (!isLive(bounty)) return false;
  return (
    sentWinnerId !== null ||
    bounty.submissions.some(
      (submission) => isAiChecking(submission) || submission.status === SUBMISSION_STATUS.WINNER_APPROVED,
    )
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

/* ------------------------------ bounty-level states ------------------------------ */

function BountyBanner({ bounty, isCreator }: { bounty: Bounty; isCreator: boolean }) {
  switch (bounty.status) {
    case BOUNTY_STATUS.DRAFT:
    case BOUNTY_STATUS.AWAITING_APPROVAL:
      return (
        <Card>
          <StatusPanel
            tone="info"
            icon={<Clock className="animate-spin-slow" />}
            title="Waiting for PayPal"
            description={
              isCreator
                ? "The bounty opens once PayPal confirms the reward is held. This page updates on its own."
                : "This bounty isn't open yet. It opens once the sponsor's funds are confirmed."
            }
          />
        </Card>
      );
    case BOUNTY_STATUS.COMPLETED:
      return (
        <Card>
          <StatusPanel
            tone="success"
            icon={<Trophy />}
            title="Bounty complete"
            description="Play2Pro confirmed the capture with PayPal and paid out the winner."
          />
        </Card>
      );
    case BOUNTY_STATUS.EXPIRED:
      return (
        <Card>
          <StatusPanel
            tone="neutral"
            icon={<Clock10 />}
            title="This bounty has expired"
            description="No winner was confirmed before the deadline, so the PayPal hold was released. The sponsor wasn't charged."
          />
        </Card>
      );
    case BOUNTY_STATUS.CANCELLED:
      return (
        <Card>
          <StatusPanel
            tone="neutral"
            title="This bounty was cancelled"
            description="The PayPal hold was released. The sponsor wasn't charged."
          />
        </Card>
      );
    default:
      return null;
  }
}

/** What the reward is doing right now, from the bounty status only. */
function fundingLabel(bounty: Bounty): string {
  switch (bounty.status) {
    case BOUNTY_STATUS.OPEN:
    case BOUNTY_STATUS.VERIFYING:
      return "Held by PayPal";
    case BOUNTY_STATUS.COMPLETED:
      return "Paid out";
    case BOUNTY_STATUS.EXPIRED:
    case BOUNTY_STATUS.CANCELLED:
      return "Hold released";
    default:
      return "Awaiting PayPal approval";
  }
}

function BountySummary({ bounty }: { bounty: Bounty }) {
  const rows = [
    { label: "Reward", value: <span className="font-display text-18 text-success">{formatMoney(bounty.reward)}</span> },
    { label: "Funding", value: fundingLabel(bounty) },
    { label: "Game", value: bounty.game ? gameName(bounty.game) : "Any" },
    {
      label: "Deadline",
      value: (
        <span className="flex items-center gap-1">
          <CalendarClock className="size-3.5 text-fg-muted" aria-hidden="true" />
          {formatDeadline(bounty.deadline)}
        </span>
      ),
    },
  ];
  return (
    <Card as="section" aria-label="Bounty details">
      <div className="flex flex-wrap gap-1.5">
        <Badge tone="blue">{BOUNTY_TYPE_LABEL[bounty.type]}</Badge>
      </div>
      <p className="text-14 whitespace-pre-line text-fg-secondary">{bounty.task}</p>
      <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-inset p-4 text-12">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <dt className="text-10 font-semibold text-fg-muted uppercase">{row.label}</dt>
            <dd className="font-bold">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function HowItWorks({ className }: { className?: string }) {
  const steps = [
    { title: "Submit a clip", description: "Gamers send a YouTube or Twitch link before the deadline." },
    { title: "AI check", description: "The AI compares the clip with the task. Its result is advice only." },
    { title: "Sponsor decides", description: "The sponsor confirms a winner or rejects entries." },
    { title: "Payout", description: "Play2Pro captures the held reward and pays the winner once PayPal confirms." },
  ];
  return (
    <Card as="aside" className={className}>
      <h2 className="text-14 font-bold">How bounties work</h2>
      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-inset text-11 font-bold text-fg-muted">
              {index + 1}
            </span>
            <div>
              <p className="text-13 font-bold">{step.title}</p>
              <p className="text-12 text-fg-muted">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/* ------------------------------ gamer ------------------------------ */

type SubmitBlock = "ineligible" | "forbidden" | null;

function SubmitForm({ bountyId, onSubmitted }: { bountyId: string; onSubmitted: () => void }) {
  const toast = useToast();
  const [clipUrl, setClipUrl] = useState("");
  const [note, setNote] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<SubmitBlock>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!isHttpsUrl(clipUrl.trim())) {
      setUrlError("Paste a full https link to your clip (YouTube or Twitch).");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitEntry(bountyId, { clipUrl: clipUrl.trim(), ...(note.trim() ? { note: note.trim() } : {}) });
      toast.show("Clip submitted. The AI check has started.", { tone: "success" });
      onSubmitted();
    } catch (error) {
      if (error instanceof ApiError && error.code === API_ERROR_CODE.NOT_VERIFIED_ADULT) setBlocked("ineligible");
      else if (error instanceof ApiError && error.code === API_ERROR_CODE.FORBIDDEN_ROLE) setBlocked("forbidden");
      else setSubmitError(errorMessage(error));
      setSubmitting(false);
    }
  }

  if (blocked) {
    return (
      <Card>
        <StatusPanel
          tone="warning"
          icon={blocked === "ineligible" ? <UserX /> : <Lock />}
          title={blocked === "ineligible" ? "Verified adult account needed" : "You can't enter this bounty"}
          description={
            blocked === "ineligible"
              ? "Bounty entries are open to gamers with a verified adult PayPal account."
              : "Your account isn't allowed to enter this bounty."
          }
        />
      </Card>
    );
  }

  return (
    <Card as="section" aria-labelledby="submit-entry-title">
      <div>
        <h2 id="submit-entry-title" className="text-16 font-bold">
          Submit your clip
        </h2>
        <p className="text-12 text-fg-muted">External links only. Play2Pro doesn't host videos.</p>
      </div>
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Clip link" required error={urlError}>
          <Input
            type="url"
            inputMode="url"
            value={clipUrl}
            placeholder="https://youtube.com/..."
            onChange={(event) => {
              setClipUrl(event.target.value);
              setUrlError(null);
            }}
          />
        </Field>
        <Field label="Note for the sponsor (optional)">
          <Textarea
            value={note}
            maxLength={300}
            placeholder="Round 14, 1v3 at B site."
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        {submitError && (
          <p role="alert" className="text-12 text-danger">
            {submitError}
          </p>
        )}
        <Button type="submit" fullWidth loading={submitting}>
          {!submitting && <Sparkles className="size-4" aria-hidden="true" />}
          Submit for AI check
        </Button>
        <p className="text-center text-11 text-fg-muted">
          The AI check is advice for the sponsor. The sponsor makes the final call.
        </p>
      </form>
    </Card>
  );
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** The gamer's own entry: 07D timeline + AI card + what happens next. */
function OwnEntry({ bounty, entry }: { bounty: Bounty; entry: BountySubmission }) {
  const checking = isAiChecking(entry);
  const decided = entry.status === SUBMISSION_STATUS.WINNER_APPROVED || entry.status === SUBMISSION_STATUS.DECLINED;
  const paid = entry.status === SUBMISSION_STATUS.WINNER_APPROVED && bounty.status === BOUNTY_STATUS.COMPLETED;

  let next: { tone: "info" | "success" | "neutral" | "warning"; text: string };
  if (paid) next = { tone: "success", text: "You won! Play2Pro confirmed the payout with PayPal." };
  else if (entry.status === SUBMISSION_STATUS.WINNER_APPROVED)
    next = { tone: "info", text: "The sponsor picked your entry. The payout is processing and shows here once PayPal confirms it." };
  else if (entry.status === SUBMISSION_STATUS.DECLINED) next = { tone: "neutral", text: "The sponsor didn't accept this entry." };
  else if (!isLive(bounty)) next = { tone: "neutral", text: "This bounty closed before the sponsor picked your entry." };
  else if (entry.aiFailed) next = { tone: "warning", text: "The AI check couldn't run. The sponsor will review your clip directly." };
  else if (checking) next = { tone: "info", text: "The AI is checking your clip. This usually takes under a minute." };
  else next = { tone: "info", text: "AI check done. Waiting for the sponsor to review." };

  const steps: Array<{ title: string; state: "done" | "active" | "waiting" }> = [
    { title: "Submitted", state: "done" },
    { title: "AI check", state: checking ? "active" : "done" },
    { title: "Sponsor review", state: decided ? "done" : checking ? "waiting" : "active" },
    { title: "Payout", state: paid ? "done" : entry.status === SUBMISSION_STATUS.WINNER_APPROVED ? "active" : "waiting" },
  ];

  return (
    <Card as="section" aria-labelledby="own-entry-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="own-entry-title" className="text-16 font-bold">
          Your entry
        </h2>
        <EntryBadge entry={entry} bounty={bounty} />
      </div>
      <ol aria-label="Entry progress" className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-inset p-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex flex-col items-center gap-1 text-center">
            <span
              aria-hidden="true"
              className={
                step.state === "done"
                  ? "flex size-7 items-center justify-center rounded-full bg-success/14 text-success"
                  : step.state === "active"
                    ? "flex size-7 items-center justify-center rounded-full bg-primary/14 text-primary"
                    : "flex size-7 items-center justify-center rounded-full border border-border text-11 font-bold text-fg-muted"
              }
            >
              {step.state === "done" ? (
                <Check className="size-3.5" />
              ) : step.state === "active" ? (
                <Spinner size={14} speed="slow" label={null} />
              ) : (
                index + 1
              )}
            </span>
            <span className={step.state === "waiting" ? "text-10 font-semibold text-fg-muted" : "text-10 font-semibold"}>
              {step.title}
            </span>
          </li>
        ))}
      </ol>
      <ClipLink entry={entry} />
      <AiAdvisory entry={entry} audience="gamer" />
      <p
        aria-live="polite"
        className={
          next.tone === "success"
            ? "text-13 font-semibold text-success"
            : next.tone === "warning"
              ? "text-13 text-warning"
              : "text-13 text-fg-secondary"
        }
      >
        {next.text}
      </p>
    </Card>
  );
}

/* ------------------------------ shared entry pieces ------------------------------ */

function EntryBadge({ entry, bounty, pendingWinner = false }: { entry: BountySubmission; bounty: Bounty; pendingWinner?: boolean }) {
  if (entry.status === SUBMISSION_STATUS.WINNER_APPROVED || pendingWinner) {
    return bounty.status === BOUNTY_STATUS.COMPLETED && !pendingWinner ? (
      <Badge tone="green">Winner, paid</Badge>
    ) : (
      <Badge tone="blue">Winner, payout pending</Badge>
    );
  }
  if (entry.status === SUBMISSION_STATUS.DECLINED) return <Badge tone="slate">Rejected</Badge>;
  if (isAiChecking(entry)) return <Badge tone="violet">AI checking</Badge>;
  if (entry.aiFailed) return <Badge tone="amber">Needs manual review</Badge>;
  return <Badge tone="violet">AI result ready</Badge>;
}

function ClipLink({ entry }: { entry: BountySubmission }) {
  if (!entry.clipUrl) return null;
  // Only https links are followed; anything else is shown as text.
  return isHttpsUrl(entry.clipUrl) ? (
    <a
      href={entry.clipUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 truncate text-12 font-semibold text-primary hover:underline"
    >
      <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
      Watch clip
    </a>
  ) : (
    <p className="truncate font-mono text-11 text-fg-muted">{entry.clipUrl}</p>
  );
}

/** 07D AI results card (violet). Always labelled advisory: it never moves money. */
function AiAdvisory({ entry, audience }: { entry: BountySubmission; audience: "gamer" | "sponsor" }) {
  if (isAiChecking(entry)) {
    return (
      <div role="status" className="flex items-center gap-2.5 rounded-lg border border-ai/35 bg-ai/14 px-4 py-3 text-12 text-ai">
        <Spinner size={16} speed="medium" label={null} />
        AI is checking the clip…
      </div>
    );
  }
  if (!entry.ai) {
    return entry.aiFailed ? (
      <p className="rounded-lg border border-dashed border-border px-4 py-3 text-12 text-fg-muted">
        The AI check couldn't run on this clip. Watch it and decide.
      </p>
    ) : null;
  }
  const { ai } = entry;
  const checks = [
    { label: "Right game", value: ai.matchesGame },
    { label: "Task completed", value: ai.taskCompleted },
    { label: "Looks original", value: ai.looksReused === undefined ? undefined : !ai.looksReused },
  ].filter((check): check is { label: string; value: boolean } => check.value !== undefined);

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-ai/35 bg-inset p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-13 font-bold text-ai">
          <Sparkles className="size-4" aria-hidden="true" />
          {ai.pass ? "AI: looks like a match" : "AI: may not match the task"}
        </p>
        <Badge tone="violet" size="sm">
          Advisory only
        </Badge>
      </div>
      {ai.confidence !== null && (
        <p className="text-11 text-fg-muted">Confidence {Math.round(ai.confidence * 100)}%</p>
      )}
      {checks.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {checks.map((check) => (
            <li key={check.label}>
              <Badge tone={check.value ? "green" : "amber"} size="sm" icon={check.value ? <Check className="size-2.5" /> : <X className="size-2.5" />}>
                {check.label}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {ai.reason && <p className="text-12 text-fg-secondary">"{ai.reason}"</p>}
      <p className="text-11 text-fg-muted">
        {audience === "sponsor"
          ? "The AI can be wrong. Watch the clip: your decision is final."
          : "This is advice for the sponsor. The sponsor makes the final call."}
      </p>
    </div>
  );
}

/* ------------------------------ sponsor review ------------------------------ */

type Decision = { kind: "confirm" | "reject"; entry: BountySubmission };

function ReviewPanel({
  bounty,
  sentWinnerId,
  onConfirmed,
  onRejected,
}: {
  bounty: Bounty;
  sentWinnerId: string | null;
  onConfirmed: (submissionId: string) => void;
  onRejected: () => void;
}) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const winner = bounty.submissions.find(
    (entry) => entry.status === SUBMISSION_STATUS.WINNER_APPROVED || entry.id === sentWinnerId,
  );
  const payoutPending = winner !== undefined && bounty.status !== BOUNTY_STATUS.COMPLETED;
  const canDecide = isLive(bounty) && !winner;

  return (
    <Card as="section" aria-labelledby="review-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="review-title" className="text-16 font-bold">
          Entries
        </h2>
        <span className="text-12 text-fg-muted">{bounty.submissions.length} submitted</span>
      </div>

      {payoutPending && isLive(bounty) && (
        <div role="status" className="flex items-start gap-2.5 rounded-lg border border-primary/35 bg-primary/14 px-4 py-3 text-12">
          <Spinner size={16} speed="slow" label={null} className="mt-0.5 text-primary" />
          <p>
            <strong>Winner confirmed.</strong> Play2Pro is capturing the held reward and paying out. This updates once
            PayPal confirms; nothing is marked paid before then.
          </p>
        </div>
      )}

      {bounty.submissions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-12 text-fg-muted">
          No entries yet. Gamers' clips show up here with the AI's advice.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {bounty.submissions.map((entry) => {
            const open =
              canDecide &&
              entry.status !== SUBMISSION_STATUS.DECLINED &&
              entry.status !== SUBMISSION_STATUS.WINNER_APPROVED;
            return (
              <li key={entry.id} className="flex flex-col gap-3 rounded-lg border border-border bg-inset p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-14 font-bold">{entry.gamerTag ?? "Gamer"}</p>
                  <EntryBadge entry={entry} bounty={bounty} pendingWinner={entry.id === sentWinnerId && entry.status !== SUBMISSION_STATUS.WINNER_APPROVED} />
                </div>
                <ClipLink entry={entry} />
                {entry.note && <p className="text-12 text-fg-secondary">{entry.note}</p>}
                <AiAdvisory entry={entry} audience="sponsor" />
                {open && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="success" size="sm" onClick={() => setDecision({ kind: "confirm", entry })}>
                      <CircleCheck className="size-3.5" aria-hidden="true" />
                      Confirm winner
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setDecision({ kind: "reject", entry })}>
                      <X className="size-3.5" aria-hidden="true" />
                      Reject
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {decision && (
        <DecisionDialog
          bounty={bounty}
          decision={decision}
          onClose={() => setDecision(null)}
          onDone={() => {
            setDecision(null);
            if (decision.kind === "confirm") onConfirmed(decision.entry.id);
            else onRejected();
          }}
        />
      )}
    </Card>
  );
}

function DecisionDialog({
  bounty,
  decision,
  onClose,
  onDone,
}: {
  bounty: Bounty;
  decision: Decision;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const confirming = decision.kind === "confirm";
  const name = decision.entry.gamerTag ?? "this gamer";

  async function run() {
    setBusy(true);
    setError(null);
    try {
      if (confirming) await confirmWinner(bounty.id, { submissionId: decision.entry.id });
      else await rejectEntry(bounty.id, decision.entry.id);
      toast.show(confirming ? "Winner confirmed. Waiting for PayPal to confirm the payout." : "Entry rejected.", {
        tone: confirming ? "info" : "success",
      });
      onDone();
    } catch (caught) {
      setBusy(false);
      if (caught instanceof ApiError && (caught.code === API_ERROR_CODE.FORBIDDEN_ROLE || caught.status === 403)) {
        setError({ title: "Not authorized", message: "Only the sponsor who created this bounty can do this." });
      } else {
        setError({
          title: confirming ? "Couldn't confirm the winner" : "Couldn't reject the entry",
          message: errorMessage(caught),
        });
      }
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      dismissible={!busy}
      title={confirming ? `Confirm ${name} as the winner?` : `Reject ${name}'s entry?`}
      description={
        confirming
          ? "This can't be undone."
          : "The gamer will see their entry wasn't accepted. The reward stays held for other entries."
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={confirming ? "success" : "primary"} onClick={run} loading={busy}>
            {confirming ? "Confirm winner" : "Reject entry"}
          </Button>
        </div>
      }
    >
      {confirming && (
        <div className="flex flex-col gap-2 text-13 text-fg-secondary">
          <p>
            Play2Pro will ask PayPal to capture the <strong className="text-fg">{formatMoney(bounty.reward)}</strong> held
            for this bounty and pay {name}, minus the platform commission.
          </p>
          <p className="text-12 text-fg-muted">
            The AI result is advice only. You'll see "Paid out" once PayPal confirms the capture.
          </p>
        </div>
      )}
      {error && <StatusPanel tone="danger" title={error.title} description={error.message} className="py-4" />}
    </Modal>
  );
}
