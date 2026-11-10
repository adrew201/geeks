import { useMemo } from "react";
import type { AgChartOptions } from "ag-charts-community";
import { Chart } from "../../components/data/Chart.tsx";
import { RAD_SCORE_LABEL } from "../../config/labels.ts";
import type { GamerDashboard } from "../../types/api.ts";

// Rad score over time from GET /gamers/:id/dashboard `radScoreHistory` (README §14 "Stats for
// AG Charts"). One series, so no legend: the card title names it. Crosshair + tooltip on
// hover. Used on /dashboard (owner) and on the Gamer profile for coaches and sponsors.
// Default export so the profile page can lazy-load it (keeps AG Charts out of its bundle).

const numberFormat = new Intl.NumberFormat("en-US");
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export interface RadScoreChartProps {
  history: GamerDashboard["radScoreHistory"];
  height?: number;
}

export default function RadScoreChart({ history, height = 240 }: RadScoreChartProps) {
  const data = useMemo(
    () =>
      [...history]
        .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
        .map((point) => ({ date: new Date(point.date), radScore: point.radScore })),
    [history],
  );

  const options = useMemo<AgChartOptions>(
    () => ({
      data,
      series: [
        {
          type: "line",
          xKey: "date",
          yKey: "radScore",
          yName: RAD_SCORE_LABEL,
          interpolation: { type: "smooth" },
          tooltip: {
            renderer: ({ datum }: { datum: { date: Date; radScore: number } }) => ({
              heading: dateFormat.format(datum.date),
              data: [{ label: RAD_SCORE_LABEL, value: numberFormat.format(datum.radScore) }],
            }),
          },
        },
      ],
      axes: {
        x: { type: "time", position: "bottom", label: { format: "%b %d" }, gridLine: { enabled: false } },
        y: { type: "number", position: "left", label: { formatter: ({ value }: { value: number }) => numberFormat.format(value) } },
      },
      legend: { enabled: false },
    }),
    [data],
  );

  if (data.length === 0) return null;
  const first = data[0]!;
  const last = data.at(-1)!;
  const summary = `${RAD_SCORE_LABEL} went from ${numberFormat.format(first.radScore)} on ${dateFormat.format(first.date)} to ${numberFormat.format(last.radScore)} on ${dateFormat.format(last.date)}.`;

  return <Chart options={options} label={`${RAD_SCORE_LABEL} over time`} summary={summary} height={height} />;
}
