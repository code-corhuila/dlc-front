# dlc-front — Specification for the front-only stage (SDD)

Status: front-only stage. Authority: ADR-011 and composition contract v1 (C01–C08) in dlc-docs
`638e4f2`; norm 5.5; Annex H where it does not contradict ADR-011. When dlc-docs changes, this
file is updated in the same increment.

## 1. Goal

`dlc-front` is the transversal compositor **without technology of its own**. It renders the common
frame and loads the five independent portals (IAM, Patients, Appointments, Billing in Angular;
Clinical in React) as same-origin ES modules through the C02 lifecycle. In this stage it runs on
contract test-double portals and, once published, the real Clinical `entry.js`.

## 2. Out of scope (this stage)

Real Gateway, Auth, IAM portal, backend services, databases, workers, sagas, portal screens,
business rules, resource authorization, Analytics indicators (HU-CLN-003), public Home.

## 3. Requirements

| ID | Requirement | Contract | Acceptance cases |
| --- | --- | --- | --- |
| FR-01 | Registry validation and selected-entry loading | C01 | FC-01, FC-02, FC-18 |
| FR-02 | Lifecycle state machine, deadlines, supersession, quarantine | C02 | FC-03, FC-04, FC-05 |
| FR-03 | Global routing, Clinical alias, 404, safe return, Back/Forward | C04 | FC-06, FC-07 |
| FR-04 | Sidebar descriptors filtered by `rolesAny`/`permissionsAll` (fail closed) | C04 | FC-16 |
| FR-05 | Session projection port: snapshot, subscribe, revision, 401 closure | C05 | FC-11, FC-12 |
| FR-06 | Development Auth double with personas (develop only) | C05, norm 5.5.2 | FC-08 (double) |
| FR-07 | HTTP capability: catalogue, headers, correlation, 10 s timeout, Result | C06 | FC-13, FC-14 |
| FR-08 | Failure containment, PORTAL_UNAVAILABLE with retry, safe telemetry | C07 | FC-15, FC-17 |
| FR-09 | Common frame: top bar and sidebar matching the mockup | C04, design system | visual check |
| FR-10 | Dashboard: shell shortcuts + Clinical Analytics host (`/analytics`) | C04 | FC-15 |
| FR-11 | Session screens: resolving, unavailable, expired; unsupported browser | C05, C01 | FC-18 |
| FR-12 | Deployment: Dockerfile (`npm ci`), nginx (`no-store` registry/entry, SPA fallback, immutable hashed chunks), compose with test-double portals | C01, Annex H 4/6 | config check |
| NFR-01 | TypeScript strict, tests, coverage, build, CI (Annex I), ≤400 lines/PR | norm 9.2 | CI |
| NFR-02 | Accessibility: landmarks, labelled controls, visible focus, heading focus | design system | review |

FC-09 and FC-10 (real MFA/refresh across tabs) require Auth and are deferred to IAM integration.

## 4. Visual elements assigned to dlc-front

Reference: `truth-root/di-lucca-mockup.pdf` (page numbers below) and the photos supplied by the
user; tokens from `12-ux-ui/design-system.md`.

| Element | Mockup reference | Notes |
| --- | --- | --- |
| Top bar: breadcrumb, search, notifications, settings, avatar/user menu with Logout | p. 4 (header of every authenticated page) | Search, notifications and settings inactive (deferred, C04); Logout via C05 |
| Sidebar: Dashboard, Patients, Appointments, Clinical, Billing, Administration | p. 4 | Items and visibility per C04 access matrix, not the mockup's extra items |
| Dashboard frame: title, shortcuts, Analytics host | p. 4 | KPI cards and charts are Clinical-owned; not rendered by the shell |
| Global 404 | design system feedback rules | No mockup page |
| PORTAL_UNAVAILABLE notice with retry | design system feedback rules | No mockup page |
| Session screens (resolving, unavailable, expired) | design system | No mockup page |
| Development sign-in with persona selector | p. 2 style (auth card) | Not the IAM Login; develop only |

Every deviation from the mockup is recorded in the evidence with its reason and reference.

## 5. Clinical integration

When `dlc-clinical-portal` publishes `entry.js` (portalId `clinical`, contractVersion 1, `mount`),
it is added to the registry: record at `/app/clinical/{patientId}` (alias
`/app/patients/{uuid}`), Analytics in Dashboard with localPath `/analytics`. No adapter for
Clinical is written in dlc-front.

## 6. Increments

1. Rules, spec and minimal CI (this increment).
2. Quality tooling: lint, format, coverage, build, `pr-gates.mjs`, `.gitattributes`, `.env.example`.
3. Common frame and sidebar (FR-09, FR-04) with test-double portals.
4. Routing, alias, 404 and Dashboard frame (FR-03, FR-10).
5. Registry and entry loading (FR-01).
6. Lifecycle (FR-02).
7. Session port, Auth double and session screens (FR-05, FR-06, FR-11).
8. HTTP capability completion (FR-07).
9. Failure containment and telemetry (FR-08).
10. Deployment and compose (FR-12).
11. Clinical real entry via the registry.

## 7. Definition of Done for this stage

- Annex H checklist satisfied where it does not require the API or contradict ADR-011.
- `docker compose up` starts the compositor with test-double portals; navigation works per role.
- A failing portal only affects its own host; shortcuts keep working.
- The visual frame matches the mockup, verified in the browser and recorded.
- Evidence and PR per increment; HU issues updated but not closed.
