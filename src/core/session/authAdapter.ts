import type { AuthPort, Establishment } from './session.ts';
import {
  parseControl,
  type ControlKind,
  type ControlRecord,
  type SessionControl,
} from './sessionControl.ts';

/**
 * C05 Auth adapter: talks to the same-origin Gateway on behalf of the shell only.
 * The access token stays in this closure; the refresh cookie is managed by the browser
 * and never read by scripts. Claim checks are a UI safeguard, never authorization.
 */
export type AuthAdapterDeps = Readonly<{
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  uuid: () => string;
  now: () => number;
  /** Deployment configuration: Tokens with another issuer/audience are rejected. */
  issuer: string;
  audience: string;
  /** Web Locks (navigator.locks): serializes cookie operations across tabs (FC-10). */
  locks: LockManagerLike;
  /** Shared generation/blocked marker (FC-11); defaults to an unshared in-memory record. */
  control?: SessionControl;
  /** A renewal 401 ended the browser session; the shell clears identity (C05). */
  onSessionEnded?: (reason: 'UNAUTHORIZED') => void;
  /** An ordinary renewal of the same session; only its expiry changes (FC-10). */
  onRenewed?: (est: Establishment) => void;
  timeoutMs?: number;
  lockTimeoutMs?: number;
}>;

function memoryControl(): SessionControl {
  let current: ControlRecord = { generation: 0, blocked: false };
  return Object.freeze({
    read: () => current,
    advance: (kind: 'established' | 'cleared') =>
      (current = {
        generation: current.generation + 1,
        blocked: kind === 'cleared',
      }),
  });
}

export type LockManagerLike = Readonly<{
  request: <T>(
    name: string,
    options: { mode: 'exclusive'; signal: AbortSignal },
    callback: () => Promise<T>,
  ) => Promise<T>;
}>;

const LOCK = 'dlc-auth-v1';
/** Renew before a protected request when the token expires within this window (C05). */
const RENEW_WINDOW_MS = 30_000;

export type AuthErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE'
  | 'SESSION_UNAVAILABLE';

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  constructor(code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
    this.code = code;
  }
}

const AUTH = '/api/v1/auth';
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === 'string');
const record = (v: unknown): Record<string, unknown> | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;

/** Reads JWT claims without trusting them; signature checks belong to owners. */
function claimsOf(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return record(JSON.parse(atob(b64)));
  } catch {
    return null;
  }
}

