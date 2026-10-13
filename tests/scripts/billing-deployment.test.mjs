import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readRepositoryFile(relativePath) {
  return readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

test('deployment config exposes Billing through the same-origin portal proxy', async () => {
  const [nginx, compose, envExample] = await Promise.all([
    readRepositoryFile('deploy/nginx.conf.template'),
    readRepositoryFile('deploy/compose.yml'),
    readRepositoryFile('.env.example'),
  ]);

  assert.match(nginx, /location \^~ \/portals\/billing\//);

  assert.match(nginx, /\$\{BILLING_UPSTREAM\}/);

  assert.match(compose, /BILLING_UPSTREAM/);

  assert.match(compose, /billing-portal-demo/);

  assert.match(compose, /billing:/);

  assert.match(compose, /BILLING_NETWORK/);

  assert.match(envExample, /^BILLING_UPSTREAM=/m);

  assert.match(envExample, /^BILLING_NETWORK=/m);

  assert.match(envExample, /^BILLING_ORIGIN=/m);
});
