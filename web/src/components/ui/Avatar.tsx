import { cn } from "../../lib/cn.ts";
import { initialsOf } from "../../lib/initials.ts";

// round = 09D .avatar-sm: circle, #2A3447, primary initials, border-light.
// tile  = 09D .avatar-md / 12D .avatar-lg: thumb gradient, primary border, display font.
const ROUND_SIZES = {
  xs: "size-7 text-11",
  sm: "size-9 text-13",
  md: "size-11 text-14",
  lg: "size-16 text-22",
  xl: "size-20 text-28",
} as const;

const TILE_SIZES = {
  xs: "size-7 rounded-8 text-11",
  sm: "size-9 rounded-8 text-13",
  md: "size-11 rounded-12 text-14 border-[1.5px]",
  lg: "size-16 rounded-xl text-22 border-2",
  xl: "size-20 rounded-xl text-28 border-2 shadow-ring-primary",
} as const;

export type AvatarSize = keyof typeof ROUND_SIZES;

export interface AvatarProps {
  name: string;
  size?: AvatarSize;
  shape?: "round" | "tile";
  className?: string;
}

export function Avatar({ name, size = "sm", shape = "round", className }: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center text-primary",
        shape === "round"
          ? cn("rounded-full border border-border-light bg-avatar font-bold", ROUND_SIZES[size])
          : cn("border border-primary bg-thumb-gradient font-display font-bold", TILE_SIZES[size]),
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
