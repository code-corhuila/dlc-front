import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createPreviewServer } from '../../scripts/preview.mjs';
import { resolveRoute } from '../../src/composition/routes.ts';

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

test('C01/C04: register Patients and preserve administrative routes and the Clinical alias', async () => {
  const registry = JSON.parse(
    await readFile('fixtures/portal-registry.json', 'utf8'),
  );
  const patient = registry.portals.find(
    (portal) => portal.portalId === 'patient',
  );
  assert.equal(patient.repository, 'dlc-patient-portal');
  assert.equal(patient.release, '0.1.0-demo');
  assert.equal(patient.entryUrl, '/portals/patient/0.1.0-demo/entry.js');
  assert.equal(patient.navigation[0].path, '/app/patients');
  for (const portalId of ['clinical', 'appointments', 'billing']) {
    assert.equal(
      registry.portals.find((portal) => portal.portalId === portalId).release,
      '0.1.0-demo',
    );
  }
  const id = '550e8400-e29b-41d4-a716-446655440001';
  for (const path of [
    '/app/patients',
    '/app/patients/new',
    `/app/patients/profiles/${id}/edit`,
  ]) {
    assert.equal(
      resolveRoute(new URL(path, 'http://dlc.test'), true).portalId,
      'patient',
    );
  }
  assert.equal(
    resolveRoute(new URL(`/app/patients/${id}`, 'http://dlc.test'), true).to,
    `/app/clinical/${id}`,
  );
});

test('C01: preview serves owner assets, HEAD and real errors while preserving Clinical and Billing', async (t) => {
  const requests = [];
  const upstream = await start(
    t,
    createServer((request, response) => {
      requests.push(request.url);
      if (request.url.includes('missing'))
        return response.writeHead(404).end('missing');
      response.writeHead(200, {
        'content-type': 'text/javascript',
        'cache-control': 'max-age=3600',
      });
      response.end('export const portalId = "patient";');
    }),
  );
  const origin = await start(
    t,
    createPreviewServer({
      patientOrigin: upstream,
      clinicalOrigin: upstream,
      billingOrigin: upstream,
    }),
  );
  const entry = '/portals/patient/0.1.0-demo/entry.js';
  for (const path of [
    entry + '?probe=1',
    '/portals/patient/0.1.0-demo/chunk.js',
    '/portals/clinical/0.1.0-demo/entry.js',
    '/portals/billing/0.1.0-demo/entry.js',
  ]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /javascript/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(await response.text(), /export const/);
  }
  assert.ok(requests.includes(entry + '?probe=1'));
  const head = await fetch(origin + entry, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal((await fetch(origin + entry, { method: 'POST' })).status, 405);
  for (const path of [
    '/portals/patient/0.1.0-demo/missing.js',
    '/portals/iam/missing',
  ]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(await response.text(), /<!doctype html/i);
  }
  const registry = await fetch(origin + '/portal-registry.json');
  assert.equal(registry.status, 200);
  assert.equal((await registry.json()).contractVersion, 1);
});

test('C07: an unavailable Patients upstream leaves the registry accessible', async (t) => {
  const origin = await start(
    t,
    createPreviewServer({ patientOrigin: 'http://127.0.0.1:0' }),
  );
  const response = await fetch(origin + '/portals/patient/0.1.0-demo/entry.js');
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await fetch(origin + '/portal-registry.json')).status, 200);
});
