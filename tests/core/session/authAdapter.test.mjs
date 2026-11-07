import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthAdapter } from '../../../src/core/session/authAdapter.ts';

const ISSUER = 'https://auth.dilucca.test';
const AUDIENCE = 'dlc-api';
const NOW = Date.parse('2026-11-05T12:00:00.000Z');
const USER = {
  id: '10000000-0000-4000-8000-000000000002',
  email: 'odontologo@demo.test',
  name: 'Dra. Valentina Ruiz',
  roles: ['DENTIST'],
};

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
/** Unsigned test JWT: the browser only reads claims; owners verify signatures. */
function jwt(overrides = {}) {
  const claims = {
    sub: USER.id,
    iss: ISSUER,
    aud: AUDIENCE,
    exp: Math.floor(NOW / 1000) + 3600,
    roles: ['DENTIST'],
    permissions: ['clinical:read'],
    ...overrides,
  };
  return `${b64({ alg: 'RS256', kid: 'k1' })}.${b64(claims)}.signature`;
}
const tokens = (claims, extra = {}) => ({
  accessToken: jwt(claims),
  expiresIn: 3600,
  user: USER,
  ...extra,
});

const json = (status, body) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/** Scripted same-origin transport keyed by "METHOD path". */
function transport(routes) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const key = `${init.method ?? 'GET'} ${url}`;
    calls.push({ key, init });
    const route = routes[key];
    if (!route) throw new Error(`unexpected ${key}`);
    return typeof route === 'function' ? route(init) : route.clone();
  };
  return { calls, fetch };
}

function adapter(routes, options = {}) {
  const net = transport(routes);
  let n = 0;
  let clock = NOW;
  const port = createAuthAdapter({
    fetch: net.fetch,
    uuid: () => `corr-${++n}`,
    now: () => clock,
    issuer: ISSUER,
    audience: AUDIENCE,
    // Single-tab tests: an uncontended lock grants immediately.
    locks: { request: (_name, _options, callback) => callback() },
    ...options,
  });
  return { port, net, advance: (ms) => (clock += ms) };
}

const header = (call, name) => new Headers(call.init.headers).get(name);
const CSRF = { 'GET /api/v1/auth/csrf': json(200, { csrfToken: 'proof-1' }) };

test('C05: restore reads CSRF proof, then refreshes with it over same-origin cookies', async () => {
  const { port, net } = adapter({
    ...CSRF,
    'POST /api/v1/auth/refresh': json(200, tokens()),
  });
  const est = await port.restore();
  assert.deepEqual(
    net.calls.map((c) => c.key),
    ['GET /api/v1/auth/csrf', 'POST /api/v1/auth/refresh'],
  );
  const [csrf, refresh] = net.calls;
  assert.equal(header(refresh, 'x-csrf-token'), 'proof-1');
  assert.equal(header(csrf, 'authorization'), null);
  assert.equal(header(refresh, 'authorization'), null);
  for (const call of net.calls) {
    assert.equal(call.init.credentials, 'same-origin');
    assert.equal(call.init.cache, 'no-store');
  }
  assert.deepEqual(est, {
    user: { id: USER.id, name: USER.name, roles: ['DENTIST'] },
    permissions: ['clinical:read'],
    expiresAt: '2026-11-05T13:00:00.000Z',
  });
  assert.equal(port.accessToken(), tokens().accessToken);
});

test('C06: every Auth attempt carries a fresh X-Correlation-Id', async () => {
  const { port, net } = adapter({
    ...CSRF,
    'POST /api/v1/auth/refresh': json(200, tokens()),
  });
  await port.restore();
  assert.deepEqual(
    net.calls.map((c) => header(c, 'x-correlation-id')),
    ['corr-1', 'corr-2'],
  );
});

test('C05: restore without an eligible cookie resolves anonymous (null) and never refreshes', async () => {
  const { port, net } = adapter({
    'GET /api/v1/auth/csrf': json(401, { error: 'UNAUTHORIZED', message: 'x' }),
  });
  assert.equal(await port.restore(), null);
  assert.equal(net.calls.length, 1);
  assert.equal(port.accessToken(), null);
});

test('C05: refresh 401 resolves anonymous without disclosing account state', async () => {
  const { port } = adapter({
    ...CSRF,
    'POST /api/v1/auth/refresh': json(401, {
      error: 'UNAUTHORIZED',
      message: 'x',
    }),
  });
  assert.equal(await port.restore(), null);
  assert.equal(port.accessToken(), null);
});

test('C05: refresh 403 or transport failure makes the session unavailable', async () => {
  for (const refresh of [
    json(403, { error: 'FORBIDDEN', message: 'x' }),
    () => Promise.reject(new TypeError('offline')),
  ]) {
    const { port } = adapter({ ...CSRF, 'POST /api/v1/auth/refresh': refresh });
    await assert.rejects(port.restore(), { code: 'SESSION_UNAVAILABLE' });
    assert.equal(port.accessToken(), null);
  }
});

