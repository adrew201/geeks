import { useMemo } from "react";
import type { AgChartOptions } from "ag-charts-community";
import { Chart } from "../../components/data/Chart.tsx";
import { formatMoney } from "../../lib/format-money.ts";
import type { BalancePoint, SourcePoint } from "./wallet-model.ts";

// 08D "Revenue Overview" and "Where your earnings come from", rebuilt on the ledger.
// Each is one series in the primary blue, so no legend; the card title names it.
// Balance: line with a 10% area wash and crosshair tooltip. Sources: horizontal bars,
// value labels at the tip (bars ≤ 24px, 4px rounded ends).

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const dollars = (value: number) => formatMoney(Math.round(value * 100));

export function BalanceChart({ points, height = 240 }: { points: BalancePoint[]; height?: number }) {
  const options = useMemo<AgChartOptions>(
    () => ({
      data: points,
      series: [
        {
          type: "area",
          xKey: "date",
          yKey: "balance",
          yName: "Balance",
          tooltip: {
            renderer: ({ datum }: { datum: BalancePoint }) => ({
              heading: dateFormat.format(datum.date),
              data: [
                { label: "Balance", value: dollars(datum.balance) },
                { label: "After", value: datum.label },
              ],
            }),
          },
        },
      ],
      axes: {
        x: { type: "time", position: "bottom", label: { format: "%b %d" }, gridLine: { enabled: false } },
        y: { type: "number", position: "left", label: { formatter: ({ value }: { value: number }) => dollars(value) } },
      },
      legend: { enabled: false },
    }),
    [points],
  );
  const last = points.at(-1);
  const summary = last
    ? `Wallet balance over ${points.length} transactions, ending at ${dollars(last.balance)} on ${dateFormat.format(last.date)}.`
    : "No transactions in this period.";
  return <Chart options={options} label="Wallet balance over time" summary={summary} height={height} />;
}

export function SourcesChart({ points, height = 200 }: { points: SourcePoint[]; height?: number }) {
  const options = useMemo<AgChartOptions>(
    () => ({
      data: points,
      series: [
        {
          type: "bar",
          direction: "horizontal",
          xKey: "source",
          yKey: "amount",
          yName: "Earned",
          // Mark spec: bars are capped at 24px thick.
          width: 22,
          label: {
            enabled: true,
            placement: "outside-end",
            formatter: ({ value }: { value: number }) => dollars(value),
          },
          tooltip: {
            renderer: ({ datum }: { datum: SourcePoint }) => ({
              heading: datum.source,
              data: [{ label: "Earned", value: dollars(datum.amount) }],
            }),
          },
        },
      ],
      axes: {
        x: { type: "category", position: "left", gridLine: { enabled: false } },
        // 25% headroom so the dollar label at the end of the longest bar fits.
        y: {
          type: "number",
          position: "bottom",
          min: 0,
          max: Math.max(1, ...points.map((point) => point.amount)) * 1.25,
          label: { formatter: ({ value }: { value: number }) => dollars(value) },
        },
      },
      legend: { enabled: false },
    }),
    [points],
  );
  const summary = points.map((point) => `${point.source}: ${dollars(point.amount)}`).join(", ");
  return <Chart options={options} label="Earnings by source" summary={summary || "No earnings in this period."} height={height} />;
}
