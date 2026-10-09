# dlc-front

> Transversal container/compositor for Di Lucca Dental Care & Technology.

**dlc-front has no technology of its own.** This is the architectural definition
in ADR-011, not a pending framework choice. The five independent portals retain
their technologies. The compositor provides the common header and experience
frame, documented navigation/composition and approved shared capabilities.

## Five independent portals

| Repository | Technology | Responsibility retained by the portal |
| --- | --- | --- |
| `dlc-iam-portal` | Angular | IAM views |
| `dlc-patient-portal` | Angular | Patient administration views |
| `dlc-appointments-portal` | Angular | Appointment views |
| `dlc-billing-portal` | Angular | Billing views |
| `dlc-clinical-portal` | React | Clinical views, including Analytics |

Portal source code, components and business rules remain in their repositories.
IAM retains authentication and durable-session authority; each owner service
enforces resource authorization. There is no patient login or sixth business
domain in the compositor.

## Current scope

The merged scaffold reserves the compositor directories. The current Issue #1
increment implements C06 / FC-13 request-target validation with 13 passing unit
tests. It does not yet implement the shared HTTP transport, session,
portal loader or browser application. The `.gitkeep` files retain reserved areas.

The directory names below organize ADR-011 responsibilities locally; they are
not a prescribed framework template or an executable integration contract.

```text
dlc-front/
├── .github/
│   └── CODEOWNERS
├── deploy/
│   └── .gitkeep
├── src/
│   ├── composition/
│   │   └── .gitkeep
│   ├── core/
│   │   ├── errors/
│   │   │   └── .gitkeep
│   │   ├── http/
│   │   │   ├── .gitkeep
│   │   │   └── requestTarget.ts
│   │   └── session/
│   │       └── .gitkeep
│   ├── integrations/
│   │   └── .gitkeep
│   └── layout/
│       └── .gitkeep
├── tests/core/http/requestTarget.test.mjs
├── package.json
├── package-lock.json
├── tsconfig.json
├── .gitignore
└── README.md
```

| Directory | Reserved responsibility | Specification |
| --- | --- | --- |
| `src/composition/` | Coordinate the common experience and documented navigation | ADR-011; navigation map |
| `src/layout/` | Common header and experience frame | ADR-011; UX/UI |
| `src/core/session/` | Shared browser-session capability; no IAM business authority | ADR-011; HU-IAM-001; Issue #1 |
| `src/core/http/` | Shared HTTP capability and specified request correlation | ADR-011; Issue #1; applicable Annex H rules |
| `src/core/errors/` | Specified transversal errors and failure-isolation policies | ADR-011; applicable Annex H rules |
| `src/integrations/` | External integration details, separated from compositor policies | ADR-011; dependency boundaries |
| `deploy/` | Future compositor deployment artifacts, after their specification | Annex H repository responsibility |
| `.github/` | Existing repository ownership controls | Branching policy |

## Issue #1 and methodology

The project owner supplied the scope of [dlc-front Issue #1](https://github.com/code-corhuila/dlc-front/issues/1):
"Provide shared session and HTTP-client integration for the IAM remote."
The session, HTTP and integration directories reserve that responsibility for
future integration. Request-target validation is a preparatory part of Issue #1;
neither that issue nor HU-IAM-001 is completed by this increment.

- **DDD:** Preserve all five portal boundaries. Compositor policies and shared
  capabilities are separated from external integrations; no domain copies exist.
- **SDD:** ADR-011 and approved navigation/security/API specifications guide
  this structure. Framework-specific Annex H templates do not assign a
  technology to the compositor under the clarification recorded in ADR-011.
- **TDD:** Harold executes RED → GREEN → REFACTOR manually. The request-target
  RED and GREEN runs are confirmed by the output supplied by Harold.
- **Hexagonal principles:** Keep coordination policies separate from external
  details. Ports/adapters will follow approved contracts when behavior is
  introduced; no empty domain/application layers are created for appearance.

## Contract and manual verification

The project documentation defines composition contract v1 in
`05-architecture/frontend-composition.md`. This increment targets C06 and FC-13:
Gateway-relative paths and caller header restrictions. Passing this internal
shape check will not approve an API operation or authorize a user. Operation
catalog checks, credentials, correlation and network behavior remain later work.

Tooling uses Node 24.12+ (24.x), TypeScript 5.9.3, ESLint and Prettier; no UI framework is added.
From this repository, run manually:

```sh
npm install
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:coverage
npm run build
```

Include package-lock.json in the PR and use npm ci for subsequent reproducible
installations. Harold's RED output records a successful type check and 13 failed
tests, all with `RED: request target validation not implemented`. The placeholder
was replaced and Harold verified GREEN: typecheck passed; 13 tests passed, with
zero failures. These tests make no network calls or Auth requests.
The validator rejects nested percent encoding conservatively and copies allowed
headers into a normalized result; it never sends an HTTP request.

[Staff sign-in, dlc-docs #47](https://github.com/code-corhuila/dlc-docs/issues/47)
identifies HU-04 as the global backlog ID and HU-IAM-001 as the technical ID
of the same story, as confirmed by the issue text supplied by the project owner.
Issue #1 requires functional integration and evidence, with dependencies on
HU-IAM-005 (mandatory MFA) and HU-IAM-006 (durable sessions). This preparatory
increment does not satisfy those acceptance criteria or close either issue.

## Documentation references

Paths below belong to the canonical documentation repository (`code-corhuila/dlc-docs`):

- [ADR-011: composition and portal technologies](https://github.com/code-corhuila/dlc-docs/blob/main/05-architecture/decisions/ADR-011-transversal-frontend-composition.md)
- `05-architecture/hexagonal-architecture.md`
- `09-microservices/transversal-repositories.md`
- `04-requirements/traceability-matrix.md`
- `07-api/authentication.md`
- `11-quality/testing-strategy.md`
- `12-ux-ui/navigation-map.md`
- `00-governance/branching-policy.md`
- `00-governance/definition-of-done.md`
- `00-governance/quality-gates.md`
