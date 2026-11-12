import type { ReactNode } from "react";
import { cn } from "../../lib/cn.ts";

// Minimalist page header: a large title, one muted line, actions on the right. No border, no
// sticky bar, no blur. Width and padding match <PageContainer> so the two line up.

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Breadcrumb or eyebrow above the title (07D). */
  eyebrow?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <header className={cn("mx-auto w-full max-w-6xl px-4 pt-8 pb-2 lg:px-8 lg:pt-14", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow}
          <h1 className="font-display text-28 font-bold tracking-[-0.5px] lg:text-40">{title}</h1>
          {description && <p className="mt-2 text-14 text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}

/** Standard page content: centred, 1152px wide, generous space between sections. */
export function PageContainer({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 lg:px-8 lg:py-8", className)}>{children}</div>;
}
