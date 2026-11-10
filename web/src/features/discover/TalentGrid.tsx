import { useMemo } from "react";
import { useNavigate } from "react-router";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { DataGrid } from "../../components/data/DataGrid.tsx";
import { gamerProfilePath } from "../../components/layout/nav-config.ts";
import { Avatar } from "../../components/ui/Avatar.tsx";
import { RAD_SCORE_LABEL } from "../../config/labels.ts";
import type { LeaderboardEntry } from "../../types/api.ts";
import { formatNumber } from "../profile/profile-model.ts";

// 11D "Explore All Gamers" as an AG Grid. Rows come from the overall leaderboard (the only
// list-of-gamers endpoint in the contract). Search uses the grid's quick filter; game and
// region filter the rows before they reach the grid. Row click / Enter opens the profile.

function GamerCell({ data }: ICellRendererParams<LeaderboardEntry>) {
  if (!data) return null;
  return (
    <div className="flex h-full min-w-0 items-center gap-2.5">
      <Avatar name={data.gamerTag} size="xs" />
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-semibold">{data.gamerTag}</span>
        <span className="truncate text-11 text-fg-muted">{data.displayName}</span>
      </div>
    </div>
  );
}

export interface TalentGridProps {
  entries: LeaderboardEntry[];
  search: string;
  compact: boolean;
}

export function TalentGrid({ entries, search, compact }: TalentGridProps) {
  const navigate = useNavigate();
  const columns = useMemo<ColDef<LeaderboardEntry>[]>(() => {
    const gamer: ColDef<LeaderboardEntry> = {
      headerName: "Gamer",
      colId: "gamer",
      valueGetter: ({ data }) => (data ? `${data.gamerTag} ${data.displayName}` : ""),
      cellRenderer: GamerCell,
      flex: 2,
      minWidth: 170,
    };
    const score: ColDef<LeaderboardEntry> = {
      headerName: RAD_SCORE_LABEL,
      field: "radScore",
      type: "rightAligned",
      sort: "desc",
      valueFormatter: ({ value }) => formatNumber(value as number),
      cellClass: "font-display font-bold",
      minWidth: 110,
    };
    if (compact) return [gamer, score];
    return [
      { headerName: "Rank", field: "rank", width: 80, flex: 0 },
      gamer,
      { headerName: "Game", field: "primaryGame", flex: 1.3 },
      { headerName: "Region", field: "region", valueFormatter: ({ value }) => (value as string | null) ?? "—" },
      score,
      { headerName: "Elo", field: "currentElo", type: "rightAligned", valueFormatter: ({ value }) => formatNumber(value as number) },
    ];
  }, [compact]);

  return (
    <DataGrid
      rows={entries}
      columns={columns}
      label="All ranked gamers"
      getRowId={(entry) => entry.gamerId}
      onRowClick={(entry) => navigate(gamerProfilePath(entry.gamerId))}
      quickFilter={search}
      rowHeight={52}
      emptyMessage="No gamers match these filters."
    />
  );
}
