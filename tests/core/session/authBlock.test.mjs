import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthAdapter } from '../../../src/core/session/authAdapter.ts';
import { createSessionControl } from '../../../src/core/session/sessionControl.ts';
import { channel, memoryStorage } from './controlDoubles.mjs';

const ISSUER = 'https://auth.dilucca.test';
const AUDIENCE = 'dlc-api';
const NOW = Date.parse('2026-11-06T12:00:00.000Z');
const USER = { id: 'u-1', name: 'Dra. Valentina Ruiz', roles: ['DENTIST'] };
const KEY = 'dlc-session-control-v1';

const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
const TOKEN = `${b64({ alg: 'RS256' })}.${b64({
  sub: USER.id,
  iss: ISSUER,
  aud: AUDIENCE,
  exp: Math.floor(NOW / 1000) + 3600,
  permissions: [],
})}.sig`;
const json = (status, body) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
const TOKENS = { accessToken: TOKEN, expiresIn: 3600, user: USER };

function setup(routes, { record, clock = { now: NOW } } = {}) {
  const storage = memoryStorage(record);
  const bus = channel();
  const calls = [];
  const ended = [];
  const port = createAuthAdapter({
    fetch: async (url, init) => {
      const key = `${init.method} ${url}`;
      calls.push({ key, record: storage.items.get(KEY) });
      const route = routes[key];
      if (!route) throw new Error(`unexpected ${key}`);
      return typeof route === 'function' ? route() : route.clone();
    },
    uuid: () => crypto.randomUUID(),
    now: () => clock.now,
    issuer: ISSUER,
    audience: AUDIENCE,
    locks: { request: (_n, _o, callback) => callback() },
    control: createSessionControl({ storage, channel: bus }),
    onSessionEnded: (reason) => ended.push(reason),
  });
  const stored = () => JSON.parse(storage.items.get(KEY) ?? 'null');
  return { port, calls, bus, ended, stored, storage, clock };
}

const CSRF = { 'GET /api/v1/auth/csrf': json(200, { csrfToken: 'p' }) };
const REFRESH = { 'POST /api/v1/auth/refresh': json(200, TOKENS) };

test('FC-11: a blocked marker suppresses automatic restoration without network', async () => {
  const { port, calls } = setup(
    { ...CSRF, ...REFRESH },
    { record: '{"generation":3,"blocked":true}' },
  );
  assert.equal(await port.restore(), null);
  assert.deepEqual(calls, []);
});

test('FC-11: invalid local control data fails closed until sign-in', async () => {
  const { port, calls } = setup(
    { ...CSRF, ...REFRESH },
    { record: '{"generation":"x"}' },
  );
  assert.equal(await port.restore(), null);
  assert.deepEqual(calls, []);
});

test('FC-11: successful login clears the block, advances generation and announces it without tokens', async () => {
  const { port, bus, stored } = setup(
    { 'POST /api/v1/auth/login': json(200, TOKENS) },
    { record: '{"generation":3,"blocked":true}' },
  );
  await port.complete({ operationId: 'AuthLogin', body: {} });
  assert.deepEqual(stored(), { generation: 4, blocked: false });
  assert.deepEqual(bus.sent, [{ generation: 4, kind: 'established' }]);
});

test('FC-11: failed login keeps the block', async () => {
  const { port, bus, stored } = setup(
    {
      'POST /api/v1/auth/login': json(401, {
        error: 'UNAUTHORIZED',
        message: 'x',
      }),
    },
    { record: '{"generation":3,"blocked":true}' },
  );
  await assert.rejects(port.complete({ operationId: 'AuthLogin', body: {} }));
  assert.deepEqual(stored(), { generation: 3, blocked: true });
  assert.deepEqual(bus.sent, []);
});

test('FC-11: logout blocks and notifies other tabs before calling Auth', async () => {
  const { port, calls, bus } = setup({
    ...CSRF,
    'POST /api/v1/auth/logout': json(204),
  });
  await port.logout();
  assert.deepEqual(bus.sent, [{ generation: 1, kind: 'cleared' }]);
  for (const call of calls)
    assert.equal(call.record, '{"generation":1,"blocked":true}');
});

test('FC-11: logout outage keeps the block across reloads', async () => {
  const { port, stored } = setup({
    ...CSRF,
    'POST /api/v1/auth/logout': json(503, {
      error: 'SERVICE_UNAVAILABLE',
      message: 'x',
    }),
  });
  await assert.rejects(port.logout(), { code: 'SESSION_UNAVAILABLE' });
  assert.deepEqual(stored(), { generation: 1, blocked: true });
});

test('FC-11: a protected 401 ends the session and blocks automatic restoration', async () => {
  const { port, bus, stored } = setup({ ...CSRF, ...REFRESH });
  await port.restore();
  await port.block();
  assert.equal(port.accessToken(), null);
  assert.deepEqual(stored(), { generation: 1, blocked: true });
  assert.deepEqual(bus.sent, [{ generation: 1, kind: 'cleared' }]);
});

test('FC-11: renewal 401 ends the session, blocks it and is never replayed', async () => {
  let refreshes = 0;
  const clock = { now: NOW };
  const { port, ended, stored } = setup(
    {
      ...CSRF,
      'POST /api/v1/auth/refresh': () =>
        ++refreshes === 1 ? json(200, TOKENS) : json(401, {}),
    },
    { clock },
  );
  await port.restore();
  clock.now += (3600 - 10) * 1000;
  assert.equal(await port.freshAccessToken(), null);
  assert.deepEqual(ended, ['UNAUTHORIZED']);
  assert.deepEqual(stored(), { generation: 1, blocked: true });
  assert.equal(await port.freshAccessToken(), null);
  assert.equal(refreshes, 2);
});

test('FC-12: a rotation that finishes after another tab advanced the generation is discarded', async () => {
  const { port, storage } = setup({
    ...CSRF,
    'POST /api/v1/auth/refresh': () => {
      storage.items.set(KEY, '{"generation":7,"blocked":true}');
      return json(200, TOKENS);
    },
  });
  assert.equal(await port.restore(), null);
  assert.equal(port.accessToken(), null);
});

test('FC-12: renewal is not attempted once another tab blocked the session', async () => {
  const clock = { now: NOW };
  const { port, calls, storage } = setup({ ...CSRF, ...REFRESH }, { clock });
  await port.restore();
  storage.items.set(KEY, '{"generation":2,"blocked":true}');
  clock.now += (3600 - 10) * 1000;
  const before = calls.length;
  assert.equal(await port.freshAccessToken(), null);
  assert.equal(calls.length, before);
});
