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

## DEV-FRONT-CLINICAL-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** integration of the real Clinical entry (`dlc-clinical-portal` `develop` `84becf5`)
  through the registry, with the C05 session and C07 failure capabilities in the portal context:
  - `src/main.ts`: session from an `AuthPort`; the development Auth double is loaded only from
    `/dev-auth.js`, which exists solely in `fixtures/` (local preview), otherwise the session is
    unavailable; context adds `session` (scoped, read-only), `reportFailure`, and `iamSession`
    for IAM only; frame identity and menu follow the session.
  - Shell: `reportFailure(mountId, {code})` ends only the live mount (lifecycle `fail`), shows
    the local PORTAL_UNAVAILABLE notice and records `{code, portalId, mountId}`;
    `sessionChanged()` force-cleans private content and goes to Login on logout, and returns to
    the safe path once on sign-in.
  - Frame `setUser` re-renders role menu and identity. Dashboard: Analytics host before the
    shortcuts; when Clinical is active the shell heading becomes visually hidden (still focusable)
    because Clinical renders the mockup header.
  - Preview: `/portals/clinical/` proxied same-origin to `CLINICAL_ORIGIN` (default
    `http://localhost:4175`, `clinical-portal-demo`) with `no-store`; registry entry
    `clinical` `0.1.0-demo`; the IAM double offers the development sign-in (DENTIST,
    ADMINISTRATOR, SECRETARY_ASSISTANT with the Clinical demo staff ids) through
    `iamSession.complete`. The Clinical test double was removed.
- **TDD:** new cases failed first (RED) and pass after the change: lifecycle `fail` (1),
  frame `setUser` (1), shell `reportFailure`/`sessionChanged` (2) and dashboard delegation (1).
- **Browser verification (`npm run build` + `npm run preview`, Clinical containers up,
  1280×917):** anonymous `/app/clinical/patient-a` → `/login` with the dev sign-in; DENTIST →
  back to `/app/clinical/patient-a`, Clinical record of Ana García Rodríguez (plan, diagnoses,
  evolution) rendered from `/portals/clinical/0.1.0-demo/entry.js` + `entry.css`; menu without
  Gestión de usuarios. Link to `/app/clinical/patient-b` → same host instance (`updateRoute`).
  Leaving to Facturación → no Clinical root or stylesheet left in the DOM (clean `unmount`).
  Logout → `/login`, no private frame left. ADMINISTRATOR → safe return, full menu; Dashboard
  shows Panel, greeting, Citas de hoy, Pacientes pendientes, Ingresos del mes, Actividad semanal
  and Próximas citas as in mockup p. 4; SECRETARY_ASSISTANT sees no Ingresos del mes.
- **Observations for the Clinical team:** the demo build shows its own role/patient selector
  inside the record; in the composed shell the role comes from the session.
- **Limitations:** no C06 `http` capability in the context yet; deploy nginx/compose proxy comes
  in the deployment increment.

## DEV-FRONT-DEPLOY-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** `deploy/Dockerfile` (Node 24 build with `npm ci` + `npm run build`, served by
  nginx 1.27), `deploy/nginx.conf.template` and `deploy/compose.yml` for the front-only demo:
  - same-origin proxy `^~ /portals/clinical/` → `${CLINICAL_UPSTREAM}` (default
    `http://clinical-portal-demo`) resolved per request through Docker DNS, so a stopped portal
    never prevents nginx from starting (C07); upstream `Cache-Control` replaced by `no-store`;
  - `/portal-registry.json`, `/dev-auth.js` and `/portals/` served `no-store` from the mounted
    deployment data (`fixtures/` in the demo compose only); missing files return 404, never the
    shell HTML; deep links return `index.html` (C01, Annex H rule 4);
  - compose joins the external `dlc-clinical-portal_default` network; variables documented in
    `.env.example`.
- **Annex H difference:** Annex H asks for Node 22 in the Dockerfile; the repository engines
  require Node 24.12+ (norm 5.5.1 admits Node 22 or 24), recorded since DEV-FRONT-RULES-001.
