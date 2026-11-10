---
type: workstream
owner: Rabasa
day: Mon 9 Nov
status: todo
priority: P0
tags: [rabasa, profiles, dashboard, ag-grid]
---

# Profiles & Dashboard API

`src/plugins/profiles/`. Serves the public **Gamer ID** and the **dashboard** data behind [[Nigel]]'s AG Grid / AG Charts views (AG Grid partner prize). Profiles **read** AI output written by [[Obonyo]]'s workers and scores written by [[Fabiola]]'s ranking library. They never compute those themselves. Up: [[Rabasa Workstreams Index]] · Spec: [[Play2Pro Turning Casual Gamers into Professionals]] §4 · Handbook: [[Specs/README|README]] §18 "Who sees what"

## Endpoints

### `GET /api/v1/gamers/:id`: public Gamer ID (no auth)
```json
{
  "id": "…", "gamerTag": "P2P-00842", "displayName": "ShadowViper",
  "games": ["Valorant"], "platforms": ["PC"], "region": "Kenya",
  "radScore": 9420, "rank": 1,
  "aiSummary": "…",                     // Obonyo's skill-summary worker
  "topClips": [{ "id": "…", "url": "…", "tags": ["clutch"], "eloRating": 1612, "aiQualityScore": 0.87 }],
  "achievements": [], "communities": [{ "id": "…", "name": "…" }],
  "bookingUrl": "https://calendly.com/…"
}
```
`:id` accepts a user ID or a `gamerTag`.

### `GET /api/v1/gamers/:id/dashboard`: guarded per viewer

| Viewer | Gets |
| --- | --- |
| The gamer (owner) | Everything + wallet summary ([[Wallet Ledger & Payouts]]) |
| COACH | Everything except the wallet, read-only |
| SPONSOR | Summary only: radScore, trend, games, region, top clips |
| Anyone else | 403 `FORBIDDEN_ROLE` |

Enforce this **in the API, not just the UI** (README §18). Free vs. paid gamer: "full dashboard analytics" is a Paid Gamer perk, so FREE owners get the summary + wallet only (`requireTier` for the analytics series).

Payload, shaped for AG Charts (arrays of flat rows):
```json
{
  "summary": { "radScore": 9420, "radScoreDelta7d": 180, "clips": 18, "votesReceived": 128, "approvalRate": 0.82 },
  "radScoreHistory": [{ "date": "2026-11-01", "radScore": 9100 }],
  "votesByDay": [{ "date": "2026-11-08", "up": 40, "down": 6 }],
  "clipsTable": [{ "clipId": "…", "game": "Valorant", "eloRating": 1612, "votes": 46, "aiQualityScore": 0.87, "tags": "clutch, aim" }],
  "earnings": { "balanceCents": 245000, "byKind": [{ "kind": "DONATION", "cents": 120000 }] }
}
```

## Data sources
- `GamerProfile.radScore` (Fabiola) + `RadScoreHistory` rows for the trend. Ask Fabiola to append a history row in `recomputeRadScore`.
- `Clip` / `Vote` (Obonyo): aggregate with `groupBy`. Add indexes on `(ownerId)` and `(clipId, createdAt)` if slow.
- `WalletEntry` (Rabasa)

## Tasks
- [ ] `GET /gamers/:id` with a JSON schema response (keeps PII like email/paypalEmail out by construction)
- [ ] `GET /gamers/:id/dashboard` with the viewer matrix above
- [ ] `PATCH /api/v1/gamers/me` *(proposed)*: games, platforms, region, bookingUrl (wireframe screen 03 onboarding)
- [ ] Optional cache: 30 s in Redis per gamer for the public profile (leaderboard clicks during the demo)
- [ ] Agree the payload with Nigel tonight and save examples in the [[Postman Collection]]

## Done when
- [ ] Demo: "Add a clip; AI tags and skill summary appear on the Gamer ID within a minute"
- [ ] Demo: "Coach views a gamer's dashboard (AG Charts)"
- [ ] A sponsor gets the summary only, and a random gamer gets 403

Related: [[Communities]] (coach side-by-side view reuses this) · [[Wireframes Index]] (screens 05, 06, 12) · [[Database]]
