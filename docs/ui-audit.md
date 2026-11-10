# Play2Pro UI Audit: HTML Prototypes → React (`web/`)

> **Owner:** Nigel (frontend) · **Audited:** 10 Nov 2026
>
> **Source:** `/home/nigel/Documents/Play2Pro/Frontend Pages/`. This is outside the repo: 32 files, pages 01–16, each with a desktop file and a mobile file.
>
> **Line references:** `NND` = `NN — High-Fidelity UI.html` (desktop) and `NNM` = `NN — High-Fidelity UI(mobile).html`. For example, `09D:675` means line 675 of the page 09 desktop file.
>
> **Prototype chrome (not product UI):** desktop files wrap the site in `.desktop-container` (1440×1024) with a `.figma-toolbar` state switcher. Mobile files wrap it in `.mobile-frame` (390×844). The React app fills the viewport, and the toolbar states become real component states.

---

## 0. Final decisions (10 Nov 2026; final unless a teammate overrides)

1. **Votes are UP/DOWN only.** Swipe right = UP, swipe left = DOWN, plus buttons for both. Drop "Average" and the feedback text. The enum values live in one constant in `web/src/types/api.ts`.
2. **Pages 13–16 become the PayPal checkout flow** for donations, bounty funding and subscriptions. There is no VOD player and no unlock copy.
3. **Remove all unlock/VOD content.** Rework the wallet (08) around `DONATION`, `BOUNTY`, `AD_SHARE`, `WITHDRAWAL`, `FEE` and `REVERSAL`. Withdraw is gated by `isVerifiedAdult`.
4. **Bounties, subscription upgrade and the house ad** are composed from the existing components. No new visual style.
5. **The gamer score is labelled "Rad score"** via one constant.
6. **Currency is USD**, stored as integer cents and formatted by one `formatMoney` helper.
7. **Navigation lives in one `nav-config.ts`:**
   - **Gamer (desktop):** Dashboard, Passport, Arena, Leaderboard, Wallet, Bounties, Submit Gameplay.
   - **Gamer (mobile tabs):** Home, Arena, Ranks, Wallet, Passport.
   - **Coach/Sponsor:** Discover, plus Bounties for sponsors only.
8. **Collapse the near-duplicate alpha tints** to one tint opacity and one border opacity per accent, using Tailwind opacity modifiers.

---

## Headline findings

1. **4 of 16 pages are entirely out of scope.** Pages 13–16 are a coach "pay to unlock a VOD" checkout, which the README removes. Unlock content also runs through 05, 06, 08, 11 and 12, and page 08's entire money model is coach unlock purchases.
2. **Some must-ship features have no screen at all.** No file contains a bounty, donation, subscription/upgrade, house ad or AG Grid/AG Charts reference.
3. **The PayPal flow in 13–15 is reusable.** Create order → approval URL → return → pending → confirmed is the same flow as donations, bounty funding and subscriptions.
4. **Tokens are mostly consistent, but have drifted.** Green has two names with the same value, 26 hex colours are hard-coded, and button and badge sizes vary between pages.
5. **Mobile files are simplified static designs.** None has a state mechanism, and most show a subset of the desktop content. The mobile nav tabs differ on almost every page.
6. **The prototypes conflict with the backend contract:**
   - The score is labelled "Ranking Score", where the contract uses rad score.
   - Votes are 3-way, where the contract has UP/DOWN.
   - Money is shown as "KSh 500.00" strings, where the contract stores cents.
   - Coach and sponsor are combined into one persona.
   - There are no tiers and no adult check.

---

## 1. Page inventory

| # | Page (`<title>`) | Role | Purpose | Endpoints (README) | Needs data with no endpoint |
|---|---|---|---|---|---|
| 01 | Landing Page | Public | Marketing: hero, how it works, gamer/coach/sponsor pitch, passport preview, motion placeholder, CTA, footer | — | — |
| 02 | Registration & Login | Public → Gamer/Coach/Sponsor | Role pick, signup form, login, forgot/reset | `POST /auth/signup`, `POST /auth/login` | forgot/reset, "remember device" |
| 03 | Gamer Setup & Onboarding | Gamer | 4-step wizard: identity, games/platform, region/bio, review + visibility | `GET /gamers/:id` only | profile update, username check, visibility |
| 04 | Coach & Sponsor Setup | Coach, Sponsor | 4-step wizard: identity (coach or sponsor variant), organisation, preferences, review | — | profile, organisation, preferences, verification |
| 05 | Gamer Dashboard | Gamer (owner) | Stats, quick actions, clip pipeline, earnings widget, activity | `GET /gamers/:id/dashboard`, `POST /clips` | my-clips list and status, profile views, activity, notifications |
| 06 | My Skills Passport | Gamer (owner) | Identity, skill bars, AI summary accept/reject/edit, evidence clips, achievements, visibility | `GET /gamers/:id` | skill metrics, AI review actions, achievements, Twitch/Steam, visibility, share |
| 07 | Gameplay Submission & AI Parsing | Gamer | Clip URL form + preview, processing timeline, AI insights review | `POST /clips` | processing status, link preview, AI accept/edit/reject; platform/mode fields not confirmed |
| 08 | Gamer Earnings & Wallet | Gamer (owner) | Metrics, revenue chart, transactions + detail modal, breakdown. **Built around unlock sales** | `GET /gamers/:id/dashboard`, `POST /wallet/withdraw` (but the UI says withdrawals are unavailable) | trend chart, breakdown, CSV export, transaction detail, period filter |
| 09 | Swipe-to-Rank Reel | Any user | Clip reel, 3-option vote, feedback text, engagement stats | `GET /feed`, `POST /clips/:id/vote` | feed tabs, approval %, views, saves, feedback, already-voted flag |
| 10 | Global Leaderboard | Gamer / public | Hero stats, game/region/period filters, podium, ranking table, "your position" | `GET /leaderboard?game=`, `GET /gamers/:id` | region and period filters, search, trend, own rank, totals |
| 11 | Talent Discovery Dashboard | Coach / Sponsor | Overview stats, search + filters, featured gamers, browse grid, saved candidates | `GET /coach/matches`, `GET /gamers/:id` | search, filters, saved, counts, notifications |
| 12 | Candidate Profile & Skills Passport | Coach / Sponsor viewing a gamer | Header, metrics, passport, skill bars, trust bar, evidence, **exclusive unlock card**, achievements | `GET /gamers/:id`, `GET /gamers/:id/dashboard` | save, views, skill scores, achievements, private visibility |
| 13 | Unlock Order Modal | Coach (implied) | **Out of scope.** Buy VOD access, create PayPal order | (pattern = `POST /donations`) | everything |
| 14 | PayPal Approval & Redirect | Payer | **Out of scope.** Approval link, copy, WhatsApp share, order summary | (pattern = donations response) | order lookup, expiry, regenerate |
| 15 | Pending Webhook Verification | Payer | **Out of scope.** Pending/confirmed/failed/cancelled/expired tracker | — | order status polling (needed for donations too) |
| 16 | Payment Confirmation & Unlocked VOD | Coach | **Out of scope.** Success hero, VOD player, receipt modal | — | everything |

