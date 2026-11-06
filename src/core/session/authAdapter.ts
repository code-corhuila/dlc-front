import type { AuthPort, Establishment } from './session.ts';

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
  timeoutMs?: number;
  lockTimeoutMs?: number;
}>;

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

  /** CSRF proof, then rotation; the access token survives only a successful rotation. */
  async function rotate(): Promise<Establishment | null> {
    try {
      const proof = await csrfProof();
      if (proof === null) return (access = null);
      const response = await send('POST', '/refresh', {
        'x-csrf-token': proof,
      });
      if (response.status === 401) return (access = null);
      if (!response.ok) throw new AuthError('SESSION_UNAVAILABLE');
      return await install(response);
    } catch (error) {
      access = null;
      throw error;
    }
  }

  // Single-flight within the tab: concurrent restores and renewals share one rotation.
  let renewal: Promise<Establishment | null> | null = null;
  const renew = () =>
    (renewal ??= exclusive(rotate).finally(() => (renewal = null)));

  const port = {
    accessToken: () =>
      access && deps.now() < access.expiresAtMs ? access.token : null,

    /** Token for a protected request, renewed first when it expires within 30 s. */
    async freshAccessToken(): Promise<string | null> {
      if (!access) return null;
      if (deps.now() < access.expiresAtMs - RENEW_WINDOW_MS)
        return access.token;
      await renew().catch(() => null);
      return port.accessToken();
    },

    restore: (): Promise<Establishment | null> => renew(),

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
        return install(response);
      });
    },

    /** Local access ends first; a failed revocation is reported, never claimed. */
    async logout(): Promise<void> {
      access = null;
      await exclusive(async () => {
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