- **Verification (`docker compose -f deploy/compose.yml up --build -d`, Clinical containers up):**
  `curl`: `/`, `/app/clinical/patient-a` → 200 HTML `no-store`; registry, dev Auth double,
  Clinical `entry.js`/`entry.css` through the proxy → 200 `no-store`; missing entry and
  `/nope.js` → 404. Browser at `http://localhost:8080`: DENTIST record of patient-a rendered.
  With `clinical-portal-demo` stopped: `dlc-front` still 200, proxy 504; after reload and
  sign-in the Dashboard shows the local PORTAL_UNAVAILABLE notice with the shell heading visible
  and six working shortcuts (FC-15); the container was started again afterwards.
- **Limitations:** the demo compose mounts preview fixtures (development only); production
  registry and Auth configuration are deployment values not yet defined.

## DEV-FRONT-DEVSESSION-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** the development Auth double (`fixtures/dev-auth.js`, preview/demo only) restores
  the session from an optional deployment file `/dev-session.json` (`{"persona": "DENTIST"}`,
  `ADMINISTRATOR` or `SECRETARY_ASSISTANT`), so the preview starts authenticated without code
  changes. Missing file, unknown persona or fetch failure → anonymous (Login). Logout keeps the
  page signed out until the next load. Nothing is stored in the browser (C05). nginx serves the
  file `no-store` from the deployment data; `fixtures/dev-session.json` defaults to DENTIST.
- **TDD:** fixture configuration only (outside `src/`); verified in the browser instead of RED.
- **Browser check (`npm run preview`):** `/app/clinical/patient-a` opens directly as
  Dra. Valentina Ruiz with the Clinical record; Logout → `/login`.
- **Replacement:** removed together with the Auth double when IAM/Auth exist.

## DEV-FRONT-ERRORS-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** full-page service error states with the same card as the global 404 (heading,
  message, one action), built by `renderServiceError` in `src/layout/pages.ts`:
  - `SESSION_UNAVAILABLE` (C05: Auth unreachable or malformed) — public frame, requested URL
    kept, "Reintentar" re-runs session resolution; protected content is never mounted.
  - `SESSION_EXPIRED` (C05) — "Iniciar sesión" to `/login`; the safe return is preserved.
  - `REGISTRY_UNAVAILABLE` (C07) — app frame kept, no entry loaded, "Reintentar".
  - `UNSUPPORTED_BROWSER` (C01/FC-18) — missing AbortController, BroadcastChannel, History,
    Web Locks or `crypto.randomUUID`; no insecure fallback.
  The local PORTAL_UNAVAILABLE notice keeps the same card style inside the portal area.
- **TDD:** the pages case failed first (missing export, RED) and the shell case failed first
  (1 failure, RED); both pass after the change.
- **Browser check (`npm run preview`, 1280×917), forcing each state with temporary fixture
  copies restored afterwards:** malformed `dev-session.json` → "Servicio de autenticación no
  disponible" at `/app/clinical/patient-a` in the public frame; invalid `portal-registry.json`
  → "Servicios no disponibles" inside the app frame.

## DEV-FRONT-HOME-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** public Home (mockup p. 1) at `/` for anonymous visitors, inside the public frame:
  the hero artwork extracted from the mockup PDF (`public/assets/home-hero.jpg`, 1802×872,
  anchored left so its text stays visible) fills the area between header and footer; the same
  content is provided as visually hidden text (`h1` "¡Bienvenido!", tagline, description, four
  pillars). Header: logo → `/`, Login → `/login` (IAM), Citas → `/app/appointments/calendar`
  (Login first, then safe return); Servicios and Contacto stay inactive (no pages specified).
  Authenticated `/` still goes to the Dashboard.
- **Difference with dlc-docs (owner decision):** `navigation-map.md` lists Home as deferred and
  C04 redirects anonymous `/` to Login. The project owner asked for the Home now; dlc-docs
  should be updated accordingly. Login, recovery and MFA remain IAM content.
- **TDD:** route, public frame, pages and shell cases failed first (4 failures, RED) and pass
  after the change (106 tests, GREEN).
