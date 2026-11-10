import { cn } from "../../lib/cn.ts";
import type { Metric } from "./profile-model.ts";

// 12D SECTION C .metrics-row-grid and 12M .metric-grid-m.
// Hidden (no contract field): 12D "Community Votes" (12M "Votes") and "Profile Views".
// The rad score uses 12D's green value colour.

export function DesktopMetrics({ metrics }: { metrics: Metric[] }) {
  return (
    <section aria-label="Performance overview">
      <dl className="grid grid-cols-4 gap-5">
        {metrics.map((metric) => (
          <div
            key={metric.key}
            className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-5 shadow-card"
          >
            <dt className="text-11 font-bold tracking-[0.5px] text-fg-muted uppercase">{metric.label}</dt>
            <dd
              className={cn(
                "font-display text-28 leading-none font-bold",
                metric.key === "rad-score" ? "text-success" : "text-fg",
              )}
            >
              {metric.value}
            </dd>
            <dd className="text-10 text-fg-muted">{metric.hint}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** 12M shows two boxes: the rad score plus the most useful second number available. */
export function MobileMetrics({ metrics }: { metrics: Metric[] }) {
  const second = metrics.find((metric) => metric.key === "clips") ?? metrics.find((metric) => metric.key === "rad-change");
  const shown = [metrics[0], second].filter((metric): metric is Metric => Boolean(metric));
  return (
    <section aria-label="Performance overview">
      <dl className="grid grid-cols-2 gap-2">
        {shown.map((metric) => (
          <div key={metric.key} className="rounded-8 border border-border bg-inset p-2.5">
            <dt className="text-9 text-fg-muted uppercase">{metric.shortLabel}</dt>
            <dd
              className={cn("font-display text-16 font-bold", metric.key === "rad-score" ? "text-success" : "text-fg")}
            >
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
