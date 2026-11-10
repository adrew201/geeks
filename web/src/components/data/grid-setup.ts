// AG Grid setup: module registration and the grid theme, built from styles/tokens.css.
// DataGrid imports this; pages import DataGrid. The dashboard pages are lazy routes
// (routes.tsx), so none of this ships with the feed. Only the modules the grids use are
// registered, to keep the bundle small; add one here if a grid option starts warning.

import {
  ClientSideRowModelModule,
  CsvExportModule,
  CellStyleModule,
  LocaleModule,
  ModuleRegistry,
  PaginationModule,
  QuickFilterModule,
  RowStyleModule,
  ValidationModule,
  colorSchemeDark,
  themeQuartz,
} from "ag-grid-community";

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  PaginationModule,
  QuickFilterModule,
  CsvExportModule,
  CellStyleModule,
  RowStyleModule,
  LocaleModule,
  // Explains misconfigured options in the console during development only.
  ...(import.meta.env.DEV ? [ValidationModule] : []),
]);

/**
 * The grid renders DOM, so its params can point straight at the token CSS variables.
 * Header = inset band like 08D .tx-table thead; rows = surface; hover = surface-hover.
 */
export const gridTheme = themeQuartz.withPart(colorSchemeDark).withParams({
  backgroundColor: "var(--color-surface)",
  foregroundColor: "var(--color-fg)",
  accentColor: "var(--color-primary)",
  borderColor: "var(--color-border)",
  chromeBackgroundColor: "var(--color-inset)",
  headerBackgroundColor: "var(--color-inset)",
  headerTextColor: "var(--color-fg-muted)",
  headerFontSize: 11,
  headerFontWeight: 700,
  rowHoverColor: "var(--color-surface-hover)",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  borderRadius: 6,
  wrapperBorderRadius: 14,
  spacing: 7,
});
