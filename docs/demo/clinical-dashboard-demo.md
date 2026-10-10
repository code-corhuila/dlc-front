# Front-only demo: Clinical and Dashboard inside dlc-front

Purpose: show the composition of the Clinical micro-front in the compositor (ADR-011,
composition contract v1) with **synthetic data only**. There is no API, database or real
infrastructure in this stage.

| Piece | In this demo | Replaced later by |
| --- | --- | --- |
| Compositor (`dlc-front`) | Production code | — |
| Session (C05) | Development Auth double (`fixtures/dev-auth.js`) | IAM portal + Auth adapter |
| Clinical | `clinical-portal-demo` build, synthetic data (`0.1.0-demo`) | `clinical-portal-dlc-front` (`0.1.0`) + API |
| Patients, IAM, Billing | C02 test doubles (contract data only) | Their `entry.js` in the registry |
| Appointments | Intentionally missing entry | Its `entry.js` |

`fixtures/` (registry, doubles, Auth double, `dev-session.json`) is development data: it is
never copied to `dist/` and never reaches `main` (Annex H rule 5).

## Start

1. In `dlc-clinical-portal` (branch `develop`): `docker compose -f deploy/compose.yml up --build -d`
2. In `dlc-front`: `docker compose -f deploy/compose.yml up --build -d`
3. Open `http://localhost:8080/`

Alternative without the front container: `npm run build` and `npm run preview`
(`http://localhost:4180/`, Clinical demo on `http://localhost:4175` by default).

Persona at load: edit `fixtures/dev-session.json` (`DENTIST`, `ADMINISTRATOR`,
`SECRETARY_ASSISTANT`) and reload; delete it to start anonymous.

## Script

| Step | Action | Expected result | Contract |
| --- | --- | --- | --- |
| 1 | Open `/` signed out | Public Home (mockup p. 1) | Owner decision |
| 2 | Login → "Entrar como Odontóloga" | Dashboard; menu without Gestión de usuarios | C04, C05 |
| 3 | Pacientes → "Abrir historia clínica — Paciente sintético A" | `/app/clinical/patient-a`, Clinical record | C04 navigation, C02 mount |
| 4 | Pacientes → Paciente sintético B | Same Clinical instance updated | C02 `updateRoute` |
| 5 | Paciente sintético C | Clinical shows "Acceso denegado" | Owner authorization |
| 6 | Paciente sintético D | Closed encounter: new entries rejected | Clinical rules |
| 7 | Back / Forward | Previous and next routes restored | C04 history |
| 8 | Facturación | Clinical unmounted, no Clinical DOM or CSS left | C02 `unmount` |
| 9 | Dashboard as Odontóloga | Clinical Analytics, professional scope | C04, HU-CLN-003 |
| 10 | Logout → "Entrar como Administración" → Dashboard | Ingresos del mes visible | C05 roles |
| 11 | Logout → "Entrar como Secretaría" → Dashboard | No Ingresos del mes | C05 roles |
| 12 | Citas | Local "Esta sección no está disponible" with Reintentar | C07 |
| 13 | `docker stop clinical-portal-demo`, reload, sign in | Dashboard shows the local notice; shortcuts still work | C07, FC-15 |
| 14 | `/app/nada` | Global 404 | C04 |

Restart Clinical afterwards: `docker start clinical-portal-demo`.

## What the demo does not prove

Real authentication, MFA, API calls (C06), persistence or production deployment.
