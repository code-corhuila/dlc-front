/** C05 browser projection of the Auth-owned session; never a session database. */
export type SessionState =
  'resolving' | 'authenticated' | 'anonymous' | 'expired' | 'unavailable';
export type SessionReason =
  | null
  | 'NO_SESSION'
  | 'EXPIRED'
  | 'UNAUTHORIZED'
  | 'LOGOUT'
  | 'DEPENDENCY_UNAVAILABLE';
export type SessionUser = Readonly<{
  id: string;
  name: string;
  roles: readonly string[];
}>;
export type SessionSnapshot = Readonly<{
  state: SessionState;
  revision: number;
  user: SessionUser | null;
  permissions: readonly string[];
  expiresAt: string | null;
  reason: SessionReason;
}>;

/** What an Auth adapter yields after validating Tokens; credentials stay inside it. */
export type Establishment = Readonly<{
  user: SessionUser;
  permissions: readonly string[];
  expiresAt: string;
}>;
export type AuthPort = Readonly<{
  restore: () => Promise<Establishment | null>;
  complete: (input: {
    operationId: string;
    body: unknown;
  }) => Promise<Establishment>;
  logout: () => Promise<void>;
}>;
export type ControlResult =
  | Readonly<{ ok: true; status: number; data: SessionSnapshot | null }>
  | Readonly<{ ok: false; status: 0; error: string }>;

const COMPLETIONS = ['AuthVerifyMFAchallenge', 'AuthConfirmMFAenrollment'];
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === 'string');

/** Rejects malformed data; keeps only id, name and roles (C05). */
function sanitize(input: unknown): Establishment | null {
  const raw = input as Record<string, unknown> | null;
  const user = raw?.user as Record<string, unknown> | undefined;
  if (!user || typeof user.id !== 'string' || !user.id) return null;
  if (typeof user.name !== 'string' || !strings(user.roles)) return null;
  if (!strings(raw?.permissions) || typeof raw?.expiresAt !== 'string')
    return null;
  if (Number.isNaN(Date.parse(raw.expiresAt))) return null;
  return {
    user: Object.freeze({
      id: user.id,
      name: user.name,
      roles: Object.freeze([...user.roles]),
    }),
    permissions: Object.freeze([...raw.permissions]),
    expiresAt: new Date(raw.expiresAt).toISOString(),
  };
}

export function createSession(auth: AuthPort) {
  let snapshot: SessionSnapshot = Object.freeze({
    state: 'resolving',
    revision: 0,
    user: null,
    permissions: Object.freeze([]),
    expiresAt: null,
    reason: null,
  });
  const listeners = new Set<(s: SessionSnapshot) => void>();

  const notify = (listener: (s: SessionSnapshot) => void) => {
    try {
      listener(snapshot);
    } catch {
      // A failing listener must not affect the shell or other portals.
    }
  };
  function publish(
    state: SessionState,
    reason: SessionReason,
    est?: Establishment,
  ) {
    snapshot = Object.freeze({
      state,
      revision: snapshot.revision + 1,
      user: est?.user ?? null,
      permissions: est?.permissions ?? Object.freeze([]),
      expiresAt: est?.expiresAt ?? null,
      reason,
    });
    for (const listener of [...listeners]) notify(listener);
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: (s: SessionSnapshot) => void) {
      listeners.add(listener);
      notify(listener);
      return () => void listeners.delete(listener);
    },
    async start() {
      try {
        const restored = await auth.restore();
        if (restored === null) return publish('anonymous', 'NO_SESSION');
        const est = sanitize(restored);
        if (est) publish('authenticated', null, est);
        else publish('unavailable', 'DEPENDENCY_UNAVAILABLE');
      } catch {
        publish('unavailable', 'DEPENDENCY_UNAVAILABLE');
      }
    },
    /** IAM-only MFA completion; the proof body is passed unchanged to Auth. */
    async complete(input: {
      operationId: unknown;
      body: unknown;
    }): Promise<ControlResult> {
      if (
        typeof input.operationId !== 'string' ||
        !COMPLETIONS.includes(input.operationId)
      )
        return { ok: false, status: 0, error: 'INVALID_REQUEST' };
      try {
        const est = sanitize(
          await auth.complete({
            operationId: input.operationId,
            body: input.body,
          }),
        );
        if (!est) return { ok: false, status: 0, error: 'INVALID_RESPONSE' };
        publish('authenticated', null, est);
        return { ok: true, status: 200, data: snapshot };
      } catch {
        return { ok: false, status: 0, error: 'SESSION_UNAVAILABLE' };
      }
    },
    /** Local private state is cleared before Auth is asked to revoke. */
    async logout(): Promise<ControlResult> {
      publish('anonymous', 'LOGOUT');
      try {
        await auth.logout();
        return { ok: true, status: 204, data: null };
      } catch {
        return { ok: false, status: 0, error: 'SESSION_UNAVAILABLE' };
      }
    },
    /** Protected 401 or expiry ends the browser session (C05). */
    invalidate: (reason: 'UNAUTHORIZED' | 'EXPIRED') =>
      publish(reason === 'EXPIRED' ? 'expired' : 'anonymous', reason),
  };
}

export type Session = ReturnType<typeof createSession>;

/** C02 capability for one mount: read-only and released when its signal aborts. */
export function scopeSession(session: Session, signal: AbortSignal) {
  const unsubscribers = new Set<() => void>();
  signal.addEventListener('abort', () => {
    for (const unsubscribe of unsubscribers) unsubscribe();
    unsubscribers.clear();
  });
  const ensureLive = () => {
    if (signal.aborted) throw new Error('CANCELLED');
  };
  return Object.freeze({
    getSnapshot: () => {
      ensureLive();
      return session.getSnapshot();
    },
    subscribe: (listener: (s: SessionSnapshot) => void) => {
      ensureLive();
      const unsubscribe = session.subscribe(listener);
      unsubscribers.add(unsubscribe);
      return () => {
        unsubscribers.delete(unsubscribe);
        unsubscribe();
      };
    },
  });
}