test('C05: malformed or mismatched Tokens are rejected as INVALID_RESPONSE', async () => {
  const bad = [
    tokens({ sub: 'someone-else' }),
    tokens({ iss: 'https://evil.test' }),
    tokens({ aud: 'other-api' }),
    tokens({ permissions: undefined }),
    tokens({ exp: 'soon' }),
    tokens({}, { accessToken: 'not-a-jwt' }),
    tokens({}, { user: { ...USER, roles: 'DENTIST' } }),
    { accessToken: jwt(), user: USER },
  ];
  for (const body of bad) {
    const { port } = adapter({
      ...CSRF,
      'POST /api/v1/auth/refresh': json(200, body),
    });
    await assert.rejects(port.restore(), { code: 'INVALID_RESPONSE' });
    assert.equal(port.accessToken(), null);
  }
});

test('C05: audience may be a list containing the configured audience', async () => {
  const { port } = adapter({
    ...CSRF,
    'POST /api/v1/auth/refresh': json(200, tokens({ aud: ['x', AUDIENCE] })),
  });
  assert.ok(await port.restore());
});

test('C05: expiresAt is the earlier of JWT exp and receipt plus expiresIn', async () => {
  const exp = Math.floor(NOW / 1000) + 600;
  const { port } = adapter({
    ...CSRF,
    'POST /api/v1/auth/refresh': json(200, tokens({ exp })),
  });
  const est = await port.restore();
  assert.equal(est.expiresAt, '2026-11-05T12:10:00.000Z');
});

test('C05: an expired access token is never handed to the HTTP client', async () => {
  const { port, advance } = adapter({
    ...CSRF,
    'POST /api/v1/auth/refresh': json(200, tokens()),
  });
  await port.restore();
  advance(3600 * 1000);
  assert.equal(port.accessToken(), null);
});

test('C05: AuthLogin posts the IAM body unchanged and installs Tokens privately', async () => {
  const { port, net } = adapter({
    'POST /api/v1/auth/login': json(200, tokens()),
  });
  const body = { email: USER.email, password: 'S3cret!' };
  const est = await port.complete({ operationId: 'AuthLogin', body });
  const [login] = net.calls;
  assert.deepEqual(JSON.parse(login.init.body), body);
  assert.equal(header(login, 'content-type'), 'application/json');
  assert.equal(header(login, 'authorization'), null);
  assert.equal(login.init.credentials, 'same-origin');
  assert.equal(est.user.id, USER.id);
  assert.equal(JSON.stringify(est).includes('accessToken'), false);
  assert.equal(port.accessToken(), tokens().accessToken);
});

test('C05: public login 401 is a generic failure that creates no session', async () => {
  const { port } = adapter({
    'POST /api/v1/auth/login': json(401, {
      error: 'UNAUTHORIZED',
      message: 'x',
    }),
  });
  await assert.rejects(port.complete({ operationId: 'AuthLogin', body: {} }), {
    code: 'UNAUTHORIZED',
  });
  assert.equal(port.accessToken(), null);
});

test('C05: only AuthLogin completes a session', async () => {
  const { port, net } = adapter({});
  await assert.rejects(
    port.complete({ operationId: 'AuthRotaterefreshtoken', body: {} }),
    { code: 'INVALID_REQUEST' },
  );
  assert.equal(net.calls.length, 0);
});

test('C05: logout drops the access token before revoking with fresh CSRF proof', async () => {
  let tokenDuringLogout = 'unset';
  const { port, net } = adapter({
    ...CSRF,
    'POST /api/v1/auth/refresh': json(200, tokens()),
    'POST /api/v1/auth/logout': () => {
      tokenDuringLogout = port.accessToken();
      return json(204);
    },
  });
  await port.restore();
  await port.logout();
  assert.equal(tokenDuringLogout, null);
  const logout = net.calls.at(-1);
  assert.equal(net.calls.at(-2).key, 'GET /api/v1/auth/csrf');
  assert.equal(header(logout, 'x-csrf-token'), 'proof-1');
  assert.equal(header(logout, 'content-type'), 'application/json');
  assert.equal(logout.init.body, '{}');
  assert.equal(header(logout, 'authorization'), null);
  assert.equal(logout.init.credentials, 'same-origin');
});

test('C05: unconfirmed server logout is reported, never claimed', async () => {
  const { port } = adapter({
    ...CSRF,
    'POST /api/v1/auth/logout': json(503, {
      error: 'SERVICE_UNAVAILABLE',
      message: 'x',
    }),
  });
  await assert.rejects(port.logout(), { code: 'SESSION_UNAVAILABLE' });
  assert.equal(port.accessToken(), null);
});

test('C06: an Auth attempt that exceeds its deadline fails closed', async () => {
  const { port } = adapter(
    {
      'GET /api/v1/auth/csrf': (init) =>
        new Promise((_, reject) =>
          init.signal.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          ),
        ),
    },
    { timeoutMs: 20 },
  );
  await assert.rejects(port.restore(), { code: 'SESSION_UNAVAILABLE' });
  assert.equal(port.accessToken(), null);
});
