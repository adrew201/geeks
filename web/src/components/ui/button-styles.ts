import { cn } from "../../lib/cn.ts";

// Minimalist pass: pill buttons, medium weight, no shadows. Secondary is an outline.
// Disabled = 07D/09D/15D .btn-primary:disabled (#1E293B bg, muted text).

export type ButtonVariant = "primary" | "secondary" | "ghost" | "ai" | "success" | "paypal";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const BASE =
  "inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 rounded-full border font-medium no-underline transition-colors duration-200 ease-[ease] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-disabled disabled:text-fg-muted";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-primary text-white hover:not-disabled:bg-primary-hover",
  secondary:
    "border-border-light bg-transparent text-fg hover:not-disabled:bg-surface",
  ghost:
    "border-transparent bg-transparent text-fg-secondary hover:not-disabled:bg-white/5 hover:not-disabled:text-fg",
  ai: "border-transparent bg-ai text-white hover:not-disabled:bg-ai-hover",
  success:
    "border-transparent bg-success text-white hover:not-disabled:bg-success-hover",
  paypal:
    "border-transparent bg-paypal font-bold text-paypal-ink hover:not-disabled:bg-paypal-hover",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-4 py-1.5 text-12",
  md: "px-5 py-2.5 text-13",
  lg: "px-7 py-3.5 text-15",
  icon: "size-[38px] p-0", // 05D .btn-icon
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
}: ButtonStyleProps = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full");
}