**Missing must-ship screens:**
- Bounty list, create, submit and confirm.
- Donation prompt.
- Subscription upgrade.
- House ad in the feed.
- Communities.
- Coach AI matches as their own view.
- AG Grid / AG Charts dashboards. The prototype tables and charts are plain HTML and inline SVG.
- Admin screens.

---

## 2. Design tokens

### 2.1 CSS variables found (`:root`, all 32 files)

**Identical in all 32 files:**
- Backgrounds: `--bg-dark #0B0E14`, `--card-surface #161B26`
- Borders: `--border-color #262E40`, `--border-light #333D54`
- Accents: `--primary-blue #3B82F6`, `--primary-blue-alpha rgba(59,130,246,.12)`, `--ai-violet #8B5CF6`
- Text: `--text-primary #F8FAFC`, `--text-secondary #94A3B8`, `--text-muted #64748B`
- Fonts: `--font-body 'Plus Jakarta Sans','Inter',-apple-system,sans-serif`, `--font-display 'Space Grotesk',sans-serif`
- Radii: `--radius-sm 6px`, `--radius-md 10px`, `--radius-lg 14px`, `--radius-full 9999px`

**Defined in only some files:**

| Variable | Value | Files |
|---|---|---|
| `--card-surface-hover` | #1E2535 | 18 (missing from most mobile files) |
| `--primary-blue-hover` | #2563EB | 17 |
| `--ai-violet-alpha` | rgba(139,92,246,.14) | 19 |
| `--ai-violet-hover` | #7C3AED | 05D, 06D, 07D |
| `--verified-green` / `-alpha` | #10B981 / .12 | 18 / 12 (pages 01–07, 13, 14) |
| **`--success-green` / `-alpha`** | **#10B981 / .12 (same value)** | 14 / 11 (pages 08–12, 15, 16) |
| `--status-amber` / `-alpha` | #F59E0B / .14 | 22 / 19 (**missing in 06D**) |
| `--status-red` / `-alpha` | #EF4444 / .14 | 18 / 15 |
| `--self-reported-slate` | #64748B (same as `--text-muted`) | 9 |
| `--self-reported-alpha` | rgba(100,116,139,.15) | 5 |
| `--radius-xl` | **20px** in 13 files; **24px in 13M**; missing from 05–07 and most mobile files | |
| `--shadow-card` | `0 10px 30px -10px rgba(0,0,0,.5)` | 17 |
| `--shadow-dropdown` | `0 20px 40px -15px rgba(0,0,0,.7)` | 15 |
| `--shadow-modal` | `0 25px 50px -12px rgba(0,0,0,.85)` | 08D, 13D, 16D |
| `--gold-accent` / `-bg` | #D97706 / rgba(217,119,6,.15) | 10D (+10M gold only) |
| `--silver-accent` / `-bg` | #94A3B8 (same as `--text-secondary`) / .15 | 10D |
| `--bronze-accent` / `-bg` | #B45309 / .15 | 10D |
| `--paypal-yellow` | #FFC439 | 13, 14 |
| `--paypal-blue` | #003087 | 13D (declared, then hard-coded anyway) |
| `--whatsapp-green` / `-alpha` | #25D366 | 14 |

### 2.2 Hard-coded values (outside `:root`)

**Colours (26 distinct hex values):**
- `#11151F` ×100 in 32 files: the inset/nested surface. **This is the most-used colour and has no token.**
- `#06080C` ×50 in 32 files: the page backdrop and deepest background (footer, thumbnails).
- `#0E121A` ×44 in 30 files: header and strip surface.
- `#FFF` ×32 and `#FFFFFF` ×32: duplicates.
- `#1E293B` → `#0F172A` ×19: clip thumbnail gradient. `#0F172A → #1E1B4B` is a violet variant.
- `#121722` ×17: mobile bezel, prototype only.
- `#161B26` ×13: a literal `--card-surface`. `#161C28` (02–04D) is a near-duplicate.
- `#3B82F6` ×8 and `#10B981` ×1 (08D): literal token values.
- `#2A3447` ×9, `#1A2232` ×6, `#222938` ×4 (skeleton highlight).
- Others: `#F2B82E` (PayPal hover), `#0D9668` (success hover, 15D), `#FCA5A5` and `#6EE7B7` (02D).

**Alpha tints are near-duplicates (91 distinct rgba values):**
- Blue: borders at .25, .3 and .35; tints at .08, .1, .12, .15 and .2.
- Violet: borders at .25, .3, .35 and .4; tints at .05, .08, .1, .12, .14, .15 and .2.
- Green borders at .3, .35 and .4. Amber borders at .3 and .35.
- The intent is clearly a tint of about .12–.15 and a border of about .3–.35 per accent. Decision 8 collapses them.

