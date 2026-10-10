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

## DEV-FRONT-SLOTS-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** the C02 lifecycle now mounts into a chosen container (main area or the Dashboard
  Analytics host); the same owner in another slot is remounted instead of updated, so Clinical
  never keeps its record instance inside the Analytics host. `leave()` releases the active mount
  voluntarily after `canLeave` (used before shell pages such as 404 and Dashboard).
  `src/composition/navigationTarget.ts` validates C04 `navigation.request` targets: same-origin
  absolute paths only; schemes, protocol-relative URLs, backslashes, control characters,
  dot-segments, malformed encoding and encoded separators → `INVALID_ROUTE`; unknown global
  paths are not recognized targets.
- **TDD:** the two new lifecycle cases failed first (2 failures, RED) and pass after the change;
  `tests/composition/navigationTarget.test.mjs` failed with `ERR_MODULE_NOT_FOUND` (RED), then 4/4
  pass (GREEN).
- **Validation:** typecheck, lint, format:check, test, test:coverage, build: results in the PR.

## DEV-FRONT-SHELL-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** `src/composition/shell.ts`, the controller that integrates the micro-fronts: it owns
  global history (shell index per entry), resolves each URL with C04, follows redirects (entry,
  Clinical alias, anonymous → `/login` with a pathname-only safe return consumed once), releases
  the current mount with `canLeave` before page changes, mounts owners into the main host, renders
  the shell Dashboard with Clinical Analytics in its own host, the global 404 and the local
  PORTAL_UNAVAILABLE notice with retry (registry revalidation) or reload after quarantine. It
  exposes `request({path, replace})` → applied / cancelled / rejected for the C04 navigation
  capability, routes same-origin link clicks, compensates cancelled Back/Forward with a suppressed
  traversal, updates the active sidebar item and focuses the content heading (or `main`).
  `frame.setActive` and the focusable `main` support it; `DOM.Iterable` was added to `lib`.
- **TDD:** `tests/composition/shell.test.mjs` failed first with `ERR_MODULE_NOT_FOUND` (RED); the
  first GREEN run showed 2 assertion failures caused by the tests' own text matching (no spaces in
  `textContent`), fixed in the tests; then 9/9 pass. The new `frame.setActive` case failed first
  (RED) and passes after the change. Covers FC-06, FC-07 (navigation), FC-15 and the C04/C07
  shell behaviour with C02 test-double portals.
- **Validation:** typecheck, lint, format:check, test (77 pass), test:coverage, build: pass locally;
  CI result in the PR.
- **Limitations:** `src/main.ts` wiring, the test-double portal bundles, the registry file and the
  browser verification come in the next increment.

## DEV-FRONT-WIRING-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** `src/main.ts` wires registry loading, the frame (sidebar from the registry's owner
  descriptors in C04 order), the lifecycle, the shell controller and the browser History adapter
  (`src/composition/browserHistory.ts`, shell index in `history.state`). Portals receive a frozen
  context with the scoped `navigation.request` capability (`src/composition/capabilities.ts`),
  which rejects with CANCELLED once its mount signal aborts. An invalid or unreachable registry
  renders the frame with the unavailable state and loads no entry (C07). `fixtures/` holds the
  local-preview registry and C02 test-double portals (IAM, Patients, Billing, Clinical; the
  Appointments entry is intentionally missing); `npm run preview` serves `fixtures/` over `dist/`
  and `npm run build` never copies it.
- **TDD:** `tests/composition/adapters.test.mjs` failed first with `ERR_MODULE_NOT_FOUND` (RED);
  after implementation 3/3 pass (GREEN).
- **Browser verification (`npm run build` + `npm run preview`, viewport 1280×917):**
  `/` → `/app/dashboard` with shortcuts and the Clinical double in the Analytics host
  (`localPath /analytics`); sidebar Citas → `/app/appointments/calendar` shows the local
  PORTAL_UNAVAILABLE notice with retry while menu and header stay usable (FC-02); Pacientes →
  Patients double, heading focused; `/app/patients/{uuid}` link → `/app/clinical/{uuid}`, Clínica
  active (FC-06); Back → `/app/patients`, Forward → Clinical record; `/app/nada` → global 404 with
  focused heading and no active item; missing `entry.js` → HTTP 404 (no HTML fallback);
  `/portal-registry.json` served `no-store`; the console shows only the two expected 404s (the missing
  Appointments entry import and the manual missing-entry check).
- **Limitations:** fixed ADMINISTRATOR persona until the C05 session port; HTTP capability (C06)
  and `reportFailure` (C07) are not yet in the portal context.

