import { useMemo } from "react";
import type { AgChartOptions } from "ag-charts-community";
import { Chart } from "../../components/data/Chart.tsx";
import { RAD_SCORE_LABEL } from "../../config/labels.ts";
import type { LeaderboardEntry } from "../../types/api.ts";
import { talentByGame, type GamePoint } from "./talent-model.ts";

// Where the ranked talent plays: gamers per primary game, with the best rad score in the
// tooltip. One series (primary blue), horizontal bars, counts at the bar tips.

const numberFormat = new Intl.NumberFormat("en-US");

export function TalentByGameChart({ entries }: { entries: LeaderboardEntry[] }) {
  const points = useMemo(() => talentByGame(entries), [entries]);
  const maxGamers = points.reduce((max, point) => Math.max(max, point.gamers), 0);
  const options = useMemo<AgChartOptions>(
    () => ({
      data: points,
      series: [
        {
          type: "bar",
          direction: "horizontal",
          xKey: "game",
          yKey: "gamers",
          yName: "Gamers",
          // Mark spec: bars are capped at 24px thick.
          width: 22,
          label: { enabled: true, placement: "outside-end" },
          tooltip: {
            renderer: ({ datum }: { datum: GamePoint }) => ({
              heading: datum.game,
              data: [
                { label: "Ranked gamers", value: numberFormat.format(datum.gamers) },
                { label: `Top ${RAD_SCORE_LABEL}`, value: numberFormat.format(datum.topScore) },
              ],
            }),
          },
        },
      ],
      axes: {
        x: { type: "category", position: "left", gridLine: { enabled: false } },
        // One step of headroom so the count label at the end of the longest bar isn't clipped.
        y: { type: "number", position: "bottom", interval: { step: 1 }, min: 0, max: maxGamers + 1 },
      },
      legend: { enabled: false },
    }),
    [points, maxGamers],
  );
  if (points.length === 0) return null;
  const summary = points.map((point) => `${point.game}: ${point.gamers}`).join(", ");
  return (
    <Chart
      options={options}
      label="Ranked gamers by game"
      summary={summary}
      height={Math.max(140, points.length * 52 + 40)}
    />
  );
}
