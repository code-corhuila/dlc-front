import assert from 'node:assert/strict';
import test from 'node:test';
import { createHttpClient } from '../../../src/core/http/client.ts';

/** Transport double: records requests and answers with the queued responses. */
function transport(...answers) {
  const calls = [];
  const fetch = (url, init) => {
    calls.push({ url, init });
    const next = answers.shift();
    if (typeof next === 'function') return next(init);
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve(next);
  };
  return { calls, fetch };
}
const reply = (status, body, headers = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
let n = 0;
function client(t, extra = {}) {
  const events = [];
  const http = createHttpClient({
    fetch: t.fetch,
    accessToken: () => 'token-1',
    onUnauthorized: () => events.push('unauthorized'),
    uuid: () => `corr-${++n}`,
    timeoutMs: 30,
    ...extra,
  });
  return { http, events };
}

test('C06: success keeps owner JSON, exposes safe headers and a fresh correlation id', async () => {
  const t = transport(
    reply(
      200,
      { data: [{ totalCents: '18000000' }], meta: { page: 1 } },
      {
        'x-correlation-id': 'corr-srv',
        'set-cookie': 'x=1',
        etag: '"v1"',
      },
    ),
  );
  const { http } = client(t);
  const result = await http.request({
    method: 'GET',
    path: '/api/v1/patients',
    query: { status: ['ACTIVE', 'INACTIVE'], page: ['1'] },
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, {
    data: [{ totalCents: '18000000' }],
    meta: { page: 1 },
  });
  assert.deepEqual(result.headers, {
    etag: '"v1"',
    'x-correlation-id': 'corr-srv',
  });
  const [{ url, init }] = t.calls;
  assert.equal(url, '/api/v1/patients?status=ACTIVE&status=INACTIVE&page=1');
  assert.equal(init.headers.authorization, 'Bearer token-1');
  assert.match(init.headers['x-correlation-id'], /^corr-\d+$/);
  assert.equal(result.correlationId, init.headers['x-correlation-id']);
  assert.equal(init.credentials, 'same-origin');
});

test('C06: caller headers are limited; Idempotency-Key is preserved; body is JSON', async () => {
  const t = transport(reply(201, { id: 'p1' }));
  const { http } = client(t);
  await http.request({
    method: 'POST',
    path: '/api/v1/patients',
    body: { name: 'Paciente sintético' },
    headers: { 'Idempotency-Key': 'intent-123456' },
  });
  const { init } = t.calls[0];
  assert.equal(init.headers['idempotency-key'], 'intent-123456');
  assert.equal(init.headers['content-type'], 'application/json');
  assert.equal(init.body, JSON.stringify({ name: 'Paciente sintético' }));
  const rejected = await http.request({
    method: 'GET',
    path: '/api/v1/patients',
    headers: { Authorization: 'Bearer stolen' },
  });
  assert.equal(rejected.error, 'INVALID_REQUEST');
  assert.equal(rejected.status, 0);
  assert.equal(t.calls.length, 1);
});

test('C06 / FC-13: foreign, internal or malformed targets never reach the network', async () => {
  const t = transport();
  const { http } = client(t);
  for (const path of [
    'https://evil.test/api/v1/x',
    '/internal/v1/x',
    '/api/v1/../x',
    '/api/v2/x',
  ])
    assert.equal(
      (await http.request({ method: 'GET', path })).error,
      'INVALID_REQUEST',
    );
  assert.equal(
    (await http.request({ method: 'TRACE', path: '/api/v1/x' })).error,
    'INVALID_REQUEST',
  );
  assert.equal(t.calls.length, 0);
});

test('C05/C06: protected request without a token fails locally; public sends no bearer', async () => {
  const t = transport(reply(200, { ok: true }));
  const { http } = client(t, { accessToken: () => null });
  const local = await http.request({ method: 'GET', path: '/api/v1/patients' });
  assert.equal(local.error, 'SESSION_UNAVAILABLE');
  assert.equal(local.kind, 'session');
  assert.equal(t.calls.length, 0);
  await http.request({
    method: 'POST',
    path: '/api/v1/auth/login',
    public: true,
    body: {},
  });
  assert.equal(t.calls[0].init.headers.authorization, undefined);
});

test('C06: owner error envelope is kept; the user message comes from the central table', async () => {
  const t = transport(
    reply(409, {
      error: 'INVALID_STATUS_TRANSITION',
      message: 'driver x',
      traceId: 't-9',
      details: ['a'],
    }),
  );
  const { http } = client(t);
  const result = await http.request({
    method: 'POST',
    path: '/api/v1/appointments',
    headers: { 'Idempotency-Key': 'intent-123456' },
  });
  assert.deepEqual(
    { ...result, correlationId: undefined },
    {
      ok: false,
      status: 409,
      error: 'INVALID_STATUS_TRANSITION',
      message: 'Actualiza y revisa el conflicto antes de continuar.',
      details: ['a'],
      traceId: 't-9',
      correlationId: undefined,
      kind: 'http',
      retryable: false,
    },
  );
});

test('C05/C06: protected 401 ends the session; public 401 does not', async () => {
  const t = transport(
    reply(401, { error: 'UNAUTHORIZED', message: 'x', traceId: 't' }),
    reply(401, { error: 'UNAUTHORIZED', message: 'x', traceId: 't' }),
  );
  const { http, events } = client(t);
  const protectedResult = await http.request({
    method: 'GET',
    path: '/api/v1/patients',
  });
  assert.equal(
    protectedResult.message,
    'Tu sesión terminó. Inicia sesión de nuevo.',
  );
  assert.deepEqual(events, ['unauthorized']);
  const publicResult = await http.request({
    method: 'POST',
    path: '/api/v1/auth/login',
    public: true,
  });
  assert.equal(publicResult.message, 'No se pudo completar la autenticación.');
  assert.deepEqual(events, ['unauthorized']);
});

test('C06: malformed envelope → INVALID_RESPONSE with the real status; traceId falls back', async () => {
  const t = transport(new Response('<html>', { status: 502 }));
  const { http } = client(t);
  const result = await http.request({
    method: 'GET',
    path: '/api/v1/patients',
  });
  assert.equal(result.error, 'INVALID_RESPONSE');
  assert.equal(result.status, 502);
  assert.equal(result.kind, 'contract');
  assert.equal(result.traceId, result.correlationId);
});

test('C06 / FC-14: timeout, network and cancel map to local codes with status 0', async () => {
  const hang = (init) =>
    new Promise((_, reject) =>
      init.signal.addEventListener('abort', () => reject(init.signal.reason)),
    );
  const t = transport(hang, new TypeError('offline'), hang, hang);
  const { http } = client(t);
  const timeout = await http.request({
    method: 'GET',
    path: '/api/v1/patients',
  });
  assert.deepEqual(
    [timeout.error, timeout.status, timeout.kind, timeout.retryable],
    ['TIMEOUT', 0, 'timeout', true],
  );
  const network = await http.request({
    method: 'GET',
    path: '/api/v1/patients',
  });
  assert.deepEqual(
    [network.error, network.kind, network.retryable],
    ['NETWORK_ERROR', 'network', true],
  );
  const write = await http.request({
    method: 'POST',
    path: '/api/v1/patients',
    headers: { 'Idempotency-Key': 'intent-123456' },
  });
  assert.equal(write.retryable, false);
  const controller = new AbortController();
  const pending = http.request({
    method: 'GET',
    path: '/api/v1/patients',
    signal: controller.signal,
  });
  controller.abort();
  const cancelled = await pending;
  assert.deepEqual(
    [cancelled.error, cancelled.kind, cancelled.message],
    ['CANCELLED', 'cancelled', ''],
  );
  assert.notEqual(
    t.calls[0].init.headers['x-correlation-id'],
    t.calls[1].init.headers['x-correlation-id'],
  );
});

test('C06: 204 and responseType none return null; blob returns a Blob', async () => {
  const t = transport(
    new Response(null, { status: 204 }),
    new Response('pdf', {
      status: 200,
      headers: { 'content-type': 'application/pdf' },
    }),
  );
  const { http } = client(t);
  assert.equal(
    (await http.request({ method: 'DELETE', path: '/api/v1/x/1' })).data,
    null,
  );
  const blob = await http.request({
    method: 'GET',
    path: '/api/v1/invoices/1/pdf',
    responseType: 'blob',
  });
  assert.ok(blob.data instanceof Blob);
});
