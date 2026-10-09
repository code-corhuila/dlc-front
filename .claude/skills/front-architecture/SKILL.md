---
name: front-architecture
description: ADR-011 and composition contract v1 checks for the dlc-front compositor. Use before changing src/ or deploy/.
---

# dlc-front architecture (ADR-011, C01–C08)

Verify before and after each change:

- No framework or federation dependency in the compositor (no React, Angular, Vue, Next,
  Module Federation, `remoteEntry`, `shell/apiClient`).
- C01: `/portal-registry.json` validated (contractVersion 1, unique known portalIds, same-origin
  `entryUrl` `/portals/{id}/{release}/entry.js`); only the selected entry is imported.
- C02: lifecycle `mount/updateRoute/canLeave/unmount` with the specified deadlines (10 s; unmount
  2 s), generations, late-handle cleanup and quarantine; context carries plain data only.
- C04: compositor-only history, whole-segment matching, Clinical alias, global 404, safe return,
  sidebar visibility by `rolesAny`/`permissionsAll` (fail closed), focus to content heading.
- C05: read-only session snapshot; no JWT, refresh token or credentials reach portals; the
  development Auth double sits behind the same port and is excluded from `main`.
- C06: only `/api/v1` catalogued operations; header allowlist; fresh `X-Correlation-Id` per
  attempt; 10 s `TIMEOUT` status 0; central message table; no automatic write retry.
- C07: portal failure stays in its host; registry and `entry.js` served `no-store`; telemetry
  without credentials, queries, bodies or patient data.
- Shell owns frame, navigation, session screens, 404 and PORTAL_UNAVAILABLE; portals own content.
- Visual elements match the mockup and `design-system.md` tokens; deferred items are inactive.