- **Browser check (`npm run preview`, 1280×917):** after logout, logo → `/` shows the Home as in
  mockup p. 1; Login → `/login` with the IAM double; Citas → `/login`, then sign-in as
  SECRETARY_ASSISTANT → `/app/appointments/calendar` with Citas active.

## DEV-FRONT-FIT-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** the common frame fits the viewport. The user chip no longer has the −23 px margin
  copied from the mockup (where it overflows the page edge), the top bar keeps 24 px padding,
  the search box shrinks before overflowing, the sidebar scrolls internally, short screens
  (≤ 760 px high) use a smaller logo and tighter spacing, and narrow screens (≤ 960 px) switch
  to an icon-only sidebar whose links keep `aria-label` and `title`.
- **TDD:** the accessible-name case failed first (RED) and passes (GREEN); layout verified in
  the browser.
- **Browser check (`npm run preview`):** 1355×634 (reported screen): no horizontal scroll (scroll
  width 1340 = client width), chip fully visible; 900×700: icon-only sidebar, no horizontal
  scroll; 1280×917: logo, nav rhythm and footer unchanged, search at x 659 (mockup 636: the
  mockup chip overflows the page).
- **Observation for the Clinical team:** `.portal-placeholder` ("Seleccione un paciente") uses
  `min-height: 100vh` inside the portal host, which adds vertical scroll under the shell header;
  the shell does not override portal CSS (C03).
- **Patients portal:** `code-corhuila/dlc-patient-portal` `develop` `ab65ce9` has empty
  `deploy/compose.yml`, `deploy/nginx.conf` and `federation.config.js` and no contract v1
  entry (`portalId`, `contractVersion`, `mount`), so it cannot be registered yet (C01–C03).

## DEV-FRONT-DEMO-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** the Patients C02 test double (`fixtures/`, preview/demo only) lists the synthetic
  patients already defined by the Clinical demo build (`patient-a` … `patient-d`, generic
  labels, no personal data) and opens each record through the C04 `navigation.request`
  capability. `docs/demo/clinical-dashboard-demo.md` describes how to start the front-only demo
  and the script per role, including live failure cases.
- **TDD:** fixture and documentation only; verified in the browser.
- **Browser run (`npm run preview`, Clinical demo container up, 1280×917, DENTIST):**
  Pacientes → patient-a record (Historia clínica active); Pacientes → patient-c → Clinical shows
  "Acceso denegado"; Back → `/app/patients`. Steps 9–14 of the script were verified in
  DEV-FRONT-CLINICAL-001, DEV-FRONT-DEPLOY-001 and DEV-FRONT-WIRING-001.

## QA-FRONT-PROMOTION-002

- **Environment:** QA promotion of the `develop` work after QA-FRONT-PROMOTION-001, up to
  `fc03016` (session, Clinical integration, deployment, dev session file, service error pages,
  public Home, viewport fit and the Clinical/Dashboard demo).
- **Mechanics:** five feeder branches `promotion/qa-front-13` … `-17`, each cut from the current
  `qa` and filled with `git cherry-pick -x` in `develop` order (append-only evidence conflicts
  resolved by keeping both sides), merged by PR into `qa`; no permanent-branch merge.

| PR | Feeder branch | Merge commit in `qa` | Source commits |
| --- | --- | --- | --- |
| #43 | `promotion/qa-front-13` | `822cb32` | `364db7d`, `a529d3b` |
| #44 | `promotion/qa-front-14` | `ffabb39` | `725b361` |
| #45 | `promotion/qa-front-15` | `05610b5` | `72d464f`, `61bd24c`, `79ebe84`, `98b14ea` |
| #46 | `promotion/qa-front-16` | `df7315a` | `b5d9d69`, `058d7b1` |
| #47 | `promotion/qa-front-17` | `5b92d58` | `0288478`, `fc03016` |

- **CI:** all five PRs passed every gate, each within 400 computable lines.
- **Audit (norm 15) after the last merge:** `git diff origin/qa origin/develop` empty; 15.3 no
  commit without trail; 15.4 no permanent-branch merge; 15.6 all 32 cited SHAs exist in
  `develop`.
