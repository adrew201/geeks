# Play2Pro: Team Instructions

This file is the single rulebook for working in the repo until submission. It combines the repo structure and git practices doc, the Chainforge commit SOP and the implementation plan, and adds the Windows/Linux rules we need because the team is split across both.

**The three rules that matter most:**

1. Pull small, push small, never leave `main` broken.
2. Stay in your own folders. Ask before touching anyone else's.
3. Everything is LF, case-exact and cross-platform, because CI and Render run on Linux even if you don't.

---

## 1. Overview

When working with your AI Agent, ensure it's first step of the work session is going through the docs folder. It `MUST` read through and understand the contents of `README.md` and `instructions.md` before building. You may use it to stage commits and draft commit messages but you `MUST` run `git status` and `git push` on your own and verify each change before pushing.

In case of any doubts regarding version control (git and github), `STOP` and contact Fabiola.

Daily syncs: (you may suggest a different time) 10 minutes at 7 pm (what's blocked, Fabiola reads top bugs) and 11 pm (everyone has pushed, deployed URL checked).

If time runs short, cut in this order and never cut payments or bounties: Zapier WhatsApp notifications → sponsor campaign builder → communities beyond create/join/approve → AI trust and safety flags → Invoicing API.

Out of scope: coach pay-to-unlock footage. Don't build it, don't add routes or Zapier triggers for it.

---

## 2. Who owns what

You own a folder means you write it, you review changes to it, and you fix it when it breaks.

| Person | Owns | Folders and files |
| --- | --- | --- |
| **Rabasa** | Platform, money, profiles, communities, deploy | `src/server.ts`, `src/config/`, `src/plugins/auth/`, `payments/`, `profiles/`, `communities/`, `webhooks/handlers.ts`, `src/lib/prisma.ts`, `src/lib/errors.ts`, `src/types/`, `tests/payments/`, `render.yaml`, `.github/workflows/ci.yml`, `postman/Play2Pro.postman_collection.json` |
| **Obonyo** | AI agent, highlights, bounties, ads, coach matching | `src/plugins/clips/`, `bounties/`, `ads/`, `coach/`, `src/workers/` (incl. `prompts/`), `src/lib/redis.ts`, `src/lib/anthropic.ts` |
| **Fabiola** | Ranking, seed data, QA, submission | `src/lib/ranking/`, `src/plugins/leaderboard/`, `prisma/seed.ts`, `tests/ranking/`, `postman/tests/`, `docs/demo-script.md`, `docs/submission.md` |
| **Gicharu** | Payment security | `src/guards/`, `src/plugins/webhooks/verify-signature.ts`, `tests/webhooks/` |
| **Nigel** | Frontend | everything in `web/` |

### Prisma models

`prisma/schema.prisma` is shared, but each model has one owner who is the only person allowed to change it.

| Owner | Models |
| --- | --- |
| Rabasa | User, GamerProfile, WalletEntry, Subscription, Community, CommunityMember |
| Obonyo | Clip, Vote, Bounty, BountySubmission, AdImpression |
| Fabiola | Endorsement |

### Cross-owner contracts (call these, don't reimplement them)

| You need | Call this | Owned by |
| --- | --- | --- |
| Take or hold money | `createOrder()`, `authorizeOrder()`, `captureOrder()`, `voidAuthorization()`, `payout()` in `src/plugins/payments/service.ts` | Rabasa. Nobody else calls PayPal directly |
| Update ranking | `recordVote()`, `recomputeRadScore(gamerId)` from `src/lib/ranking` | Fabiola |
| Block a route by role, tier or age | `require-role`, `require-tier`, `require-verified-adult` from `src/guards/` | Gicharu |
| AI outputs on a profile | Read `aiSummary`, clip `tags`, `stats`, `aiQualityScore` from the database | Written by Obonyo's workers; profiles only read |
| Frontend data | Endpoints in the Postman collection | Backend owners. If you change a response shape, tell Nigel and update the Postman request the same evening |

---

## 3. Shared files: who touches what

These are the only files more than one person edits. Nearly every conflict happens here.

| File | Who edits | Rule |
| --- | --- | --- |
| `prisma/schema.prisma` + `prisma/migrations/` | Each model's owner | Say "migrating" in the group chat, pull, run `npx prisma migrate dev --name <what>`, commit schema and migration together, push immediately, say "done". One migration at a time across the team |
| `src/app.ts` | Anyone adding a plugin | Add one `register` line in your own block. Never reorder or reformat other lines |
| `package.json` + `package-lock.json` | Anyone adding a dependency | Commit both in the same commit. On a lockfile conflict take `main`'s version and rerun `npm install`; never hand-merge |
| `.env.example` (root and `web/`) | Anyone adding a variable | Name + placeholder + one-line comment. Real value goes privately to the team, never in git |
| `src/lib/features.ts` | Anyone adding a flag | One line per flag, default off |
| `postman/Play2Pro.postman_collection.json` | Rabasa only | Others add requests in the shared Postman workspace; Rabasa exports once per evening |
| `render.yaml`, `.github/workflows/ci.yml` | Rabasa only | Ask before changing build or deploy steps |
| `.gitattributes`, `.editorconfig`, `commitlint.config.js` | Rabasa only | These enforce the cross-platform rules below; don't change them locally |

To change a file you don't own: message the owner first. Often they'll make the change faster than you can. Never resolve a conflict in someone else's file by keeping only your side.

---

## 4. Windows and Linux: working on the same repo

CI (GitHub Actions on `ubuntu-latest`) and Render both run Linux. Code that works only on Windows is broken code. These rules prevent the four problems mixed teams always hit: line endings, filename case, shell scripts, and native dependencies.

### 4.1 One-time setup, everyone

```bash
git config --global pull.rebase true
git config --global rebase.autoStash true
git config --global user.name  "Your Name"            # match GitHub
git config --global user.email "you@example.com"      # match GitHub
```

**Windows only:**

```bash
git config --global core.autocrlf false   # .gitattributes handles line endings; don't let git convert
git config --global core.longpaths true   # node_modules paths exceed 260 chars
```

**Linux only:**

```bash
git config --global core.autocrlf input   # safety net: never commit CRLF
```

Windows users: run git commands from **Git Bash** (installed with Git for Windows) or WSL. Every command in this file is written for bash. PowerShell mostly works, but quoting and `^` behave differently, and older PowerShell 5 doesn't support `&&`.

### 4.2 Line endings: everything is LF

`.gitattributes` in the repo root must contain:

```gitattributes
* text=auto eol=lf
*.sh      text eol=lf
.husky/*  text eol=lf
*.png     binary
*.jpg     binary
*.ico     binary
*.woff2   binary
```

`.editorconfig` must contain `end_of_line = lf`, and `.prettierrc` must have `"endOfLine": "lf"`.

In VS Code, set `"files.eol": "\n"` in your user settings. The status bar should say **LF**, not CRLF.

If `.gitattributes` was added after files already existed, Rabasa runs this once and pushes:

```bash
git add --renormalize .
git commit -m "chore: normalize line endings to LF"
```

Symptoms that line endings went wrong: every line of a file shows as changed in `git diff`, or a husky hook fails with `/usr/bin/env: 'sh\r': No such file or directory`.

### 4.3 Filename case: Linux is case-sensitive, Windows isn't

On Windows, `import ClipCard from './clipCard'` works even if the file is `ClipCard.tsx`. On Render it fails the build. Rules:

- Imports must match the filename exactly, letter for letter.
- `tsconfig.json` (root and `web/`) sets `"forceConsistentCasingInFileNames": true`.
- To rename a file only by case, do it in two steps or git won't see it on Windows:

  ```bash
  git mv clipCard.tsx ClipCard.tmp.tsx
  git mv ClipCard.tmp.tsx ClipCard.tsx
  ```

- Never have two files whose names differ only by case.
- Naming convention: React components `PascalCase.tsx`; everything else `kebab-case.ts` (as in the file tree).

### 4.4 Paths in code

- Use `path.join()` / `path.resolve()`, never hardcode `/` or `\`.
- In ESM files, get the directory with `path.dirname(fileURLToPath(import.meta.url))`, not `__dirname`.
- URLs and import paths always use `/`, on every OS.

### 4.5 npm scripts must run on both

npm runs scripts in `cmd.exe` on Windows and `sh` on Linux. So in `package.json` scripts:

| Don't | Do |
| --- | --- |
| `rm -rf dist` | `rimraf dist` |
| `NODE_ENV=test vitest` | `cross-env NODE_ENV=test vitest` |
| `cp a b`, `mkdir -p` | `shx cp a b`, `shx mkdir -p`, or a small Node script |
| `eslint 'src/**/*.ts'` (single quotes) | `eslint \"src/**/*.ts\"` (escaped double quotes) |
| `export VAR=x && ...` | put it in `.env` or use `cross-env` |

`&&` is fine inside npm scripts on both platforms. If you add a script, ask someone on the other OS to run it once before you rely on it.

### 4.6 Husky hooks on both platforms

- Hooks are plain shell files in `.husky/` and must be LF (covered by `.gitattributes`).
- They must be executable. Windows can't set the executable bit, so a Linux user runs this once and pushes:

  ```bash
  git update-index --chmod=+x .husky/pre-commit .husky/commit-msg
  ```

- Install hooks with `npm run prepare` after cloning or after `npm ci` (works on both; on husky v9 the `prepare` script is `"husky"`, on older versions `"husky install"`).
- Windows hooks run through Git for Windows' bundled `sh`, so commit from Git Bash, VS Code or WSL, not from a GUI that bundles its own git.
- Never skip hooks with `--no-verify`. If a hook is broken, say so in the chat and get it fixed.

### 4.7 Node, dependencies and local services

- **Node version:** use the version in `.nvmrc`. Linux: `nvm use`. Windows: nvm-windows does not read `.nvmrc`, so run `nvm install <version>` then `nvm use <version>` with the number from the file. (`fnm` reads `.nvmrc` on both, if you prefer it.)
- **Install with `npm ci`**, not `npm install`, unless you're adding a dependency.
- **Windows `EPERM` / file locked during `npm ci`:** stop the dev server and any watchers, close the folder in other terminals, retry.
- **Native optional dependencies:** if CI or Render fails with something like `Cannot find module @rollup/rollup-linux-x64-gnu`, the lockfile was regenerated on one OS and lost another OS's optional binary. Don't patch it yourself; tell Rabasa, who regenerates the lockfile once and pushes it.
- **Postgres and Redis:** run them with `docker compose up -d`. Windows needs Docker Desktop with the WSL 2 backend. Redis has no native Windows build, so don't try to install it directly. If you already have Postgres installed natively on Windows, it may be holding port 5432; stop that service or change the port in your local `.env` only.
- **Prisma:** never commit the generated client. Render's build runs `npx prisma generate`, so don't add Windows `binaryTargets` to the schema.

### 4.8 Files and encoding

- Create `.env` by copying: `cp .env.example .env` (Git Bash/Linux) or `Copy-Item .env.example .env` (PowerShell).
- Don't create or edit files with PowerShell 5's `>` or `echo > file`: it writes UTF-16 and breaks `.env`, JSON and scripts. Use your editor.
- Files are UTF-8 without BOM.

### 4.9 If Windows keeps fighting you

WSL 2 (Ubuntu) with the repo cloned inside the Linux filesystem (`~/play2pro`, **not** `/mnt/c/...`) removes almost every problem in this section. Don't switch mid-sprint if your setup works; do switch if you lose more than 30 minutes to environment issues.

---

## 5. Commits (Chainforge format)

We commit to `main` and use the Chainforge format so pushes link to tasks automatically.

```text
<type>(<scope>): <description> [#<task-id>]
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`, `ci`, `style`, `revert`, `wip`.

**Scope** is the plugin or area you changed:

| Area | Scopes |
| --- | --- |
| Backend plugins | `auth`, `payments`, `webhooks`, `profiles`, `communities`, `clips`, `bounties`, `ads`, `coach`, `leaderboard` |
| Other backend | `workers`, `ranking`, `guards`, `prisma`, `seed`, `config` |
| Frontend | `web` (or `web-feed`, `web-dashboards` etc. if useful) |
| Tooling | `ci`, `deploy`, `postman`, `deps` |

**Rules:**

- Always run `git status` before staging changes and after to ensure you're staging the right changes and you're on the correct working branch.
- Imperative mood: `add vote endpoint`, not `added vote endpoint`.
- Include the Chainforge task UUID in `[#...]` whenever the commit belongs to a task. Tiny chores with no task can leave it off.
- The UUID is 36 characters, so keep the description short. Aim for the whole subject under 72 characters where practical; commitlint allows up to 100 so the UUID never blocks a commit.
- One logical change per commit. Don't mix formatting with a fix.
- Add a body when the why isn't obvious from the subject.
- Fabiola logs bugs as Chainforge tasks, so bug fixes reference the bug's task ID the same way.
- `wip` is allowed only for code that sits behind a feature flag and doesn't break the build. No `wip` commits on Wednesday.
- Stage on purpose: `git add <paths>` or `git add -p`, then `git diff --staged`. No blind `git add .`.

**Examples:**

```text
feat(bounties): void authorization on expiry [#3f2a...-uuid]
fix(payments): round amounts to 2 decimals [#9b1c...-uuid]
test(ranking): cover coach vote K-factor [#a07e...-uuid]
chore(deps): add cross-env
docs: update demo script
```

**Reverts:** `git revert <sha>` opens an editor; rewrite the subject to `revert(<scope>): <what> [#<task-id>]` before saving.

`commitlint.config.js` (Rabasa) should enforce this:

```js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'refactor', 'perf', 'test',
      'chore', 'ci', 'style', 'revert', 'wip',
    ]],
    'header-max-length': [2, 'always', 100],
    'subject-case': [0],
  },
};
```

### Branches

Default: commit straight to `main` (the repo doc replaces the old "branch per feature, Rabasa merges" rule).

Chainforge task branches (`task/<task-id>/<short-description>`) are allowed only for a risky change that can't be hidden behind a flag. Keep it to one evening, rebase on `main` before merging, merge with a rebase/fast-forward (history stays linear), and delete the branch after. After the Wednesday 9 pm freeze, no task branches.

---

## 6. The daily loop

```bash
git pull                                  # rebases thanks to setup
# if package-lock.json changed:   npm ci
# if prisma/migrations changed:   npx prisma migrate dev
# ...work in small steps, commit each working step...
npm run check                             # lint + typecheck + tests
git add -p
git commit -m "feat(clips): add vote endpoint [#<task-id>]"
git pull                                  # again, right before pushing
npm run check                             # rerun if anything came in
git push
```

- Push at least every 1–2 hours.
- Never end a session with unpushed commits. Unfinished work goes behind a flag or into a stash.
- Unfinished backend features: flag in `src/lib/features.ts` (e.g. `FEATURE_COMMUNITIES`, `FEATURE_ZAPIER`), off by default. New routes go in new files and are registered only once they respond correctly.
- Unfinished frontend pages stay out of `web/src/routes.tsx` until they render with real or mocked data.

### Conflicts during pull

```bash
git status                                # lists conflicted files
# fix the files, then:
git add <resolved files>
git rebase --continue
# unsure? back out completely and ask the file's owner:
git rebase --abort
```

If two migrations collide, whoever pushed second deletes their local migration folder, pulls, and reruns `npx prisma migrate dev`.

---

## 7. Never do these

1. `git push --force` or `--force-with-lease` on `main`.
2. Amend, rebase or squash commits that are already pushed.
3. `git reset --hard` to undo pushed work. Use `git revert <sha>`.
4. Edit a migration that's already pushed. Make a new one.
5. Commit secrets: PayPal client ID/secret, Anthropic API key, JWT secret, database or Redis URLs, webhook IDs. Real values live in your local `.env` and in Render's environment settings. If one is ever pushed, rotate it immediately; deleting the commit is not enough.
6. Use live PayPal credentials. Everything is sandbox until after the hackathon.
7. Commit `node_modules/`, `dist/`, `web/dist/`, `coverage/`, `.env`, generated Prisma client, or video files. Demo clips are links.
8. Skip hooks with `--no-verify`.
9. Call PayPal from anywhere except `src/plugins/payments/`.
10. Mark anything paid without a verified webhook signature (Gicharu's `verify-signature.ts` runs before every handler).
11. Let a withdraw or bounty entry through without `require-verified-adult`. Many gamers are under 18.

---

## 8. When `main` breaks

- CI runs on every push. Red build means stop: whoever pushed fixes it within 15 minutes or reverts.
- Post in the group chat when `main` breaks and again when it's fixed.
- Prefer a clean revert over a stack of quick fixes.
- Render redeploys on every push, so a broken push breaks the live URL too. Pause auto-deploy during the demo recording on Wednesday.

---

## 9. Freeze and submission (Wednesday)

- 7–9 pm: bug fixes only, from Fabiola's list, highest demo impact first.
- 9 pm: freeze. After this, every fix is announced in the chat and checked by Rabasa before pushing. No new features, no dependency changes, no migrations unless they fix a demo blocker.
- Tag the exact commit the demo video was recorded on, so it can be redeployed if something breaks later:

  ```bash
  git tag -a v1.0-submission -m "Submission" && git push origin v1.0-submission
  ```

- Hit the Render URL a few minutes before any live demo (free tier cold-starts).
- Keep the "simulate webhook" Postman request ready in case PayPal sandbox webhooks are slow.
- Fabiola signs off the demo-ready checklist on the deployed URL before 9 pm and submits repo, video and pitch links before midnight.

---

## 10. Cheat sheet

```bash
# See what teammates pushed
git fetch && git log --oneline HEAD..origin/main

# Undo things
git restore <file>                 # discard unstaged changes
git restore --staged <file>        # unstage, keep changes
git reset --soft HEAD~1            # undo last commit, NOT yet pushed
git revert <sha> && git push       # undo a commit that IS pushed

# Park unfinished work
git stash push -m "wip bounty expiry"
git stash pop

# Check line endings of a file (should say "lf")
git ls-files --eol <file>

# Milestone tag
git tag -a v0.2-deployed -m "Deployed on Render" && git push origin v0.2-deployed
```

Use `HEAD~1`, not `HEAD^`: `^` is an escape character in Windows `cmd`.

---

## 11. Quick self-check before you push

- [ ] `git pull` done, `npm ci` / `prisma migrate dev` rerun if needed
- [ ] `npm run check` passes
- [ ] Only files in my folders, or shared files edited per section 3
- [ ] Imports match filename case exactly
- [ ] No secrets, no `.env`, no build output staged
- [ ] Commit message in Chainforge format with task ID
- [ ] Half-built work is behind a flag or not registered