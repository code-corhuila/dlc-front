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
  timeoutMs?: number;
}>;

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

  const port = {
    accessToken: () =>
      access && deps.now() < access.expiresAtMs ? access.token : null,

    async restore(): Promise<Establishment | null> {
      access = null;
      const proof = await csrfProof();
      if (proof === null) return null;
      const response = await send('POST', '/refresh', {
        'x-csrf-token': proof,
      });
      if (response.status === 401) return null;
      if (!response.ok) throw new AuthError('SESSION_UNAVAILABLE');
      return install(response);
    },

    async complete(input: {
      operationId: string;
      body: unknown;
    }): Promise<Establishment> {
      if (input.operationId !== 'AuthLogin')
        throw new AuthError('INVALID_REQUEST');
      access = null;
      const response = await send('POST', '/login', {}, input.body);
      // Generic failure: no account state, eligibility or history is disclosed.
      if (response.status === 401) throw new AuthError('UNAUTHORIZED');
      if (!response.ok) throw new AuthError('SESSION_UNAVAILABLE');
      return install(response);
    },

    /** Local access ends first; a failed revocation is reported, never claimed. */
    async logout(): Promise<void> {
      access = null;
      const proof = await csrfProof();
      if (proof === null) return;
      const response = await send('POST', '/logout', { 'x-csrf-token': proof });
      if (response.status !== 204) throw new AuthError('SESSION_UNAVAILABLE');
    },
  };
  return Object.freeze(port) satisfies AuthPort;
}
