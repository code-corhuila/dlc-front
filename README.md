# dlc-front

Transversal compositor of Di Lucca Dental Care & Technology. It presents the five independent
domain portals as one application and owns only what must not be repeated: the common frame
(top bar, sidebar, public header/footer), navigation, the shared browser session, failure
containment and the shared HTTP capability.

**dlc-front has no technology of its own** ([ADR-011](https://github.com/code-corhuila/dlc-docs/blob/main/05-architecture/decisions/ADR-011-transversal-frontend-composition.md)):
plain TypeScript and DOM APIs, no Angular, React or Module Federation. Portals are integrated
through the framework-neutral **composition contract v1** (dlc-docs
`05-architecture/frontend-composition.md`, C01–C08).

| Portal | Repository | Technology | Routes |
| --- | --- | --- | --- |
| `iam` | `dlc-iam-portal` | Angular | `/login`, `/recover-password`, `/app/administration`, `/app/sessions` |
| `patient` | `dlc-patient-portal` | Angular | `/app/patients` |
| `appointments` | `dlc-appointments-portal` | Angular | `/app/appointments` |
| `billing` | `dlc-billing-portal` | Angular | `/app/billing` |
| `clinical` | `dlc-clinical-portal` | React | `/app/clinical`, Analytics in `/app/dashboard` |

## How a portal is integrated

1. The portal publishes a same-origin ES module `/portals/{portalId}/{release}/entry.js`
   exporting `portalId`, `contractVersion: 1` and `mount(host, context)` (C01–C03).
2. It is listed in `/portal-registry.json` with its navigation descriptors (C01, C04).
3. The compositor imports only the selected entry, mounts it in its host and passes a plain
   context: `route`, `signal`, `navigation`, `session`, `reportFailure` (`iamSession` for IAM).
   No token or credential ever reaches a portal (C05).
4. A failing or stopped portal only shows a local "Esta sección no está disponible" card; when
   its entry answers again the card offers "Actualizar" (C07).

Step-by-step rules for portal teams: `docs/integration/portal-integration-guide.md`.

## Source layout

| Path | Responsibility |
| --- | --- |
| `src/composition/` | Routes (C04), registry and loader (C01), lifecycle (C02), shell controller, history, capabilities |
| `src/core/session/` | Session projection behind an Auth port (C05) |
| `src/core/http/` | Shared request transport and target validation (C06) |
| `src/layout/` | Common frame, public frame, Home, Dashboard shortcuts, 404 and service error pages |
| `public/` | Static shell (`index.html`, styles, mockup assets) |
| `fixtures/` | **Development only**: demo registry, Auth double, `dev-session.json` |
| `deploy/` | Dockerfile, nginx template (same-origin proxy, `no-store`), demo compose |
| `scripts/` | Build helpers, local preview server, PR gates |

`fixtures/` is never copied to `dist/` or into the image and never reaches `main`.

## Run

Requirements: Node 24.12+ and Docker.

```sh
npm ci
npm run build
npm run preview          # http://localhost:4180, Clinical demo expected on :4175
```

Docker demo (start Clinical first, its network is used by dlc-front):

```sh
# in dlc-clinical-portal
docker compose -f deploy/compose.yml up --build -d
# in dlc-front
docker compose -f deploy/compose.yml up --build -d   # http://localhost:8080
```

Variables are listed in `.env.example`. The demo persona is set in `fixtures/dev-session.json`
(`DENTIST`, `ADMINISTRATOR`, `SECRETARY_ASSISTANT`); set `persona` to `null` to start signed out.
The preview-only Auth double accepts `admin@demo.test`, `odontologo@demo.test` and
`asistente@demo.test` with password `Demo1234!`. These are synthetic users, not Auth accounts.
The demo script is `docs/demo/clinical-dashboard-demo.md`.

The IAM image serves `/portals/iam/0.1.0-local/entry.js`. After the front Compose creates
`dlc-front_default`, start `dlc-iam-portal/deploy/compose.yml` on that network. The front
proxies IAM assets to `iam-portal-demo` and selects the portal for `/login`,
`/recover-password`, `/app/administration` and `/app/sessions`. Keep the registry release
aligned with `IAM_RELEASE` if either changes. The development Auth double handles only the
three synthetic logins and previews the IAM staff and own-session lists in the browser.
These records are fictional and read-only; save and revoke actions report unavailable.
For `npm run preview`, `IAM_ORIGIN` must point to an IAM asset server that serves the
versioned path; the Angular standalone preview on port 4201 does not serve that module path.

## Quality

```sh
npm run typecheck && npm run lint && npm run format:check
npm test && npm run test:coverage && npm run build
```

CI (`.github/workflows/ci.yml`) runs the same commands plus `scripts/pr-gates.mjs` (branch,
400-line size, commit subjects, PR sections, no framework imports). Evidence per increment:
`docs/quality/validation-evidence.md`. Specification: `docs/spec/dlc-front-spec.md`.

## Dependencies

Composes the portal entries above and, later, the Gateway (`/api/v1`) and Auth (`/api/v1/auth`).
No database or business logic lives here. User story: HU-IAM-001 (`code-corhuila/dlc-docs#47`).
