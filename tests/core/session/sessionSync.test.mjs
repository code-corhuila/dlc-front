import assert from 'node:assert/strict';
import test from 'node:test';
import { createSession } from '../../../src/core/session/session.ts';
import { createAuthAdapter } from '../../../src/core/session/authAdapter.ts';
import { createSessionControl } from '../../../src/core/session/sessionControl.ts';
import { channel, memoryStorage } from './controlDoubles.mjs';

const NOW = Date.parse('2026-11-06T12:00:00.000Z');
const est = (minutes, id = 'u-1') => ({
  user: { id, name: 'Dra. Valentina Ruiz', roles: ['DENTIST'] },
  permissions: [],
  expiresAt: new Date(NOW + minutes * 60_000).toISOString(),
});

/** Manual clock and timers for the C05 expiry safeguard. */
function clock() {
  const timers = new Map();
  let id = 0;
  let time = NOW;
  const c = {
    now: () => time,
    setTimer: (fn, ms) => (timers.set(++id, { fn, at: time + ms }), id),
    clearTimer: (t) => void timers.delete(t),
    advance(ms) {
      time += ms;
      for (const [t, timer] of [...timers])
        if (timer.at <= time) {
          timers.delete(t);
          timer.fn();
        }
    },
  };
  return c;
}

const authWith = (restored) => ({
  restore: async () => restored,
  complete: async () => restored,
  logout: async () => {},
});

test('FC-11: at expiry identity is cleared and the session is expired', async () => {
  const c = clock();
  const session = createSession(authWith(est(60)), { expiry: c });
  await session.start();
  c.advance(59 * 60_000);
  assert.equal(session.getSnapshot().state, 'authenticated');
  c.advance(60_000);
  const s = session.getSnapshot();
  assert.deepEqual(
    [s.state, s.reason, s.user, s.expiresAt],
    ['expired', 'EXPIRED', null, null],
  );
});

test('FC-11: a renewal extends expiry without a new generation or identity change', async () => {
  const c = clock();
  const session = createSession(authWith(est(60)), { expiry: c });
  await session.start();
  c.advance(59 * 60_000);
  session.renewed(est(120));
  assert.equal(session.getSnapshot().expiresAt, est(120).expiresAt);
  c.advance(10 * 60_000);
  assert.equal(session.getSnapshot().state, 'authenticated');
});

test('FC-12: a renewal for another user or after the session ended is ignored', async () => {
  const session = createSession(authWith(est(60)));
  await session.start();
  const before = session.getSnapshot();
  session.renewed(est(120, 'u-2'));
  assert.equal(session.getSnapshot(), before);
  session.invalidate('LOGOUT');
  session.renewed(est(120));
  const s = session.getSnapshot();
  assert.deepEqual([s.state, s.reason, s.user], ['anonymous', 'LOGOUT', null]);
});

const ISSUER = 'https://auth.dilucca.test';
const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
const token = (exp) =>
  `${b64({})}.${b64({ sub: 'u-1', iss: ISSUER, aud: 'dlc-api', exp, permissions: [] })}.s`;
const json = (body) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

function adapter(extra = {}) {
  const t = { now: NOW };
  let n = 0;
  const port = createAuthAdapter({
    fetch: async (url) =>
      url.endsWith('/csrf')
        ? json({ csrfToken: 'p' })
        : json({
            accessToken: token(Math.floor(t.now / 1000) + 3600 + ++n),
            expiresIn: 3600,
            user: { id: 'u-1', name: 'Dra. Valentina Ruiz', roles: [] },
          }),
    uuid: () => crypto.randomUUID(),
    now: () => t.now,
    issuer: ISSUER,
    audience: 'dlc-api',
    locks: { request: (_n, _o, cb) => cb() },
    control: createSessionControl({
      storage: memoryStorage(),
      channel: channel(),
    }),
    ...extra,
  });
  return { port, t };
}

test('FC-10: an ordinary renewal is reported to the shell; a restore is not', async () => {
  const renewals = [];
  const { port, t } = adapter({ onRenewed: (e) => renewals.push(e) });
  await port.restore();
  assert.equal(renewals.length, 0);
  t.now += (3600 - 10) * 1000;
  await port.freshAccessToken();
  assert.equal(renewals.length, 1);
  assert.equal(renewals[0].user.id, 'u-1');
});

test('FC-12: a newer remote generation drops this tab’s token and reports its kind', async () => {
  const { port } = adapter();
  await port.restore();
  assert.equal(
    port.remote({ generation: 1, kind: 'established' }),
    'established',
  );
  assert.equal(port.accessToken(), null);
});

test('FC-12: stale or malformed remote messages are ignored', async () => {
  const { port } = adapter();
  await port.restore();
  assert.equal(port.remote({ generation: 2, kind: 'cleared' }), 'cleared');
  await port.restore().catch(() => null);
  for (const message of [
    { generation: 2, kind: 'cleared' },
    { generation: 1, kind: 'established' },
    { generation: 3, kind: 'other' },
    { generation: '4', kind: 'cleared' },
    { generation: 5, kind: 'cleared', token: 'x' },
    null,
  ])
    assert.equal(port.remote(message), null);
});

test('FC-12: a storage update of the control record maps to its kind', async () => {
  const { port } = adapter();
  assert.equal(port.remoteRecord('{"generation":4,"blocked":true}'), 'cleared');
  assert.equal(
    port.remoteRecord('{"generation":5,"blocked":false}'),
    'established',
  );
  assert.equal(port.remoteRecord('{"generation":5,"blocked":false}'), null);
  assert.equal(port.remoteRecord('garbage'), 'cleared');
});
