import { useMemo, type Ref } from "react";
import type { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { DataGrid } from "../../components/data/DataGrid.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import { formatMoney } from "../../lib/format-money.ts";
import type { WalletEntry } from "../../types/api.ts";
import { kindMeta } from "./wallet-model.ts";

// 08D "Recent Transactions" (.tx-table) as an AG Grid: sortable, paged, CSV export from the
// page header, and a row click (or Enter) opens the 08D transaction details modal.
// Columns reworked for the ledger: no content title or buyer (unlock sales are gone).
// Values are exported as plain text (kind label, dollars), not badges.

const dateFormat = new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric" });

function KindCell({ data }: ICellRendererParams<WalletEntry>) {
  if (!data) return null;
  const meta = kindMeta(data.kind);
  return (
    <Badge tone={meta.tone} size="sm">
      {meta.label}
    </Badge>
  );
}

function AmountCell({ data }: ICellRendererParams<WalletEntry>) {
  if (!data) return null;
  return (
    <span className="font-display font-bold">
      {data.amount > 0 ? "+" : ""}
      {formatMoney(data.amount)}
    </span>
  );
}

export interface TransactionsGridProps {
  entries: WalletEntry[];
  compact: boolean;
  onOpen: (entry: WalletEntry) => void;
  gridRef?: Ref<AgGridReact<WalletEntry>>;
}

export function TransactionsGrid({ entries, compact, onOpen, gridRef }: TransactionsGridProps) {
  const columns = useMemo<ColDef<WalletEntry>[]>(() => {
    const date: ColDef<WalletEntry> = {
      headerName: "Date",
      field: "createdAt",
      sort: "desc",
      valueFormatter: ({ value }) => (value ? dateFormat.format(new Date(value as string)) : ""),
      comparator: (a: string, b: string) => Date.parse(a) - Date.parse(b),
      minWidth: compact ? 96 : 110,
    };
    const kind: ColDef<WalletEntry> = {
      headerName: "Type",
      colId: "kind",
      valueGetter: ({ data }) => (data ? kindMeta(data.kind).label : ""),
      cellRenderer: KindCell,
      minWidth: compact ? 96 : 110,
    };
    const amount: ColDef<WalletEntry> = {
      headerName: "Amount",
      field: "amount",
      type: "rightAligned",
      cellRenderer: AmountCell,
      valueFormatter: ({ value }) => formatMoney(value as number),
      minWidth: compact ? 80 : 100,
    };
    if (compact) return [date, kind, amount];
    return [
      date,
      kind,
      {
        headerName: "PayPal reference",
        field: "paypalRef",
        cellClass: "font-mono text-12",
        flex: 1.4,
      },
      amount,
    ];
  }, [compact]);

  return (
    <DataGrid
      gridRef={gridRef}
      rows={entries}
      columns={columns}
      label="Wallet transactions"
      getRowId={(entry) => entry.id}
      onRowClick={onOpen}
      emptyMessage="No transactions in this period."
    />
  );
}