**Typography:**
- 20 font sizes: 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 32, 34, 36, 40, 46px.
- Most-used sizes: 12px (230), 11px (224), 13px (161), 10px (136), 14px (84). 8–9px text appears 70 times, mostly on mobile badges.
- Weights: 700 (436), 600 (144), 800 (132). 500 and 400 appear once each.
- Line heights: 1.4, 1.5, 1.6, 1, 1.1, 1.15, 1.2.
- Letter spacing: .5, .4, .3, −.3, −.2, 1 and −1px.

**Radii:**
- Tokens: `md` ×148, `lg` ×54, `sm` ×43, `full` ×32, `xl` ×30.
- Hard-coded: **4px ×45** (badges, state buttons), 50% ×41, 6px ×36 (same as `sm`), **8px ×30**, **12px ×14**, 40px (mobile frame), and 3, 2, 16, 18 and 20px.

**Shadows (26 distinct):**
- The card, dropdown and modal tokens.
- Mobile toast: `0 10px 25px rgba(0,0,0,.6)`.
- Primary hover glow: `0 4px 14px rgba(59,130,246,.35)` ×14, with violet, green and PayPal variants.
- About 10 one-off glows: `0 0 12–30px <accent>`.

**Borders:**
- `1px solid var(--border-color)` ×322.
- Accent borders at .25–.35 alpha.
- `1px dashed` for placeholders.
- `1.5px` (02–04D) and `2px` variants.

**Spacing (4px base, with exceptions):**
- Gaps: 8, 12, 10, 6, 4, 16, 24, 20, 14, 5, 3, 32, 2, 28, 40, 48 and 18px.
- Padding has 79 distinct values. The most common are 16, 14, 12, 10px; 10/14; 2/8; 12/20; 6/12; 10/18; 24; 32; 40.
- Page gutters: 48px (01), 32px (app pages), 16px (mobile).

**Blur:** 10px (headers), 6px (modals), 12px (01 nav), 8px (16 controls).

**Gradients:**
- Brand: `linear-gradient(135deg, primary-blue, ai-violet)` ×30.
- Thumbnail gradients.
- About 20 one-off hero glows: `radial-gradient(circle at …, accent .05–.15, transparent 60–70%)`.
- Gradient-filled text on 01 and 02.

### 2.3 Differences between pages and between desktop and mobile

**Buttons:**
- Most desktop pages: `.btn` is 10px 18px, 13px text.
- 02D: 12px 20px, 14px text, `width:100%`.
- 13D: 12px 20px, `width:100%`. 14D: 12px 20px.
- 15D: 10px 18px at weight 600, versus 700 elsewhere.
- Mobile `.btn-m` / `.btn` padding varies: 8/12, 8/14, 10/14, 12 and 14px.

**Badges:**
- Desktop has three sizes: 3px 10px / 10px (01, 02); 3px 8px / 11px (05, 11, 13, 14); 4px 10px / 10–11px (06, 08, 09, 10, 12, 15, 16).
- Mobile badges are 2px 7px / 9px.
- **There are two naming systems.** Most pages use colour names: `badge-blue/violet/green/amber/red/slate`. Page 06 uses semantic names: `badge-self-reported/community/ai/verified`.

**Toast:**
- Desktop: 0.3s overshoot curve `cubic-bezier(.175,.885,.32,1.275)`, fixed bottom-right. 13D uses 0.3s ease instead.
- Mobile: 0.3s ease, absolutely positioned at bottom 20, 74 or 84px.
- Dwell time is 2500ms everywhere except 06D (3000ms).

**Other drift:**
- Metric value: 32px (05D) vs 28px (08D, 12D).
- Header h1 weight: 700 (06D) vs 800 elsewhere.
- `.card-panel`: radius-lg with gap 16 (09) vs radius-xl with gap 20 (12).
- Filter pills: a segmented control on 09 vs bordered pills on 10.
- `.avatar-md` border: blue on 09, light on 11.

**Fonts:**
- Every file loads **Inter**, but it is only ever a fallback.
- Space Grotesk at weight **800** is loaded only in 01D–04D. Weight 800 is used in 01M–04M, 10D, 10M, 12M and 13M, so those files get a synthesized bold. **Verified during the build:** Space Grotesk's maximum weight is 700 (the `@fontsource/space-grotesk` package ships 300–700), so 800 is mapped to 700.

### 2.4 Central token set (implemented in `web/src/styles/tokens.css`)

This keeps every value the prototypes actually use. It merges only exact duplicates (verified-green = success-green; `#FFF` = `#FFFFFF`; self-reported-slate = text-muted; silver-accent = text-secondary) and names the hard-coded surfaces.

Tints use Tailwind opacity modifiers (decision 8):
- **Tint `/14`** and **border `/35`** for every accent, e.g. `bg-primary/14 border-primary/35`.
- Changing `--color-primary` updates every tint and border.

**Surfaces**

| Token | Value | Source |
|---|---|---|
| `--color-page` | #06080C | hard-coded ×50 |
| `--color-bg` | #0B0E14 | `--bg-dark` |
| `--color-header` | #0E121A | hard-coded ×44 |
| `--color-inset` | #11151F | hard-coded ×100 |
| `--color-surface` | #161B26 | `--card-surface` |
| `--color-surface-hover` | #1E2535 | |
| `--color-disabled` | #1E293B | 07D/09D disabled button, thumbnail gradient start |
| `--color-thumb-end` | #0F172A | thumbnail gradient end |
| `--color-skeleton-hi` | #222938 | skeleton shimmer |
| `--color-border` | #262E40 | |
| `--color-border-light` | #333D54 | |

**Text**

| Token | Value |
|---|---|
| `--color-fg` | #F8FAFC |
| `--color-fg-secondary` | #94A3B8 |
| `--color-fg-muted` | #64748B |

