import { parseRegistry, type RegistryResult } from './registry.ts';
import type { PortalId } from './routes.ts';

type FetchLike = (
  url: string,
  init: RequestInit,
) => Promise<Pick<Response, 'ok' | 'json'>>;

export type LoaderDeps = Readonly<{
  fetch: FetchLike;
  /** Browser dynamic import of a same-origin entry; never eager (C01). */
  importModule: (url: string) => Promise<unknown>;
  timeoutMs?: number;
}>;

const REGISTRY_URL = '/portal-registry.json';
const INVALID: RegistryResult = { ok: false, error: 'REGISTRY_INVALID' };

/** C01 registry fetch (no-store, 10 s) and selected-entry import. */
export function createEntryLoader(deps: LoaderDeps) {
  let cached: Promise<RegistryResult> | null = null;

  async function fetchRegistry(): Promise<RegistryResult> {
    try {
      const response = await deps.fetch(REGISTRY_URL, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(deps.timeoutMs ?? 10000),
      });
      return response.ok ? parseRegistry(await response.json()) : INVALID;
    } catch {
      return INVALID;
    }
  }

  // Portals whose entry could not be imported: the only case a probe can recover (C07).
  const importFailed = new Set<PortalId>();
  const registry = () => (cached ??= fetchRegistry());

  async function loadEntry(portalId: PortalId): Promise<unknown> {
    const current = await registry();
    if (!current.ok) throw new Error('REGISTRY_UNAVAILABLE');
    const entry = current.portals[portalId];
    if (entry?.status !== 'available') throw new Error('PORTAL_DISABLED');
    try {
      const module = await deps.importModule(entry.entryUrl);
      importFailed.delete(portalId);
      return module;
    } catch (error) {
      importFailed.add(portalId);
      throw error;
    }
  }

  /** C07: HEAD of the selected entry, no import, no cache; false when not available. */
  async function probe(portalId: PortalId): Promise<boolean> {
    if (!importFailed.has(portalId)) return false;
    const current = await registry();
    const entry = current.ok ? current.portals[portalId] : undefined;
    if (entry?.status !== 'available') return false;
    try {
      const response = await deps.fetch(entry.entryUrl, {
        method: 'HEAD',
        cache: 'no-store',
        credentials: 'same-origin',
        signal: AbortSignal.timeout(deps.timeoutMs ?? 10000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /** Latest published registry revision, or null when unreadable. */
  async function revision(): Promise<string | null> {
    const latest = await fetchRegistry();
    return latest.ok ? latest.revision : null;
  }

  return {
    registry,
    probe,
    markImportFailed: (portalId: PortalId) => void importFailed.add(portalId),
    revision,
    loadEntry,
    /** Explicit retry: the next call re-fetches the registry (C07). */
    invalidate: () => {
      cached = null;
    },
  };
}
