import { cn } from "../../lib/cn.ts";
import { TONE_FILL, type Tone } from "./tone-styles.ts";

// skill = 12D .skill-track/.skill-fill: 8px, inset track with border, blue→violet fill.
// bar   = 08D .progress-bar-bg/-fill: 6px, white/6 track, solid tone fill, radius 3px.

export interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: "skill" | "bar";
  tone?: Tone;
  label?: string;
  /** Text on the right of the label row, e.g. "88%". Defaults to the rounded percentage. */
  valueLabel?: string;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  variant = "skill",
  tone = "blue",
  label,
  valueLabel,
  className,
}: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <div className="flex justify-between text-12 font-semibold">
          <span>{label}</span>
          <span className="text-fg-secondary">{valueLabel ?? `${Math.round(percent)}%`}</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={cn(
          "w-full overflow-hidden",
          variant === "skill"
            ? "h-2 rounded-full border border-border bg-inset"
            : "h-1.5 rounded-[3px] bg-white/6",
        )}
      >
        <div
          className={cn(
            "h-full",
            variant === "skill" ? "rounded-full bg-skill-gradient" : cn("rounded-[3px]", TONE_FILL[tone]),
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
