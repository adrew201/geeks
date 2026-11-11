import { useEffect, useState, type FormEvent } from "react";
import { Check, CloudUpload, Cpu, Info, Sparkles, X } from "lucide-react";
import { PageContainer, PageHeader } from "../../components/layout/PageHeader.tsx";
import { ROUTES } from "../../components/layout/nav-config.ts";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button, ButtonLink } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { Field, Input, Select, Textarea } from "../../components/ui/Field.tsx";
import type { Tone } from "../../components/ui/tone-styles.ts";
import { TrustBadge } from "../../components/ui/TrustBadge.tsx";
import { GAMES, GAME_SLUGS, type GameSlug } from "../../config/games.ts";
import { ApiError } from "../../lib/api-client.ts";
import { cn } from "../../lib/cn.ts";
import { CLIP_STATUS, type Clip } from "../../types/api.ts";
import { canTrackClip, fetchClip, submitClip } from "./api.ts";

// /clips/new (GAMER only, routes.tsx). Page 07: submission form, 4-step processing timeline and
// the AI results panel. The API takes title, link, game and description, so 07D's platform and
// match type are folded into the description. No Accept / Edit / Reject: the clip has no
// review fields. The real API has no GET /clips/:id, so a real submission stops at "Queued for
// AI"; the mocks play the whole timeline (features/clips/api.ts canTrackClip).

const PLATFORMS = ["PC", "PlayStation", "Xbox", "Mobile"] as const;
const MATCH_TYPES = ["Ranked competitive", "Official tournament", "Team scrim", "Casual / highlights"] as const;
const CLIP_HOSTS = ["youtube.com", "youtu.be", "twitch.tv"];
const POLL_MS = 1500;

interface Draft {
  url: string;
  title: string;
  game: GameSlug;
  platform: string;
  matchType: string;
  notes: string;
}

const EMPTY_DRAFT: Draft = { url: "", title: "", game: GAME_SLUGS[0]!, platform: "", matchType: "", notes: "" };

type Errors = Partial<Record<"url" | "title", string>>;

