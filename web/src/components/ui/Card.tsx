import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

// surface = .card-panel (09D): surface bg, border, radius-lg, 24px, shadow-card, gap 16.
// inset   = nested #11151F panels (pipeline steps, passport cards).
const VARIANTS = {
  surface: "border-border bg-surface",
  inset: "border-border bg-inset",
} as const;

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
} as const;

export interface CardProps extends ComponentProps<"div"> {
  as?: "div" | "section" | "article" | "aside";
  variant?: keyof typeof VARIANTS;
  padding?: keyof typeof PADDING;
  /** Adds --shadow-card. Defaults to true for surface cards. */
  elevated?: boolean;
  /** radius-xl (hero/auth cards) instead of radius-lg. */
  large?: boolean;
}

export function Card({
  as: Component = "div",
  variant = "surface",
  padding = "md",
  elevated,
  large = false,
  className,
  ...rest
}: CardProps) {
  const shadow = elevated ?? variant === "surface";
  return (
    <Component
      className={cn(
        "flex flex-col gap-4 border",
        large ? "rounded-xl" : "rounded-lg",
        VARIANTS[variant],
        PADDING[padding],
        shadow && "shadow-card",
        className,
      )}
      {...rest}
    />
  );
}
