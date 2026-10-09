import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRoute } from '../../src/composition/routes.ts';

const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const auth = (href) => resolveRoute(new URL(href, 'https://dlc.test'), true);
const anon = (href) => resolveRoute(new URL(href, 'https://dlc.test'), false);
const owner = (r) => [r.kind, r.portalId, r.basePath, r.localPath];

test('C04: entry redirects depend on session state', () => {
  assert.deepEqual(anon('/'), {
    kind: 'redirect',
    to: '/login',
    replace: true,
  });
  assert.deepEqual(auth('/'), {
    kind: 'redirect',
    to: '/app/dashboard',
    replace: true,
  });
  assert.deepEqual(auth('/app'), {
    kind: 'redirect',
    to: '/app/dashboard',
    replace: true,
  });
});

test('C01/C04: each owner prefix selects its portal with base and local path', () => {
  assert.deepEqual(owner(auth('/login')), ['portal', 'iam', '/login', '/']);
  assert.deepEqual(owner(auth('/recover-password/step')), [
    'portal',
    'iam',
    '/recover-password',
    '/step',
  ]);
  assert.deepEqual(owner(auth('/app/administration/users/7')), [
    'portal',
    'iam',
    '/app/administration',
    '/users/7',
  ]);
  assert.deepEqual(owner(auth('/app/patients/new')), [
    'portal',
    'patient',
    '/app/patients',
    '/new',
  ]);
  assert.deepEqual(owner(auth('/app/appointments/calendar')), [
    'portal',
    'appointments',
    '/app/appointments',
    '/calendar',
  ]);
  assert.deepEqual(owner(auth('/app/billing')), [
    'portal',
    'billing',
    '/app/billing',
    '/',
  ]);
  assert.deepEqual(owner(auth(`/app/clinical/${uuid}`)), [
    'portal',
    'clinical',
    '/app/clinical',
    `/${uuid}`,
  ]);
});

test('C04: dashboard is shell-owned and hosts Clinical Analytics at /analytics', () => {
  assert.deepEqual(owner(auth('/app/dashboard')), [
    'dashboard',
    'clinical',
    '/app/dashboard',
    '/analytics',
  ]);
});

test('C04 / FC-06: legacy clinical record alias redirects with replacement', () => {
  assert.deepEqual(auth(`/app/patients/${uuid}?tab=plan#notes`), {
    kind: 'redirect',
    to: `/app/clinical/${uuid}?tab=plan#notes`,
    replace: true,
  });
  assert.equal(auth(`/app/patients/${uuid}/edit`).portalId, 'patient');
  assert.equal(auth('/app/patients/not-a-uuid').portalId, 'patient');
});

test('C04 / FC-06: whole-segment matching; unknown paths are a shell 404', () => {
  assert.deepEqual(auth('/app/billingx'), { kind: 'not-found' });
  assert.deepEqual(auth('/app/unknown'), { kind: 'not-found' });
  assert.deepEqual(auth('/loginx'), { kind: 'not-found' });
});

test('C04: route carries query arrays and fragment without #', () => {
  const route = auth('/app/billing/invoices?status=paid&status=open#top').route;
  assert.equal(route.globalPath, '/app/billing/invoices');
  assert.deepEqual(route.query, { status: ['paid', 'open'] });
  assert.equal(route.fragment, 'top');
});

test('C04: protected routes need a session; anonymous users go to IAM login', () => {
  assert.deepEqual(anon('/app/billing'), {
    kind: 'sign-in',
    returnPath: '/app/billing',
  });
  assert.equal(anon('/login').kind, 'portal');
});
