import { cn } from "../../lib/cn.ts";

// Canonical desktop .btn (01D/05D–12D): 10px 18px, 13px, 600, radius-md, all .2s ease.
// Disabled = 07D/09D/15D .btn-primary:disabled (#1E293B bg, muted text).

export type ButtonVariant = "primary" | "secondary" | "ghost" | "ai" | "success" | "paypal";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const BASE =
  "inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 border font-semibold no-underline transition-all duration-200 ease-[ease] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-disabled disabled:text-fg-muted disabled:shadow-none";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-primary text-white hover:not-disabled:bg-primary-hover hover:not-disabled:shadow-glow-primary",
  secondary:
    "border-border bg-surface text-fg hover:not-disabled:border-border-light hover:not-disabled:bg-surface-hover",
  ghost:
    "border-transparent bg-transparent text-fg-secondary hover:not-disabled:bg-white/5 hover:not-disabled:text-fg",
  ai: "border-transparent bg-ai text-white hover:not-disabled:bg-ai-hover hover:not-disabled:shadow-glow-ai",
  success:
    "border-transparent bg-success text-white hover:not-disabled:bg-success-hover hover:not-disabled:shadow-glow-success",
  paypal:
    "border-transparent bg-paypal font-bold text-paypal-ink hover:not-disabled:bg-paypal-hover hover:not-disabled:shadow-glow-paypal",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "rounded-sm px-3 py-1.5 text-12",
  md: "rounded-md px-[18px] py-2.5 text-13",
  lg: "rounded-md px-6 py-3.5 text-15",
  icon: "size-[38px] rounded-md p-0", // 05D .btn-icon
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
}: ButtonStyleProps = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full");
}
