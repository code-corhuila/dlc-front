# dlc-front — Agent rules (DI LUCCA)

Read this file completely before any action. It applies to every AI agent working in this
repository (Claude Code, Codex or others). Explain things to the user in Spanish; code, commits,
PRs and repository documents in English.

## 1. Sources of truth (priority order)

1. Professor's norm and annexes, read-only: `C:\Users\bonil\Desktop\dev-dilucca\truth-root`
   (norm sections 4, 5.4, 5.5, 6, 8, 9, 10, 12, 13, 15, 16, 17; Annex H; Annex I;
   `di-lucca-mockup.pdf`).
2. dlc-docs, read-only (local `C:\Users\bonil\Desktop\dlc-docs\dlc-docs`, revision `638e4f2` or
   newer delivered by the user). Never commit, copy or publish it. For this repository the
   authoritative documents are:
   - `05-architecture/decisions/ADR-011-transversal-frontend-composition.md`;
   - `05-architecture/frontend-composition.md` (composition contract v1, C01 to C08);
   - `12-ux-ui/navigation-map.md`, `12-ux-ui/design-system.md`, `07-api/authentication.md`.
3. `docs/spec/dlc-front-spec.md` (the SDD spec for this stage).
4. Living reference, read-only: `dlc-clinical-portal` (CI, `scripts/pr-gates.mjs`, evidence format).

ADR-011 records the professor's clarification relayed by the project owner: **dlc-front has no
technology of its own**. Annex H applies wherever it does not contradict ADR-011 and C01–C08;
every clash is recorded as a difference in `docs/quality/validation-evidence.md`.
Non-negotiable pillars: DDD, SDD, TDD. dlc-docs and truth-root are never modified.

## 2. Scope of this stage

Front-only delivery: the compositor works with contract test-double portals and, once published,
the real Clinical `entry.js`, on test data. **No API, database or real infrastructure.**

dlc-front owns: common frame (top bar, sidebar), Dashboard shortcuts and the Clinical Analytics
host, global 404, PORTAL_UNAVAILABLE notice, session state screens, development sign-in (develop
only), and the compositor infrastructure C01–C07 plus `deploy/`.

dlc-front does **not** own: portal screens (patients, appointments, billing, administration,
IAM Login/MFA/recovery, clinical record, analytics indicators), business rules or resource
authorization. Never copy or fake a portal's screens; use C02-compliant test doubles.

## 3. Architecture (ADR-011, contract v1)

- No Angular, React, Vue, Next or Module Federation in the compositor. No `shell/apiClient`,
  no `remoteEntry`, no `loaded-first`: portals are same-origin ES modules
  `/portals/{portalId}/{release}/entry.js` listed in `/portal-registry.json` (C01).
- Portals receive only the C02 `context` (route, signal, navigation, session, http,
  reportFailure; `iamSession` for IAM only). No JWT, credentials or framework objects cross it.
- The compositor alone controls history; whole-segment route matching; Clinical alias
  `/app/patients/{uuid}` → `/app/clinical/{uuid}` (C04).
- Session is a read-only projection owned by Auth (C05); `401` on a protected request ends it.
- HTTP capability (C06): catalogued `/api/v1` operations only, fresh `X-Correlation-Id` per
  attempt, 10 s → `TIMEOUT` (status 0), single central message table, `traceId`, caller
  `Idempotency-Key` preserved, no automatic write retry.
- Failure containment (C07): a failed portal only affects its host; registry and `entry.js`
  are `no-store`; safe telemetry without credentials or patient data.
- Development sign-in is a test double behind the C05 session port; it never reaches `main`.

## 4. Visual fidelity

The UI must match the mockup (photos supplied by the user, `di-lucca-mockup.pdf`,
`design-system.md`): structure, order, texts, icons, colors, typography, spacing, borders, states.
Compare every visual increment in the browser before the PR and record the comparison in the
evidence. Deviate only when dlc-docs requires it (e.g. Help, Settings, notifications deferred by
C04): render the element as in the mockup but inactive, and record reason and reference.
Never claim visual equality without a real browser check.

## 5. Workflow rules

- Work only in `code-corhuila/dlc-front`. Do not modify other repositories.
- Branches from `develop`: `feat/`, `fix/`, `chore/`. Conventional commits in English:
  `type(scope): lowercase description`, with the `Co-Authored-By` trailer the system indicates.
- No merge commits on branches; on conflicts, new branch from `develop` + `cherry-pick`. Never
  rebase, force-push or rewrite history. Promotion to `qa`/`main` only with `git cherry-pick -x`.
- Maximum 400 computable changed lines per PR (tests, lockfiles and generated files excluded).
- PR body sections, exactly: `## User story`, `## What changed and why`, `## How it was tested`,
  `## Evidence`, `## Known limitations`. User story: HU-IAM-001, `code-corhuila/dlc-docs#47`,
  unless the user approves another. **No "Generated with Claude Code" footer** in PRs or comments.
- CI reads the PR body from the event: after editing a body, close and reopen the PR.
- Merge only with green CI (`gh pr merge N --merge`) under the user's standing authorization.
- Never modify `.github/CODEOWNERS` or gate logic; never disable a test or gate to pass.
- Forbidden: `git rebase`, `git reset --hard`, `git clean`, `git checkout --`, `rm -rf`.
- Do not close HU issues: they stay open until real API integration and peer DoD review.

## 6. Per-increment cycle

1. Read the relevant sources; pick the smallest coherent slice (≤400 lines).
2. Write the behavioral test; run it; record RED only if it truly failed.
3. Implement; GREEN; refactor only if justified.
4. Run every gate available in `package.json`, `git diff --check` and the size measurement.
5. Add one section to `docs/quality/validation-evidence.md` (`DEV-FRONT-<TOPIC>-NNN`).
6. Commit → push → PR → wait for CI → fix failures yourself → merge when green.
7. Report to the user briefly: what changed, what was verified, what is next.

Never claim browser verification you did not perform. Never fabricate command results.

## 7. Autonomy

Decide technical matters yourself within these rules. Ask the user only for product decisions,
unresolvable source conflicts, a PR that does not fit HU-IAM-001, or irreversible actions not yet
authorized. Standing authorization applies only to this repository.

## 8. Lessons learned in clinical-portal

- `.gitattributes` with `*.mjs text eol=lf` (Windows CRLF breaks shebangs).
- Portal CSS is scoped to its mount wrapper; no global CSS leaks into the shell (C03).
- A professor bot reviews each PR: do not reformat unrelated files; every finding gets an
  answer (applied, or not applied with justification, norm 9.9).
- Do not put backtick text inside shell commands; use the file editor.
