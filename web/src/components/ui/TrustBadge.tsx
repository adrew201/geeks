import { TRUST_LABELS, type TrustLevel } from "../../config/labels.ts";
import { Badge, type BadgeProps } from "./Badge.tsx";
import type { Tone } from "./tone-styles.ts";

// 06D trust badges: self-reported = slate, community = blue, ai = violet, verified = green.
const TRUST_TONES: Record<TrustLevel, Tone> = {
  "self-reported": "slate",
  community: "blue",
  ai: "violet",
  verified: "green",
};

export interface TrustBadgeProps extends Pick<BadgeProps, "size" | "className"> {
  level: TrustLevel;
}

export function TrustBadge({ level, size, className }: TrustBadgeProps) {
  return (
    <Badge tone={TRUST_TONES[level]} size={size} className={className}>
      {TRUST_LABELS[level]}
    </Badge>
  );
}