export function createAuthAdapter(deps: AuthAdapterDeps) {
  const timeoutMs = deps.timeoutMs ?? 10_000;
  const control = deps.control ?? memoryControl();
  let access: Readonly<{ token: string; expiresAtMs: number }> | null = null;

  async function send(
    method: 'GET' | 'POST',
    path: string,
    headers: Record<string, string> = {},
    body?: unknown,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await deps.fetch(`${AUTH}${path}`, {
        method,
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          'x-correlation-id': deps.uuid(),
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          ...headers,
        },
        body: body === undefined ? null : JSON.stringify(body),
      });
    } catch {
      // Network, timeout or cancellation: the outcome is unknown, so fail closed.
      throw new AuthError('SESSION_UNAVAILABLE');
    } finally {
      clearTimeout(timer);
    }
  }

  async function bodyOf(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new AuthError('INVALID_RESPONSE');
    }
  }

  /** Validates Tokens against the deployment and keeps the token private. */
  async function install(response: Response): Promise<Establishment> {
    const raw = record(await bodyOf(response));
    const user = record(raw?.user);
    const token = raw?.accessToken;
    const claims = typeof token === 'string' ? claimsOf(token) : null;
    const audiences = strings(claims?.aud) ? claims.aud : [claims?.aud];
    if (
      !raw ||
      !user ||
      !claims ||
      typeof token !== 'string' ||
      typeof raw.expiresIn !== 'number' ||
      raw.expiresIn <= 0 ||
      typeof user.id !== 'string' ||
      !user.id ||
      typeof user.name !== 'string' ||
      !strings(user.roles) ||
      claims.sub !== user.id ||
      claims.iss !== deps.issuer ||
      !audiences.includes(deps.audience) ||
      typeof claims.exp !== 'number' ||
      !strings(claims.permissions)
    )
      throw new AuthError('INVALID_RESPONSE');
    const expiresAtMs = Math.min(
      claims.exp * 1000,
      deps.now() + raw.expiresIn * 1000,
    );
    access = Object.freeze({ token, expiresAtMs });
    return {
      user: { id: user.id, name: user.name, roles: [...user.roles] },
      permissions: [...claims.permissions],
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  }

  /** Session-bound proof for cookie operations; null when no eligible cookie exists. */
  async function csrfProof(): Promise<string | null> {
    const response = await send('GET', '/csrf');
    if (response.status === 401) return null;
    if (!response.ok) throw new AuthError('SESSION_UNAVAILABLE');
    const proof = record(await bodyOf(response))?.csrfToken;
    if (typeof proof !== 'string' || !proof)
      throw new AuthError('INVALID_RESPONSE');
    return proof;
  }

  /** FC-10: one tab at a time may change the refresh cookie; waiting is bounded. */
  async function exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const signal = AbortSignal.timeout(deps.lockTimeoutMs ?? 10_000);
    let granted = false;
    try {
      return await deps.locks.request(
        LOCK,
        { mode: 'exclusive', signal },
        () => {
          granted = true;
          return operation();
        },
      );
    } catch (error) {
      if (granted) throw error;
      throw new AuthError('SESSION_UNAVAILABLE');
    }
  }

  /** Under the lock: end the browser session everywhere and block auto-restoration. */
  function end(): null {
    access = null;
    seen = Math.max(seen, control.advance('cleared').generation);
    return null;
  }

  // Highest generation this tab knows; remote news at or below it is stale (FC-12).
  let seen = 0;
  /** Another tab changed the session: drop this tab's token and report the change. */
  function adopt(generation: number, kind: ControlKind): ControlKind | null {
    if (generation <= seen) return null;
    seen = generation;
    access = null;
    return kind;
  }

  /**
   * CSRF proof, then rotation; the access token survives only a successful rotation of
   * the current generation. A blocked or invalid marker suppresses it without network.
   */
  async function rotate(renewing: boolean): Promise<Establishment | null> {
    const start = control.read();
    if (!start || start.blocked) return (access = null);
    seen = Math.max(seen, start.generation);
    try {
      const proof = await csrfProof();
      const response =
        proof === null
          ? null
          : await send('POST', '/refresh', { 'x-csrf-token': proof });
      if (response === null || response.status === 401) {
        if (!renewing) return (access = null);
        // Renewal 401 ends the session; the failed request is never replayed.
        end();
        deps.onSessionEnded?.('UNAUTHORIZED');
        return null;
      }
      if (!response.ok) throw new AuthError('SESSION_UNAVAILABLE');
      const est = await install(response);
      // FC-12: a response that outlived its generation never installs state.
      if (control.read()?.generation !== start.generation)
        return (access = null);
      if (renewing) deps.onRenewed?.(est);
      return est;
    } catch (error) {
      access = null;
      throw error;
    }
  }

  // Single-flight within the tab: concurrent restores and renewals share one rotation.
  let renewal: Promise<Establishment | null> | null = null;
  const renew = (renewing: boolean) =>
    (renewal ??= exclusive(() => rotate(renewing)).finally(
      () => (renewal = null),
    ));

  const port = {
    accessToken: () =>
      access && deps.now() < access.expiresAtMs ? access.token : null,

    /** Token for a protected request, renewed first when it expires within 30 s. */
    async freshAccessToken(): Promise<string | null> {
      if (!access) return null;
      if (deps.now() < access.expiresAtMs - RENEW_WINDOW_MS)
        return access.token;
      await renew(true).catch(() => null);
      return port.accessToken();
    },

    restore: (): Promise<Establishment | null> => renew(false),

    /** BroadcastChannel dlc-session-v1 message: only {generation, kind} is accepted. */
    remote(message: unknown): ControlKind | null {
      const m = record(message);
      if (!m || Object.keys(m).length !== 2) return null;
      const { generation, kind } = m;
      if (!Number.isSafeInteger(generation) || (generation as number) < 0)
        return null;
      if (kind !== 'established' && kind !== 'cleared') return null;
      return adopt(generation as number, kind);
    },

    /** Storage event for dlc-session-control-v1; invalid data fails closed. */
    remoteRecord(raw: string | null): ControlKind | null {
      const next = parseControl(raw);
      if (!next) {
        access = null;
        return 'cleared';
      }
      return adopt(next.generation, next.blocked ? 'cleared' : 'established');
    },

    /** Protected 401: local access ends now; the block is recorded under the lock. */
    async block(): Promise<void> {
      access = null;
      await exclusive(async () => void end()).catch(() => void end());
    },

    async complete(input: {
      operationId: string;
      body: unknown;
    }): Promise<Establishment> {
      if (input.operationId !== 'AuthLogin')
        throw new AuthError('INVALID_REQUEST');
      access = null;
      return exclusive(async () => {
        const response = await send('POST', '/login', {}, input.body);
        // Generic failure: no account state, eligibility or history is disclosed.
        if (response.status === 401) throw new AuthError('UNAUTHORIZED');
        if (!response.ok) throw new AuthError('SESSION_UNAVAILABLE');
        const est = await install(response);
        // Deliberate sign-in clears the block and invalidates other tabs' tokens.
        seen = Math.max(seen, control.advance('established').generation);
        return est;
      });
    },

    /** Local access ends first; a failed revocation is reported, never claimed. */
    async logout(): Promise<void> {
      access = null;
      await exclusive(async () => {
        // Block and notify other tabs before Auth is asked to revoke.
        end();
        const proof = await csrfProof();
        if (proof === null) return;
        const response = await send('POST', '/logout', {
          'x-csrf-token': proof,
        });
        if (response.status !== 204) throw new AuthError('SESSION_UNAVAILABLE');
      });
    },
  };
  return Object.freeze(port) satisfies AuthPort;
}
