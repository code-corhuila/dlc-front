import type { NavigationDescriptor } from '../layout/navigation.ts';
import { resolveRoute, type PortalId } from './routes.ts';

export const REPOSITORIES: Readonly<Record<PortalId, string>> = {
  iam: 'dlc-iam-portal',
  patient: 'dlc-patient-portal',
  appointments: 'dlc-appointments-portal',
  billing: 'dlc-billing-portal',
  clinical: 'dlc-clinical-portal',
};

export type PortalEntry =
  | Readonly<{
      status: 'available';
      release: string;
      entryUrl: string;
      navigation: readonly NavigationDescriptor[];
    }>
  | Readonly<{ status: 'disabled' }>;

export type RegistryResult =
  | Readonly<{
      ok: true;
      revision: string;
      portals: Readonly<Partial<Record<PortalId, PortalEntry>>>;
      navigation: readonly NavigationDescriptor[];
    }>
  | Readonly<{ ok: false; error: 'REGISTRY_INVALID' }>;

const RELEASE = /^(?!\.+$)[A-Za-z0-9._-]+$/;
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isStrings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === 'string');
const isKnown = (id: unknown): id is PortalId =>
  typeof id === 'string' && Object.hasOwn(REPOSITORIES, id);

/** C04 descriptor whose path is a plain pathname owned by `owner`. */
function toDescriptor(raw: unknown, owner: PortalId) {
  if (!isRecord(raw) || !isRecord(raw.visibility)) return null;
  const { id, label, path } = raw;
  const { rolesAny, permissionsAll } = raw.visibility;
  if (typeof id !== 'string' || !id || typeof label !== 'string' || !label)
    return null;
  if (
    typeof path !== 'string' ||
    !isStrings(rolesAny) ||
    !isStrings(permissionsAll)
  )
    return null;
  let url: URL;
  try {
    url = new URL(path, 'https://registry.invalid');
  } catch {
    return null;
  }
  const owned = resolveRoute(url, true);
  if (url.pathname + url.search + url.hash !== path) return null;
  if (!('portalId' in owned) || owned.portalId !== owner) return null;
  return { id, label, path, visibility: { rolesAny, permissionsAll } };
}

function toEntry(raw: Record<string, unknown>, id: PortalId) {
  const { release, entryUrl, repository, navigation } = raw;
  if (repository !== REPOSITORIES[id] || typeof release !== 'string')
    return null;
  if (!RELEASE.test(release)) return null;
  if (entryUrl !== `/portals/${id}/${release}/entry.js`) return null;
  if (!Array.isArray(navigation)) return null;
  const items = navigation.map((item) => toDescriptor(item, id));
  if (items.some((item) => item === null)) return null;
  return { release, entryUrl, navigation: items as NavigationDescriptor[] };
}

/** C01: whole registry fails closed; a bad descriptor disables only its portal. */
export function parseRegistry(input: unknown): RegistryResult {
  const invalid = { ok: false, error: 'REGISTRY_INVALID' } as const;
  if (!isRecord(input) || input.contractVersion !== 1) return invalid;
  const { registryRevision: revision, portals } = input;
  if (typeof revision !== 'string' || !revision || !Array.isArray(portals))
    return invalid;
  const seen = new Set<PortalId>();
  for (const raw of portals) {
    if (!isRecord(raw) || !isKnown(raw.portalId) || seen.has(raw.portalId))
      return invalid;
    seen.add(raw.portalId);
  }

  const entries = new Map<PortalId, ReturnType<typeof toEntry>>();
  for (const raw of portals as Record<string, unknown>[])
    entries.set(
      raw.portalId as PortalId,
      toEntry(raw, raw.portalId as PortalId),
    );

  // Ids and paths claimed by two owners disable both: no owner precedence is invented.
  const claims = new Map<string, Set<PortalId>>();
  for (const [id, entry] of entries)
    for (const item of entry?.navigation ?? [])
      for (const key of [`id:${item.id}`, `path:${item.path}`])
        claims.set(key, (claims.get(key) ?? new Set()).add(id));
  for (const owners of claims.values())
    if (owners.size > 1) for (const id of owners) entries.set(id, null);

  const result: Partial<Record<PortalId, PortalEntry>> = {};
  const navigation: NavigationDescriptor[] = [];
  for (const [id, entry] of entries) {
    result[id] = entry
      ? { status: 'available', ...entry }
      : { status: 'disabled' };
    if (entry) navigation.push(...entry.navigation);
  }
  return { ok: true, revision, portals: result, navigation };
}

/** C01: validate the imported module before invoking mount. */
export function validateEntryModule(module: unknown, portalId: PortalId) {
  return (
    isRecord(module) &&
    module.portalId === portalId &&
    module.contractVersion === 1 &&
    typeof module.mount === 'function'
  );
}
