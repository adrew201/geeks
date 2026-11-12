import { Award, Cpu, Info } from "lucide-react";
import { Card } from "../../components/ui/Card.tsx";
import { TrustBadge } from "../../components/ui/TrustBadge.tsx";
import type { TrustLevel } from "../../config/labels.ts";
import { cn } from "../../lib/cn.ts";
import type { AiSkillSummary } from "../../types/api.ts";
import { IncompleteNotice, MetaPill, SectionHeader } from "./ProfileParts.tsx";
import { TRUST_DESCRIPTIONS } from "./profile-model.ts";

// Skills Passport blocks for viewers (12D SECTION D–F, 12M passport card).
//
// Hidden: the 12D "Skill Assessment" bars and the 06D "Skills Assessment Metrics" bars.
// Their per-skill scores (Strategy 88%, Reflexes & Aim 92%, ...) have no contract field;
// README §10 gives the AI summary only `summary`, `strengths` and `roles`. StrengthsCard
// shows those real fields in the same slot.
// Animation notes kept from the prototypes (docs/ui-audit.md §5b/§5c), not implemented:
// - 06D:958 "Demonstration metric cards. Dynamic radar/score metrics expand as backend AI
//   capability is confirmed." The dynamic radar has no data and no HTML; not built.
// - 12D skill bars are static widths with no fill animation (ProgressBar "skill" variant
//   matches them if scores ever ship).
// Also hidden: 12D "View Full Passport" (this page is the full passport).

const AI_DISCLAIMER =
  "AI-generated observations are based on available submitted gameplay evidence and may not represent overall performance.";

/** 12D state C, verbatim. */
export function NotAssessed({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("text-center text-fg-muted", compact ? "py-2 text-11" : "p-5 text-13")}>
      {!compact && <Cpu className="mx-auto mb-2 size-6 opacity-50" aria-hidden="true" />}
      <strong className="block uppercase">Not yet assessed</strong>
      AI assessment is not yet available for this profile.
    </div>
  );
}

/** 12D SECTION D "Skills Passport". */
export function PassportCard({ summary, missing }: { summary: AiSkillSummary | null; missing: string[] }) {
  return (
    <Card as="section" large aria-labelledby="passport-title">
      <SectionHeader
        id="passport-title"
        title="Gamer ID"
        subtitle="Performance evidence summary"
        aside={summary && <TrustBadge level="ai" />}
      />
      {missing.length > 0 && <IncompleteNotice missing={missing} owner={false} />}
      {summary ? (
        <>
          <blockquote className="rounded-md border border-ai/35 bg-ai/14 p-4 text-13 leading-[1.6]">
            “{summary.summary}”
          </blockquote>
          <p className="flex items-center gap-1.5 text-11 text-fg-muted">
            <Info className="size-3.5 shrink-0" aria-hidden="true" />
            {AI_DISCLAIMER}
          </p>
        </>
      ) : (
        <NotAssessed />
      )}
    </Card>
  );
}

/** In place of 12D "Skill Assessment" / 06D skill bars: the summary's strengths and roles. */
export function StrengthsCard({ summary }: { summary: AiSkillSummary }) {
  const groups = [
    { label: "Strengths", items: summary.strengths },
    { label: "Roles", items: summary.roles },
  ].filter((group) => group.items.length > 0);
  if (groups.length === 0) return null;
  return (
    <Card as="section" large aria-labelledby="strengths-title">
      <SectionHeader
        id="strengths-title"
        icon={<Award className="text-primary" aria-hidden="true" />}
        title="Strengths & roles"
        aside={<TrustBadge level="ai" />}
      />
      <div className="flex flex-col gap-3.5">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <h3 className="text-11 font-bold tracking-[0.5px] text-fg-muted uppercase">{group.label}</h3>
            <ul className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <li key={item}>
                  <MetaPill>{item}</MetaPill>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

const TRUST_COLUMNS = ["grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4"];

/** 12D SECTION F trust bar: explains only the badges this page actually shows. */
export function TrustBar({ levels }: { levels: TrustLevel[] }) {
  if (levels.length === 0) return null;
  return (
    <section
      aria-label="What the trust badges mean"
      className={cn("grid gap-4 rounded-lg bg-inset px-5 py-4", TRUST_COLUMNS[levels.length - 1])}
    >
      {levels.map((level) => (
        <div key={level} className="flex flex-col gap-1">
          <TrustBadge level={level} className="self-start" />
          <span className="mt-1 text-11 text-fg-muted">{TRUST_DESCRIPTIONS[level]}</span>
        </div>
      ))}
    </section>
  );
}

/** 12M PASSPORT SUMMARY MOBILE. */
export function MobilePassportCard({ summary, missing }: { summary: AiSkillSummary | null; missing: string[] }) {
  return (
    <section aria-labelledby="passport-title" className="flex flex-col gap-2.5 rounded-lg bg-surface p-3">
      <SectionHeader id="passport-title" size="xs" title="Gamer ID" aside={summary && <TrustBadge level="ai" size="sm" />} />
      {missing.length > 0 && <IncompleteNotice missing={missing} owner={false} compact />}
      {summary ? (
        <p className="text-11 leading-[1.4] text-fg-secondary">“{summary.summary}”</p>
      ) : (
        <NotAssessed compact />
      )}
    </section>
  );
}
