# Claude chat: UI/UX overwrite prompt pack (Play2Pro)

Everything needed to run the minimalist redesign in a Claude chat (claude.ai). Use it in this order:

1. Start a **new chat** (a Project is better: add the files from section 3 as project knowledge).
2. Paste the **System prompt** (section 1) as the first message, or as the Project instructions.
3. Attach or paste the files in section 3, phase by phase (not all at once).
4. Send the **Phase prompts** (section 4) one at a time, and apply each answer locally before the next.
5. After every phase run `cd web && npm run lint && npm run typecheck && npm run build`. Paste any errors back into the chat.

Reference site for the look: https://lolawilde.com (see section 2). Do not copy its colours or content, only its structure and restraint.

---

## 1. System prompt (paste first)

```
You are a senior product designer and front-end engineer. You are redesigning the UI/UX of an existing React app, Play2Pro, with minimalist principles. You output complete, working code that I paste into the repo.

THE APP
Play2Pro turns casual gamers into professionals. Gamers submit gameplay clips, get a Gamer ID and a Rad Score, receive donations and bounty payouts through PayPal, and are discovered by coaches and sponsors. Roles: GAMER, COACH, SPONSOR. Tiers: FREE, PAID.

STACK (do not change, do not add dependencies without asking)
React 19, Vite, TypeScript, Tailwind CSS 4 (tokens in web/src/styles/tokens.css via @theme), React Router, AG Grid and AG Charts (lazy-loaded), lucide-react icons, fonts via @fontsource: Plus Jakarta Sans (body) and Space Grotesk (display).

HARD RULES
1. DO NOT CHANGE THE COLOUR SCHEME. Keep every colour token value exactly as given in the token table I paste. You may change radii, spacing, shadows, borders, weights, sizes and layout.
2. No feature added, none removed. Same routes, same roles, same data and states (loading, empty, error, success), same props and exports on shared components, same text where it carries meaning.
3. Do not touch API calls, adapters, types, mocks, or the VITE_USE_MOCKS / VITE_REAL_API switch.
4. Use design tokens and Tailwind utilities only. No inline hex colours. Token names stay the same, only values for radii, shadows and decorative utilities may change.
5. Accessibility: visible focus ring, AA contrast, keyboard order, labels on icon-only buttons, respect prefers-reduced-motion.
6. Work in small steps. For each step output FULL file contents for every file you change, each in its own code block headed by the file path. No diffs, no "rest unchanged" placeholders.
7. If something is ambiguous, state your assumption in one line and continue. Do not ask more than one question at a time.

MINIMALIST PRINCIPLES TO APPLY
- One idea per screen. One primary action per view, shown as a solid pill. Everything else is quieter (outline pill or plain text link).
- Remove, do not decorate: no gradients as ornament, no glows, no card shadows, no boxed badges, no helper paragraphs where the UI explains itself, no duplicate headings.
- Separate with space and surface colour, not borders. Use a hairline only when two surfaces of the same colour touch.
- Typography does the work: a large display title, one muted supporting line, small uppercase labels. Medium weights, tight tracking on large text.
- Generous, consistent spacing (8 px base). Centred, max-width containers (about 1152 px for app pages, 720 px for reading, 440 px for forms).
- Rounded geometry: pill buttons, 18 to 24 px card radii.
- Motion is small and purposeful: 150 to 300 ms colour and opacity transitions, no looping animation.
- Copy is short: 2 to 5 words for labels, one sentence for descriptions.
```

---

## 2. Design brief from lolawilde.com

Observed on 12 Nov 2026 (desktop 1440 px and mobile 390 px). Structure and behaviour to borrow:

- **Background:** near-black, warm. One accent colour used sparingly (a single red). For Play2Pro the accent stays blue (`primary`) with violet (`ai`) for AI items.
- **Navigation:** one centred row of plain text links (no icons, no boxes), plus one pill call-to-action on the right (cream pill with dark text). No sidebar, no borders. On mobile the same row shrinks to a few links and the pill.
- **Hero:** an enormous display title, centred. Under it a small bold subtitle, then one tiny status line with a coloured dot: "Out now · New album". Nothing else competes.
- **Focal content:** one row of tall cards with rounded corners (about 22 px). The active card sits in the centre at full size; neighbours are smaller, tilted and dimmed. Each card shows only a number, a title and (on the active one) one pill button.
- **Controls:** two circular outline buttons (previous, next) and a counter "01 / 12". A tiny muted hint line in a corner ("Drag to browse").
- **Space:** very large vertical gaps, text never touches the edges, almost no borders, no shadows on the page chrome.
- **Type:** a heavy display face for the title, a clean sans for everything else, small sizes for secondary text, wide letter-spacing on small uppercase labels.
- **Focus ring:** 2 px accent outline with 3 px offset.

How that maps to Play2Pro:

| lolawilde.com | Play2Pro |
| --- | --- |
| Centred text-link nav + pill CTA | Top bar: logo left, role-based links centred (from `nav-config.ts`), account line and "Log out" pill right. Bottom tabs on mobile |
| Giant centred title | `PageHeader`: large display title, one muted line, actions on the right |
| Focal card carousel | Arena feed: one centred reel card, neighbours dimmed, prev/next circles, "01 / 12" counter |
| Status dot line | Small coloured dot + label for state (verified, pending, live) instead of boxed badges |
| Hairline-free surfaces | Cards are `bg-surface` with no border and no shadow |

---

## 3. Files to give Claude (attach per phase)

Paths are relative to the repo root. Attach the **token file and index.css to every phase**.

