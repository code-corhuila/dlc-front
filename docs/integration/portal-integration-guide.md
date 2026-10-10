# Portal integration guide (dlc-front, composition contract v1)

For the teams of `dlc-iam-portal`, `dlc-patient-portal`, `dlc-appointments-portal`,
`dlc-billing-portal` and `dlc-clinical-portal`. Normative source: dlc-docs
`05-architecture/frontend-composition.md` (C01–C08) and ADR-011. This guide summarises what the
compositor already enforces, so that portals integrate without conflicting with each other.
Reference implementation: `dlc-clinical-portal` (`src/clinical/entry.tsx`).

## 1. What you publish (C01)

| Item | Rule |
| --- | --- |
| Entry | `/portals/{portalId}/{release}/entry.js`, a browser ES module, same origin through the dlc-front proxy |
| `portalId` | Exactly one of `iam`, `patient`, `appointments`, `billing`, `clinical` |
| `release` | Letters, digits, `.`, `_`, `-` (e.g. `0.1.0`, `0.1.0-demo`); a new release is a new folder, never overwrite one |
| Assets | Under the same release folder, relative URLs (`new URL('./entry.css', import.meta.url)`); no bare imports, import maps or shared globals |
| Exports | `portalId`, `contractVersion = 1`, `mount(host, context)` |
| Import | No side effects: no bootstrap, request, listener or DOM change until `mount` |
| Server | `Cache-Control: no-store` for `/portals/`; missing files return 404, never your `index.html` |
| Container | A Docker service on a network the dlc-front compose can join; tell the front team its name and port |

The registry entry (`portal-registry.json`, maintained by dlc-front) needs from you:
`repository`, `release`, `entryUrl` and your **navigation descriptors**
(`id`, `label`, `path`, `visibility: { rolesAny, permissionsAll }`). Paths must be inside your
own routes; an id or path claimed by two portals disables both.

| Portal | Owned global routes |
| --- | --- |
| `iam` | `/login`, `/recover-password`, `/app/administration/**` |
| `patient` | `/app/patients/**` (except `/app/patients/{uuid}`, alias of Clinical) |
| `appointments` | `/app/appointments/**` |
| `billing` | `/app/billing/**` (including `/app/billing/procedures`) |
| `clinical` | `/app/clinical/**`, and `/analytics` inside the Dashboard |

## 2. `mount(host, context)` and the handle (C02, C03)

- Render **only inside `host`**. Resolve as soon as the first loading/empty/error/data frame
  exists (10 s deadline). On rejection, clean what you created.
- Return `{ updateRoute(route), canLeave(), unmount() }`, all Promise-returning:
  - `updateRoute`: same instance, new `route.localPath`/`query`; unknown local path → your 404.
  - `canLeave`: `false` keeps the user (unsaved form); 10 s deadline.
  - `unmount`: idempotent, within 2 s; remove roots, listeners, timers, requests, overlays and
    styles. A cleanup that hangs quarantines your portal until reload.
- Also clean up when `context.signal` aborts.
- Angular: `createApplication` inside `host`, zoneless, no `provideHttpClient`, no global router
  (drive internal routing from `updateRoute`). React: `createRoot(host)`, `root.unmount()`.

## 3. The context you receive

| Member | Use |
| --- | --- |
| `route` | `{ compositionId, globalPath, basePath, localPath, query, fragment }` |
| `signal` | Aborted when your mount ends |
| `navigation.request({ path, replace })` | The only way to change the URL or open another portal; never touch `history` or `location` |
| `session.getSnapshot()` / `subscribe()` | `{ state, revision, user: { id, name, roles }, permissions, expiresAt, reason }`; show private data only when `state === 'authenticated'` |
| `reportFailure({ code })` | `PORTAL_RENDER_FAILED` or `PORTAL_TASK_FAILED` only; the shell ends your mount and shows the local notice |
| `iamSession` | IAM only: `complete`, `logout`, `retryRestore` |
| `http` | Coming (C06): the only API transport. Never call `fetch`, `axios` or `XMLHttpRequest` against `/api` (norm 5.4.1, serious fault) |

You never receive tokens or credentials and must not store any (`localStorage`,
`sessionStorage`, cookies).

## 4. Rules that avoid conflicts between portals

1. **CSS isolation:** prefix every selector, variable, id and keyframe with your portal prefix
   (e.g. `pat-`, `apt-`, `bil-`, `iam-`, `cl-`) and scope it to your wrapper. No `html`, `body`,
   `:root` or element-wide resets; no `100vh` layouts inside the host; overlays stay inside it.
2. **No shared runtime:** bundle your framework; do not expect Angular/React from the shell or
   another portal.
3. **No cross-portal imports or DOM access:** talk to other areas only through
   `navigation.request` (e.g. Patients opens `/app/clinical/{patientId}`).
4. **Identity and roles come from `context.session`:** no role/persona selectors inside the
   composed portal. Standalone demo pages may keep them.
5. **Synthetic data:** use only data derived from your OpenAPI `examples` in dlc-docs; ids that
   cross portals (patients, appointments, invoices) must come from one shared synthetic dataset
   agreed in dlc-docs, never invented per team. Never real personal data.
6. **Money** as exact decimal text in COP; **creations** send `Idempotency-Key` per intent
   (through `context.http` once available).
7. **Each view** has loading, error with retry, empty and data states; labels and field errors
   (`aria-describedby`); submit disabled while pending.

## 5. Checklist before asking for registration

- [ ] `entry.js` exports `portalId`, `contractVersion: 1`, `mount`; import has no side effects.
- [ ] Served same-origin path `/portals/{portalId}/{release}/`, `no-store`, 404 for missing files.
- [ ] `mount` renders only in `host`; handle has `updateRoute`, `canLeave`, idempotent `unmount`.
- [ ] Unmount leaves no DOM, styles or listeners (checked in the browser).
- [ ] CSS prefixed and scoped; no global rules.
- [ ] No `fetch`/token/session code against the API; role from `context.session`.
- [ ] Navigation descriptors listed with their routes and visibility.
- [ ] Docker service name, port and network communicated to the front team.

## 6. How the front team registers you

1. Add your entry and descriptors to the registry; add the `/portals/{portalId}/` proxy in
   `deploy/nginx.conf.template` and the variable in `deploy/compose.yml`/`.env.example`.
2. Verify in the browser: mount, `updateRoute`, unmount without leftovers, portal stopped →
   local notice, restarted → "La sección ya está disponible".
3. Record the evidence and promote to `qa` with `git cherry-pick -x`.
