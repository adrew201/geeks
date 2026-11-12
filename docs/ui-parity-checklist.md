# UI reskin: parity checklist (Phase 0)

Baseline: `origin/main` @ `388f657`, branch `web/ui-reskin`. On this baseline `npm run lint`, `npm run typecheck` and `npm run build` all pass (12 Nov 2026), so any later failure comes from the reskin.

**Rule: no feature added, none removed** ([ui-redesign-strategy.md](ui-redesign-strategy.md) §1). The reskin may only change styling, copy length and motion. Routes, roles, props, API calls and the `VITE_USE_MOCKS` / `VITE_REAL_API` switch stay as they are.

How to use: in mock mode, walk each row as gamer, coach and sponsor (and logged out for public routes). Tick a row only when the screen still has every element and every state (loading, empty, error, success). Screenshot before and after at 1280 px and 390 px.

Source of the routes: `web/src/components/layout/nav-config.ts` (`ROUTES`) and `web/src/routes.tsx`. Elements below come from the files in each `web/src/features/*` folder; add anything the walk finds that this list misses **before** restyling that screen.

## Routes

| Done | Route | Layout | Screen | Elements that must survive (from source files) |
| --- | --- | --- | --- | --- |
| [ ] | `/` | Public | Home | Landing page, public header and footer, links to signup and login |
| [ ] | `/login` | Auth | Login | Form (`AuthParts`, validation, focus on first invalid field), redirect after login |
| [ ] | `/signup` | Auth | Signup + role step | Form, role choice (`RoleStep`), validation, redirect |
| [ ] | `/feed` | App | Arena | Reel card, swipe (`use-swipe`), vote panel (`VotePanel`, `vote-options`), house ad (`HouseAdCard`), feed loading and empty states |
| [ ] | `/leaderboard` | App | Leaderboard | Podium, rankings list, your position |
| [ ] | `/gamers/:id` | Public + checkout flow | Gamer ID | Identity cards, metric cards, Rad Score card, AI summary review, evidence clips, visibility toggle (owner), Donate button and donation modal (`?donate=1` reopens it) |
| [ ] | `/passport` | App | Passport | Passport cards, visibility toggle |
| [ ] | `/dashboard` | App (lazy) | Dashboard | Rad Score chart, clip pipeline grid, stat tiles, own-dashboard loading and error |
| [ ] | `/wallet` | App (lazy) | Wallet | Balance, charts, transactions grid, transaction modal, withdraw modal |
| [ ] | `/bounties` | App | Bounties list | List, status badges |
| [ ] | `/bounties/:id` | App | Bounty detail | Detail, submissions, confirm and reject actions where the role allows |
| [ ] | `/bounties/new` | App (sponsor) | New bounty | Form, validation |
| [ ] | `/clips/new` | App | Submit clip | Submit form (`SubmitClipPage`) |
| [ ] | `/discover` | App (lazy, coach/sponsor) | Discover | Talent grid, talent-by-game chart |
| [ ] | `/pay/return` | Checkout | PayPal return | Status panel: pending, confirmed, failed, cancelled |
| [ ] | `/pay/cancel` | n/a | Redirect | Redirects to `/pay/return?cancelled=1` with the same query |
| [ ] | `/upgrade` | App | Upgrade | Subscription upgrade screen (the house ad links here) |
| [ ] | `/privacy`, `/terms` | Public | Static pages | Content intact |
| [ ] | `*` | Public | Not found | 404 page and link home |

## Shared pieces (restyle once, check on every screen)

- [ ] Sidebar (`AppSidebar`), bottom nav (`BottomNav`), public header and footer. Nav items come from `nav-config.ts` and must not change.
- [ ] Primitives in `components/ui`: Button, Card, Badge, Modal, Toast, ProgressBar, Avatar, Skeleton, Spinner, Field, EmptyState, StatusPanel, TrustBadge. Props and exports unchanged.
- [ ] Payments: amount picker, donate and payment modals, PayPal approval. PayPal button colours stay as the brand requires.
- [ ] AG Grid and AG Charts themes (`grid-setup.ts`, `chart-setup.ts`). Check the lazy routes separately.
- [ ] Focus ring, keyboard order, `prefers-reduced-motion`.

## Checks after each phase

```
cd web
npm run lint
npm run typecheck
npm run build
```

Then re-walk the rows touched in that phase. When every row is ticked at both widths, in mock mode for all three roles and once in hybrid mode (API running), stop: the user reviews on localhost.
