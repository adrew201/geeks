import { useEffect, type ReactNode } from "react";
import { Link } from "react-router";
import { ArrowRight, Award, CloudUpload, Crosshair, Flame, RefreshCw, Wallet, type LucideIcon } from "lucide-react";
import { PageContainer, PageHeader } from "../../components/layout/PageHeader.tsx";
import { ROUTES } from "../../components/layout/nav-config.ts";
import { StatGrid, StatTile, StatTileSkeleton } from "../../components/data/StatTile.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button, ButtonLink } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { Skeleton } from "../../components/ui/Skeleton.tsx";
import { StatusPanel } from "../../components/ui/StatusPanel.tsx";
import { RAD_SCORE_LABEL } from "../../config/labels.ts";
import { formatMoney } from "../../lib/format-money.ts";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/use-media-query.ts";
import { CLIP_STATUS, type GamerDashboard } from "../../types/api.ts";
import { displayName, formatNumber, isClipAnalysed } from "../profile/profile-model.ts";
import { kindMeta, newestFirst } from "../wallet/wallet-model.ts";
import { ClipPipelineGrid } from "./ClipPipelineGrid.tsx";
import RadScoreChart from "./RadScoreChart.tsx";
import { radScoreChange } from "./rad-score.ts";
import { useOwnDashboard } from "./use-own-dashboard.ts";

// /dashboard: page 05 (Gamer Dashboard), owner only. Data: GET /gamers/:id/dashboard.
// 05D sections kept: welcome header, metric cards, quick actions, clip pipeline, earnings
// widget. Reworked: earnings are wallet entries (decision 3), not unlock sales; metrics
// without a contract field (Profile Views, Community Upvotes) are replaced by derived ones;
// 05D "Recent Activity" has no endpoint and is left out. The rad score chart is new
// (README: AG Charts dashboards).

const RECENT_ENTRIES = 3;

export default function DashboardPage() {
  const { status, dashboard, error, reload } = useOwnDashboard();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  useEffect(() => {
    document.title = "Dashboard · Play2Pro";
  }, []);

  const name = dashboard ? displayName(dashboard.profile) : null;

  return (
    <>
      <PageHeader
        title={name ? `Welcome back, ${name}!` : "Dashboard"}
        description="Here's how your Gamer ID, clips and earnings are doing."
        actions={
          <>
            <ButtonLink to={ROUTES.passport} variant="secondary" size={isDesktop ? "md" : "sm"}>
              <Award className="size-3.5" aria-hidden="true" />
              View Gamer ID
            </ButtonLink>
            <ButtonLink to={ROUTES.submitGameplay} size={isDesktop ? "md" : "sm"}>
              <CloudUpload className="size-3.5" aria-hidden="true" />
              Submit Gameplay
            </ButtonLink>
          </>
        }
      />
      <PageContainer>
        {status === "loading" && <DashboardSkeleton />}
        {status === "error" && (
          <Card>
            <StatusPanel
              tone="danger"
              title="Couldn't load your dashboard"
              description={error}
              actions={
                <Button variant="secondary" onClick={reload}>
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                  Try again
                </Button>
              }
            />
          </Card>
        )}
        {status === "ready" && dashboard && <DashboardBody dashboard={dashboard} compact={!isDesktop} />}
      </PageContainer>
    </>
  );
}

