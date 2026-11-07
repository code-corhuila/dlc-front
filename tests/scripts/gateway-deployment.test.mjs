import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readRepositoryFile(relativePath) {
  // Windows checkouts may use CRLF; CI uses LF.
  const text = await readFile(
    new URL(`../../${relativePath}`, import.meta.url),
    'utf8',
  );
  return text.replace(/\r\n/g, '\n');
}

function apiLocation(nginx) {
  const match = nginx.match(
    /location ~ \^\/api\/v1\/\(\.\*\)\$ \{([\s\S]*?)\n {2}\}/,
  );
  assert.ok(match, 'the /api/v1 location exists');
  return match[1];
}

test('the /api/v1 proxy forwards the browser address to the Gateway', async () => {
  const nginx = await readRepositoryFile('deploy/nginx.conf.template');

  assert.match(
    apiLocation(nginx),
    /proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;/,
  );
});

test('the compositor joins the platform network where the real Gateway runs', async () => {
  const compose = await readRepositoryFile('deploy/compose.yml');

  const service = compose.match(/\n {2}dlc-front:\n([\s\S]*?)\n\n/);
  assert.ok(service, 'the dlc-front service exists');
  assert.match(service[1], /\n {6}- platform(\n|$)/);

  assert.match(
    compose,
    /\n {2}platform:\n {4}external: true\n {4}name: \$\{PLATFORM_NETWORK:-platform\}\n/,
  );
});

test('the environment example defaults to the real Gateway upstream', async () => {
  const envExample = await readRepositoryFile('.env.example');

  assert.match(envExample, /^PLATFORM_NETWORK=platform$/m);
  assert.match(
    envExample,
    /^GATEWAY_UPSTREAM=http:\/\/dlc-api-gateway:8080\/api\/v1$/m,
  );
  assert.match(envExample, /^AUTH_CONFIG_FILE=/m);
  assert.doesNotMatch(envExample, /mock-gateway|DLC_DOCS_OPENAPI/);
});

test('the compose deployment uses the real Gateway and requires Auth data, no mock', async () => {
  const compose = await readRepositoryFile('deploy/compose.yml');

  assert.match(
    compose,
    /GATEWAY_UPSTREAM: \$\{GATEWAY_UPSTREAM:-http:\/\/dlc-api-gateway:8080\/api\/v1\}/,
  );
  assert.match(
    compose,
    /\$\{AUTH_CONFIG_FILE:\?[^}]+\}:\/usr\/share\/nginx\/auth\/auth-config\.json:ro/,
  );
  assert.doesNotMatch(compose, /mock-gateway|prism|profiles:/);
});
