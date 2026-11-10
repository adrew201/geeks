---
type: workstream
owner: Rabasa
day: ongoing
status: todo
priority: P2
tags: [rabasa, ci, git, tooling]
---

# CI & Repo Hygiene

Repo `docs/instructions.md` makes Rabasa the only editor of `.github/workflows/ci.yml`, `.gitattributes`, `.editorconfig` and `commitlint.config.js`, and the person who regenerates the lockfile. The team mixes Windows and Linux. Up: [[Rabasa Workstreams Index]] · Commit format: [[chainforge-commit-sop]]

## Current state (repo `origin/main` @ `51d70b6`)
None of these files exist yet. A fresh Windows checkout already shows every file as modified, purely from line endings, which is exactly what `.gitattributes` prevents.

## Tasks (in value order)
- [ ] **`.gitattributes`**: `* text=auto eol=lf`, plus `*.png binary`. Then renormalise once: `git add --renormalize . && git commit -m "chore: normalize line endings to LF"`, push, and tell the team to re-clone or `git rm --cached -r . && git reset --hard`.
- [ ] **`.editorconfig`**: `end_of_line = lf`, `charset = utf-8`, `indent_style = space`, `indent_size = 2`, `insert_final_newline = true`
- [ ] **CI** `.github/workflows/ci.yml` on push to `main`: `npm ci` → `npx prisma generate` → `npm run lint` → `npm run typecheck` → `npm test`. A red build means fix within 15 min or revert (instructions §8).
- [ ] **commitlint** (config in instructions §5: Chainforge types, header ≤ 100) + husky `commit-msg` hook. Lowest priority; skip if short on time.
- [ ] **Lockfile:** if CI or Render fails on a missing native optional dependency, regenerate `package-lock.json` once (delete it and `node_modules`, then `npm install`) and push

## Process duties
- Commits go straight to `main` (the instructions doc overrides the old "Rabasa merges PRs" rule). Task branches only for risky changes, merged fast-forward.
- After the Wed 9 pm freeze, Rabasa checks every fix before it is pushed → [[Freeze, Demo Video & Submission]]

Related: [[Render Deployment Runbook]] · [[Platform Skeleton & Config]]
