import { useId, useState, type ReactNode } from "react";
import { Check, Cpu, PenLine, Sparkles, X } from "lucide-react";
import { ROUTES } from "../../components/layout/nav-config.ts";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button, ButtonLink } from "../../components/ui/Button.tsx";
import { Textarea } from "../../components/ui/Field.tsx";
import { Modal } from "../../components/ui/Modal.tsx";
import { TrustBadge } from "../../components/ui/TrustBadge.tsx";
import { cn } from "../../lib/cn.ts";
import type { GamerProfile } from "../../types/api.ts";
import { SectionHeader } from "./ProfileParts.tsx";
import { isSummaryPending } from "./profile-model.ts";
import type { OwnerAction } from "./use-gamer-profile.ts";

// Owner review of the AI skill summary: 06D SECTION D .ai-card and 06M AI SUMMARY CARD.
// Accept / Reject / Edit persist through the UNCONFIRMED profile update (features/profile/api.ts).
// - Accept: only while the summary awaits review (AI_SUMMARY_STATUS in types/api.ts).
// - Reject: removes the summary (with a confirmation, since there's no undo).
// - Edit (desktop only; 06M has no Edit): an inline textarea instead of 06D's contentEditable.
// Hidden: 06D meta bar "Source: Clip Analysis Engine v2.4 / Analyzed: Oct 28" (no fields).

const MAX_SUMMARY_LENGTH = 1000;

export interface AiSummaryReviewProps {
  profile: GamerProfile;
  pendingAction: OwnerAction | null;
  onAccept: () => Promise<boolean>;
  onReject: () => Promise<boolean>;
  onEdit: (summary: string) => Promise<boolean>;
  layout: "desktop" | "mobile";
}

export function AiSummaryReview({ profile, pendingAction, onAccept, onReject, onEdit, layout }: AiSummaryReviewProps) {
  const desktop = layout === "desktop";
  const summary = profile.aiSummary;
  const pending = isSummaryPending(profile);
  const [draft, setDraft] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const editorId = useId();
  const busy = pendingAction !== null;

  const statusBadge = pending ? (
    <Badge tone="amber" size={desktop ? "md" : "sm"}>
      Needs review
    </Badge>
  ) : (
    <TrustBadge level="ai" size={desktop ? "md" : "sm"} />
  );

  const header = (
    <SectionHeader
      id="ai-summary-title"
      size={desktop ? "md" : "sm"}
      icon={<Sparkles className="text-ai" aria-hidden="true" />}
      title={desktop ? "AI Player Insight Summary" : "AI Player Insight"}
      aside={summary && statusBadge}
    />
  );

  if (!summary) {
    return (
      <Shell desktop={desktop}>
        {header}
        <div className={cn("flex flex-col items-center gap-2 text-center text-fg-muted", desktop ? "p-5 text-13" : "py-2 text-12")}>
          <Cpu className="size-6 opacity-50" aria-hidden="true" />
          <strong className="uppercase">Not yet assessed</strong>
          <p>Submit gameplay clips and the AI will summarise your skills here.</p>
          <ButtonLink to={ROUTES.submitGameplay} variant="ai" size="sm" className="mt-1">
            Submit gameplay
          </ButtonLink>
        </div>
      </Shell>
    );
  }

  const editing = draft !== null;
  const trimmed = draft?.trim() ?? "";
  const canSave = trimmed !== "" && trimmed !== summary.summary;

  async function save() {
    if (!canSave) return;
    if (await onEdit(trimmed)) setDraft(null);
  }

  async function reject() {
    if (await onReject()) setConfirmReject(false);
  }

  return (
    <Shell desktop={desktop}>
      <div className="flex flex-col gap-2">
        {header}
        <p className="text-12 text-fg-muted">
          {pending
            ? "Only you can see this until you accept it."
            : desktop
              ? "Automated clip analysis generated from submitted gameplay evidence. Shown on your public Gamer ID."
              : "Shown on your public Gamer ID."}
        </p>
      </div>

      {editing ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={editorId} className="sr-only">
            Edit AI summary
          </label>
          <Textarea
            id={editorId}
            value={draft}
            maxLength={MAX_SUMMARY_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            rows={5}
            className="leading-[1.6]"
            autoFocus
          />
          <p className="text-right text-11 text-fg-muted">
            {draft.length}/{MAX_SUMMARY_LENGTH}
          </p>
        </div>
      ) : (
        <blockquote
          className={cn(
            "rounded-md border border-dashed border-ai/35 bg-ai/14 text-fg",
            desktop ? "p-4 text-14 leading-[1.6]" : "rounded-sm p-2.5 text-12 leading-normal",
          )}
        >
          “{summary.summary}”
        </blockquote>
      )}

      <div className={cn("flex items-center gap-2.5", desktop && "mt-auto border-t border-border pt-4")}>
        {editing ? (
          <>
            <Button variant="ai" size="sm" onClick={save} disabled={!canSave} loading={pendingAction === "edit"}>
              <Check className="size-3.5" aria-hidden="true" />
              Save summary
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)} disabled={busy}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            {pending && (
              <Button
                variant="ai"
                size="sm"
                className={cn(!desktop && "flex-1")}
                onClick={onAccept}
                disabled={busy}
                loading={pendingAction === "accept"}
              >
                {desktop && <Check className="size-3.5" aria-hidden="true" />}
                {desktop ? "Accept Summary" : "Accept"}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              className={cn(!desktop && "flex-1")}
              onClick={() => setConfirmReject(true)}
              disabled={busy}
            >
              {desktop && <X className="size-3.5" aria-hidden="true" />}
              Reject
            </Button>
            {desktop && (
              <Button variant="ghost" size="sm" onClick={() => setDraft(summary.summary)} disabled={busy}>
                <PenLine className="size-3.5" aria-hidden="true" />
                Edit
              </Button>
            )}
          </>
        )}
      </div>

      <Modal
        open={confirmReject}
        onClose={() => setConfirmReject(false)}
        dismissible={pendingAction !== "reject"}
        size="sm"
        title="Reject the AI summary?"
        footer={
          <>
            <Button fullWidth onClick={reject} loading={pendingAction === "reject"}>
              Reject summary
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setConfirmReject(false)}
              disabled={pendingAction === "reject"}
            >
              Keep it
            </Button>
          </>
        }
      >
        <p className="text-13 text-fg-secondary">
          The summary will be removed from your Gamer ID. You can't undo this.
        </p>
      </Modal>
    </Shell>
  );
}

/** 06D .ai-card (radius-lg, 24px) / 06M AI card (16px): violet border and corner glow. */
function Shell({ desktop, children }: { desktop: boolean; children: ReactNode }) {
  return (
    <section
      aria-labelledby="ai-summary-title"
      className={cn(
        "flex flex-col rounded-lg border border-ai/35 bg-surface bg-glow-ai",
        desktop ? "h-full gap-4 p-6 shadow-card" : "gap-2.5 p-4",
      )}
    >
      {children}
    </section>
  );
}
