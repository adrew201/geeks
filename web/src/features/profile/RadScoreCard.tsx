import { lazy, Suspense } from "react";
import { Card } from "../../components/ui/Card.tsx";
import { Skeleton } from "../../components/ui/Skeleton.tsx";
import { RAD_SCORE_LABEL } from "../../config/labels.ts";
import type { GamerDashboard } from "../../types/api.ts";

// The gamer's rad score trend for coaches (read-only dashboard) and sponsors (summary only),
// from GET /gamers/:id/dashboard `radScoreHistory` (README §18 "Who sees what"). The chart is
// lazy-loaded so AG Charts stays out of the public profile bundle.

const RadScoreChart = lazy(() => import("../dashboard/RadScoreChart.tsx"));

export function RadScoreCard({ dashboard, compact = false }: { dashboard: GamerDashboard | null; compact?: boolean }) {
  if (!dashboard || dashboard.radScoreHistory.length < 2) return null;
  const height = compact ? 180 : 220;
  return (
    <Card padding={compact ? "sm" : "md"}>
      <div>
        <h2 className="text-16 font-bold">{RAD_SCORE_LABEL} trend</h2>
        <p className="text-12 text-fg-muted">How this gamer's score moved as the community voted on their clips.</p>
      </div>
      <Suspense fallback={<Skeleton className={compact ? "h-[180px] w-full" : "h-[220px] w-full"} />}>
        <RadScoreChart history={dashboard.radScoreHistory} height={height} />
      </Suspense>
    </Card>
  );
}
