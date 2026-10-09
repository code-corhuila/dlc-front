import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRequestTarget } from '../../../src/core/http/requestTarget.ts';

// C06 / FC-13: pure boundary tests; no real network, credentials or Auth fixture.
const path = '/api/v1/auth/login';
const invalid = { ok: false, error: 'INVALID_REQUEST' };

test('accepts a Gateway-relative Auth path with no caller headers', () => {
  assert.deepEqual(validateRequestTarget({ path }), {
    ok: true,
    target: { path, headers: {} },
  });
});

test('normalizes permitted header names without changing their values', () => {
  assert.deepEqual(
    validateRequestTarget({
      path,
      headers: {
        Accept: 'application/json',
        'content-TYPE': 'application/json',
        'If-Match': '"revision-1"',
        'Idempotency-Key': 'intent-1',
      },
    }),
    {
      ok: true,
      target: {
        path,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'if-match': '"revision-1"',
          'idempotency-key': 'intent-1',
        },
      },
    },
  );
});

test('does not mutate input or retain a mutable caller header reference', () => {
  const headers = { accept: 'application/json' };
  const input = { path, headers };
  const result = validateRequestTarget(input);
  assert.equal(result.ok, true);
  assert.deepEqual(input, { path, headers: { accept: 'application/json' } });
  headers.accept = 'text/html';
  assert.equal(result.target.headers.accept, 'application/json');
});

test('rejects absolute URLs and protocol-relative destinations', () => {
  for (const value of [
    'https://example.test/api/v1/auth/login',
    'http://localhost/api/v1/auth/login',
    '//example.test/api/v1/auth/login',
  ]) {
    assert.deepEqual(validateRequestTarget({ path: value }), invalid, value);
  }
});

test('rejects private paths and lookalike API prefixes', () => {
  for (const value of [
    '/internal/v1/auth',
    '/health',
    '/api/v10/auth/login',
    '/api/v1evil/auth/login',
    'api/v1/auth/login',
    '/api/v1',
    '/api/v1/',
  ]) {
    assert.deepEqual(validateRequestTarget({ path: value }), invalid, value);
  }
});

test('keeps query and fragment out of the path field', () => {
  for (const suffix of ['?email=example', '#section']) {
    assert.deepEqual(validateRequestTarget({ path: path + suffix }), invalid);
  }
});

test('rejects traversal before browser URL normalization', () => {
  for (const value of [
    '/api/v1/../auth/login',
    '/api/v1/./auth/login',
    '/api/v1/%2e%2e/auth/login',
    '/api/v1/%252e%252e/auth/login',
  ]) {
    assert.deepEqual(validateRequestTarget({ path: value }), invalid, value);
  }
});

test('rejects ambiguous path separators, including encoded variants', () => {
  for (const value of [
    '/api/v1/auth\\login',
    '/api/v1/auth//login',
    '/api/v1/auth%2flogin',
    '/api/v1/auth%5Clogin',
  ]) {
    assert.deepEqual(validateRequestTarget({ path: value }), invalid, value);
  }
});

test('rejects whitespace and control characters in paths', () => {
  for (const value of [' ' + path, path + ' ', path + '\n', path + '%0d']) {
    assert.deepEqual(validateRequestTarget({ path: value }), invalid);
  }
});

test('rejects malformed path encoding', () => {
  for (const value of [path + '%', path + '%GG', path + '%C0%AF']) {
    assert.deepEqual(validateRequestTarget({ path: value }), invalid, value);
  }
});

test('rejects caller credentials, correlation, identity and unknown headers', () => {
  for (const name of [
    'Authorization',
    'aUtHoRiZaTiOn',
    'Cookie',
    'Origin',
    'X-CSRF-Token',
    'X-Correlation-Id',
    'X-User-Id',
    'X-Custom',
  ]) {
    assert.deepEqual(
      validateRequestTarget({ path, headers: { [name]: 'fixture' } }),
      invalid,
      name,
    );
  }
});

test('rejects duplicate case-insensitive headers and line injection', () => {
  for (const headers of [
    { Accept: 'text/plain', accept: 'application/json' },
    { accept: 'application/json\r\nAuthorization: fixture' },
    { accept: 123 },
  ]) {
    assert.deepEqual(validateRequestTarget({ path, headers }), invalid);
  }
});

test('rejects malformed boundary values with a controlled result', () => {
  for (const input of [
    null,
    undefined,
    [],
    'request',
    {},
    { path: 123 },
    { path, headers: null },
    { path, headers: [] },
  ]) {
    assert.deepEqual(validateRequestTarget(input), invalid);
  }
});
