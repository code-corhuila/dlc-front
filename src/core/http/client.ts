import { userMessage } from './messages.ts';
import { validateRequestTarget } from './requestTarget.ts';

export type HttpRequest = Readonly<{
  method: string;
  path: string;
  query?: Readonly<Record<string, readonly string[]>>;
  body?: unknown;
  headers?: Readonly<Record<string, string>>;
  responseType?: 'json' | 'blob' | 'none';
  signal?: AbortSignal;
  /** Security-empty operation: no Bearer token (set from the operation catalogue). */
  public?: boolean;
}>;

export type HttpSuccess = Readonly<{
  ok: true;
  status: number;
  data: unknown;
  headers: Readonly<Record<string, string>>;
  correlationId: string;
}>;

export type HttpFailure = Readonly<{
  ok: false;
  status: number;
  error: string;
  message: string;
  details: unknown;
  traceId: string;
  correlationId: string;
  kind: 'http' | 'network' | 'timeout' | 'cancelled' | 'contract' | 'session';
  retryable: boolean;
}>;

export type HttpResult = HttpSuccess | HttpFailure;

export type HttpClientDeps = Readonly<{
  fetch: (
    url: string,
    init: RequestInit & { headers: Record<string, string> },
  ) => Promise<Response>;
  /** Private access token held by the session adapter; never handed to portals. */
  accessToken: () => string | null;
  /** C05: a protected 401 ends the browser session. */
  onUnauthorized: () => void;
  uuid: () => string;
  timeoutMs?: number;
}>;

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const EXPOSED = [
  'content-type',
  'location',
  'etag',
  'retry-after',
  'x-correlation-id',
];

function toUrl(path: string, query: HttpRequest['query']) {
  const params = new URLSearchParams();
  for (const [key, values] of Object.entries(query ?? {}))
    for (const value of values) params.append(key, value);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

const isEnvelope = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as Record<string, unknown>).error === 'string' &&
  typeof (v as Record<string, unknown>).message === 'string';

/** C06 shared HTTP capability: the only transport to the same-origin Gateway. */
export function createHttpClient(deps: HttpClientDeps) {
  const timeoutMs = deps.timeoutMs ?? 10000;

  async function request(input: HttpRequest): Promise<HttpResult> {
    const correlationId = deps.uuid();
    const isPublic = input.public === true;
    const method = String(input.method).toUpperCase();
    const fail = (
      status: number,
      error: string,
      kind: HttpFailure['kind'],
      extra: { details?: unknown; traceId?: string } = {},
    ): HttpFailure => ({
      ok: false,
      status,
      error,
      message: userMessage(status, error, isPublic),
      details: extra.details ?? null,
      traceId: extra.traceId ?? correlationId,
      correlationId,
      kind,
      // Only reads may be offered again; writes are never replayed blindly.
      retryable:
        method === 'GET' &&
        (kind === 'network' ||
          kind === 'timeout' ||
          status === 429 ||
          status >= 500),
    });

    const target = validateRequestTarget({
      path: input.path,
      headers: input.headers,
    });
    if (!target.ok || !METHODS.has(method))
      return fail(0, 'INVALID_REQUEST', 'contract');
    const token = isPublic ? null : deps.accessToken();
    if (!isPublic && !token) return fail(0, 'SESSION_UNAVAILABLE', 'session');

    const headers: Record<string, string> = {
      accept: 'application/json',
      ...target.target.headers,
      'x-correlation-id': correlationId,
    };
    if (token) headers.authorization = `Bearer ${token}`;
    let body: string | undefined;
    if (input.body !== undefined) {
      body = JSON.stringify(input.body);
      headers['content-type'] = 'application/json';
    }

    const deadline = AbortSignal.timeout(timeoutMs);
    const signals = input.signal ? [input.signal, deadline] : [deadline];
    let response: Response;
    try {
      response = await deps.fetch(toUrl(target.target.path, input.query), {
        method,
        headers,
        ...(body === undefined ? {} : { body }),
        credentials: 'same-origin',
        signal: AbortSignal.any(signals),
      });
    } catch {
      if (input.signal?.aborted) return fail(0, 'CANCELLED', 'cancelled');
      if (deadline.aborted) return fail(0, 'TIMEOUT', 'timeout');
      return fail(0, 'NETWORK_ERROR', 'network');
    }
    if (input.signal?.aborted) return fail(0, 'CANCELLED', 'cancelled');

    const exposed: Record<string, string> = {};
    for (const name of EXPOSED) {
      const value = response.headers.get(name);
      if (value !== null && name !== 'content-type') exposed[name] = value;
    }

    if (response.ok) {
      let data: unknown = null;
      try {
        if (response.status !== 204 && input.responseType !== 'none')
          data =
            input.responseType === 'blob'
              ? await response.blob()
              : await response.json();
      } catch {
        return fail(response.status, 'INVALID_RESPONSE', 'contract');
      }
      return {
        ok: true,
        status: response.status,
        data,
        headers: exposed,
        correlationId,
      };
    }

    if (response.status === 401 && !isPublic) deps.onUnauthorized();
    const envelope: unknown = await response.json().catch(() => null);
    if (!isEnvelope(envelope))
      return fail(response.status, 'INVALID_RESPONSE', 'contract');
    return fail(response.status, envelope.error as string, 'http', {
      details: envelope.details ?? null,
      ...(typeof envelope.traceId === 'string'
        ? { traceId: envelope.traceId }
        : {}),
    });
  }

  return { request };
}
