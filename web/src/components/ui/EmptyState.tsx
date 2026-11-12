import type { ReactNode } from "react";
import { cn } from "../../lib/cn.ts";

// 08D empty state: 48px padding, centred; 64px icon circle (primary tint + primary border);
// 20px/800 heading; 13px muted text (max 400px); action 12px below.

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Wrap in a surface card (default) or render bare inside an existing card. */
  card?: boolean;
  className?: string;
}

export function EmptyState({ icon, title, description, action, card = true, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 p-12 text-center",
        card && "rounded-lg bg-surface",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-full border border-primary bg-primary/14 text-primary [&>svg]:size-8"
      >
        {icon}
      </div>
      <h2 className="text-20 font-extrabold">{title}</h2>
      {description && <p className="max-w-[400px] text-13 text-fg-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