- **Demo on `qa` (`5b92d58`):** `deploy/compose.yml` built from `qa` with the Clinical demo
  container up, `http://localhost:8080`, DENTIST from `dev-session.json`: Pacientes → patient-a
  record; patient-b in the same Clinical instance (`updateRoute`); Dashboard with Clinical
  Analytics in professional scope (no Ingresos del mes); leaving to Facturación leaves no
  Clinical root or stylesheet.

## DEV-FRONT-HOME-002

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change (owner decision):** `/` is always the public Home, the entry where the visitor
  chooses the flow; a signed-in visitor who opens `/login` goes to the Dashboard instead of IAM
  Login (C04 "otherwise open dashboard"). The Home hero now uses the artwork's own ratio
  (1802:872) at full width, so nothing is cropped, and the footer follows it directly.
- **Difference with dlc-docs:** extends DEV-FRONT-HOME-001 (C04 redirects `/`; navigation-map
  lists Home as deferred).
- **TDD:** the route case failed first (RED); two shell tests that encoded the previous `/`
  and `/login` behaviour were adapted (`/app` and `/recover-password`) and a new case covers the
  signed-in Home; 108 tests pass (GREEN).
- **Browser comparison (`npm run preview`, 1280×777 = mockup page size, signed in as DENTIST):**
  header 0–63, hero 63–682, footer 682–775 (mockup 0–63, 63–684, 684–777); tooth, plant and
  mirror visible as in mockup p. 1.

## DEV-FRONT-TOPBAR-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** the top bar is interactive.
  - **Search:** `form[role=search]`; Enter with a non-empty term requests
    `/app/patients?q=<term>` through the shell navigation. The Patients owner interprets the
    query (C04 route query); the shell aggregates no business data. The Patients C02 test double
    filters the synthetic list by `q` to demonstrate it.
  - **User menu:** the chip is a `button` (`aria-haspopup="menu"`, `aria-expanded`) opening a
    menu with name, role, Inicio (`/`) and Cerrar sesión (C05 logout); closes on Escape (focus
    back to the chip) and on outside click.
- **Difference:** C04 defers global search; by owner request the search is enabled as owner-route
  navigation only, with no shell-side data or new API.
- **TDD:** the search and menu cases failed first (2 failures, RED) and pass (GREEN).
- **Browser check (`npm run preview`, 1280×917):** "sintético b" + Enter → `/app/patients?q=…`
  listing only Paciente sintético B; chip → menu with Dra. Valentina Ruiz / ODONTÓLOGO, no
  horizontal overflow; outside click closes it; Cerrar sesión → `/login`.

## DEV-FRONT-DASHBOARD-CHECK-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** the top bar stays visible while the page scrolls (sticky, page background), and
  the sidebar logo links to the Home entry (`/`, `aria-label` "DI LUCCA, inicio"; image now
  decorative inside the link).
- **TDD:** the logo-link case failed first (RED) and passes; 110 tests (GREEN).
- **Browser check (`npm run preview`, 1280×917):** after scrolling 86 px the top bar stays at
  y 0, 63 px high; logo box still 36,56,158×128 and first item at y 211; clicking the logo opens
  `/` with the Home.
- **Dashboard vs mockup p. 4 (ADMINISTRATOR, 1280×917):**

| Element | Owner | Mockup | Implementation | Result |
| --- | --- | --- | --- | --- |
| Sidebar, top bar | shell | measured in DEV-FRONT-FRAME-002 | unchanged | match |
| KPI cards | Clinical | x 280/612/946, 309×148, y 204 | x 280/608/937, 304×143, y 194 | close (scrollbar −15 px) |
| Actividad semanal | Clinical | 280,402, 641×454, "This Week" selector | 280,361, 625×332, no selector | differs |
| Próximas citas | Clinical | 946,402, 310×508, "View All Appointments" | 929,361, 312×332, no link | differs |
| "Actualizado: hh:mm UTC" | Clinical | absent | present | differs |
| Shortcuts below Analytics | shell | absent | present | C04 deviation (shell shortcuts) |

  The differing rows are Clinical-owned content (HU-CLN-003); reported to the Clinical team, not
  overridden by the shell (C03).