**Accents**

| Token | Value |
|---|---|
| `--color-primary` | #3B82F6 (hover #2563EB) |
| `--color-ai` | #8B5CF6 (hover #7C3AED) |
| `--color-success` | #10B981 (hover #0D9668) |
| `--color-warning` | #F59E0B |
| `--color-danger` | #EF4444 |
| `--color-rank-gold` | #D97706 |
| `--color-rank-bronze` | #B45309 |
| `--color-paypal` | #FFC439 (ink #003087, hover #F2B82E) |

**Fonts**

| Token | Value |
|---|---|
| `--font-sans` | Plus Jakarta Sans (Inter dropped) |
| `--font-display` | Space Grotesk |

**Radii:** `--radius-xs` 4, `-sm` 6, `-8` 8, `-md` 10, `-12` 12, `-lg` 14, `-xl` 20px.

**Shadows:** `card`, `dropdown`, `modal`, `toast`, `glow-primary`, `glow-ai`, `glow-success`, `glow-paypal`.

**Motion:** the easings and animations defined in the HTML (see §5a).

---

## 3. Recurring components

| Component | Variants found | Pages |
|---|---|---|
| **Button** | primary, secondary, ghost, ai (violet), success, paypal, whatsapp, icon (38px); sizes sm/default/lg; `:disabled` only on 07, 09, 15 | all |
| **Badge** | blue/violet/green/amber/red/slate, *or* trust labels; some with an icon | all |
| **Trust badge set** | SELF-REPORTED · COMMUNITY-RANKED · AI-ASSESSED · VERIFIED | 01, 06, 09, 11, 12 |
| **Card / panel** | card-panel, card-m, metric card, hero/overview card with radial glow, info/notice card (dashed) | all |
| **Brand logo** | gradient "P2P" square at 26/28/32px + wordmark | all |
| **Public nav + footer** | links, Log In / Get Started; mobile hamburger overlay | 01 |
| **Focused header** | logo + 1–2 actions, no nav | 02–04, 14–16 |
| **App sidebar (Gamer)** | 05–07: Overview, My Skills Passport, Gameplay Clips, Discover, Leaderboard, Earnings. 08–10: Dashboard, Skills Passport, Submit Gameplay, Earnings & Wallet, Community, Leaderboard, Settings | 05–10 |
| **App sidebar (Coach/Sponsor)** | Overview, Discover Talent, Saved Gamers, *Unlock History* (out of scope), Settings | 11, 12 |
| **Mobile bottom nav** | 4–5 tabs, **with a different set on almost every page** (§7) | 05–12 M |
| **Main header** | sticky, blurred; title + actions; breadcrumb (07D) | 05–11 D |
| **Stepper (horizontal)** | active/completed; "Step N of 4" | 03, 04 |
| **Pipeline stepper** | dots + lines, completed/active/failed | 05 |
| **Timeline (vertical)** | completed/active nodes + descriptions; compact on mobile | 07 |
| **Progress tracker** | completed/in-progress/waiting | 15 |
| **Progress bar** | skill bar (blue→violet gradient), breakdown bar | 06, 08, 12 |
| **Form controls** | input (valid/invalid/focus), password + eye toggle, select (custom chevron), textarea, checkbox, radio chips, selectable cards, pills | 02, 03, 04, 07, 09 |
| **Filter pills / segmented** | 2 different styles | 08, 09, 10 |
| **Search field** | icon input | 10, 11 |
| **Tabs** | auth Sign Up / Log In | 02 |
| **Avatar** | initials; sm 28–36, md 40, lg 44–90; some with a ring | 02–16 |
| **Table** | tx-table (hover rows, clickable), leaderboard-table (highlighted user row, trend up/down/neutral) | 05, 08, 10 |
| **Podium** | rank-1/2/3, gold/silver/bronze | 10 |
| **Clip / evidence card** | gradient thumbnail + play overlay + duration tag; locked variant | 05, 06, 07, 12 |
| **Reel card** | 420×640 viewport, gradient overlays, identity row | 09 |
| **Vote option cards** | selected states | 09 |
| **Modal** | centred + blur (08, 13, 16); bottom sheet with handle (13M) | 08, 13, 16 |
| **Toast** | single global; slide-up | all |
| **Status / overlay panel** | loading / empty / unavailable / error / restricted | 02–04, 08–13, 15, 16 |
| **Skeleton** | shimmer blocks | 08, 10, 11, 12 |
| **Empty state** | icon circle + heading + text + CTA | 08, 09, 10, 11 |
| **Spinner** | Lucide `loader-2` + spin, or a CSS border spinner (13, 16) | 02–04, 09, 13, 15, 16 |
| **Video player chrome** | play button, timeline, controls (static) | 16 |
| **Order / receipt rows** | label/value rows, total row | 13–16 |
| **Copyable field** | monospace URL + Copy (no clipboard API) | 03, 14 |

---

## 4. Interactions (JS per page)

Every desktop file calls `lucide.createIcons()` and has a toast function. Nearly every click is just a toast. All hrefs are `#`. Mobile files are toast-only.

- **01:**
  - D: `setScreenState(A–E)` smooth-scrolls to sections.
  - M: `toggleMobileMenu()` opens and closes the hamburger overlay.
- **02:**
  - D: `selectRole()` handles role cards. `setScreenState(A–H)` swaps the auth card innerHTML; tabs and links switch states.
  - The eye toggle does nothing, and there is no validation.
  - M: role cards toast but don't select.
- **03:**
  - D: `setStepProgress()` and `setScreenState()`. The game, platform and visibility cards aren't clickable, and the preview never updates.
  - **Bug:** the Success state overwrites `#onboarding-workspace` (D:600), so later state clicks throw.
- **04:**
  - D: the same wizard plus a coach/sponsor switch. The preview updates only the name, org and badge.
  - **Bug:** the same workspace-destroy bug as 03.
