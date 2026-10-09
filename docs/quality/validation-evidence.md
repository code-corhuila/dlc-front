# dlc-front Validation Evidence

Append-oriented record. Earlier PASS/FAIL entries are not rewritten; corrections are explicit and
reference the affected entry. Git history, PRs and GitHub Actions are the supporting trace.

## DEV-FRONT-RULES-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** agent rules (`AGENTS.md`, `CLAUDE.md`, `.claude/`), SDD spec and minimal CI aligned
  to ADR-011 and composition contract v1 (dlc-docs `638e4f2`).
- **TDD:** documentation and configuration only; no production code, so no RED is recorded.
- **Validation:** `npm run typecheck` and `npm test` (existing 13 request-target tests) run locally
  and in `ci.yml`; results are in the PR.

### Recorded differences between Annex H / norm and ADR-011

| Source rule | ADR-011 / contract v1 | Treatment |
| --- | --- | --- |
| Norm 4.2.2, 5.5.1; Annex H: React or Angular container | No technology of its own (ADR-011) | ADR-011 followed, as relayed professor clarification |
| Annex H: Module Federation, `shell/apiClient`, `loaded-first` | Registry + ES-module `entry.js`, C02 context (C01–C03) | Outcomes kept: shared client/session, per-route loading, local failure isolation |
| Annex H rule 4: `remoteEntry`/manifest never cached | Registry and `entry.js` `no-store` (C01) | Same intent applied to the new artifacts |
| Norm 5.5.2: dev sign-in with `dlc-infra` token | Session owned by Auth (C05) | Auth double behind the C05 port, develop only; replaced by IAM + Auth when they exist |
| Annex I: CI with Node 22 | Repository engines Node 24.12+ (native TS test run) | Node 24, admitted by norm 5.5.1 |
