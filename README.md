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

## Structural scope

This increment contains directory placeholders and repository documentation.
It implements no behavior, routes, session, HTTP client, portal loader or tests.
There is no runtime, dependency manifest, build configuration or test runner.
The `.gitkeep` files only retain directories in Git.

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
│   │   │   └── .gitkeep
│   │   └── session/
│   │       └── .gitkeep
│   ├── integrations/
│   │   └── .gitkeep
│   └── layout/
│       └── .gitkeep
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

The project owner supplied the scope of dlc-front Issue #1:
"Provide shared session and HTTP-client integration for the IAM remote."
The session, HTTP and integration directories reserve that responsibility for
future work. Issue #1 and HU-IAM-001 remain unimplemented by this increment.

- **DDD:** Preserve all five portal boundaries. Compositor policies and shared
  capabilities are separated from external integrations; no domain copies exist.
- **SDD:** ADR-011 and approved navigation/security/API specifications guide
  this structure. Framework-specific Annex H templates do not assign a
  technology to the compositor under the clarification recorded in ADR-011.
- **TDD:** Harold will perform RED → GREEN → REFACTOR manually for subsequent
  behavior. No tests or test tooling are introduced here; the documentation
  does not mandate a test-directory layout for this compositor.
- **Hexagonal principles:** Keep coordination policies separate from external
  details. Ports/adapters will follow approved contracts when behavior is
  introduced; no empty domain/application layers are created for appearance.

## Specification still required for implementation

Executable portal composition/lifecycle and shared-capability contracts require
definition and verification. Deployment details also require specification.
These are integration concerns, not a framework-selection task for dlc-front.
No endpoints, events, storage mechanism or Angular/React adapter are defined here.

The canonical story is HU-IAM-001. A HU-04 alias was not found in the reviewed
documentation; no equivalence is asserted. Structure alone cannot complete the
story, Issue #1 or the project's Definition of Done.

## Documentation references

Paths below belong to the canonical documentation repository (`ods-docs`):

- `05-architecture/decisions/ADR-011-transversal-frontend-composition.md`
- `05-architecture/hexagonal-architecture.md`
- `09-microservices/transversal-repositories.md`
- `04-requirements/traceability-matrix.md`
- `07-api/authentication.md`
- `11-quality/testing-strategy.md`
- `12-ux-ui/navigation-map.md`
- `00-governance/branching-policy.md`
- `00-governance/definition-of-done.md`
- `00-governance/quality-gates.md`
