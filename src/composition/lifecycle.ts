import { validateEntryModule } from './registry.ts';
import type { PortalId, PortalRoute } from './routes.ts';

/** C02 deadlines in milliseconds. */
export const DEADLINES = {
  load: 10000,
  mount: 10000,
  update: 10000,
  leave: 10000,
  unmount: 2000,
} as const;
export type Deadlines = { [K in keyof typeof DEADLINES]: number };

export type ContextRoute = PortalRoute & Readonly<{ compositionId: string }>;

export type PortalHandle = Readonly<{
  updateRoute(route: ContextRoute): Promise<void>;
  canLeave(): Promise<boolean>;
  unmount(): Promise<void>;
}>;

/** Plain-data part of the C02 context; capabilities are added by `createContext`. */
export type BaseContext = Readonly<{
  contractVersion: 1;
  portalId: PortalId;
  mountId: string;
  compositionId: string;
  route: ContextRoute;
  signal: AbortSignal;
}>;

export type Outcome =
  | Readonly<{ status: 'active' | 'cancelled' | 'superseded' | 'quarantined' }>
  | Readonly<{ status: 'failed'; code: 'PORTAL_UNAVAILABLE' }>;

export type Phase =
  'IDLE' | 'LOADING' | 'MOUNTING' | 'ACTIVE' | 'UNMOUNTING' | 'FAILED';

export type LifecycleDeps = Readonly<{
  container: HTMLElement;
  loadEntry: (portalId: PortalId) => Promise<unknown>;
  createContext: (base: BaseContext) => object;
  uuid: () => string;
  deadlines?: Deadlines;
}>;

type Mounted = {
  portalId: PortalId;
  handle: PortalHandle;
  host: HTMLElement;
  controller: AbortController;
};

class DeadlineExceeded extends Error {}

function deadline<T>(work: () => T | Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DeadlineExceeded()), ms);
  });
  return Promise.race([Promise.resolve().then(work), expiry]).finally(() =>
    clearTimeout(timer),
  );
}

const isHandle = (value: unknown): value is PortalHandle =>
  typeof value === 'object' &&
  value !== null &&
  ['updateRoute', 'canLeave', 'unmount'].every(
    (key) => typeof (value as Record<string, unknown>)[key] === 'function',
  );

/** Late or rejected handles are destroyed immediately (C02). */
function discard(handle: unknown) {
  const unmount = (handle as { unmount?: unknown } | null)?.unmount;
  if (typeof unmount === 'function')
    Promise.resolve()
      .then(() => unmount.call(handle))
      .catch(() => undefined);
}

const FAILED: Outcome = { status: 'failed', code: 'PORTAL_UNAVAILABLE' };
const SUPERSEDED: Outcome = { status: 'superseded' };

/** One selected portal at a time; newer targets supersede pending work (C02). */
export function createLifecycle(deps: LifecycleDeps) {
  const limits = deps.deadlines ?? DEADLINES;
  const quarantined = new Set<PortalId>();
  let generation = 0;
  let phase: Phase = 'IDLE';
  let active: Mounted | null = null;
  let pending: { controller: AbortController; host: HTMLElement } | null = null;

  function abortPending() {
    pending?.controller.abort();
    pending?.host.remove();
    pending = null;
  }

  async function cleanup(mounted: Mounted) {
    phase = 'UNMOUNTING';
    active = null;
    mounted.controller.abort();
    try {
      await deadline(() => mounted.handle.unmount(), limits.unmount);
    } catch {
      quarantined.add(mounted.portalId); // Recoverable only by page reload.
    }
    mounted.host.remove();
    phase = 'IDLE';
  }

  async function mount(id: PortalId, route: ContextRoute, gen: number) {
    const controller = new AbortController();
    const host = deps.container.ownerDocument.createElement('div');
    host.className = 'dlc-portal-host';
    host.dataset.portal = id;
    pending = { controller, host };
    phase = 'LOADING';
    const fail = (): Outcome => {
      controller.abort();
      host.remove();
      if (gen !== generation) return SUPERSEDED;
      pending = null;
      phase = 'FAILED';
      return FAILED;
    };

    let module: unknown;
    try {
      module = await deadline(() => deps.loadEntry(id), limits.load);
    } catch {
      return fail();
    }
    if (gen !== generation || !validateEntryModule(module, id)) return fail();

    phase = 'MOUNTING';
    deps.container.append(host);
    const base: BaseContext = {
      contractVersion: 1,
      portalId: id,
      mountId: deps.uuid(),
      compositionId: route.compositionId,
      route,
      signal: controller.signal,
    };
    const mountFn = (
      module as { mount: (host: HTMLElement, context: object) => unknown }
    ).mount;
    const mounting = Promise.resolve().then(() =>
      mountFn(host, deps.createContext(base)),
    );
    let handle: unknown;
    try {
      handle = await deadline(() => mounting, limits.mount);
    } catch (error) {
      if (error instanceof DeadlineExceeded)
        mounting.then(discard, () => undefined);
      return fail();
    }
    if (gen !== generation || !isHandle(handle)) {
      discard(handle);
      return fail();
    }
    pending = null;
    active = { portalId: id, handle, host, controller };
    phase = 'ACTIVE';
    return { status: 'active' } as const;
  }

  async function show(id: PortalId, route: PortalRoute): Promise<Outcome> {
    const gen = ++generation;
    abortPending();
    if (quarantined.has(id)) return { status: 'quarantined' };
    const next: ContextRoute = { ...route, compositionId: deps.uuid() };
    const current = active;
    if (current) {
      const leave = await deadline(
        () => current.handle.canLeave(),
        limits.leave,
      ).then(
        (answer) => answer === true,
        () => false,
      );
      if (!leave) return { status: 'cancelled' };
      if (gen !== generation) return SUPERSEDED;
      if (current.portalId === id) {
        try {
          await deadline(() => current.handle.updateRoute(next), limits.update);
          return { status: 'active' };
        } catch {
          await cleanup(current);
          phase = 'FAILED';
          return FAILED;
        }
      }
      await cleanup(current);
      if (gen !== generation) return SUPERSEDED;
    }
    return mount(id, next, gen);
  }

  /** Forced cleanup (session invalidation): no leave veto (C02). */
  async function clear() {
    generation += 1;
    abortPending();
    if (active) await cleanup(active);
  }

  return {
    show,
    clear,
    state: () => ({ phase, portalId: active?.portalId ?? null }),
  };
}
