import type { ReactNode } from "react";
import { Gem, Lock, SlidersHorizontal } from "lucide-react";
import { ROUTES } from "../../components/layout/nav-config.ts";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button, ButtonLink } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { Field, Input, Select } from "../../components/ui/Field.tsx";
import { RAD_SCORE_LABEL } from "../../config/labels.ts";
import type { RecommendationEntitlements } from "../plans/plans.ts";
import { DEFAULT_SETTINGS, SORT, type RecommendationSettings, type SortMode } from "./recommendation-settings.ts";

// Coach recommendation settings (Coach Pro unlocks all; see plans.ts). Locked controls stay
// visible but disabled, with an upgrade link, so a free coach sees what Pro adds.

export interface RecommendationSettingsCardProps {
  settings: RecommendationSettings;
  onChange: (next: RecommendationSettings) => void;
  allowed: RecommendationEntitlements;
  games: string[];
  regions: string[];
}

function ProLabel({ children, locked }: { children: ReactNode; locked: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {children}
      {locked && (
        <Badge tone="violet" size="sm" icon={<Lock className="size-3" aria-hidden="true" />}>
          Coach Pro
        </Badge>
      )}
    </span>
  );
}

export function RecommendationSettingsCard({ settings, onChange, allowed, games, regions }: RecommendationSettingsCardProps) {
  const s = allowed.settings;
  const anyLocked = !s.region || !s.minRadScore || !s.sort;
  const set = <K extends keyof RecommendationSettings>(key: K, value: RecommendationSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
          <h2 className="text-16 font-bold">Recommendation settings</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge size="sm">Up to {allowed.maxMatches} matches</Badge>
          <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_SETTINGS)}>
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Game">
          <Select value={settings.game} disabled={!s.game} onChange={(e) => set("game", e.target.value)}>
            <option value="">All games</option>
            {games.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={<ProLabel locked={!s.region}>Region</ProLabel>}>
          <Select value={settings.region} disabled={!s.region} onChange={(e) => set("region", e.target.value)}>
            <option value="">Any region</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={<ProLabel locked={!s.minRadScore}>Minimum {RAD_SCORE_LABEL}</ProLabel>}>
          <Input
            type="number"
            min={0}
            max={100}
            step={1}
            disabled={!s.minRadScore}
            value={settings.minRadScore}
            onChange={(e) => set("minRadScore", Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
          />
        </Field>
        <Field label={<ProLabel locked={!s.sort}>Sort</ProLabel>}>
          <Select value={settings.sort} disabled={!s.sort} onChange={(e) => set("sort", e.target.value as SortMode)}>
            <option value={SORT.BEST}>Best {RAD_SCORE_LABEL} first</option>
            <option value={SORT.HIDDEN_GEMS}>Hidden gems (rising talent first)</option>
          </Select>
        </Field>
      </div>

      {anyLocked && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-inset px-4 py-3">
          <p className="text-12 text-fg-secondary">
            Coach Pro unlocks region, minimum score and sort, and shows up to 12 matches.
          </p>
          <ButtonLink to={ROUTES.upgrade} variant="paypal" size="sm">
            <Gem className="size-3.5" aria-hidden="true" />
            Upgrade
          </ButtonLink>
        </div>
      )}
    </Card>
  );
}