## DEV-FRONT-GATES-002

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** `scripts/pr-gates.mjs` aligned with the promotion procedure before the first
  promotion to `qa`:
  - **Controlled feeder exception:** `promotion/*` is admitted only toward `qa`. Git cannot hold
    `refs/heads/qa/*` while `refs/heads/qa` exists, so the literal `qa/*` prefix of norm 6.3.1
    cannot be created; the project owner instructed `promotion/*` (same exception used in
    dlc-clinical-portal, QA-CLIN-PORTAL-QUALITY-001). This record does **not** claim literal
    `qa/*` compliance. Promotion mechanics are unchanged: branch from `qa`, `git cherry-pick -x`,
    PR back into `qa`, no permanent-branch merge (norm 10).
  - **Commit subject:** the scope is now optional, exactly the norm 15.2 audit expression; the
    previous gate was stricter than the norm and would reject conformant commits already in
    `develop` (e.g. `docs: correct scaffold documentation references`).
- **TDD:** two new cases in `tests/scripts/pr-gates.test.mjs` failed first (RED, 2 failures);
  after the change 8/8 pass (GREEN).
- **Validation:** typecheck, lint, format:check, test, test:coverage, build: results in the PR.

## DEV-FRONT-SIDEBAR-002

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** the sidebar renders the full mockup menu from owner-supplied registry descriptors:
  Dashboard, Pacientes, Procedimientos, Citas, Horarios y Slots, Historia clínica, Facturación,
  Gestión de usuarios. `orderNavigation` follows the mockup order (owner sub-areas next to their
  owners); `activeItemId` picks the most specific entry whose path prefixes the URL, else the
  owner's default entry; new `procedures` (bolt) and `availability` (clock) icons, and filled
  person/tooth/gear glyphs as drawn in the mockup.
- **Ownership (navigation-map.md):** Horarios y Slots → `dlc-appointments-portal`;
  Procedimientos (price catalog) → `dlc-billing-portal`; per C04 these entries are owner
  metadata. The preview registry (`fixtures/`) supplies them with placeholder paths
  `/app/appointments/availability` and `/app/billing/procedures`, pending owner approval.
