---
name: front-increment
description: Run one dlc-front increment end to end (scope, TDD, gates, evidence, PR). Use for every task in dlc-front.
---

# dlc-front increment

1. Read `AGENTS.md`, `docs/spec/dlc-front-spec.md` and the applicable contract sections (C01–C08).
2. Inspect branch, `git status`, `origin/develop`, latest evidence entry and open PRs.
3. Choose the smallest coherent slice that fits in 400 computable lines; branch `feat/`, `fix/`
   or `chore/` from `develop`.
4. Apply `tdd-evidence`: behavioral test first, genuine RED.
5. Implement only the approved scope; follow `front-architecture`.
6. Visual change: compare with the mockup photo in the browser; record result and deviations.
7. Apply `quality-gates`.
8. Add the evidence section `DEV-FRONT-<TOPIC>-NNN` (story, change, TDD, validation, FC cases,
   Annex H differences, limitations).
9. Commit, push and open the PR with the five sections (no generated footer); wait for CI, fix
   failures, merge when green.
10. Report: changed files, real results, size, limitations, next step.
