import assert from 'node:assert/strict';
import test from 'node:test';
import { loadAuthConfig } from '../../../src/core/session/authConfig.ts';

const reply = (status, body) => async (url, init) => {
  reply.last = { url, init };
  return new Response(JSON.stringify(body), { status });
};

test('C05: Auth deployment data is read without caching from the same origin', async () => {
  const fetch = reply(200, {
    issuer: 'https://auth.test',
    audience: 'dlc-api',
  });
  const config = await loadAuthConfig({ fetch });
  assert.deepEqual(config, {
    status: 'configured',
    issuer: 'https://auth.test',
    audience: 'dlc-api',
  });
  assert.equal(reply.last.url, '/auth-config.json');
  assert.equal(reply.last.init.cache, 'no-store');
  assert.equal(reply.last.init.credentials, 'same-origin');
});

test('C05: a deployment without Auth data is reported as absent', async () => {
  const config = await loadAuthConfig({ fetch: reply(404, {}) });
  assert.deepEqual(config, { status: 'absent' });
});

test('C05: malformed Auth data fails closed instead of falling back', async () => {
  for (const body of [
    {},
    { issuer: '', audience: 'dlc-api' },
    { issuer: 'https://auth.test', audience: 7 },
    { issuer: 'https://auth.test', audience: 'dlc-api', extra: true },
    [],
  ]) {
    const config = await loadAuthConfig({ fetch: reply(200, body) });
    assert.deepEqual(config, { status: 'invalid' });
  }
});

test('C05: unreachable Auth data fails closed', async () => {
  for (const fetch of [
    async () => {
      throw new TypeError('offline');
    },
    reply(500, {}),
    async () => new Response('not json', { status: 200 }),
  ]) {
    assert.deepEqual(await loadAuthConfig({ fetch }), { status: 'invalid' });
  }
});
