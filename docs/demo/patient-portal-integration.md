# Patients portal demo integration

Reference: code-corhuila/dlc-docs#53; contributing issue: code-corhuila/dlc-patient-portal#1.
Branch: feat/patient-portal-integration; target: develop; base: f6d956a.
Authority: dlc-docs 05-architecture/frontend-composition.md C01-C04/C07-C08 and ADR-011.

## Scope and execution

- Register patient release 0.1.0-demo under /portals/patient/0.1.0-demo/entry.js. Preserve Clinical, Appointments and Billing descriptors, proxies and networks.
- Administrative routes remain Patient-owned: /app/patients, /new and /profiles/{patientId}/edit. The single UUID Clinical alias is unchanged.
- Preview uses PATIENT_ORIGIN (default http://127.0.0.1:4177). Start the independently built Patients asset server before npm run preview; the shell defaults to 4180.
- Docker uses PATIENT_UPSTREAM=http://patient-portal-demo and external PATIENT_NETWORK=dlc-patient-portal_default. Start every referenced owner Compose network before dlc-front. FRONT_PORT defaults to 8080 and can be overridden to 4180 for the local test.
- Preview assets preserve upstream status/MIME/query, send no-store, support GET/HEAD and use a 10-second timeout. Missing assets return 404; unavailable upstream returns 502 without disabling the registry.
- No domain API, HTTP/session infrastructure, role selector or patient business rules are added to the shell. Default Dentist cannot access the administrative demo. Use the shell development login as Administration/Secretary for dummy flows.

## Evidence and remaining work

- Local RED: Node 24.12.0 could not import createPreviewServer before implementation. GREEN: three integration tests pass using HTTP test doubles; these do not establish owner API acceptance. No RED/GREEN Git commits are claimed.
- Current branch validation: 143/143 tests; src coverage lines 99.57%, branches 91.43%, functions 96.28%. Typecheck, lint, formatting, build and Compose config pass. npm child processes required Node 24 on PATH; the initial Node 22 run was invalid. Output: coverage/patient-integration-current.log (locally ignored).
- Previous local Docker/browser validation loaded real Clinical/Appointments/Patients entries, exercised registration/editing and outage isolation/recovery. It required a Patients publishing fix: chmod(0755) on the staged release; its Linux regression passed 4/4. Review/publish that owner correction before relying on the integration artifact.
- Previous runtime ports: shell 4180, Clinical 4175, Patients 4177, temporary Appointments override 4178. That validation predates the Billing-inclusive base of this branch and is historical evidence, not a new four-portal runtime result.
- Current Docker validation: rebuilt this branch's shell and started Billing on 4204. All four owner entries return 200 JavaScript/no-store through 4180; missing assets return 404. Browser verified Patients list/edit/save, Appointments calendar and Clinical patient selection. Billing mounts its delivered placeholder; /app/billing/procedures shows its local 404, so functional Billing acceptance remains pending. HTTP evidence: coverage/patient-integration-current-docker.json; Patients screenshot: coverage/patient-current-browser.png.
- Record this branch's actual validation output and reviewed revision/CI links in the PR. Local validation is not CI or production acceptance.
- Dummy data lasts only for a mount. Backend authorization, persistence, assigned Dentist scope, deactivation guards and a shared synthetic patient dataset remain outside this increment. HU-PAT-001 is not complete.
- No commit, push or promotion is performed automatically. Each PR includes tests/config/docs within 400 changed lines. Promote reviewed work using a child of the target branch and cherry-pick -x, never merging permanent branches.