## DEV-FRONT-HOME-003

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** Home header "Servicios" opens `/app/billing/procedures`, the procedure catalog that
  mockup p. 7 presents as "Servicios, duraciones y precios" (Billing owner; Login first when
  signed out). "Contacto" stays inactive: no contact page or data is specified in dlc-docs.
- **Note:** "Login" on the Home goes to IAM Login when signed out and to the Dashboard when a
  session exists (DEV-FRONT-HOME-002); with `dev-session.json` the preview starts signed in.
- **TDD:** the public frame case failed first (RED) and passes (GREEN).
- **Browser check (`npm run preview`):** a real click on Login with a session opened
  `/app/dashboard`.

## QA-FRONT-PROMOTION-003

- **Environment:** QA promotion of `9a81893` … `67aeef2` (second promotion record, Home entry
  flow, top bar search and menu, sticky top bar and logo link, Home services link).

| PR | Feeder branch | Merge commit in `qa` | Source commits |
| --- | --- | --- | --- |
| #53 | `promotion/qa-front-18` | `2cc2b06` | `9a81893`, `e7aa558` |
| #54 | `promotion/qa-front-19` | `9e8e298` | `933a31c` |
| #55 | `promotion/qa-front-20` | `899457d` | `e5b87ac`, `67aeef2` |

- **CI:** the three PRs passed every gate within 400 computable lines.
- **Full audit after the merge (all promotions 001–003):** `git diff origin/qa origin/develop`
  empty; every `develop` commit has a `qa` commit with its `cherry picked from` trail except the
  exact duplicates `9a7aeef`/`08a9e50` (QA-FRONT-PROMOTION-001) and the seed `5b339d1`, which is
  `qa`'s own base; 15.2 no non-conformant subject; 15.3 no `qa` commit without trail; 15.4 no
  permanent-branch merge; 15.6 all 37 trails point to SHAs in `develop`.
- **PR format (Annex I):** the merged PRs #6–#51 lacked the required checklist section; it was
  added to their descriptions (no secrets, no schema changes outside `-db`, contract respected),
  and #52–#55 include it.
- **Branch hygiene (norm 6.4.3, audit 15.1/15.5):** merged child branches were deleted after
  their PRs, so the `promotion/*` feeders no longer appear in 15.1. Two teammate branches
  (`feat/hu-iam-001-05`, `chore/front-shell-scaffold`) were deleted by mistake in that cleanup
  and restored immediately at their exact SHAs (`0c041bf`, `438a134`). `qa-front-shell-scaffold`
  (teammate, outside the 6.3 nomenclature) was not touched.

## DEV-FRONT-DEMO-002

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** in the demo registry (`fixtures/`, development only) the Clinical-owned
  "Historia clínica" descriptor points to `/app/clinical/patient-a`, so the sidebar opens the
  Clinical record directly and the patient is chosen with Clinical's own demo selector. The demo
  no longer depends on the Patients portal knowing Clinical's synthetic ids, avoiding a conflict
  with the Patients team's own synthetic data.
- **Request to the Clinical team:** offer patient selection in the `/app/clinical` prompt
  ("Seleccione un paciente") so the descriptor can return to `/app/clinical`.
- **TDD:** fixture data only; checked in the browser (container `:8080`, fixtures mounted).

## DEV-FRONT-RECOVERY-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:**
  - Pacientes, Facturación (and Procedimientos) and Gestión de usuarios show the same local
    PORTAL_UNAVAILABLE card as the other sections: their teams have not published an entry, so
    the demo registry marks Patients and Billing as `0.0.0-pending` (no files) and the IAM double
    refuses `/app/administration`. The Patients and Billing C02 doubles were removed, including
    the list that used Clinical's synthetic ids.
  - Recovery watch (C07): after a failed entry import the shell probes that entry every 5 s
    (`HEAD`, `no-store`, never imported); when it answers, the card becomes "La sección ya está
    disponible" with "Actualizar", which reloads the page (a failed module import stays cached
    by the browser, C07). Mount failures are not probed. Nothing reloads by itself.
  - Registry revision watch: every 30 s the shell re-reads `/portal-registry.json`; a new
    revision shows a "Hay una nueva versión de DI LUCCA disponible — Actualizar" toast.
