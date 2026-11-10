import type { ReactNode } from "react";
import { cn } from "../../lib/cn.ts";
import { TONE_SOFT, type Tone } from "./tone-styles.ts";

// 01D .badge: 3px 10px, 10px, 700, uppercase, letter-spacing .4px, pill.
// sm = mobile .badge: 2px 7px, 9px.
const SIZES = {
  md: "gap-[5px] px-2.5 py-[3px] text-10",
  sm: "gap-1 px-[7px] py-0.5 text-9",
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
        "inline-flex items-center whitespace-nowrap rounded-full border font-bold uppercase leading-normal tracking-[0.4px]",
        SIZES[size],
        TONE_SOFT[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
