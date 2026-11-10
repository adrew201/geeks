// Game slugs the API accepts (GET /api/v1/leaderboard?game=<slug>), mapped to display names.
// The single source for game slugs and their labels.
//
// UNCONFIRMED until Fabiola sends the seed slugs. Only codm, valorant and fc25 have been
// confirmed as examples; the display names and this being the full list are not.
// The backend answers 400 for an unknown slug.
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
