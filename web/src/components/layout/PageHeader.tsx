import type { ReactNode } from "react";
import { cn } from "../../lib/cn.ts";

// 09D .main-header: sticky, 24px 32px, border-bottom, bg/85 + 10px blur.
// .page-title h1: 22px/800, -0.3px; p: 13px muted. Sticky only on desktop, because the
// mobile app header is already sticky.

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
    <header
      className={cn(
        "z-10 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-bg/85 px-4 py-4 backdrop-blur-[10px] lg:sticky lg:top-0 lg:px-8 lg:py-6",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow}
        <h1 className="text-20 font-extrabold tracking-[-0.3px] lg:text-22">{title}</h1>
        {description && <p className="text-13 text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

/** Standard page content padding: 16px on mobile, 32px on desktop. */
export function PageContainer({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex flex-col gap-6 p-4 lg:p-8", className)}>{children}</div>;
}
