import assert from 'node:assert/strict';
import test from 'node:test';
import { validateNavigationTarget } from '../../src/composition/navigationTarget.ts';

const origin = 'https://dlc.test';
const ok = (path) => validateNavigationTarget(path, origin);
const invalid = { ok: false, error: 'INVALID_ROUTE' };

test('C04: recognized same-origin absolute paths are accepted with query and fragment', () => {
  const result = ok('/app/billing/invoices/7?tab=pay#top');
  assert.equal(result.ok, true);
  assert.equal(result.url.href, `${origin}/app/billing/invoices/7?tab=pay#top`);
  assert.equal(ok('/app/patients/new').ok, true);
});

test('C04: schemes, protocol-relative URLs and backslashes are INVALID_ROUTE', () => {
  for (const path of [
    'https://evil.test/app/billing',
    'javascript:alert(1)',
    '//evil.test/app',
    '/app\\billing',
    'app/billing',
    '',
    42,
  ])
    assert.deepEqual(ok(path), invalid, String(path));
});

test('C04: dot-segments, malformed or encoded separators are INVALID_ROUTE', () => {
  for (const path of [
    '/app/../login',
    '/app/./billing',
    '/app/%2e%2e/login',
    '/app/billing%2Finvoices',
    '/app/billing%5cinvoices',
    '/app/%E0%A4%A',
    '/app/billing\n',
  ])
    assert.deepEqual(ok(path), invalid, path);
});

test('C04: unknown global paths are not recognized targets', () => {
  assert.deepEqual(ok('/app/unknown'), invalid);
});
