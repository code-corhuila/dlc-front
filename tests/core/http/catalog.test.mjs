import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizeOperation } from '../../../src/core/http/catalog.ts';
import { createHttpCapability } from '../../../src/core/http/capability.ts';

const key = { 'Idempotency-Key': 'intent-12345678' };
const ok = (portalId, method, path, headers) =>
  authorizeOperation(portalId, { method, path, headers });

test('C06: catalogued Gateway operations resolve with their security class', () => {
  const read = ok('patient', 'GET', '/api/v1/patients/7f1c2b9a');
  assert.equal(read.ok, true);
  assert.equal(read.operation.operationId.length > 0, true);
  assert.equal(read.operation.public, false);
  assert.equal(ok('clinical', 'get', '/api/v1/clinical-records/abc').ok, true);
});

test('C06: unknown operations and wrong methods are rejected before transport', () => {
  assert.equal(
    ok('patient', 'GET', '/api/v1/unknown').error,
    'INVALID_REQUEST',
  );
  assert.equal(
    ok('patient', 'DELETE', '/api/v1/patients').error,
    'INVALID_REQUEST',
  );
  assert.equal(
    ok('patient', 'GET', '/api/v1/patients/a/b/c').error,
    'INVALID_REQUEST',
  );
});

test('C06: operations that require Idempotency-Key reject without a valid one', () => {
  const create = ['POST', '/api/v1/auth/staff/u1/disablings'];
  assert.equal(ok('iam', ...create).error, 'INVALID_REQUEST');
  assert.equal(
    ok('iam', ...create, { 'Idempotency-Key': 'short' }).error,
    'INVALID_REQUEST',
  );
  assert.equal(ok('iam', ...create, key).ok, true);
});

test('C05/C06: public Auth is IAM-only; cookie and MFA controls are never generic HTTP', () => {
  assert.equal(ok('iam', 'POST', '/api/v1/auth/login').operation.public, true);
  assert.equal(
    ok('clinical', 'POST', '/api/v1/auth/login').error,
    'INVALID_REQUEST',
  );
  for (const path of [
    '/api/v1/auth/refresh',
    '/api/v1/auth/logout',
    '/api/v1/auth/mfa-verifications',
    '/api/v1/auth/mfa-enrollment-confirmations',
  ])
    assert.equal(ok('iam', 'POST', path).error, 'INVALID_REQUEST', path);
  assert.equal(ok('iam', 'GET', '/api/v1/auth/csrf').error, 'INVALID_REQUEST');
});

test('C02/C06: the per-mount capability uses the catalogue, the mount signal and expires', async () => {
  const sent = [];
  const client = {
    request: async (input) => {
      sent.push(input);
      return {
        ok: true,
        status: 200,
        data: null,
        headers: {},
        correlationId: 'c',
      };
    },
  };
  const controller = new AbortController();
  const http = createHttpCapability(client, 'iam', controller.signal);
  assert.ok(Object.isFrozen(http));
  await http.request({ method: 'POST', path: '/api/v1/auth/login', body: {} });
  assert.equal(sent[0].public, true);
  assert.ok(sent[0].signal instanceof AbortSignal);
  const denied = await http.request({ method: 'GET', path: '/api/v1/nowhere' });
  assert.deepEqual(
    [denied.ok, denied.error, denied.status],
    [false, 'INVALID_REQUEST', 0],
  );
  assert.equal(sent.length, 1);
  controller.abort();
  await assert.rejects(
    http.request({ method: 'GET', path: '/api/v1/auth/staff' }),
    /CANCELLED/,
  );
});
