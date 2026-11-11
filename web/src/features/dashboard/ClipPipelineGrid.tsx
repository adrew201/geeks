import { useMemo } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ExternalLink } from "lucide-react";
import { DataGrid } from "../../components/data/DataGrid.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import type { Tone } from "../../components/ui/tone-styles.ts";
import { CLIP_STATUS, type Clip } from "../../types/api.ts";
import { isClipAnalysed, safeClipUrl } from "../profile/profile-model.ts";

// 05D "Gameplay Processing Pipeline" as an AG Grid. The clip's aiAnalysisStatus goes PENDING
// (queued) → PROCESSING → COMPLETED or FAILED. 05D's "Review" stage has no contract field.
// Mobile keeps the clip and its status only.

const STATUS_BADGE: Record<string, { label: string; tone: Tone }> = {
  [CLIP_STATUS.PENDING]: { label: "Queued", tone: "slate" },
  [CLIP_STATUS.PROCESSING]: { label: "AI analysis", tone: "amber" },
  [CLIP_STATUS.COMPLETED]: { label: "Analysed", tone: "violet" },
  [CLIP_STATUS.FAILED]: { label: "Analysis failed", tone: "red" },
};

function statusBadge(clip: Clip) {
  return STATUS_BADGE[clip.status] ?? { label: clip.status, tone: "slate" as Tone };
}

function ClipCell({ data }: ICellRendererParams<Clip>) {
  if (!data) return null;
  const href = safeClipUrl(data.url);
  return (
    <div className="flex h-full min-w-0 flex-col justify-center leading-tight">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-w-0 items-center gap-1 truncate font-semibold text-fg hover:text-primary"
        >
          <span className="truncate">{data.description}</span>
          <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : (
        <span className="truncate font-semibold">{data.description}</span>
      )}
      <span className="truncate text-11 text-fg-muted">{data.game}</span>
    </div>
  );
}

function StatusCell({ data }: ICellRendererParams<Clip>) {
  if (!data) return null;
  const badge = statusBadge(data);
  return (
    <Badge tone={badge.tone} size="sm">
      {badge.label}
    </Badge>
  );
}

export function ClipPipelineGrid({ clips, compact }: { clips: Clip[]; compact: boolean }) {
  const columns = useMemo<ColDef<Clip>[]>(() => {
    const clip: ColDef<Clip> = {
      headerName: "Clip",
      field: "description",
      cellRenderer: ClipCell,
      flex: 2.4,
      minWidth: 200,
    };
    const status: ColDef<Clip> = {
      headerName: "Status",
      colId: "status",
      valueGetter: ({ data }) => (data ? statusBadge(data).label : ""),
      cellRenderer: StatusCell,
      minWidth: 120,
    };
    if (compact) return [clip, status];
    return [
      clip,
      status,
      {
        headerName: "AI quality",
        colId: "quality",
        valueGetter: ({ data }) => (data && isClipAnalysed(data) ? data.aiQualityScore : null),
        valueFormatter: ({ value }) => (value === null || value === undefined ? "—" : `${value}/100`),
        type: "rightAligned",
      },
      { headerName: "Elo", field: "eloRating", type: "rightAligned" },
      {
        headerName: "AI tags",
        colId: "tags",
        valueGetter: ({ data }) => data?.tags.join(", ") ?? "",
        flex: 1.4,
        sortable: false,
      },
    ];
  }, [compact]);

  return (
    <DataGrid
      rows={clips}
      columns={columns}
      label="Your submitted clips"
      getRowId={(clip) => clip.id}
      emptyMessage="No clips yet. Submit a gameplay link to start building your Gamer ID."
      pageSize={6}
      rowHeight={56}
    />
  );
}
