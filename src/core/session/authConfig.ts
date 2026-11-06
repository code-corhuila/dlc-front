/**
 * C05 deployment data for the real Auth adapter: the issuer and audience that Tokens must
 * carry. Absent data keeps the local preview on its development double; present but
 * malformed or unreachable data fails closed, never falling back to the double.
 */
export type AuthConfig =
  | Readonly<{ status: 'configured'; issuer: string; audience: string }>
  | Readonly<{ status: 'absent' | 'invalid' }>;

const AUTH_CONFIG_URL = '/auth-config.json';
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