- **TDD:** pages, loader and shell cases failed first (RED: 3, then 2 after the import-only and
  reload refinements) and pass (114 tests, GREEN).
- **Browser check (container `:8080`, ADMINISTRATOR):** Pacientes, Facturación and Gestión de
  usuarios show the card (administration stays "no disponible" after 7 s: no false recovery);
  `docker stop clinical-portal-demo` → Historia clínica card; `docker start` → card turns into
  "La sección ya está disponible"; Actualizar → Clinical record of patient-a.

## DEV-FRONT-DEPLOY-002

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** base images pinned by digest (`node:24-alpine@sha256:ebfe2f90…`,
  `nginx:1.27-alpine@sha256:65645c7b…`) for reproducible builds; `/healthz` liveness endpoint in
  nginx (independent of portals) with a compose `healthcheck` and `restart: unless-stopped`; the
  external Clinical network is documented in the compose file.
- **Verification from scratch:** `docker compose down` for both projects; starting dlc-front
  first fails clearly ("network dlc-clinical-portal_default declared as external, but could not
  be found"), so Clinical must start first (demo guide step 1); then Clinical `up`, dlc-front
  `build --no-cache` and `up`: container `healthy`. `nginx -t` passes; the image holds only the
  compiled app (fixtures arrive as a read-only volume). `curl`: `/healthz`, `/`, deep link,
  registry, dev session, dev Auth double, Clinical `entry.js`/`entry.css` through the proxy, IAM
  double, Home image → 200 `no-store`; pending Patients entry and `/nope.js` → 404. With
  `clinical-portal-demo` stopped: front 200, healthz 200, proxy 504; after restart proxy 200.
  Browser: `/app/clinical/patient-a` renders the record as Dra. Valentina Ruiz.
- **Limitation:** order dependency on the Clinical network remains (no shared network owner
  yet; would be defined by `dlc-infra`).

## QA-FRONT-PROMOTION-004

| PR | Feeder branch | Merge commit in `qa` | Source commits |
| --- | --- | --- | --- |
| #60 | `promotion/qa-front-21` | `22c61af` | `f29f5f5`, `14da1c8`, `638e290` |
| #61 | `promotion/qa-front-22` | `1f17b49` | `a3eebd0` |

- **CI:** both PRs passed every gate; feeder branches deleted after merge.
- **Audit after the merge:** `git diff origin/qa origin/develop` empty; 15.3 no commit without
  trail; 15.4 no permanent-branch merge; 15.6 all 41 trails exist in `develop`; 15.1 only the
  teammate branch `qa-front-shell-scaffold` remains outside the nomenclature.
- **Deployment check on the promoted content:** see DEV-FRONT-DEPLOY-002 (from-scratch build,
  healthy container, Clinical down/up).

## DEV-FRONT-DOCS-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** README rewritten for norm 5.1 (purpose, how to run with npm and Docker, dependencies,
  integration steps for portals, source layout, quality commands); spec updated with the status
  of each requirement, the project-owner decisions that differ from dlc-docs, and the next
  increments.
- **TDD:** documentation only; commands in the README were run in DEV-FRONT-DEPLOY-002.

## DEV-FRONT-HOME-004

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** public frame and Home responsive at ≤ 720 px: header wraps (brand + Login on the
  first row, Citas/Servicios/Contacto below), footer stacks, and the hero shows the text half of
  the mockup artwork at full width so the welcome text stays readable.
- **TDD:** styling only; verified in the browser.
- **Browser check (container `:8080`, 440×956 as the reported iPhone 16 Pro Max):** no horizontal
  scroll (scroll width 440 = client width), Login visible at x 356, hero 440×426, footer stacked;
  desktop 1280 px layout unchanged (rules only apply ≤ 720 px).

## DEV-FRONT-GUIDE-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** `docs/integration/portal-integration-guide.md` for the portal teams: what to
  publish (C01), mount and handle (C02/C03), the context members as implemented, rules that avoid
  conflicts between portals (CSS prefixes, no shared runtime, navigation only through the
  capability, roles from the session, one shared synthetic dataset from the OpenAPI examples),
  a pre-registration checklist and the front team's registration steps. Linked from the README.
