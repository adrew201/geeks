import { LoaderCircle } from "lucide-react";
import { cn } from "../../lib/cn.ts";

// Lucide loader-2 with the spin speeds the prototypes define:
// fast 0.8s (13D/16D), normal 1s (02D–04D), medium 2s (09D), slow 3s (15D/15M).
const SPEEDS = {
  fast: "animate-spin-fast",
  normal: "animate-spin",
  medium: "animate-spin-medium",
  slow: "animate-spin-slow",
} as const;

export interface SpinnerProps {
  size?: number;
  speed?: keyof typeof SPEEDS;
  /** Screen-reader text. Pass null when the spinner is decorative (e.g. inside a busy button). */
  label?: string | null;
  className?: string;
}

export function Spinner({ size = 20, speed = "normal", label = "Loading", className }: SpinnerProps) {
  const icon = (
    <LoaderCircle
      aria-hidden="true"
      width={size}
      height={size}
      className={cn(SPEEDS[speed], "shrink-0", className)}
    />
  );
  if (label === null) return icon;
  return (
    <span role="status" className="inline-flex">
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}
