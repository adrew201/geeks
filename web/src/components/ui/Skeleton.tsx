import { cn } from "../../lib/cn.ts";

/** 08D .skeleton: shimmer gradient, 1.5s infinite, radius 4px. Size it with className. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("bg-skeleton-shimmer animate-skeleton rounded-xs", className)} />
  );
}
