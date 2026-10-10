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

## 6. Status (develop = qa)

| ID | Status | Evidence |
| --- | --- | --- |
| FR-01 Registry and entry loading | Done | DEV-FRONT-REGISTRY-001, LOADER-001 |
| FR-02 Lifecycle | Done | DEV-FRONT-LIFECYCLE-001, SLOTS-001 |
| FR-03 Routing, alias, 404, safe return | Done | DEV-FRONT-ROUTES-001, SHELL-001 |
| FR-04 Sidebar visibility | Done | DEV-FRONT-NAV-001, SIDEBAR-002 |
| FR-05 Session projection | Done (port) | DEV-FRONT-SESSION-001 |
| FR-06 Development Auth double | Done (fixtures only) | DEV-FRONT-CLINICAL-001, DEVSESSION-001 |
| FR-07 HTTP capability | Pending (target validation only) | — |
| FR-08 Containment and recovery | Done; safe telemetry pending | DEV-FRONT-CLINICAL-001, RECOVERY-001 |
| FR-09 Common frame | Done | DEV-FRONT-FRAME-002, FIT-001, TOPBAR-001 |
| FR-10 Dashboard | Done | DEV-FRONT-CLINICAL-001, DASHBOARD-CHECK-001 |
| FR-11 Session and browser screens | Done | DEV-FRONT-ERRORS-001 |
| FR-12 Deployment | Done | DEV-FRONT-DEPLOY-001, DEPLOY-002 |
| Clinical real entry | Integrated (demo build `0.1.0-demo`) | DEV-FRONT-CLINICAL-001 |

## 7. Project-owner decisions (differences with dlc-docs)

| Decision | dlc-docs today | Evidence |
| --- | --- | --- |
| `/` is always the public Home (mockup p. 1); signed-in `/login` opens the Dashboard | C04 redirects `/`; navigation-map lists Home as deferred | DEV-FRONT-HOME-001/002 |
| Home "Servicios" opens the procedure catalog (mockup p. 7); "Contacto" inactive | Not specified | DEV-FRONT-HOME-003 |
| Top bar search routes the term to `/app/patients?q=` | C04 defers global search | DEV-FRONT-TOPBAR-001 |
| Sidebar follows the mockup labels and order with owner sub-areas | C04 baseline descriptors | DEV-FRONT-SIDEBAR-002 |
| Down portals are probed and offer "Actualizar"; new registry revisions are announced | C07 explicit retry (kept: nothing reloads by itself) | DEV-FRONT-RECOVERY-001 |
| Demo "Historia clínica" opens `/app/clinical/patient-a` | Owner descriptor `/app/clinical` | DEV-FRONT-DEMO-002 |

These should be reflected in dlc-docs by its owner.

## 8. Next increments

1. C06 HTTP capability (`context.http`): operation catalogue from the OpenAPI contracts,
   correlation, 10 s timeout, central message table, 401 closure, Idempotency-Key.
2. C07 safe telemetry record (FC-17).
3. Real Auth adapter (CSRF, refresh, Web Locks, BroadcastChannel; FC-09, FC-10) when IAM/Auth exist.
4. Register the other portals as they publish their `entry.js`.

## 9. Definition of Done for this stage

- Annex H checklist satisfied where it does not require the API or contradict ADR-011.
- `docker compose up` starts the compositor with test-double portals; navigation works per role.
- A failing portal only affects its own host; shortcuts keep working.
- The visual frame matches the mockup, verified in the browser and recorded.
- Evidence and PR per increment; HU issues updated but not closed.
