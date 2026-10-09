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

## DEV-FRONT-ROUTES-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** `src/composition/routes.ts`, the pure C04 route resolver used to select and mount
  every portal: `/` → login or dashboard by session state, `/app` → dashboard, C01 owner bases
  (IAM `/login`, `/recover-password`, `/app/administration`; Patients, Appointments, Billing,
  Clinical prefixes) with whole-segment matching, legacy `/app/patients/{uuid}` →
  `/app/clinical/{uuid}` with replacement (query and fragment kept), Dashboard as shell-owned
  page hosting Clinical Analytics at localPath `/analytics`, shell 404 for unknown paths, and
  anonymous access to protected bases → sign-in with a pathname-only safe return.
  The route handed to portals carries `globalPath`, `basePath`, `localPath`, `query`
  (string arrays) and `fragment` without `#`.
- **TDD:** `tests/composition/routes.test.mjs` failed first with `ERR_MODULE_NOT_FOUND` (RED);
  after implementation 7/7 pass (GREEN). Covers the routing part of FC-06.
- **Validation:** typecheck, lint, format:check, test, test:coverage, build: results in the PR.
- **Limitations:** no history wiring, 404 page or dashboard yet (next increment); `compositionId`
  is added by the lifecycle (C02).

## DEV-FRONT-REGISTRY-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** `src/composition/registry.ts`, the C01 contract every micro-front is integrated
  through. `parseRegistry` validates `/portal-registry.json`: `contractVersion: 1`, non-empty
  `registryRevision`, one descriptor per known `portalId`; unsupported version, duplicate or
  unknown ids reject the whole registry (fails closed). A descriptor is disabled on its own when
  its `repository` does not match the owner, its `release` is not a safe segment, its `entryUrl`
  is not `/portals/{portalId}/{release}/entry.js`, or a navigation descriptor is malformed or
  points outside the owner's routes (checked with the C04 resolver). Navigation ids/paths claimed
  by two owners disable both, since no precedence is specified. `validateEntryModule` checks the
  imported `portalId`, `contractVersion: 1` and `mount` before invoking it.
- **TDD:** `tests/composition/registry.test.mjs` failed first with `ERR_MODULE_NOT_FOUND` (RED);
  after implementation 5/5 pass (GREEN). Covers the validation part of FC-01 and FC-02.
- **Decision recorded:** duplicate navigation claims disable both owners (interpretation of C01
  "unique IDs/paths"); to be confirmed by the contract owner.
- **Validation:** typecheck, lint, format:check, test, test:coverage, build: results in the PR.
- **Limitations:** fetching the registry and importing entries arrive with the lifecycle (C02).

## DEV-FRONT-LIFECYCLE-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** `src/composition/lifecycle.ts`, the C02 lifecycle that mounts any micro-front:
  validated entry (`validateEntryModule`), fresh `div[data-portal]` host per mount, plain base
  context (`contractVersion`, `portalId`, `mountId`, `compositionId`, `route` with
  `compositionId`, `signal`) extended by an injected capability factory, handle validation
  (`updateRoute`, `canLeave`, `unmount`), phases IDLE → LOADING → MOUNTING → ACTIVE →
  UNMOUNTING → IDLE / FAILED, deadlines (10 s load/mount/update/leave, 2 s unmount),
  `canLeave` before voluntary transitions, same-owner `updateRoute`, different-owner
  unmount-then-mount, newer targets superseding pending work (abort signal, late handles
  unmounted), forced cleanup without veto, and quarantine after a failed cleanup.
- **TDD:** `tests/composition/lifecycle.test.mjs` failed first with `ERR_MODULE_NOT_FOUND` (RED);
  after implementation 11/11 pass (GREEN); a 12th case (failed `updateRoute`) was added during
  refactor for coverage. Uses C02 test-double portals. Covers FC-01 (mount part), FC-02, FC-03,
  FC-04, FC-05 (lifecycle order) and FC-07.
- **Validation:** typecheck, lint, format:check, test (54 pass), test:coverage (lifecycle.ts
  100 % lines), build: pass locally; CI result in the PR.
- **Limitations:** the entry loader (registry fetch + dynamic import) and capability factory are
  injected; they are wired with the shell controller in the next increment.

## DEV-FRONT-LOADER-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** `src/composition/loader.ts` fetches `/portal-registry.json` once (same-origin,
  `no-store`, 10 s deadline), validates it with `parseRegistry` and imports only the selected
  available `entryUrl`; an unreachable or invalid registry fails closed and imports nothing;
  `invalidate()` lets an explicit retry revalidate it (C01, C07). `src/layout/pages.ts` adds the
  shell pages: global 404 with a way back, local PORTAL_UNAVAILABLE notice (`role=alert`) with
  explicit retry, and the shell-owned Dashboard (title, greeting, role-filtered shortcuts and an
  empty Clinical Analytics host). Headings are focusable for post-navigation focus (C04).
- **TDD:** `tests/composition/loader.test.mjs` and `tests/layout/pages.test.mjs` failed first with
  `ERR_MODULE_NOT_FOUND` (RED); after implementation 4/4 and 3/3 pass (GREEN).
- **Deviation:** the mockup greeting "Bienvenida de nuevo, Dra. Sarah. Esto es lo que sucede hoy."
  becomes "Hola de nuevo, {name}." because the shell does not know the user's gender and shows
  no daily data (indicators are Clinical-owned, HU-CLN-003).
- **Validation:** typecheck, lint, format:check, test, test:coverage, build: results in the PR.
- **Limitations:** wiring with history, lifecycle and the browser comparison come in the next
  increment.