function isClipLink(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    return CLIP_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

/** "Platform: PC\nMatch type: Team scrim\n\n<notes>", or undefined when all are empty. */
function composeDescription({ platform, matchType, notes }: Draft): string | undefined {
  const meta = [platform && `Platform: ${platform}`, matchType && `Match type: ${matchType}`].filter(Boolean);
  const parts = [meta.join("\n"), notes.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

function submitErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return "Your account couldn't be found. Log out, log back in and try again.";
    if (error.status >= 400 && error.status < 500) return error.message;
  }
  return "We couldn't submit your clip. Check your connection and try again.";
}

const isFinished = (clip: Clip) => clip.status === CLIP_STATUS.COMPLETED || clip.status === CLIP_STATUS.FAILED;

export default function SubmitClipPage() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [clip, setClip] = useState<Clip | null>(null);
  const [trackError, setTrackError] = useState(false);

  useEffect(() => {
    document.title = "Submit Gameplay · Play2Pro";
  }, []);

  // Mock mode only: follow the clip until analysis finishes.
  useEffect(() => {
    if (!clip || !canTrackClip || isFinished(clip) || trackError) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchClip(clip.id, controller.signal).then(setClip, (error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setTrackError(true);
      });
    }, POLL_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [clip, trackError]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (key === "url" || key === "title") setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: Errors = {};
    if (!isClipLink(draft.url)) next.url = "Paste a YouTube or Twitch clip link.";
    if (!draft.title.trim()) next.title = "Give the clip a short title.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      setClip(
        await submitClip({
          videoUrl: draft.url.trim(),
          title: draft.title.trim(),
          game: GAMES[draft.game].name,
          description: composeDescription(draft),
        }),
      );
    } catch (error) {
      setSubmitError(submitErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setSubmitError(null);
    setClip(null);
    setTrackError(false);
  }

  return (
    <>
      <PageHeader
        title="Submit Gameplay"
        description="Share a clip so Play2Pro can find and show your strengths on your Gamer ID."
      />
      <PageContainer>
        <div className="grid items-start gap-6 lg:grid-cols-12">
          <Card as="section" className="lg:col-span-7">
            <h2 className="flex items-center gap-2 text-16 font-bold">
              <CloudUpload className="size-[18px] text-primary" aria-hidden="true" />
              Submit a gameplay clip
            </h2>
            <form noValidate onSubmit={submit}>
              <fieldset disabled={submitting || clip !== null} className="flex flex-col gap-4">
                <Field label="Gameplay video link" required error={errors.url}>
                  <Input
                    type="url"
                    inputMode="url"
                    value={draft.url}
                    placeholder="Paste a YouTube or Twitch clip link"
                    onChange={(event) => update("url", event.target.value)}
                  />
                </Field>
                <Field label="Title" required error={errors.title}>
                  <Input
                    value={draft.title}
                    maxLength={100}
                    placeholder="e.g. 1v3 clutch on Ascent"
                    onChange={(event) => update("title", event.target.value)}
                  />
                </Field>
                <Field label="Game" required>
                  <Select value={draft.game} onChange={(event) => update("game", event.target.value as GameSlug)}>
                    {GAME_SLUGS.map((slug) => (
                      <option key={slug} value={slug}>
                        {GAMES[slug].name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Platform">
                    <Select value={draft.platform} onChange={(event) => update("platform", event.target.value)}>
                      <option value="">Not specified</option>
                      {PLATFORMS.map((platform) => (
                        <option key={platform} value={platform}>
                          {platform}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Match type">
                    <Select value={draft.matchType} onChange={(event) => update("matchType", event.target.value)}>
                      <option value="">Not specified</option>
                      {MATCH_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="What happens in the clip" hint="Optional. The AI reads this along with the clip details.">
                  <Textarea
                    value={draft.notes}
                    maxLength={1000}
                    placeholder="Describe the key moments, e.g. 1v3 clutch with the Sheriff to win the round."
                    onChange={(event) => update("notes", event.target.value)}
                  />
                </Field>
              </fieldset>
              {submitError && (
                <p role="alert" className="mt-4 rounded-md border border-danger/35 bg-danger/14 px-3 py-2 text-12 text-danger">
                  {submitError}
                </p>
              )}
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                {clip ? (
                  <Button variant="secondary" size="lg" fullWidth onClick={reset}>
                    Submit another clip
                  </Button>
                ) : (
                  <Button type="submit" size="lg" fullWidth loading={submitting}>
                    <Sparkles className="size-4" aria-hidden="true" />
                    Submit for AI analysis
                  </Button>
                )}
                <p className="text-center text-11 text-fg-muted">
                  External video links only. Play2Pro doesn't store or host your videos.
                </p>
              </div>
            </form>
          </Card>

          <div className="flex flex-col gap-6 lg:col-span-5">
            <ProcessingCard clip={clip} trackError={trackError} />
            {clip?.status === CLIP_STATUS.COMPLETED && <ResultsCard clip={clip} />}
          </div>
        </div>
      </PageContainer>
    </>
  );
}

/* ------------------------------ timeline ------------------------------ */

type StepState = "idle" | "active" | "done" | "failed";

const STEPS = [
  { title: "Submitted", description: "Your link is saved to your clips." },
  { title: "Queued for AI", description: "Waiting for the clip analysis to start." },
  { title: "AI analysis", description: "Tagging key moments and scoring the clip." },
  { title: "Results ready", description: "Tags, key moments and a quality score." },
] as const;

function stepStates(clip: Clip | null): StepState[] {
  switch (clip?.status) {
    case undefined:
      return ["idle", "idle", "idle", "idle"];
    case CLIP_STATUS.PENDING:
      return ["done", "active", "idle", "idle"];
    case CLIP_STATUS.PROCESSING:
      return ["done", "done", "active", "idle"];
    case CLIP_STATUS.FAILED:
      return ["done", "done", "failed", "idle"];
    default:
      return ["done", "done", "done", "done"];
  }
}

const STATUS_BADGE: Record<string, { label: string; tone: Tone }> = {
  none: { label: "No clip submitted", tone: "slate" },
  [CLIP_STATUS.PENDING]: { label: "Queued", tone: "slate" },
  [CLIP_STATUS.PROCESSING]: { label: "AI analysis running", tone: "amber" },
  [CLIP_STATUS.COMPLETED]: { label: "Results ready", tone: "violet" },
  [CLIP_STATUS.FAILED]: { label: "Analysis failed", tone: "red" },
};

const NODE_STYLES: Record<StepState, string> = {
  idle: "border-border bg-inset text-fg-muted",
  active: "border-ai bg-ai/14 text-ai shadow-glow-ai",
  done: "border-success bg-success/14 text-success",
  failed: "border-danger bg-danger/14 text-danger",
};

function ProcessingCard({ clip, trackError }: { clip: Clip | null; trackError: boolean }) {
  const states = stepStates(clip);
  const badge = STATUS_BADGE[clip?.status ?? "none"] ?? STATUS_BADGE.none!;

  return (
    <Card as="section">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-14 font-bold">
          <Cpu className="size-4 text-ai" aria-hidden="true" />
          Gameplay processing
        </h2>
        <span aria-live="polite">
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </span>
      </div>
      <ol className="flex flex-col gap-4">
        {STEPS.map((step, index) => {
          const state = states[index]!;
          return (
            <li key={step.title} className="flex items-start gap-3" aria-current={state === "active" ? "step" : undefined}>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-11 font-bold",
                  NODE_STYLES[state],
                )}
                aria-hidden="true"
              >
                {state === "done" ? <Check className="size-3.5" /> : state === "failed" ? <X className="size-3.5" /> : index + 1}
              </span>
              <div>
                <p className={cn("text-13 font-bold", state === "idle" && "text-fg-muted")}>
                  {step.title}
                  <span className="sr-only">{state === "idle" ? "" : ` (${state === "active" ? "in progress" : state})`}</span>
                </p>
                <p className="text-11 text-fg-muted">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {clip && !canTrackClip && (
        <TimelineNote>
          Analysis runs in the background. Live status isn't available yet, so check your Dashboard in a few minutes.
        </TimelineNote>
      )}
      {clip && canTrackClip && trackError && (
        <TimelineNote>We lost track of this clip's status. It's still being analysed; check your Dashboard later.</TimelineNote>
      )}
      {clip?.status === CLIP_STATUS.FAILED && (
        <TimelineNote>The AI couldn't analyse this clip. Your clip is still saved; try submitting it again later.</TimelineNote>
      )}
      {clip && (clip.status === CLIP_STATUS.FAILED || !canTrackClip || trackError) && (
        <ButtonLink to={ROUTES.dashboard} variant="secondary" size="sm" className="self-start">
          Go to Dashboard
        </ButtonLink>
      )}
    </Card>
  );
}

function TimelineNote({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-dashed border-border px-3 py-2.5 text-12 text-fg-muted">
      <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

/* ------------------------------ AI results ------------------------------ */

function ResultsCard({ clip }: { clip: Clip }) {
  const moments = clip.keyMoments ?? [];
  return (
    <Card as="section" className="border-ai/35 bg-[radial-gradient(circle_at_100%_0%,color-mix(in_srgb,var(--color-ai)_10%,transparent),transparent_70%)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-14 font-bold text-ai">
          <Sparkles className="size-4" aria-hidden="true" />
          Gameplay insights
        </h2>
        <TrustBadge level="ai" />
      </div>
      <p className="-mt-2 text-11 text-fg-muted">Generated from your clip's link, title and description.</p>

      {clip.aiQualityScore !== null && (
        <p className="text-13">
          <span className="text-fg-secondary">AI quality score </span>
          <span className="font-display text-18 font-bold">{clip.aiQualityScore}</span>
          <span className="text-fg-muted">/100</span>
        </p>
      )}

      {clip.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="AI tags">
          {clip.tags.map((tag) => (
            <li
              key={tag}
              className="flex items-center gap-1 rounded-sm border border-ai/35 bg-ai/14 px-2.5 py-1 text-11 font-semibold text-ai"
            >
              <Check className="size-2.5" aria-hidden="true" />
              {tag}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-12 text-fg-muted">No tags for this clip.</p>
      )}

      {moments.length > 0 && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-inset p-3">
          <h3 className="text-12 font-semibold text-fg-secondary">Key moments</h3>
          <ul className="flex flex-col gap-1.5">
            {moments.map((moment) => (
              <li key={`${moment.t}-${moment.label}`} className="flex gap-3 text-12">
                <span className="w-10 shrink-0 font-semibold tabular-nums text-ai">{moment.t}</span>
                <span>{moment.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
