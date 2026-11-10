import type { ReactNode } from "react";
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { Spinner } from "./Spinner.tsx";

// Replaces the prototypes' state-switcher panels with real component states.
// compact = 13D .state-panel: 48px tinted icon circle, 15px/700 title, 12px muted text.
// hero    = 15D verification indicator: 72px inset circle with 2px tone border,
//           optional .pulse-ring (pulseExpand 2s), used for payment pending/confirmed.

export type StatusTone = "loading" | "info" | "success" | "warning" | "danger" | "neutral";

const TONE = {
  loading: { text: "text-primary", soft: "bg-primary/14", border: "border-primary", ring: "border-primary/35" },
  info: { text: "text-primary", soft: "bg-primary/14", border: "border-primary", ring: "border-primary/35" },
  success: { text: "text-success", soft: "bg-success/14", border: "border-success", ring: "border-success/35" },
  warning: { text: "text-warning", soft: "bg-warning/14", border: "border-warning", ring: "border-warning/35" },
  danger: { text: "text-danger", soft: "bg-danger/14", border: "border-danger", ring: "border-danger/35" },
  neutral: { text: "text-fg-muted", soft: "bg-fg-muted/14", border: "border-fg-muted", ring: "border-fg-muted/35" },
} as const;

const DEFAULT_ICONS: Record<Exclude<StatusTone, "loading">, ReactNode> = {
  info: <Info />,
  success: <CircleCheck />,
  warning: <TriangleAlert />,
  danger: <CircleX />,
  neutral: <Info />,
};

export interface StatusPanelProps {
  tone: StatusTone;
  title: string;
  description?: ReactNode;
  /** Overrides the default icon for the tone. */
  icon?: ReactNode;
  /** Badge or label rendered above the title (hero layout). */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  layout?: "compact" | "hero";
  /** Show the 15D pulse ring around the hero icon (pending states). */
  pulse?: boolean;
  className?: string;
}

export function StatusPanel({
  tone,
  title,
  description,
  icon,
  eyebrow,
  actions,
  layout = "compact",
  pulse = false,
  className,
}: StatusPanelProps) {
  const colors = TONE[tone];
  const glyph =
    tone === "loading" ? (
      <Spinner size={layout === "hero" ? 32 : 36} speed={layout === "hero" ? "slow" : "fast"} label={null} />
    ) : (
      (icon ?? DEFAULT_ICONS[tone])
    );

  return (
    <div
      role={tone === "loading" ? "status" : tone === "danger" ? "alert" : undefined}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        layout === "hero" ? "gap-4 px-5 py-8" : "gap-3 px-5 py-8",
        className,
      )}
    >
      {layout === "hero" ? (
        <div className="relative flex size-20 items-center justify-center" aria-hidden="true">
          {pulse && (
            <div className={cn("absolute -inset-1.5 animate-pulse-ring rounded-full border-2", colors.ring)} />
          )}
          <div
            className={cn(
              "z-[1] flex size-[72px] items-center justify-center rounded-full border-2 bg-inset [&>svg]:size-8",
              colors.border,
              colors.text,
            )}
          >
            {glyph}
          </div>
        </div>
      ) : tone === "loading" ? (
        <div className={colors.text} aria-hidden="true">
          {glyph}
        </div>
      ) : (
        <div
          aria-hidden="true"
          className={cn("flex size-12 items-center justify-center rounded-full [&>svg]:size-6", colors.soft, colors.text)}
        >
          {glyph}
        </div>
      )}

      {eyebrow}
      <div className="flex flex-col items-center gap-1">
        {layout === "hero" ? (
          <h2 className="text-22 font-extrabold tracking-[-0.3px]">{title}</h2>
        ) : (
          <p className={cn("text-15 font-bold", tone === "danger" && "text-danger")}>{title}</p>
        )}
        {description && (
          <p className={cn("text-fg-muted", layout === "hero" ? "max-w-[460px] text-13" : "max-w-[380px] text-12")}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </div>
  );
}
