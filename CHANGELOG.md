# Changelog

All notable changes of `dlc-front` are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions follow
[Semantic Versioning](https://semver.org/). Work enters `develop` from `feat/`, `fix/` and `chore/` branches, reaches `qa` through
`promotion/*` branches re-applied with `git cherry-pick -x`, and reaches `main` through a `release/<version>` branch cut from `main`
and filled with the commits of `qa`, also with `git cherry-pick -x`, merged by PR with the approval of @ariel5253. A release is
tagged `v<version>` after the merge. Nothing is merged between permanent branches.

## [Unreleased]

## [2.0.0] - 2026-10-14

MVP 2: the cross-cutting compositor (ADR-011, composition contract v1), the common frame and the demo portals of every bounded
context. Released through `release/2.0.0` (59 commits re-applied from `qa`), tagged `v2.0.0` after the merge.

### Added

- C01 registry: `/portal-registry.json` is validated (`contractVersion: 1`, one owner per route) and each portal's `entry.js` is
  loaded from its release path. ([#13], [#15], [#18])
- C02 lifecycle: `mount`, `updateRoute`, `canLeave` and `unmount` with deadlines of 10 s for load, mount, update and leave, and 2 s
  for unmount. ([#14], [#16])
- C03 isolation: each portal renders inside its own host slot and keeps its styles there. ([#16])
- C04 navigation: global routes resolved to their owner portal, a sidebar menu filtered by role, and a not-found page for unknown
  routes and service errors. ([#9], [#12], [#17], [#20], [#39])
- C05 session: a session projection behind an Auth port; on `develop` the preview session comes from a deployment file
  (`/dev-session.json`). ([#35], [#38])
- C06 `http` capability: a shared client with `X-Correlation-Id`, a 10 s timeout, central messages, the OpenAPI operation
  catalogue, idempotency keys on writes and target validation (Unicode look-alike separators included). ([#5], [#68], [#69], [#77])
- C07 failure containment: a failing portal shows `PORTAL_UNAVAILABLE` with a retry, portals that stop answering are removed and
  their recovery is announced, and safe telemetry events are recorded. ([#58], [#74], [#79])
- Common frame: header with search and account menu, sidebar, public home, public frame for IAM routes, and a Dashboard entry.
  ([#10], [#11], [#21], [#40], [#49], [#50], [#52], [#88])
- Deploy: Dockerfile and nginx with pinned images and a health check. Compose runs the demo portals behind same-origin proxies
  `/portals/<id>/` and a Prism gateway mock behind `/api/v1/`. ([#37], [#59], [#75])
- Integrated portals and their releases: clinical `0.1.0-demo` ([#36], [#57], [#81]), patient `0.1.0-demo` ([#85]),
  appointments `0.1.0-demo` ([#83]), billing `2.0.0` ([#84], [#91]) and iam `0.1.0-local` ([#86]).
- Quality gates in CI, and the portal integration guide for portal teams. ([#8], [#19], [#66])

### Fixed

- Common frame on small screens and phones; the top bar stays visible. ([#41], [#51], [#65])
- On Login and Recover Password, the public IAM host fills the space down to the footer. ([#90])

### Security

- HTTP targets are validated before any request, including Unicode look-alike separators. ([#5], [#77])
- Telemetry records only safe fields of portal and HTTP failures. ([#74])
- The registry and portal entries are served with `Cache-Control: no-store`. ([#37])

### Known limits

- The preview session (`/dev-session.json`) exists only on `develop`; real login depends on `dlc-iam-portal` and IAM.
- Patient, appointments and clinical run as `-demo` releases and iam as `-local`; only billing has a published release.
- Help, Settings, notifications and the legal pages are deferred.
- Not yet tested against a real API: `/api/v1/` points to a Prism mock of the `dlc-docs` contracts.

[#5]: https://github.com/code-corhuila/dlc-front/pull/5
[#8]: https://github.com/code-corhuila/dlc-front/pull/8
[#9]: https://github.com/code-corhuila/dlc-front/pull/9
[#10]: https://github.com/code-corhuila/dlc-front/pull/10
[#11]: https://github.com/code-corhuila/dlc-front/pull/11
[#12]: https://github.com/code-corhuila/dlc-front/pull/12
[#13]: https://github.com/code-corhuila/dlc-front/pull/13
[#14]: https://github.com/code-corhuila/dlc-front/pull/14
[#15]: https://github.com/code-corhuila/dlc-front/pull/15
[#16]: https://github.com/code-corhuila/dlc-front/pull/16
[#17]: https://github.com/code-corhuila/dlc-front/pull/17
[#18]: https://github.com/code-corhuila/dlc-front/pull/18
[#19]: https://github.com/code-corhuila/dlc-front/pull/19
[#20]: https://github.com/code-corhuila/dlc-front/pull/20
[#21]: https://github.com/code-corhuila/dlc-front/pull/21
[#35]: https://github.com/code-corhuila/dlc-front/pull/35
[#36]: https://github.com/code-corhuila/dlc-front/pull/36
[#37]: https://github.com/code-corhuila/dlc-front/pull/37
[#38]: https://github.com/code-corhuila/dlc-front/pull/38
[#39]: https://github.com/code-corhuila/dlc-front/pull/39
[#40]: https://github.com/code-corhuila/dlc-front/pull/40
[#41]: https://github.com/code-corhuila/dlc-front/pull/41
[#49]: https://github.com/code-corhuila/dlc-front/pull/49
[#50]: https://github.com/code-corhuila/dlc-front/pull/50
[#51]: https://github.com/code-corhuila/dlc-front/pull/51
[#52]: https://github.com/code-corhuila/dlc-front/pull/52
[#57]: https://github.com/code-corhuila/dlc-front/pull/57
[#58]: https://github.com/code-corhuila/dlc-front/pull/58
[#59]: https://github.com/code-corhuila/dlc-front/pull/59
[#65]: https://github.com/code-corhuila/dlc-front/pull/65
[#66]: https://github.com/code-corhuila/dlc-front/pull/66
[#68]: https://github.com/code-corhuila/dlc-front/pull/68
[#69]: https://github.com/code-corhuila/dlc-front/pull/69
[#74]: https://github.com/code-corhuila/dlc-front/pull/74
[#75]: https://github.com/code-corhuila/dlc-front/pull/75
[#77]: https://github.com/code-corhuila/dlc-front/pull/77
[#79]: https://github.com/code-corhuila/dlc-front/pull/79
[#81]: https://github.com/code-corhuila/dlc-front/pull/81
[#83]: https://github.com/code-corhuila/dlc-front/pull/83
[#84]: https://github.com/code-corhuila/dlc-front/pull/84
[#85]: https://github.com/code-corhuila/dlc-front/pull/85
[#86]: https://github.com/code-corhuila/dlc-front/pull/86
[#88]: https://github.com/code-corhuila/dlc-front/pull/88
[#90]: https://github.com/code-corhuila/dlc-front/pull/90
[#91]: https://github.com/code-corhuila/dlc-front/pull/91