- **Labels:** the preview registry uses the mockup labels ("Historia clínica", "Gestión de
  usuarios"); the shell baseline keeps the navigation-map labels as fallback.
- **TDD:** two new cases in `tests/layout/navigation.test.mjs` failed first (RED, 2 failures);
  after the change all tests pass (84, GREEN).
- **Browser check:** `npm run build` + `npm run preview`, 1280×917, `/app/billing/procedures`:
  eight items in the mockup order with Procedimientos active.

## DEV-FRONT-PUBLIC-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** public brand frame (`src/layout/publicFrame.ts`, mockup pp. 1-3) around the
  IAM-owned public bases `/login` and `/recover-password`: header with the DI LUCCA emblem
  (`public/assets/emblem.png`, cut from the mockup logo with a transparent background), word
  mark, Citas/Servicios/Contacto and Login; footer with the copyright and Privacidad, Términos,
  Cookies. The shell controller now holds two frames and swaps them by route (public IAM bases
  vs protected routes); a slot is one owner inside one frame, so IAM moving from `/login` to
  `/app/administration` is remounted in the app frame and stale app content is cleared.
- **Ownership (navigation-map.md, ADR-011):** the Login card, recovery and MFA are
  `dlc-iam-portal` content mounted in `#public-host`; the shared header/footer does not transfer
  them to dlc-front. Home (`/`) is a deferred public reference: `/` keeps the C04 redirect to
  Login or Dashboard. Citas/Servicios/Contacto and the legal links render inactive
  (`aria-disabled`) because their pages are deferred. The background photos belong to the
  Home/Login content, not to the frame.
- **TDD:** `tests/layout/publicFrame.test.mjs` failed first with `ERR_MODULE_NOT_FOUND` (RED),
  then 3/3; the shell frame-swap cases failed first (RED: 10 failures, then 1 for stale content)
  and pass after the change (89 tests in total, GREEN).
- **Browser comparison (`/login`, 1280×917, against mockup p. 2 at 1280 px):** emblem x 38
  (mockup ≈ 40), word mark x 124 (124), Citas 239 (238), Servicios 328 (330), Contacto 446 (447),
  Login button x 1179, 68×35, `#1EA296` (1179, 69×35, `#1EA296`), header 63 px with `#E5E7EB`
  border (same); footer 93 px, legal links at 1024/1112/1192 (≈ 1015/1109/1194).

## QA-FRONT-PROMOTION-001

- **Environment:** QA promotion of all dlc-front work validated in `develop` up to `f1bf020`.
- **Mechanics (norm 10):** twelve feeder branches `promotion/qa-front-01` … `-12`, each cut from
  the current `qa`, filled with `git cherry-pick -x` in `develop` order and merged by PR into
  `qa`; no permanent branch was merged into another. `promotion/*` is the controlled feeder
  exception (DEV-FRONT-GATES-002); this record does not claim literal `qa/*` compliance.
- **Size (norm 9.2):** every promotion PR stayed within 400 computable lines (largest 349).
- **Decisions:**
  - Harold's commits `16da03a`/`438a134` were promoted as they are, including the CODEOWNERS
    comment change (`library-docs` → `code-corhuila/dlc-docs`); the project owner confirmed it
    was an intentional alignment after a template from another group. The owner rule
    `*   @ariel5253` is unchanged.
  - `9a7aeef` and `08a9e50` are exact duplicates of `16da03a` and `438a134` (same parent, merged
    through PRs #4 and #5) and were not re-applied; their content is in `qa` through the first pair.
  - `e2d624e` (promotion gate fix) was promoted with `27adad8` in batch 04 so the full CI ran
    with the agreed feeder rule.
  - Conflicts only arose in this append-only evidence file and were resolved by keeping both
    sides (`git merge-file --union`).
- **Promotion PRs:**

| PR | Feeder branch | Merge commit in `qa` | Source commits |
| --- | --- | --- | --- |
| #22 | `promotion/qa-front-01` | `c633150` | `16da03a`, `438a134`, `0c041bf` |
| #23 | `promotion/qa-front-02` | `add0f4e` | `440e099`, `7ad5313` |
| #24 | `promotion/qa-front-03` | `124f733` | `6748d8f`, `9b96a03` |
| #25 | `promotion/qa-front-04` | `5e0bcc7` | `27adad8`, `e2d624e` |
| #26 | `promotion/qa-front-05` | `fb33055` | `ba39a46`, `574fd33` |
| #27 | `promotion/qa-front-06` | `abcb7cc` | `249f901` |
| #28 | `promotion/qa-front-07` | `ff2ef0b` | `9af75eb`, `41f88dc` |
| #29 | `promotion/qa-front-08` | `1125ec7` | `7332dc2` |
| #30 | `promotion/qa-front-09` | `e8e9b47` | `2b8698a`, `56ae0bf` |
| #31 | `promotion/qa-front-10` | `4208eea` | `3e5f34a` |
| #32 | `promotion/qa-front-11` | `53207ef` | `987d474` |
| #33 | `promotion/qa-front-12` | `aa2fb54` | `720d27b`, `f1bf020` |

- **CI:** PR #22 had no checks because `ci.yml` only arrives in batch 02; it was verified locally
  (typecheck, 13/13 tests). PRs #23–#33 passed `ci.yml`; from #25 on with every gate.
- **Audit (norm 15) after the last merge:** `git diff origin/qa origin/develop` is empty;
  15.3 returns no commit without trail; 15.4 returns no permanent-branch merge; 15.6: all 21
  cited SHAs exist in `develop`; 15.2 returns only GitHub "Merge pull request" subjects.
- **Functional check on `qa` (`aa2fb54`):** `npm ci`, `npm run build`, 89/89 tests; preview at
  1280×917: `/` → dashboard with the Clinical Analytics double, eight-item menu, Procedimientos
  active on `/app/billing/procedures`, local PORTAL_UNAVAILABLE on Citas, public frame with the
  IAM double on `/login`.

## DEV-FRONT-SESSION-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** `src/core/session/session.ts`, the C05 browser projection behind an `AuthPort`:
  snapshot `{state, revision, user, permissions, expiresAt, reason}` (states resolving,
  authenticated, anonymous, expired, unavailable), frozen defensive copies exposing only
  `{id, name, roles}`, malformed data → unavailable/INVALID_RESPONSE, `subscribe` delivering the
  current snapshot immediately with isolated listener failures, IAM-only `complete` limited to
  `AuthVerifyMFAchallenge`/`AuthConfirmMFAenrollment`, `logout` that clears local state before
  asking Auth and reports an outage as unconfirmed, and `invalidate` for protected 401/expiry.
  `scopeSession` gives each mount a read-only `{getSnapshot, subscribe}` released when its
  signal aborts (calls afterwards throw CANCELLED).
- **Norm 5.5.2 vs C05:** the norm's development sign-in uses a `dlc-infra` token; C05 makes Auth
  the session authority. The port keeps tokens inside the Auth adapter; the development Auth
  double (next increment) plugs into the same port and is replaced by the real Auth adapter when
  IAM/Auth exist. Cross-tab Web Locks/BroadcastChannel and CSRF/refresh (FC-10) belong to that
  real adapter and are not implemented here.
- **TDD:** `tests/core/session/session.test.mjs` failed first with `ERR_MODULE_NOT_FOUND` (RED);
  after implementation 8/8 pass (GREEN). Covers the C05 parts of FC-09, FC-11 and FC-12.
- **Validation:** typecheck, lint, format:check, test, test:coverage, build: results in the PR.