- **05:**
  - D: `switchView()` toggles an embedded mobile view. `triggerAction()` shows the toast.
  - `.btn-ai` is used but not defined in 05D.
- **06:**
  - D: `toggleVisibility()` switches Public/Private, but the initial icon is inverted. `editSummary()` sets contentEditable.
  - M: the clip carousel uses CSS scroll-snap.
- **07:**
  - D: `handleUrlChange()` accepts any URL containing youtube.com or twitch.tv, then shows the preview and enables submit.
  - Also: `selectChip()`, `setTimelineStage()`, `handleSubmit()` (2.5s processing → results), `editAiSummary()`, `resetUrlInput()`.
  - The error message and `.invalid` state are never shown.
- **08:**
  - D: `openTxModal(...)` / `closeTxModal()`.
  - The Loading and Empty states replace `#main-content-body`, so only a reload restores the page.
  - Pills have no handlers, and the modal has no Esc or backdrop close.
- **09:**
  - D: `selectVoteOption()` and `submitVote()`. State E auto-returns after 1.5s.
  - **There is no swipe, drag or touch handling.** Pills have no handlers.
  - **Bug:** `selectVoteOption(null)` enables submit.
- **10:**
  - D: `setFilter()` toasts.
  - `handleSearch()` fires on input longer than 2 characters but doesn't filter.
  - State A calls `location.reload()`.
- **11:**
  - D: `handleSearchInput()`, and `applyFilters()`, which ignores 2 of the 4 selects. `clearAllFilters()`.
  - `toggleSaveCandidate()` always says "saved" and always sets the count to 19.
- **12:**
  - D: `toggleSaveCandidate()`.
  - **Bug:** the State F button id is `btn-state-e-loading` (D:567), but the code looks up `btn-state-f` (D:915), so it throws.
- **13:**
  - D: `setModalState()`, and `initiateOrderCreation()` (simulates 2s).
  - Close and Cancel don't actually close.
- **14:**
  - D: `setApprovalState()`, and `copyApprovalLink()` (state only, no clipboard).
  - Buttons are not reset between states.
- **15:**
  - D: `setScreenState(A–G)`, and `manualRefresh()` (simulated 2s poll).
  - There is no real background polling.
  - State C permanently overwrites the refresh button's onclick.
- **16:**
  - D: `setScreenState()`, `openReceiptModal()` / `closeReceiptModal()`.
  - The player controls are inert.

---

## 5. Animations

### 5a. Fully defined in CSS/JS

| Page | Defined |
|---|---|
| All | Toast slide-up: `translateY(100px)→0` + opacity, 0.3s, overshoot on desktop, ease on mobile, 2.5s dwell. `.state-btn` and `.btn` use `all .2s ease` |
| 01D | nav and footer link colour .2s; `.step-card` border-color .2s; header `backdrop-filter: blur(12px)` |
| 02D | `@keyframes spin` (D:856) on `loader-2` at 1s linear (D:830); tabs, role cards and inputs .2s |
| 03D/04D | `@keyframes spin` (03D:864, 04D:882): "Checking..." loader and a large loader at 1s; game card, platform card and pill .2s |
| 05D | `.action-tile` hover `translateY(-2px)`; metric-card border .2s. **The PROCESSING `loader-2` (D:1049) doesn't spin** |
| 06D | `.evidence-card` hover `translateY(-2px)`. 06M: CSS scroll-snap carousel (M:293/304) |
| 07D | input focus ring; radio chip .2s; static glow on the active timeline node; JS 2.5s processing → results |
| 08D | `@keyframes skeletonLoading` (D:599), 1.5s infinite shimmer (D:595) |
| 09D | `@keyframes spin` (D:557), `.spin-icon` at 2s (D:556); vote card .2s; JS 1.5s loading auto-return |
| 10D | `skeletonLoading` (D:626); `.podium-card` hover `translateY(-4px)` (D:467–469) |
| 11D | `skeletonLoading` (D:570); `.featured-card` hover `translateY(-2px)`; bookmark colour .2s |
| 12D | `skeletonLoading` (D:522); clip card border .2s; static skill bars |
| 13D | `@keyframes modalSlideUp` (D:285), 0.3s `cubic-bezier(.16,1,.3,1)`; `.spinner` at 0.8s (D:553–556) |
| 13M | `@keyframes sheetSlideUp` (M:114), `translateY(100%)→0`, 0.3s with the same curve |
| 15D | `@keyframes pulseExpand` (D:321) on `.pulse-ring`, 2s infinite `cubic-bezier(.215,.61,.355,1)`; `spin` at 3s (D:341–346) |
| 15M | `spin` at 3s (M:166–167) |
| 16D | play button hover `scale(1.08)`; `.spinner` at 0.8s (D:585–588); controls blur 8px |

### 5b. Animation prompts, placeholders and comments (verbatim)

**`01 — High-Fidelity UI.html`** is the only file with explicit motion prompts:
- D:318 `/* HERO SHOWCASE STATIC ANIMATION PLACEHOLDER */`
- D:495 `/* SECTION H: FUTURE ANIMATION SHOWCASE PLACEHOLDER */`
- D:672 `<!-- RIGHT HERO SHOWCASE: ANIMATION PLACEHOLDER -->`
- D:674 badge: `ANIMATION PLACEHOLDER`
- D:676 label: `Product Pipeline Flow`, with stages `01. EVIDENCE` "Gameplay Clips" → `02. PASSPORT` "AI Insights" → `03. DISCOVERY` "Coach Match"
- D:707 `Interactive motion preview component reserved for Framer Motion / Lottie integration.`
- D:905 `<!-- SECTION H: FUTURE ANIMATION SHOWCASE PLACEHOLDER -->`
- D:908 badge: `MOTION PREVIEW — COMING SOON`
- D:910 heading: `See the Potential Behind Every Player`
- D:911 `Interactive product motion component storyboard reserved for frontend animation component.`
- D:915–943 storyboard frames: `01` "Clip Submitted" → `02` "Evidence Extracted" → `03` "Passport Built" → `04` "Coach Discovers" → `05` "Footage Unlocked". **Frame 05 is out of scope.**
- D:1045 toast: `Focusing on Motion Preview placeholder`
- 01M has none of these.

