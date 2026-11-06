import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createPreviewServer } from '../../scripts/preview.mjs';
import { parseRegistry } from '../../src/composition/registry.ts';
import { visibleItems } from '../../src/layout/navigation.ts';

async function start(t, server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  );
  return `http://127.0.0.1:${server.address().port}`;
}

test('IAM release and own-sessions navigation are valid alongside the other portals', async () => {
  const raw = JSON.parse(
    await readFile('fixtures/portal-registry.json', 'utf8'),
  );
  const registry = parseRegistry(raw);
  assert.equal(registry.ok, true);
  const iam = registry.portals.iam;
  assert.equal(iam.status, 'available');
  assert.equal(iam.entryUrl, '/portals/iam/0.1.0-local/entry.js');
  assert.deepEqual(
    iam.navigation.find((item) => item.id === 'sessions'),
    {
      id: 'sessions',
      label: 'Mis sesiones',
      path: '/app/sessions',
      visibility: { rolesAny: [], permissionsAll: [] },
    },
  );
  for (const role of ['ADMINISTRATOR', 'DENTIST', 'SECRETARY_ASSISTANT']) {
    const items = visibleItems(registry.navigation, {
      roles: [role],
      permissions: [],
    });
    assert.ok(items.some((item) => item.id === 'sessions'));
  }

  for (const id of ['patient', 'appointments', 'clinical']) {
    assert.equal(registry.portals[id].status, 'available');
    assert.equal(registry.portals[id].release, '0.1.0-demo');
  }

  assert.equal(registry.portals.billing.status, 'available');
  assert.equal(registry.portals.billing.release, '2.0.0');
});

test('IAM preview proxy preserves its release path, no-store and missing-asset status', async (t) => {
  const upstream = await start(
    t,
    createServer((request, response) => {
      if (request.url.endsWith('/entry.js')) {
        response.writeHead(200, { 'content-type': 'application/javascript' });
        return response.end('export const portalId = "iam";');
      }
      response.writeHead(404).end();
    }),
  );
  const origin = await start(t, createPreviewServer({ iamOrigin: upstream }));
  const entry = '/portals/iam/0.1.0-local/entry.js';
  const available = await fetch(origin + entry);
  assert.equal(available.status, 200);
  assert.equal(available.headers.get('cache-control'), 'no-store');
  assert.match(await available.text(), /portalId = "iam"/);
  const missing = await fetch(origin + '/portals/iam/0.1.0-local/missing.js');
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get('cache-control'), 'no-store');
});
