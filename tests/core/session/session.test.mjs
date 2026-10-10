import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSession,
  scopeSession,
} from '../../../src/core/session/session.ts';

const dentist = {
  user: { id: 'u-1', name: 'Dra. Sarah Ruiz', roles: ['DENTIST'] },
  permissions: ['clinical:read'],
  expiresAt: '2026-10-10T12:00:00.000Z',
};

/** Auth port double: no JWT, refresh token or credential ever reaches the session. */
function auth({ restore = null, complete = dentist, failLogout = false } = {}) {
  const calls = [];
  return {
    calls,
    async restore() {
      calls.push('restore');
      if (restore instanceof Error) throw restore;
      return restore;
    },
    async complete(input) {
      calls.push(`complete:${input.operationId}`);
      if (complete instanceof Error) throw complete;
      return complete;
    },
    async logout() {
      calls.push('logout');
      if (failLogout) throw new Error('offline');
    },
  };
}

test('C05: resolving then anonymous when Auth has no session', async () => {
  const session = createSession(auth());
  assert.deepEqual(session.getSnapshot(), {
    state: 'resolving',
    revision: 0,
    user: null,
    permissions: [],
    expiresAt: null,
    reason: null,
  });
  await session.start();
  const snapshot = session.getSnapshot();
  assert.equal(snapshot.state, 'anonymous');
  assert.equal(snapshot.reason, 'NO_SESSION');
  assert.equal(snapshot.revision, 1);
});

test('C05: restored session exposes only id, name and roles', async () => {
  const session = createSession(
    auth({ restore: { ...dentist, user: { ...dentist.user, email: 'x@y' } } }),
  );
  await session.start();
  const snapshot = session.getSnapshot();
  assert.equal(snapshot.state, 'authenticated');
  assert.deepEqual(snapshot.user, dentist.user);
  assert.deepEqual(snapshot.permissions, ['clinical:read']);
  assert.equal(snapshot.expiresAt, dentist.expiresAt);
  assert.ok(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.user));
});

test('C05: Auth failure or malformed data leaves the session unavailable', async () => {
  for (const restore of [
    new Error('down'),
    { user: { id: 'u', name: 'N', roles: 'DENTIST' }, permissions: [] },
  ]) {
    const session = createSession(auth({ restore }));
    await session.start();
    assert.equal(session.getSnapshot().state, 'unavailable');
    assert.equal(session.getSnapshot().reason, 'DEPENDENCY_UNAVAILABLE');
  }
});

test('C05: subscribe delivers now and on change; listener errors are isolated', async () => {
  const session = createSession(auth({ restore: dentist }));
  const seen = [];
  session.subscribe(() => {
    throw new Error('listener');
  });
  const unsubscribe = session.subscribe((s) => seen.push(s.state));
  await session.start();
  unsubscribe();
  await session.logout();
  assert.deepEqual(seen, ['resolving', 'authenticated']);
});

test('C05: completion establishes; failure keeps anonymous; logout clears first', async () => {
  const port = auth();
  const session = createSession(port);
  await session.start();
  const done = await session.complete({
    operationId: 'AuthVerifyMFAchallenge',
    body: { code: '000000' },
  });
  assert.equal(done.ok, true);
  assert.equal(done.data.state, 'authenticated');
  const logout = session.logout();
  assert.equal(session.getSnapshot().state, 'anonymous');
  assert.equal(session.getSnapshot().reason, 'LOGOUT');
  assert.equal(session.getSnapshot().user, null);
  assert.deepEqual(await logout, { ok: true, status: 204, data: null });

  const failing = createSession(auth({ complete: new Error('bad proof') }));
  await failing.start();
  const result = await failing.complete({
    operationId: 'AuthVerifyMFAchallenge',
    body: {},
  });
  assert.equal(result.ok, false);
  assert.equal(failing.getSnapshot().state, 'anonymous');
});

test('C05: only the two MFA completion operations are accepted', async () => {
  const session = createSession(auth());
  await session.start();
  const result = await session.complete({ operationId: 'AuthLogin', body: {} });
  assert.deepEqual(result.ok, false);
  assert.equal(result.error, 'INVALID_REQUEST');
});

test('C05: logout outage is reported as unconfirmed, never as revoked', async () => {
  const session = createSession(auth({ restore: dentist, failLogout: true }));
  await session.start();
  const result = await session.logout();
  assert.equal(result.ok, false);
  assert.equal(result.error, 'SESSION_UNAVAILABLE');
  assert.equal(session.getSnapshot().state, 'anonymous');
});

test('C02/C05: scoped capability is read-only and released with the mount', async () => {
  const session = createSession(auth({ restore: dentist }));
  const controller = new AbortController();
  const scoped = scopeSession(session, controller.signal);
  assert.deepEqual(Object.keys(scoped).sort(), ['getSnapshot', 'subscribe']);
  const seen = [];
  scoped.subscribe((s) => seen.push(s.state));
  controller.abort();
  await session.start();
  assert.deepEqual(seen, ['resolving']);
  assert.throws(() => scoped.getSnapshot(), /CANCELLED/);
});
