import assert from 'node:assert/strict';
import test from 'node:test';
import { createEntryLoader } from '../../src/composition/loader.ts';

const registry = {
  contractVersion: 1,
  registryRevision: 'r1',
  portals: [
    {
      portalId: 'clinical',
      repository: 'dlc-clinical-portal',
      release: '2.0.0',
      entryUrl: '/portals/clinical/2.0.0/entry.js',
      navigation: [],
    },
    {
      portalId: 'billing',
      repository: 'dlc-billing-portal',
      release: '1.0.0',
      entryUrl: 'https://cdn.test/entry.js',
      navigation: [],
    },
  ],
};
const json = (body, status = 200) => ({
  ok: status < 300,
  status,
  json: async () => body,
});

function setup(responses) {
  const requests = [];
  const imports = [];
  const loader = createEntryLoader({
    fetch: async (url, init) => {
      requests.push({ url, init });
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return next;
    },
    importModule: async (url) => {
      imports.push(url);
      return { url };
    },
  });
  return { loader, requests, imports };
}

test('C01: registry is fetched once, same-origin, no-store, with a deadline signal', async () => {
  const { loader, requests } = setup([json(registry)]);
  const result = await loader.registry();
  assert.equal(result.ok, true);
  await loader.registry();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/portal-registry.json');
  assert.equal(requests[0].init.cache, 'no-store');
  assert.equal(requests[0].init.credentials, 'same-origin');
  assert.ok(requests[0].init.signal instanceof AbortSignal);
});

test('C01: only the selected available entry is imported', async () => {
  const { loader, imports } = setup([json(registry)]);
  assert.deepEqual(await loader.loadEntry('clinical'), {
    url: '/portals/clinical/2.0.0/entry.js',
  });
  await assert.rejects(loader.loadEntry('billing'), /PORTAL_DISABLED/);
  await assert.rejects(loader.loadEntry('iam'), /PORTAL_DISABLED/);
  assert.deepEqual(imports, ['/portals/clinical/2.0.0/entry.js']);
});

test('C07: unreachable or invalid registry fails closed and loads no entry', async () => {
  for (const response of [
    new Error('offline'),
    json({}, 404),
    json({ contractVersion: 9 }),
  ]) {
    const { loader, imports } = setup([response]);
    assert.deepEqual(await loader.registry(), {
      ok: false,
      error: 'REGISTRY_INVALID',
    });
    await assert.rejects(loader.loadEntry('clinical'), /REGISTRY_UNAVAILABLE/);
    assert.deepEqual(imports, []);
  }
});

test('C07: explicit retry revalidates the no-store registry', async () => {
  const { loader, requests } = setup([new Error('offline'), json(registry)]);
  assert.equal((await loader.registry()).ok, false);
  loader.invalidate();
  assert.equal((await loader.registry()).ok, true);
  assert.equal(requests.length, 2);
});