function DashboardBody({ dashboard, compact }: { dashboard: GamerDashboard; compact: boolean }) {
  const clips = dashboard.clips ?? [];
  const inAnalysis = clips.filter((clip) => clip.status === CLIP_STATUS.PENDING).length;
  const analysed = clips.filter(isClipAnalysed);
  const avgQuality =
    analysed.length > 0
      ? Math.round(analysed.reduce((sum, clip) => sum + (clip.aiQualityScore ?? 0), 0) / analysed.length)
      : null;
  const change = radScoreChange(dashboard.radScoreHistory);

  return (
    <>
      <StatGrid>
        <StatTile
          label={RAD_SCORE_LABEL}
          value={formatNumber(dashboard.profile.radScore)}
          emphasis="success"
          hint={change === null ? "Votes, bounties and tournaments" : `${change >= 0 ? "+" : "−"}${formatNumber(Math.abs(change))} over this period`}
        />
        <StatTile
          label="Gameplay clips"
          value={formatNumber(clips.length)}
          hint={inAnalysis > 0 ? `${inAnalysis} in AI analysis` : "All analysed"}
          tag={
            <Badge tone="violet" size="sm">
              AI parsed
            </Badge>
          }
        />
        <StatTile
          label="Avg AI quality"
          value={avgQuality === null ? "—" : `${avgQuality}/100`}
          hint={`Across ${analysed.length} analysed ${analysed.length === 1 ? "clip" : "clips"}`}
        />
        <StatTile
          label="Wallet balance"
          value={dashboard.walletBalance === undefined ? "—" : formatMoney(dashboard.walletBalance)}
          hint="Available to withdraw"
        />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <SectionTitle title={`${RAD_SCORE_LABEL} trend`} description="How your score moved as the community voted on your clips." />
          {dashboard.radScoreHistory.length > 0 ? (
            <RadScoreChart history={dashboard.radScoreHistory} height={compact ? 200 : 240} />
          ) : (
            <p className="py-10 text-center text-13 text-fg-muted">Your score history appears after your first votes.</p>
          )}
        </Card>
        <QuickActions />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <SectionTitle
            title="Gameplay processing pipeline"
            description="Track the AI analysis of the clips you've submitted."
            aside={
              <ButtonLink to={ROUTES.submitGameplay} variant="secondary" size="sm">
                <CloudUpload className="size-3.5" aria-hidden="true" />
                Add clip
              </ButtonLink>
            }
          />
          <ClipPipelineGrid clips={clips} compact={compact} />
        </Card>
        <EarningsWidget dashboard={dashboard} />
      </div>
    </>
  );
}

function SectionTitle({ title, description, aside }: { title: string; description?: string; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-16 font-bold">{title}</h2>
        {description && <p className="text-12 text-fg-muted">{description}</p>}
      </div>
      {aside}
    </div>
  );
}

const ACTIONS: Array<{ to: string; label: string; hint: string; icon: LucideIcon }> = [
  { to: ROUTES.submitGameplay, label: "Submit Gameplay", hint: "Add an external clip link", icon: CloudUpload },
  { to: ROUTES.passport, label: "Gamer ID", hint: "Review your AI insights", icon: Award },
  { to: ROUTES.arena, label: "Arena", hint: "Vote on player clips", icon: Flame },
  { to: ROUTES.bounties, label: "Bounties", hint: "Win sponsor rewards", icon: Crosshair },
];

/** 05D .action-tile grid (hover lift kept). */
function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-2 gap-3 self-start">
      {ACTIONS.map(({ to, label, hint, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-border-light hover:bg-surface-hover focus-visible:shadow-focus focus-visible:outline-none"
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-primary/14 text-primary" aria-hidden="true">
            <Icon className="size-4" />
          </span>
          <span className="text-13 font-bold">{label}</span>
          <span className="text-11 text-fg-muted">{hint}</span>
        </Link>
      ))}
    </nav>
  );
}

/** 05D "PayPal Earnings", rebuilt on the wallet ledger. */
function EarningsWidget({ dashboard }: { dashboard: GamerDashboard }) {
  const recent = newestFirst(dashboard.walletEntries ?? []).slice(0, RECENT_ENTRIES);
  return (
    <Card>
      <SectionTitle
        title="PayPal earnings"
        description="Credited once PayPal's webhook is verified."
        aside={
          <Badge tone="green" size="sm">
            Verified ledger
          </Badge>
        }
      />
      <div className="rounded-md border border-border bg-inset p-4">
        <p className="text-11 font-bold tracking-[0.5px] text-fg-muted uppercase">Available balance</p>
        <p className="font-display text-28 font-bold">{formatMoney(dashboard.walletBalance ?? 0)}</p>
      </div>
      {recent.length === 0 ? (
        <p className="text-13 text-fg-muted">No earnings yet. Share your Gamer ID so fans can donate.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border" aria-label="Recent wallet activity">
          {recent.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Badge tone={kindMeta(entry.kind).tone} size="sm">
                  {kindMeta(entry.kind).label}
                </Badge>
                <span className="truncate text-12 text-fg-muted">
                  {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
              <span className="font-display text-14 font-bold whitespace-nowrap">
                {entry.amount > 0 ? "+" : ""}
                {formatMoney(entry.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <ButtonLink to={ROUTES.wallet} variant="secondary" fullWidth>
        <Wallet className="size-3.5" aria-hidden="true" />
        Open wallet
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </ButtonLink>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading your dashboard">
      <StatGrid>
        {[0, 1, 2, 3].map((index) => (
          <StatTileSkeleton key={index} />
        ))}
      </StatGrid>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-56 w-full" />
        </Card>
        <Card>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </Card>
      </div>
    </div>
  );
}
