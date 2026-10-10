---
name: quality-gates
description: Mandatory checks before every dlc-front commit and PR.
---

# Quality Gates

Run every script that exists in `package.json` and report real results:

- `npm run typecheck`, `npm test`; once added: `npm run lint`, `npm run format:check`,
  `npm run test:coverage`, `npm run build`
- `git diff --check`
- size: `git diff --numstat origin/develop` (or `node scripts/pr-gates.mjs lines --base
  origin/develop --head WORKTREE` once the script exists); tests, lockfiles and generated files
  are excluded; use `git add -N` only for measuring
- commit subjects match `^(feat|fix|docs|style|refactor|test|chore|perf)\([a-z0-9.-]+\): [a-z]`
- no framework/federation dependency, no token or credential reaching a portal context

Never alter a gate or test to obtain a pass.
