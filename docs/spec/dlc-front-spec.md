# dlc-front — Specification for the real integration stage (SDD)

Status: real integration and final delivery (project-owner direction, 2026-11-06). Authority: ADR-011 and composition contract v1 (C01–C08) in dlc-docs
`638e4f2`; norm 5.5; Annex H where it does not contradict ADR-011. When dlc-docs changes, this
file is updated in the same increment.

## 1. Goal

`dlc-front` is the transversal compositor **without technology of its own**. It renders the common
frame and loads the five independent portals (IAM, Patients, Appointments, Billing in Angular;
Clinical in React) as same-origin ES modules through the C02 lifecycle, against the real
`dlc-api-gateway` and IAM/Auth. No demo data, doubles or mock Gateway.

## 2. Out of scope (this stage)

Backend services, databases, workers and sagas (owned by their repositories), portal screens,
business rules, resource authorization, Analytics indicators (HU-CLN-003).

## 3. Requirements

| ID | Requirement | Contract | Acceptance cases |
| --- | --- | --- | --- |
| FR-01 | Registry validation and selected-entry loading | C01 | FC-01, FC-02, FC-18 |
| FR-02 | Lifecycle state machine, deadlines, supersession, quarantine | C02 | FC-03, FC-04, FC-05 |
| FR-03 | Global routing, Clinical alias, 404, safe return, Back/Forward | C04 | FC-06, FC-07 |
| FR-04 | Sidebar descriptors filtered by `rolesAny`/`permissionsAll` (fail closed) | C04 | FC-16 |
| FR-05 | Session projection port: snapshot, subscribe, revision, 401 closure | C05 | FC-11, FC-12 |
| FR-06 | Real Auth adapter: deployment data, CSRF/refresh, Web Lock, shared block, cross-tab sync, expiry | C05 | FC-09, FC-10, FC-11, FC-12 |
| FR-07 | HTTP capability: catalogue, headers, correlation, 10 s timeout, Result | C06 | FC-13, FC-14 |
| FR-08 | Failure containment, PORTAL_UNAVAILABLE with retry, safe telemetry | C07 | FC-15, FC-17 |
| FR-09 | Common frame: top bar and sidebar matching the mockup | C04, design system | visual check |
| FR-10 | Dashboard: shell shortcuts + Clinical Analytics host (`/analytics`) | C04 | FC-15 |
| FR-11 | Session screens: resolving, unavailable, expired; unsupported browser | C05, C01 | FC-18 |
| FR-12 | Deployment: Dockerfile (`npm ci`), nginx (`no-store` registry/entry, SPA fallback, immutable hashed chunks), compose against the real Gateway with required Auth data | C01, C06, Annex H 4/6 | config check |
| NFR-01 | TypeScript strict, tests, coverage, build, CI (Annex I), ≤400 lines/PR | norm 9.2 | CI |
| NFR-02 | Accessibility: landmarks, labelled controls, visible focus, heading focus | design system | review |

FC-09 to FC-12 are covered at unit level; their end-to-end check needs IAM running behind the Gateway.

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

Every deviation from the mockup is recorded in the evidence with its reason and reference.

## 5. Clinical integration

When `dlc-clinical-portal` publishes `entry.js` (portalId `clinical`, contractVersion 1, `mount`),
it is added to the registry: record at `/app/clinical/{patientId}` (alias
`/app/patients/{uuid}`), Analytics in Dashboard with localPath `/analytics`. No adapter for
Clinical is written in dlc-front.

## 6. Status (develop = qa)

| ID | Status | Evidence |
| --- | --- | --- |
| FR-01 Registry and entry loading | Done | DEV-FRONT-REGISTRY-001, LOADER-001 |
| FR-02 Lifecycle | Done | DEV-FRONT-LIFECYCLE-001, SLOTS-001 |
| FR-03 Routing, alias, 404, safe return | Done | DEV-FRONT-ROUTES-001, SHELL-001 |
| FR-04 Sidebar visibility | Done | DEV-FRONT-NAV-001, SIDEBAR-002 |
| FR-05 Session projection | Done (port) | DEV-FRONT-SESSION-001 |
| FR-06 Real Auth adapter | Done (unit); end-to-end pending IAM | DEV-FRONT-AUTH-ADAPTER-001, AUTH-WIRING-001, AUTH-TABS-001, AUTH-BLOCK-001, AUTH-SYNC-001, AUTH-RECOVERY-001, AUTH-LOGOUT-001, NO-DEMO-AUTH-001 |
| FR-07 HTTP capability | Pending (target validation only) | — |
| FR-08 Containment and recovery | Done; safe telemetry pending | DEV-FRONT-CLINICAL-001, RECOVERY-001 |
| FR-09 Common frame | Done | DEV-FRONT-FRAME-002, FIT-001, TOPBAR-001 |
| FR-10 Dashboard | Done | DEV-FRONT-CLINICAL-001, DASHBOARD-CHECK-001 |
| FR-11 Session and browser screens | Done | DEV-FRONT-ERRORS-001 |
| FR-12 Deployment | Done; real Gateway by default, no mock | DEV-FRONT-GATEWAY-001, NO-DEMO-COMPOSE-001 |
| Portal releases | Pending: registry still lists `-demo` builds until portals publish real ones | — |

## 7. Project-owner decisions (differences with dlc-docs)

| Decision | dlc-docs today | Evidence |
| --- | --- | --- |
| `/` is always the public Home (mockup p. 1); signed-in `/login` opens the Dashboard | C04 redirects `/`; navigation-map lists Home as deferred | DEV-FRONT-HOME-001/002 |
| Home "Servicios" opens the procedure catalog (mockup p. 7); "Contacto" inactive | Not specified | DEV-FRONT-HOME-003 |
| Top bar search routes the term to `/app/patients?q=` | C04 defers global search | DEV-FRONT-TOPBAR-001 |
| Sidebar follows the mockup labels and order with owner sub-areas | C04 baseline descriptors | DEV-FRONT-SIDEBAR-002 |
| Down portals are probed and offer "Actualizar"; new registry revisions are announced | C07 explicit retry (kept: nothing reloads by itself) | DEV-FRONT-RECOVERY-001 |
| No development sign-in or mock Gateway; real integration only | C05 allows a development double | DEV-FRONT-NO-DEMO-AUTH-001, NO-DEMO-COMPOSE-001 |

These should be reflected in dlc-docs by its owner.

## 8. Next increments

1. Register the real portal releases as each portal publishes an `entry.js` wired to
   `context.http` (no demo data).
2. End-to-end check with IAM, the owner APIs and the Gateway on `platform` (FC-09 to FC-12).
3. C07 safe telemetry record (FC-17).

## 9. Definition of Done for this stage

- Annex H checklist satisfied where it does not contradict ADR-011.
- `docker compose up` starts the compositor against the real Gateway and IAM; real staff sign in
  and navigation works per role.
- A failing portal only affects its own host; shortcuts keep working.
- The visual frame matches the mockup, verified in the browser and recorded.
- Evidence and PR per increment; HU issues updated but not closed.
