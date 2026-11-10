// AG Charts setup: module registration and the chart theme, built from styles/tokens.css.
// Chart imports this. Only the chart types the app draws are registered (line, area,
// horizontal bar on number/category/time axes), which keeps the lazy chunk small.

import {
  AreaSeriesModule,
  BarSeriesModule,
  CartesianChartModule,
  CategoryAxisModule,
  LegendModule,
  LineSeriesModule,
  ModuleRegistry,
  NumberAxisModule,
  TimeAxisModule,
  type AgChartTheme,
} from "ag-charts-community";

ModuleRegistry.registerModules([
  CartesianChartModule,
  LineSeriesModule,
  AreaSeriesModule,
  BarSeriesModule,
  NumberAxisModule,
  CategoryAxisModule,
  TimeAxisModule,
  LegendModule,
]);

/** Charts paint to a canvas, which can't read CSS variables, so resolve them once. */
function token(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

let cachedChartTheme: AgChartTheme | null = null;

/**
 * Every chart in the app is one series in the primary blue (validated against the dark
 * surface: lightness, chroma and 3:1 contrast pass). Thin marks: 2px lines, 8px markers,
 * area wash at 10%, 4px bar ends. Grid and axis lines are hairlines in the border colour.
 */
export function chartTheme(): AgChartTheme {
  if (cachedChartTheme) return cachedChartTheme;
  const primary = token("--color-primary", "#3b82f6");
  const surface = token("--color-surface", "#161b26");
  const inset = token("--color-inset", "#11151f");
  const border = token("--color-border", "#262e40");
  const fg = token("--color-fg", "#f8fafc");
  const fgSecondary = token("--color-fg-secondary", "#94a3b8");
  const fgMuted = token("--color-fg-muted", "#64748b");
  cachedChartTheme = {
    baseTheme: "ag-default-dark",
    palette: { fills: [primary], strokes: [primary] },
    params: {
      backgroundColor: surface,
      foregroundColor: fg,
      textColor: fgSecondary,
      subtleTextColor: fgMuted,
      axisLabelColor: fgMuted,
      axisLineColor: border,
      gridLineColor: border,
      gridLineWidth: 1,
      fontFamily: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      fontSize: 11,
      tooltipBackgroundColor: inset,
      tooltipTextColor: fg,
      chartPadding: 8,
    },
    overrides: {
      line: { series: { strokeWidth: 2, marker: { size: 8, strokeWidth: 2, stroke: surface } } },
      area: { series: { fillOpacity: 0.1, strokeWidth: 2, marker: { enabled: true, size: 8, strokeWidth: 2, stroke: surface } } },
      bar: { series: { cornerRadius: 4 } },
    },
  };
  return cachedChartTheme;
}
