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

  const registry = () => (cached ??= fetchRegistry());

  async function loadEntry(portalId: PortalId): Promise<unknown> {
    const current = await registry();
    if (!current.ok) throw new Error('REGISTRY_UNAVAILABLE');
    const entry = current.portals[portalId];
    if (entry?.status !== 'available') throw new Error('PORTAL_DISABLED');
    return deps.importModule(entry.entryUrl);
  }

  return {
    registry,
    loadEntry,
    /** Explicit retry: the next call re-fetches the registry (C07). */
    invalidate: () => {
      cached = null;
    },
  };
}