| Phase | Files |
| --- | --- |
| 1 Foundations | `web/src/styles/tokens.css`, `web/src/index.css`, `web/index.html` |
| 2 Primitives | `web/src/components/ui/` all files: `Button.tsx`, `button-styles.ts`, `Card.tsx`, `Badge.tsx`, `tone-styles.ts`, `Modal.tsx`, `Field.tsx`, `ProgressBar.tsx`, `EmptyState.tsx`, `StatusPanel.tsx`, `Avatar.tsx`, `Skeleton.tsx`, `ToastProvider.tsx`, `TrustBadge.tsx`, `Spinner.tsx` |
| 3 Shells | `web/src/layouts/AppLayout.tsx`, `AuthLayout.tsx`, `PublicLayout.tsx`, `CheckoutLayout.tsx`, `web/src/components/layout/` (`BottomNav.tsx`, `PageHeader.tsx`, `PublicHeader.tsx`, `SiteFooter.tsx`, `BrandLogo.tsx`, `nav-config.ts`), `web/src/routes.tsx` |
| 4a Public and auth | `web/src/pages/HomePage.tsx`, `web/src/features/auth/` (`LoginPage.tsx`, `SignupPage.tsx`, `RoleStep.tsx`, `AuthParts.tsx`) |
| 4b Arena | `web/src/features/feed/` (`FeedPage.tsx`, `ReelCard.tsx`, `VotePanel.tsx`, `HouseAdCard.tsx`, `use-swipe.ts`, `vote-options.ts`), `web/src/features/leaderboard/` |
| 4c Gamer ID | `web/src/features/profile/` (all `.tsx` files) |
| 4d Dashboard and wallet | `web/src/features/dashboard/`, `web/src/features/wallet/`, `web/src/components/data/` (`Chart.tsx`, `DataGrid.tsx`, `StatTile.tsx`, `chart-setup.ts`, `grid-setup.ts`) |
| 4e Bounties and discover | `web/src/features/bounties/`, `web/src/features/discover/` |
| 4f Payments | `web/src/features/payments/` (all `.tsx` files). PayPal button colours stay as the brand requires |

Also paste, once, in the first message of phase 1: the contents of `docs/ui-parity-checklist.md` (so Claude knows what must survive).

### Colour tokens that must not change

```
Surfaces    page #06080c   bg #0b0e14   header #0e121a   inset #11151f
            surface #161b26   surface-hover #1e2535   avatar #2a3447
            disabled #1e293b   thumb-end #0f172a   skeleton-hi #222938
Borders     border #262e40   border-light #333d54
Text        fg #f8fafc   fg-secondary #94a3b8   fg-muted #64748b
Accents     primary #3b82f6 (hover #2563eb)   ai #8b5cf6 (hover #7c3aed)
            success #10b981 (hover #0d9668)   warning #f59e0b   danger #ef4444
            danger-soft #fca5a5   success-soft #6ee7b7
Podium      rank-gold #d97706   rank-bronze #b45309
PayPal      paypal #ffc439 (hover #f2b82e)   paypal-ink #003087
```

---

## 4. Phase prompts (send one at a time)

**Phase 1: foundations**
```
Phase 1 of 4. Files attached: tokens.css, index.css, index.html.
Keep every colour value. Change only: radii (xs 6, sm 8, md 12, lg 18, xl 24), remove card and glow shadows (keep a soft shadow only for modals and toasts), neutralise decorative utilities (corner glows, gradient hero text), and set a calm type scale. Add a 150 to 300 ms transition default and a 2 px primary focus ring with 3 px offset in index.css. Output full files.
```

**Phase 2: primitives**
```
Phase 2 of 4. Files attached: the components/ui folder and the tokens.
Restyle Button (solid pill primary, outline pill secondary, plain ghost; PayPal variant keeps brand colours), Card (no border, no shadow, rounded-xl), Badge (small coloured label with an optional dot, no box), ProgressBar (4 px line), Modal, Field (transparent, 1 px border, primary border on focus), EmptyState, StatusPanel, Avatar, Skeleton, Toast. Keep every prop and export so no screen breaks. Output full files.
```

**Phase 3: shells**
```
Phase 3 of 4. Files attached: layouts, components/layout, nav-config.ts, routes.tsx.
Rebuild AppLayout as a slim top bar: logo left, role-based text links centred (read them from nav-config, no icons), account line plus a "Log out" outline pill on the right; bottom tabs on mobile without a top border. PageHeader: large display title, one muted line, actions right, no border or sticky bar. PublicHeader and PublicLayout in the same style. AuthLayout: logo then one centred 440 px card. Keep the nav-config contract unchanged. Output full files.
```

**Phase 4: screens (repeat for 4a to 4f)**
```
Phase 4x of 4. Files attached: <the files for this screen group>.
Apply the minimalist principles to these screens. Keep every feature, state and data field. Remove ornament and helper text, shorten labels, replace boxed badges with dot labels, replace borders with space and surface colour, keep one primary action per view. For the Arena (4b) use one centred reel card with dimmed neighbours, previous/next circle buttons and a "01 / 12" counter, keeping the existing swipe, vote and house-ad logic untouched. Output full files, then list what you removed and what you kept, one line each.
```

**Final review prompt**
```
Review everything you produced against the hard rules. List any colour value you changed (there should be none), any feature, state or prop you removed (there should be none), any inline hex, and any element without a visible focus state. Then fix them and output only the changed files.
```

---

## 5. Acceptance checklist (tick locally after each phase)

- [ ] `cd web && npm run lint && npm run typecheck && npm run build` pass
- [ ] Colour tokens identical to section 3 (diff `tokens.css` colours only)
- [ ] Every row of `docs/ui-parity-checklist.md` still works as gamer, coach and sponsor
- [ ] Screens checked at 1280 px and 390 px
- [ ] Keyboard: Tab order sensible, focus ring visible
- [ ] Reduced motion honoured
- [ ] Nothing pushed; commit message and commands drafted for the repo owner