**Other motion-related comments and copy:**
- 03D:524 and 04D:520 `<!-- RIGHT REAL-TIME PROFILE PREVIEW PANEL -->`
- 06D:958 `Demonstration metric cards. Dynamic radar/score metrics expand as backend AI capability is confirmed.`
- 06M:533 `Swipe right →`
- 08D:591 and 11D:562 `/* SKELETON LOADING ANIMATION */`
- 08D:1038 `// State B: Skeleton Loading`
- 09D:675 `<!-- Simulated Gameplay Graphic Background -->`
- 11M:143 `/* HORIZONTAL CAROUSEL FOR FEATURED CANDIDATES MOBILE */`
- 16D:412 `/* REALISTIC PLAYER CONTROLS */`
- 16D:686 `<!-- REALISTIC PLAYER CONTROLS BAR -->`
- 16M:247 `<!-- COLLAPSIBLE RECEIPT CARD -->`

### 5c. Described but not implemented

- **01:** the hero pipeline motion and the 5-frame storyboard (Framer Motion / Lottie per D:707).
- **03/04:** the "real-time" preview.
- **05D:** the loader doesn't spin.
- **06D:** the "dynamic radar" chart.
- **09:** the **swipe gesture** (title, and the "SWIPE FEED" badge at 09M:261) and video playback.
- **10:** "Live Sync / Updated 5m ago".
- **11M:** the carousel is native scroll only. **11D:** the "SPOTLIGHT REEL" badge has no reel behind it.
- **12:** skill bars have no fill animation.
- **14D:** `class="spin"` is injected (D:679), but **no `.spin` rule exists in 14D**.
- **15:** no background polling.
- **16:** the player controls don't work, and the receipt card isn't collapsible.
- **08 and 16:** modals have no enter animation; only 13 has one.

---

## 6. State switchers (desktop only; no mobile file has states)

| Page | States (labels verbatim) → what changes |
|---|---|
| 01 | **A: Default View** / **B: Gamer Focus** / **C: Coach Focus** / **D: Passport Focus** / **E: Motion Focus**: scrolls to top / #for-gamers / #for-coaches / #passport / #motion-preview, plus a toast |
| 02 | **A: Role Selection** · **B: Reg Form (Gamer)** (name/email/password/terms; badge shows the selected role) · **C: Reg Success** · **D: Login View** · **E: Forgot Password** · **F: Reset Sent** · **G: Form Errors** (banner + invalid fields) · **H: Loading**. The left brand panel is static |
| 03 | **Step 1: Identity** · **Step 2: Games** · **Step 3: Details** · **Step 4: Review** · **Success State** · **Validation Errors** (username taken) · **Username Check** (spinner) · **Loading** |
| 04 | **Step 1: Coach Identity** · **Step 1: Sponsor Identity** · **Step 2: Organisation** (+ verification notice) · **Step 3: Preferences** · **Step 4: Review** · **Success State** · **Validation Errors** · **Loading** |
| 05, 06 | None; only a **Desktop (1440px) / Mobile (390px)** view toggle |
| 07 | **1. Default Form** · **2. Validated Preview** · **3. Processing Queue** (amber "AI PARSING ACTIVE", stage 2) · **4. AI Results Ready** (violet "REVIEW REQUIRED", stage 4). The AI panel is always visible because of broken CSS at D:938: `style="display: opacity: 0.5;"` |
| 08 | **A: Normal Wallet** · **B: Loading State** (skeletons) · **C: Empty Wallet** · **D: Pending Focus** / **E: Failed Focus** (toast only) · **F: Tx Details Modal** |
| 09 | **A: New Clip** · **B: Option Selected** · **C: Vote Submitted** (128→129) · **D: Already Voted** · **E: Loading Clip** (auto-returns after 1.5s) · **F: Empty Feed** · **G: Unavailable** · **H: Vote Failed** |
| 10 | **A: Default** · **B: Filtered (Kenya)** · **C: Search ("Shadow")** · **D: Unranked User** · **E: Loading** · **F: Empty Results** · **G: User Highlighted** |
| 11 | **A: Default Discovery** · **B: Search ("Shadow")** · **C: Filtered (Kenya)** · **D: Saved Candidate** · **E: Loading** · **F: No Results** · **G: Profile View (Screen 12)** |
| 12 | **A: Complete Profile** · **B: Incomplete Passport** · **C: No AI Assessment** · **D: No Exclusive Footage** · **E: Saved Candidate** · **F: Loading** (*broken*) · **G: Restricted Access** |
| 13 | **1. Default Modal** · **2. Creating Order (Backend)** · **3. Approval Link Generated** · **4. Order Failed** |
| 14 | **1. Link Ready** · **2. Link Copied** · **3. WhatsApp Preview** (toast only) · **4. Awaiting Return** · **5. Link Expired** |
| 15 | **A: Pending** · **B: Checking** · **C: Confirmed** · **D: Still Pending** · **E: Failed** · **F: Cancelled** · **G: Expired**. Each changes the badge, icon, title, description, steps and button |
| 16 | **A: Confirmed & Unlocked** · **B: Video Loading** · **C: Video Unavailable** · **D: Access Expired** · **E: Receipt Modal** |

In React, these become real component states: loading, empty, error, success, restricted and so on.

---

## 7. Desktop vs mobile, per page

