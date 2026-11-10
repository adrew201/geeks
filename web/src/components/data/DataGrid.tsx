import { type Ref } from "react";
import { AgGridReact } from "ag-grid-react";
import type { CellKeyDownEvent, ColDef, GetRowIdParams, RowClickedEvent } from "ag-grid-community";
import { gridTheme } from "./grid-setup.ts";

// The one AG Grid wrapper (README §8: AG Grid for the dashboards). Grows with its rows
// (autoHeight) and pages after `pageSize` rows. Row clicks also fire on Enter, so a
// clickable row works from the keyboard.

export interface DataGridProps<T> {
  /** null = loading (the grid shows its loading overlay). */
  rows: T[] | null;
  columns: ColDef<T>[];
  /** Accessible name for the grid. */
  label: string;
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Shown when `rows` is empty. */
  emptyMessage?: string;
  /** Text filter across every column (AG Grid quick filter). */
  quickFilter?: string;
  pageSize?: number;
  /** Taller rows for two-line cells. */
  rowHeight?: number;
  gridRef?: Ref<AgGridReact<T>>;
}

const DEFAULT_COL_DEF: ColDef = {
  sortable: true,
  resizable: true,
  suppressMovable: true,
  flex: 1,
  minWidth: 90,
};

export function DataGrid<T>({
  rows,
  columns,
  label,
  getRowId,
  onRowClick,
  emptyMessage = "Nothing to show yet.",
  quickFilter,
  pageSize = 10,
  rowHeight,
  gridRef,
}: DataGridProps<T>) {
  const paginate = (rows?.length ?? 0) > pageSize;
  return (
    <div role="region" aria-label={label} className="w-full">
      <AgGridReact<T>
        ref={gridRef}
        theme={gridTheme}
        rowData={rows ?? []}
        loading={rows === null}
        columnDefs={columns}
        defaultColDef={DEFAULT_COL_DEF as ColDef<T>}
        getRowId={(params: GetRowIdParams<T>) => getRowId(params.data)}
        domLayout="autoHeight"
        rowHeight={rowHeight}
        pagination={paginate}
        paginationPageSize={pageSize}
        paginationPageSizeSelector={false}
        quickFilterText={quickFilter}
        localeText={{ noRowsToShow: emptyMessage }}
        suppressCellFocus={!onRowClick}
        rowClass={onRowClick ? "cursor-pointer" : undefined}
        onRowClicked={onRowClick ? (event: RowClickedEvent<T>) => event.data && onRowClick(event.data) : undefined}
        onCellKeyDown={
          onRowClick
            ? (event: CellKeyDownEvent<T>) => {
                const key = (event.event as KeyboardEvent | null)?.key;
                if (key === "Enter" && event.data) onRowClick(event.data);
              }
            : undefined
        }
      />
    </div>
  );
}
