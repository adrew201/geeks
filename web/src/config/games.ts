// The app's game slugs mapped to display names. The single source for games and their labels.
//
// The leaderboard API takes the display name, not the slug (GET /api/v1/leaderboard?game=Valorant),
// matched exactly against GamerProfile.primaryGame / secondaryGames, so `name` must be spelled
// exactly as the seed stores it. An unknown name returns an empty board, not an error.
// UNCONFIRMED until Fabiola sends the seed's game names: only "Valorant" (the schema default)
// is confirmed; "Call of Duty Mobile", "EA SPORTS FC 25" and this being the full list are not.
// `short` is the label used where space is tight (10M filter pills).

export const GAMES = {
  valorant: { name: "Valorant" },
  codm: { name: "Call of Duty Mobile", short: "COD Mobile" },
  fc25: { name: "EA SPORTS FC 25" },
} as const satisfies Record<string, { name: string; short?: string }>;

export type GameSlug = keyof typeof GAMES;

export const GAME_SLUGS = Object.keys(GAMES) as GameSlug[];

export function isGameSlug(value: string): value is GameSlug {
  return Object.hasOwn(GAMES, value);
}

/** Display name for a slug from the API; falls back to the raw value for slugs not listed yet. */
export function gameName(slug: string): string {
  return isGameSlug(slug) ? GAMES[slug].name : slug;
}

/** Short display name (falls back to the full name). */
export function gameShortName(slug: string): string {
  if (!isGameSlug(slug)) return slug;
  const game: { name: string; short?: string } = GAMES[slug];
  return game.short ?? game.name;
}
