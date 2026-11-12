import type { ReactNode } from "react";
import { cn } from "../../lib/cn.ts";
import { Skeleton } from "../ui/Skeleton.tsx";

// 05D/08D metric card: label + tag row, big display number, muted hint underneath.
// Used in a <dl>-free grid; each tile is its own small definition list.

export interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Small badge on the right of the label row (08D VERIFIED / PENDING tags). */
  tag?: ReactNode;
  /** Highlight the value (rad score uses success, per 12D). */
  emphasis?: "success" | "primary";
  className?: string;
}

export function StatTile({ label, value, hint, tag, emphasis, className }: StatTileProps) {
  return (
    <dl className={cn("flex min-w-0 flex-col gap-1.5 rounded-lg bg-surface p-4 shadow-card lg:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <dt className="truncate text-11 font-bold tracking-[0.5px] text-fg-muted uppercase">{label}</dt>
        {tag}
      </div>
      <dd
        className={cn(
          "truncate font-display text-22 leading-none font-bold lg:text-28",
          emphasis === "success" ? "text-success" : emphasis === "primary" ? "text-primary" : "text-fg",
        )}
      >
        {value}
      </dd>
      {hint && <dd className="text-11 text-fg-muted">{hint}</dd>}
    </dl>
  );
}

export function StatTileSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card lg:p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/** 2 columns on mobile, 4 on desktop. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">{children}</div>;
}
