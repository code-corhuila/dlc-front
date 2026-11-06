import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parseRegistry } from '../../src/composition/registry.ts';

async function readRepositoryFile(relativePath) {
  return readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

test('the registry lists the real Clinical release, never a demo build', async () => {
  const registry = parseRegistry(
    JSON.parse(await readRepositoryFile('fixtures/portal-registry.json')),
  );

  assert.equal(registry.ok, true);
  const clinical = registry.portals.clinical;
  assert.equal(clinical.status, 'available');
  assert.equal(clinical.release, '0.1.0');
  assert.equal(clinical.entryUrl, '/portals/clinical/0.1.0/entry.js');
});

test('deployment proxies Clinical to the real portal container by default', async () => {
  const compose = await readRepositoryFile('deploy/compose.yml');

  assert.match(
    compose,
    /CLINICAL_UPSTREAM: \$\{CLINICAL_UPSTREAM:-http:\/\/clinical-portal-dlc-front\}/,
  );
  assert.doesNotMatch(compose, /clinical-portal-demo/);
});

test('local settings point Clinical to the real portal port, not the demo one', async () => {
  const [envExample, preview] = await Promise.all([
    readRepositoryFile('.env.example'),
    readRepositoryFile('scripts/preview.mjs'),
  ]);

  assert.match(
    envExample,
    /^CLINICAL_UPSTREAM=http:\/\/clinical-portal-dlc-front\r?$/m,
  );
  assert.match(envExample, /^CLINICAL_ORIGIN=http:\/\/localhost:4173\r?$/m);
  assert.match(preview, /CLINICAL_ORIGIN \?\? 'http:\/\/localhost:4173'/);
});
