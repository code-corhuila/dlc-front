import type { AuthPort } from './session.ts';

/**
 * C05 deployment data for the real Auth adapter: the issuer and audience that Tokens must
 * carry. Absent, malformed or unreachable data fails closed: there is no development double.
 */
export type AuthConfig =
  | Readonly<{ status: 'configured'; issuer: string; audience: string }>
  | Readonly<{ status: 'absent' | 'invalid' }>;

const AUTH_CONFIG_URL = '/auth-config.json';

/** Session port for a deployment without valid Auth data: always unavailable. */
export const UNCONFIGURED_AUTH: AuthPort = Object.freeze({
  restore: () => Promise.reject(new Error('AUTH_NOT_CONFIGURED')),
  complete: () => Promise.reject(new Error('AUTH_NOT_CONFIGURED')),
  logout: () => Promise.resolve(),
});
const INVALID: AuthConfig = { status: 'invalid' };
const text = (v: unknown): v is string => typeof v === 'string' && v !== '';

export async function loadAuthConfig(deps: {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  timeoutMs?: number;
}): Promise<AuthConfig> {
  try {
    const response = await deps.fetch(AUTH_CONFIG_URL, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(deps.timeoutMs ?? 10_000),
    });
    if (response.status === 404) return { status: 'absent' };
    if (!response.ok) return INVALID;
    const raw: unknown = await response.json();
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
      return INVALID;
    const { issuer, audience, ...rest } = raw as Record<string, unknown>;
    if (!text(issuer) || !text(audience) || Object.keys(rest).length > 0)
      return INVALID;
    return { status: 'configured', issuer, audience };
  } catch {
    return INVALID;
  }
}
