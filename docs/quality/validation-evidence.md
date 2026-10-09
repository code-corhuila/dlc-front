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

## DEV-FRONT-QUALITY-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** ESLint, Prettier, Node test coverage (lines ≥90 %, branches ≥80 % over `src/`),
  `tsc` build to `dist/`, `.gitattributes`, `.env.example`, and `scripts/pr-gates.mjs`
  (norm 9.2 size, 6.3 branch, 8/15.2 commits, 9.1 PR body, ADR-011 no-framework import check),
  all run by `ci.yml`.
- **TDD:** `tests/scripts/pr-gates.test.mjs` ran first and failed with `ERR_MODULE_NOT_FOUND`
  (RED); after adding the script, 6/6 pass (GREEN).
- **Validation (local, Node 24.19):** typecheck, lint, format:check, test (19 pass),
  test:coverage (100 % lines/branches on `requestTarget.ts`), build: all pass.
- **Notes:** two `no-control-regex` exceptions in `requestTarget.ts` are intentional (C06 rejects
  control characters). Existing sources were reformatted in a separate `style` commit. Markdown is
  excluded from Prettier to avoid documentation churn.

## DEV-FRONT-NAV-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** C04 navigation model (baseline descriptors, generic `rolesAny`/`permissionsAll`
  membership that fails closed, active item by whole path segments) and the static shell
  pipeline: `public/` copied to `dist/` by `npm run build`, self-hosted Inter font,
  `npm run preview` (no-store, shell HTML for deep links, 404 for missing assets, C01).
  `rewriteRelativeImportExtensions` lets sources import `.ts` and emit `.js`.
- **TDD:** `tests/layout/navigation.test.mjs` failed first with `ERR_MODULE_NOT_FOUND` (RED);
  after implementation 4/4 pass (GREEN).
- **Validation:** typecheck, lint, format:check, test, test:coverage, build: results in the PR.
- **Limitations:** no visible frame yet (next increments); `happy-dom` is added for DOM tests.

## DEV-FRONT-FRAME-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** DOM structure of the common frame (mockup p. 4) in plain TypeScript: landmarks
  (banner, labelled navigation, main), sidebar from the C04 model with `aria-current`, top bar
  with the deferred search (disabled) and user chip, sidebar footer with initials, role badge
  and a labelled Logout action, and the empty composition host. `src/main.ts` mounts it with a
  fixed ADMINISTRATOR development persona until the C05 session port lands.
- **TDD:** `tests/layout/frame.test.mjs` failed first with `ERR_MODULE_NOT_FOUND` (RED); after
  implementation 7/7 pass (GREEN).
- **Validation:** typecheck, lint, format:check, test, test:coverage, build: results in the PR.
- **Limitations:** styles, logo and the browser comparison with the mockup arrive in the next PR.

## DEV-FRONT-FRAME-002

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** shell styles measured on mockup p. 4 (`public/assets/shell.css`, shell-prefixed
  selectors only) and the DI LUCCA logo extracted from the mockup (`public/assets/logo.png`).
- **TDD:** styling only; verified by the browser comparison below, no RED recorded.
- **Browser comparison:** mockup p. 4 rendered with pdf.js at 1280×917 (pixel colors read with
  `getImageData`) against `npm run preview` at `/app/billing/invoices/7`, viewport 1280×917,
  Inter loaded, positions from `getBoundingClientRect`:

| Element | Mockup | Implementation |
| --- | --- | --- |
| Sidebar width / background / border | 256 px, `#F2F4F6`, `#C2C6D4` | 256 px, same colors |
| Logo box | x 36, y 56, 158×128 | x 36, y 56, 158×128 |
| Nav item centers (y) | 232, 277, 321, 367, 413, 458 | 233, 278, 323, 368, 413, 458 |
| Active item | x 12–244, `#E4EBF8`, 4 px `#1EA296` bar | x 12–243, same colors (Facturación active on a descendant route) |
| Footer | border y 807, height 110, avatar center (42, 862), logout center x 215 | same |
| Top bar | 63 px, bottom border `#C2C6D4` | 63 px, same |
| Search box / gap to chip | x 636, 372×38, gap 25 | x 653, 372×38, gap 24 |

The 17 px search offset comes from the 15 px classic scrollbar of the test viewport and the chip
width; the mockup chip itself overflows the 1280 px page edge.

### Recorded deviations from the mockup

| Element | Deviation | Reason / reference |
| --- | --- | --- |
| Sidebar items | Dashboard, Pacientes, Citas, Clínica, Facturación, Administración instead of Pacientes/Procedimiento/Citas/Horarios y Slots/Historia clínica/Facturación/Gestión de Usuarios | C04 baseline descriptors and `navigation-map.md`; owners add sub-areas |
| Search | Rendered as in the mockup but disabled | No global search is specified; C04 defers shell features beyond navigation |
| Breadcrumb, notifications, settings | Not rendered | Absent from mockup p. 4; notifications/Help/Settings deferred by C04 |
| Icons | Outline approximations of the mockup glyphs | Original icon set not in the repository |
| Role badge | ADMIN / ODONTÓLOGO / SECRETARÍA | Mockup only shows ADMIN |
| Dashboard content (KPIs, charts, next appointments) | Not rendered by the shell | Clinical-owned Analytics (HU-CLN-003); shell adds shortcuts in a later increment |
