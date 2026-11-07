import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthAdapter } from '../../../src/core/session/authAdapter.ts';

const ISSUER = 'https://auth.dilucca.test';
const AUDIENCE = 'dlc-api';
const NOW = Date.parse('2026-11-06T12:00:00.000Z');
const USER = { id: 'u-1', name: 'Dra. Valentina Ruiz', roles: ['DENTIST'] };

const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
const jwt = (n, exp = Math.floor(NOW / 1000) + 3600) =>
  `${b64({ alg: 'RS256' })}.${b64({
    sub: USER.id,
    iss: ISSUER,
    aud: AUDIENCE,
    exp,
    jti: `t${n}`,
    permissions: [],
  })}.sig`;
const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
const tick = () => new Promise((r) => setTimeout(r, 0));

/** Web Locks double: one exclusive holder per name; waiting honors the abort signal. */
function lockManager() {
  const queues = new Map();
  const requests = [];
  return {
    requests,
    request(name, options, callback) {
      requests.push({ name, mode: options.mode });
      const tail = queues.get(name) ?? Promise.resolve();
      const run = new Promise((resolve, reject) => {
        const onAbort = () => reject(new DOMException('aborted', 'AbortError'));
        options.signal?.addEventListener('abort', onAbort, { once: true });
        tail.then(() => {
          if (options.signal?.aborted) return;
          options.signal?.removeEventListener('abort', onAbort);
          callback().then(resolve, reject);
        });
      });
      queues.set(
        name,
        run.catch(() => {}),
      );
      return run;
    },
  };
}

/** Shared Auth server: counts refreshes in flight to prove they never overlap. */
function server({ refreshDelay = 5, exp } = {}) {
  const stats = { refreshes: 0, inFlight: 0, maxInFlight: 0 };
  const fetch = async (url) => {
    if (url.endsWith('/csrf')) return json(200, { csrfToken: 'proof' });
    if (url.endsWith('/refresh')) {
      stats.inFlight += 1;
      stats.maxInFlight = Math.max(stats.maxInFlight, stats.inFlight);
      await new Promise((r) => setTimeout(r, refreshDelay));
      stats.inFlight -= 1;
      stats.refreshes += 1;
      return json(200, {
        accessToken: jwt(stats.refreshes, exp),
        expiresIn: 3600,
        user: USER,
      });
    }
    throw new Error(`unexpected ${url}`);
  };
  return { stats, fetch };
}

function tab(srv, locks, clock = { now: NOW }, extra = {}) {
  return createAuthAdapter({
    fetch: srv.fetch,
    uuid: () => crypto.randomUUID(),
    now: () => clock.now,
    issuer: ISSUER,
    audience: AUDIENCE,
    locks,
    ...extra,
  });
}

test('FC-10: cookie operations take the exclusive Web Lock dlc-auth-v1', async () => {
  const locks = lockManager();
  await tab(server(), locks).restore();
  assert.deepEqual(locks.requests, [
    { name: 'dlc-auth-v1', mode: 'exclusive' },
  ]);
});

test('FC-10: two tabs restoring after reload never refresh concurrently', async () => {
  const srv = server();
  const locks = lockManager();
  const [a, b] = [tab(srv, locks), tab(srv, locks)];
  const [ea, eb] = await Promise.all([a.restore(), b.restore()]);
  assert.equal(srv.stats.refreshes, 2);
  assert.equal(srv.stats.maxInFlight, 1);
  assert.ok(ea && eb);
  assert.notEqual(a.accessToken(), b.accessToken());
});

test('FC-10: concurrent restores inside one tab share a single refresh', async () => {
  const srv = server();
  const port = tab(srv, lockManager());
  const [x, y] = await Promise.all([port.restore(), port.restore()]);
  assert.equal(srv.stats.refreshes, 1);
  assert.deepEqual(x, y);
});

test('FC-10: lock wait beyond 10 s fails closed before any network attempt', async () => {
  const srv = server();
  const calls = [];
  const port = tab(
    { fetch: (u, i) => (calls.push(u), srv.fetch(u, i)) },
    {
      request: (_name, options) =>
        new Promise((_, reject) =>
          options.signal.addEventListener('abort', () =>
            reject(new DOMException('timeout', 'TimeoutError')),
          ),
        ),
    },
    undefined,
    { lockTimeoutMs: 15 },
  );
  await assert.rejects(port.restore(), { code: 'SESSION_UNAVAILABLE' });
  assert.deepEqual(calls, []);
});

test('FC-10: a token valid beyond 30 s is used without renewal', async () => {
  const srv = server();
  const clock = { now: NOW };
  const port = tab(srv, lockManager(), clock);
  await port.restore();
  clock.now += (3600 - 31) * 1000;
  assert.equal(await port.freshAccessToken(), jwt(1));
  assert.equal(srv.stats.refreshes, 1);
});

test('FC-10: a token expiring within 30 s is renewed once before protected requests', async () => {
  const srv = server();
  const clock = { now: NOW };
  const port = tab(srv, lockManager(), clock);
  await port.restore();
  clock.now += (3600 - 20) * 1000;
  const tokens = await Promise.all([
    port.freshAccessToken(),
    port.freshAccessToken(),
    port.freshAccessToken(),
  ]);
  assert.equal(srv.stats.refreshes, 2);
  assert.deepEqual(tokens, [jwt(2), jwt(2), jwt(2)]);
});

test('FC-10: without a session no renewal is attempted', async () => {
  const srv = server();
  const port = tab(srv, lockManager());
  assert.equal(await port.freshAccessToken(), null);
  await tick();
  assert.equal(srv.stats.refreshes, 0);
});

test('FC-10: a failed renewal yields no token instead of an expiring one', async () => {
  const clock = { now: NOW };
  let fail = false;
  const srv = server();
  const port = tab(
    {
      fetch: (u, i) =>
        fail && u.endsWith('/refresh') ? json(401, {}) : srv.fetch(u, i),
    },
    lockManager(),
    clock,
  );
  await port.restore();
  fail = true;
  clock.now += (3600 - 10) * 1000;
  assert.equal(await port.freshAccessToken(), null);
  assert.equal(port.accessToken(), null);
});
