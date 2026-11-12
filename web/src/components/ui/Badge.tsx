import type { ReactNode } from "react";
import { cn } from "../../lib/cn.ts";
import { TONE_TEXT, type Tone } from "./tone-styles.ts";

// Minimalist pass: a small coloured label, no box and no border.
// sm = mobile .badge: 2px 7px, 9px.
const SIZES = {
  md: "gap-1.5 text-10",
  sm: "gap-1 text-9",
} as const;

export interface BadgeProps {
  tone?: Tone;
  size?: keyof typeof SIZES;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "slate", size = "md", icon, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap font-medium uppercase leading-normal tracking-[0.6px]",
        SIZES[size],
        TONE_TEXT[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