| Page | Navigation | Layout and content differences |
|---|---|---|
| 01 | top nav → hamburger overlay | Mobile drops the showcase, trust strip, coach/sponsor cards, motion section, final CTA and footer. Steps become one card |
| 02 | focused header | Mobile shows **only the role picker**: no tabs, login, form, errors or brand panel |
| 03 | "Step 1 / 4" text | Mobile shows **only step 1** |
| 04 | same | Mobile shows only the coach step 1: no sponsor variant, preview or verification |
| 05 | sidebar → 5 tabs (Overview/Passport/Clips/Discover/Earnings) | Mobile adds a welcome strip; 3 action chips instead of 4 tiles; no tx table; the pipeline is text; 2 activity items; some labels renamed |
| 06 | Home/Passport/Discover/Ranks/Earnings | Mobile drops the pills and visibility toggle; AI summary comes before skills; 3 skill bars instead of 4; scroll-snap carousel; 2 achievements; no Edit |
| 07 | Overview/Passport/Clips/Discover/Earnings | Mobile has no platform chips, description, validation or preview. The timeline is horizontal dots, statically at step 3 |
| 08 | same 5 tabs | Mobile has no chart, breakdown, pills, export or modal. 3 transactions; abbreviated values |
| 09 | Overview/Passport/**Arena**/Discover/Wallet | Mobile has no pills, feedback, Skip/Bookmark, states or info card. The reel has no identity row. 3 metrics |
| 10 | Overview/Passport/Discover/**Ranks**/Wallet | Mobile has no hero stats or table (stacked cards instead) and no period filter. Compact podium. Search is an icon |
| 11 | Overview/Discover/Saved/**Orders** | Mobile has no stats, selects or saved panel. Carousel + 2 stacked cards |
| 12 | same as 11 | Mobile has no breadcrumb; 2 metrics; no skill bars, trust bar, clips or achievements. The unlock is the main CTA |
| 13 | — | Desktop modal → mobile **bottom sheet**. Mobile has no fee line or state panels |
| 14 | Back to Profile → Back | Mobile is one column with no order summary, VOD panel or WhatsApp preview |
| 15 | — | Mobile has no pulse ring or step descriptions. Labels are DONE/ACTIVE/WAITING |
| 16 | coach pill → VERIFIED | Mobile has no controls, overlays, receipt modal or report link |

**Desktop nav is inconsistent:**
- 05–07 share one sidebar: Overview / My Skills Passport / Gameplay Clips / Discover / Leaderboard / Earnings.
- 08–10 share another: Dashboard / Skills Passport / Submit Gameplay / Earnings & Wallet / Community / Leaderboard / Settings.
- 08 has no Discover item.
- On 09 the active item is "Community". Decision 7 replaces all of these.

---

## 8. Assets

| Asset | Source | Decision |
|---|---|---|
| Plus Jakarta Sans 500/600/700/800 | Google Fonts (all 32) | Self-host via `@fontsource/plus-jakarta-sans` |
| Space Grotesk 600/700 (+800 requested in 01D–04D) | Google Fonts | Self-host via `@fontsource/space-grotesk`; **800 doesn't exist, so use 700** |
| Inter 400–700 | Google Fonts, fallback only | Dropped |
| Lucide icons, ~80 distinct | `https://unpkg.com/lucide@latest` (unpinned CDN) | `lucide-react` (pinned, tree-shaken) |
| Images, video, iframes | **None.** Thumbnails are CSS gradients + icons. One inline SVG chevron (07D:288, broken `%3C` instead of `%23`). One inline SVG chart (08D) | Clips are external YouTube/Twitch links |

---

## 9. Routing

| Route | Page(s) | Layout | Notes |
|---|---|---|---|
| `/` | 01 | Public | Hash sections: how-it-works, for-gamers, for-coaches, passport |
| `/signup`, `/login`, `/forgot-password` | 02 | Auth | Role picker → form → success |
| `/onboarding/gamer` | 03 | Focused | Step state in one route |
| `/onboarding/pro?role=coach\|sponsor` | 04 | Focused | Same wizard as 03, role variant |
| `/dashboard` | 05 | App (gamer) | |
| `/passport` | 06 | App (gamer) | Owner view of the Gamer ID |
| `/clips/new` | 07 | App (gamer) | "Submit Gameplay" |
| `/wallet` | 08 | App (gamer) | Reworked per decision 3 |
| `/arena` | 09 | App (gamer) | Core demo; swipe UP/DOWN |
| `/leaderboard` | 10 | App (gamer) or public | |
| `/bounties` (+ `/bounties/new`, `/bounties/:id`) | — (composed) | App | Decision 4 |
| `/discover` | 11 | App (coach/sponsor) | Default after coach login |
| `/gamers/:id` | 12 (+ 06 public preview) | App or public | One page, sections gated by viewer role |
| `/pay/:orderId` → `/pay/return` → result | 13 → 14 → 15 → 16 | Checkout | Decision 2. `/pay/return` is the PayPal return URL to `WEB_ORIGIN` |
| `/upgrade` | — (composed) | App | Subscription |
| ~~`/unlock-history`, `/orders`~~ | 11/12 nav | — | Out of scope, dropped |

Per `docs/instructions.md`, a route is added to `routes.tsx` only once its page renders with real or mocked data.

---

## 10. Inconsistencies and contract conflicts

**Out of scope (unlock / VOD). Removed per decisions 2 and 3:**
- **Pages 13–16:** the whole files, desktop and mobile.
- **05:**
  - D:1112, 1126, 1130, 1144–1156, 1176.
  - M:398, 439.
- **06:**
  - D:1083–1094, including "Coach Unlock Fee: $5.00 via PayPal" at D:1091, and D:1216–1219.
  - M:550–558.
- **08:** the whole revenue model, D:709–1059 and M:271–321.
- **11:**
  - D:641 "Unlock History", and "View Profile & VODs" at D:792/827/863.
  - M:318 "Orders".
- **12:**
  - D:593 and D:624.
  - D:831–853, the exclusive card, including "Price: KSh 500.00 (One-time unlock)".
  - M:258–296.
- **01:**
  - "VOD unlocks" copy in 01M, and at 01D:824 and 01D:847.
  - Storyboard frame 05, "Footage Unlocked".

**Cut-list related:**
- WhatsApp share on page 14.
- The receipt on page 16 (close to invoicing).
- "Report a problem" on page 16 (close to trust & safety).

**Contract conflicts:**

| Topic | Prototypes | README / schema | Resolution |
|---|---|---|---|
| Score name | "Ranking Score", "Elo Ranking Score" (06D:1182) | rad score | Decision 5 |
| Vote | 3-way + feedback (09) | `UP`/`DOWN` (README) vs `UPVOTE`/`DOWNVOTE` (schema) | Decision 1 (README values, one constant) |
| Roles | lowercase gamer/coach/sponsor; combined "COACH / SPONSOR" | README role + tier; schema `GAMER_FREE`/`GAMER_PAID`/`COACH`/`SPONSOR`/`ADMIN` | Types follow the README (role + tier); confirm with Rabasa |
| Tier / ads / upgrade | absent | required | Decision 4 |
| Under-18 | no adult check | `isVerifiedAdult` gates money features | Decision 3 |
| Withdraw | "not available" (08D:951, 08M:334) | `POST /wallet/withdraw` | Decision 3 |
| Wallet kinds | unlock sales, CONFIRMED/PENDING/FAILED | DONATION, BOUNTY, AD_SHARE, WITHDRAWAL, FEE, REVERSAL | Decision 3 |
| Money | "KSh 500.00", "KSh 12.5k", "$5.00" | integer cents, `PAYPAL_CURRENCY=USD` | Decision 6 |
| Clip status | Sub/Processing/AI Assessment/Review | README `PENDING` → `ANALYSED`; schema `AnalysisStatus` PENDING/PROCESSING/COMPLETED/FAILED | Confirm with Obonyo |
| "AWAITING APPROVAL" | payment link status (14) | bounty status `AWAITING_APPROVAL` | Don't reuse the label |
| Trust labels | SELF-REPORTED / COMMUNITY-RANKED / AI-ASSESSED / VERIFIED | no matching fields | Display only, derived where possible |
| Missing fields | region, platform, availability, saves, views, achievements, skill sub-scores, visibility | not in the contract | Ask the owners or cut |

**Data inconsistencies between pages:**
- **Gamer ID formats:** `#P2P-00842`, `P2P-00842`, `P2P-10482`, `#P2P-88422`, `#P2P-8842`, and `#P2P-2026-00842`, which equals the order reference on 15/16.
- **Order references:** `#ORD-8842-P2P` (13, 14) vs `P2P-2026-00842` (15, 16).
- **Personas:**
  - Gamers: Alex Vance, ShadowViper, Alex Morgan, Nigel Wayne, Alex Mercer.
  - Coaches: Coach Marcus, Coach_Marcus.
  - Organisations: Apeks Academy, Apeks Esports Academy, Apeks Esports. Kibo Brands, Kibo Gear Ltd, Kibo Brands Africa.
- **Copy:** 16D:753 describes "ALGS" footage (an Apex event) for a Valorant gamer. 02's password hint and its error message disagree.
- **Routing:** 02 sends every signup to gamer onboarding, and every login to the coach dashboard.

**Prototype bugs (not copied into React):**
- The success states on 03 and 04 destroy the workspace.
- 12D:567 vs 915: the State F id mismatch.
- 11D:1 starts with a stray `v` before the doctype. 15D:894 ends with a stray `N` after `</html>`.
- Invalid CSS: `pt:` (07, 11, 14, 16) and `items-center;` (02D:555).
- 07D:938: the broken AI panel display style.
- Undefined classes: `.badge-slate` (02D, 09D), `.btn-lg` (03D), `.btn-ai` (05D), `btn-sm` (15D), `.spin` (14D).
- 07D:288: the broken select chevron data-URI.
- 14D: buttons are not reset between states. 15D: state C overwrites the onclick. 16D: the hero badge is not reset.

---

## Build order (freeze is Wed 11 Nov, 9 pm)

1. **Foundation.** Tokens, fonts, icons, UI primitives, layouts, API client, types, mocks. ← *step 1, done on `nigel/web-scaffold`*
2. **09 Arena (swipe UP/DOWN) + 10 Leaderboard**, with the house-ad slot for FREE users.
3. **02 Auth.** Signup with role, and login.
4. **12 / 06 Gamer profile.** One page, gated by viewer role, with no unlock card.
5. **PayPal checkout (13–16 repurposed).** Used for donations, then bounty funding and subscriptions.
6. **Bounties.** Composed from the existing components.
7. **Dashboards with AG Grid / AG Charts:** 05 and the reworked 08 for gamers, 11 for coaches, and a summary view for sponsors.
8. **07 Clip submission.**
9. **Subscription upgrade.**
10. **01 Landing** (motion per the 01D notes, minus the unlock frame), then **03/04 onboarding** (reduced).

## `web/src` structure

```text
web/src/
├── main.tsx · routes.tsx · index.css
├── styles/tokens.css            # single token source + keyframes + verbatim animation notes
├── config/env.ts · config/labels.ts
├── lib/api-client.ts · lib/format-money.ts · lib/cn.ts
├── types/api.ts                 # contract types + enum constants (VOTE_DIRECTION etc.)
├── mocks/                       # fixtures + handlers; VITE_USE_MOCKS switches mock/real
├── components/ui/               # Button Badge TrustBadge Card Modal Toast Skeleton Spinner
│                                # Avatar ProgressBar EmptyState StatusPanel Field
├── components/layout/           # BrandLogo PublicHeader SiteFooter AppSidebar BottomNav
│                                # PageHeader nav-config.ts
├── layouts/                     # PublicLayout AuthLayout AppLayout CheckoutLayout
└── features/<name>/             # one folder per feature, added from step 2 onward
```