- **TDD:** documentation only; context members checked against `src/main.ts` and
  `src/composition/shell.ts`.

## DEV-FRONT-HTTP-001

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:** `src/core/http/client.ts`, the C06 shared HTTP capability core, and
  `src/core/http/messages.ts`, the single central message table.
  - Only `GET/POST/PUT/PATCH/DELETE` to same-origin `/api/v1/...` (reuses the FC-13 target
    validation); caller headers limited to Accept, Content-Type, If-Match, Idempotency-Key
    (preserved as given); never caller Authorization/Cookie/correlation.
  - Fresh `X-Correlation-Id` per attempt; private Bearer token from the session adapter on
    protected operations; `public` operations send none; protected without token →
    `SESSION_UNAVAILABLE` (status 0) with no network.
  - 10 s deadline → `TIMEOUT` (status 0); network → `NETWORK_ERROR`; caller abort → `CANCELLED`
    with an empty message; malformed error body → `INVALID_RESPONSE` with the real status;
    owner envelope `error`/`details`/`traceId` kept, `traceId` falls back to the correlation id.
  - Success `{ok, status, data, headers, correlationId}` exposing only Location, ETag,
    Retry-After and X-Correlation-Id; 204/none → `null`, blob → `Blob`.
  - Protected 401 calls `onUnauthorized` (session invalidation); public 401 does not.
  - `retryable` only for GET network/timeout/429/5xx; writes are never replayed.
- **TDD:** `tests/core/http/client.test.mjs` failed first with `ERR_MODULE_NOT_FOUND` (RED);
  9/9 pass (GREEN) with a transport double, no network. Covers FC-13 and FC-14.
- **Limitations:** the operation catalogue from the OpenAPI contracts and the per-mount
  `context.http` capability come in the next increments.

## DEV-FRONT-HTTP-002

- **Story:** HU-IAM-001, Issue #1, `code-corhuila/dlc-docs#47`.
- **Change:**
  - `scripts/generate-catalog.mjs` derives the C06 operation catalogue from the Gateway-facing
    contract `07-api/contracts/openapi/api-gateway.yaml` and its owner contracts (dlc-docs
    `638e4f2`): 70 operations on 57 paths with method, path template, security-empty (public)
    and `Idempotency-Key` requirement, written to `src/core/http/__generated__/catalog.ts`
    (generated; only derived method/path/security data, no documentation copied).
  - `src/core/http/catalog.ts`: unknown operations rejected; refresh, logout, CSRF and MFA
    completion never available as generic HTTP (C05 controls); public Auth operations only for
    IAM; required `Idempotency-Key` of 8–128 characters (norm 5.3.8).
  - `src/core/http/capability.ts`: frozen per-mount `context.http`, catalogue-checked, sets the
    security class, combines the caller signal with the mount signal and rejects `CANCELLED`
    after unmount. Wired in `src/main.ts` for every portal.
  - Until the Auth adapter exists the client has no access token, so protected calls return
    `SESSION_UNAVAILABLE` locally; nginx has no `/api/v1` upstream yet (no Gateway).
- **TDD:** `tests/core/http/catalog.test.mjs` failed first with `ERR_MODULE_NOT_FOUND` (RED);
  5/5 pass (GREEN). Covers FC-13 (catalogue part) and FC-16 (no frontend authority).

## QA-FRONT-PROMOTION-005

- PR #67 (`promotion/qa-front-24`): `ec0ebc4`… responsive Home and integration guide.
- PR #70 (`promotion/qa-front-25`) failed the size gate (408/400) with both HTTP commits and
  was closed without merge; the same commits were promoted separately:
  PR #71 (`promotion/qa-front-26`, `76f0433`) and PR #72 (`promotion/qa-front-27`, `901f101`),
  both green and merged; feeder branches deleted.
- After the merge `git diff origin/qa origin/develop` is empty.
- **Teacher bot review (norm 9.7–9.9):** PRs #6–#72 were checked through the GitHub API; none
  has bot review comments, reviews or inline findings, so there are no findings to answer yet.
