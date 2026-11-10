// Decision 8: one tint (/14) and one border (/35) opacity per accent.
// Every soft-tinted surface (badges, notices, icon circles) reads from here.

export type Tone = "blue" | "violet" | "green" | "amber" | "red" | "slate";

/** Tinted background + accent text + accent border. */
export const TONE_SOFT: Record<Tone, string> = {
  blue: "bg-primary/14 text-primary border-primary/35",
  violet: "bg-ai/14 text-ai border-ai/35",
  green: "bg-success/14 text-success border-success/35",
  amber: "bg-warning/14 text-warning border-warning/35",
  red: "bg-danger/14 text-danger border-danger/35",
  slate: "bg-fg-muted/14 text-fg-secondary border-fg-muted/35",
};

/** Accent text colour only. */
export const TONE_TEXT: Record<Tone, string> = {
  blue: "text-primary",
  violet: "text-ai",
  green: "text-success",
  amber: "text-warning",
  red: "text-danger",
  slate: "text-fg-muted",
};

/** Solid accent fill (progress bars, dots). */
export const TONE_FILL: Record<Tone, string> = {
  blue: "bg-primary",
  violet: "bg-ai",
  green: "bg-success",
  amber: "bg-warning",
  red: "bg-danger",
  slate: "bg-fg-muted",
};
