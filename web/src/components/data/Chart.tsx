import { useMemo } from "react";
import { AgCharts } from "ag-charts-react";
import type { AgChartOptions } from "ag-charts-community";
import { chartTheme } from "./chart-setup.ts";

// The one AG Charts wrapper (README §8). Applies the app theme and a transparent
// background so the chart sits on its Card. `label` is the chart's accessible name;
// `summary` is read by screen readers in place of the canvas.

export interface ChartProps {
  options: AgChartOptions;
  label: string;
  /** Plain-text summary of what the chart shows. */
  summary: string;
  height?: number;
}

export function Chart({ options, label, summary, height = 240 }: ChartProps) {
  const themed = useMemo(
    () =>
      ({
        ...options,
        theme: chartTheme(),
        background: { visible: false },
        height,
      }) as AgChartOptions,
    [options, height],
  );
  return (
    <figure className="m-0 w-full" aria-label={label}>
      <AgCharts options={themed} style={{ height, width: "100%" }} />
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}
