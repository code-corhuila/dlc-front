import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BASELINE_NAVIGATION,
  activeItemId,
  visibleItems,
} from '../../src/layout/navigation.ts';

const user = (roles, permissions = []) => ({ roles, permissions });
const ids = (items) => items.map((item) => item.id);

test('C04 baseline: order and default paths of the sidebar', () => {
  assert.deepEqual(
    BASELINE_NAVIGATION.map((item) => [item.id, item.path]),
    [
      ['dashboard', '/app/dashboard'],
      ['patients', '/app/patients'],
      ['appointments', '/app/appointments/calendar'],
      ['clinical', '/app/clinical'],
      ['billing', '/app/billing'],
      ['administration', '/app/administration'],
    ],
  );
});

test('C04 access matrix: visibility per staff role', () => {
  const shared = ['dashboard', 'patients', 'appointments', 'billing'];
  assert.deepEqual(
    ids(visibleItems(BASELINE_NAVIGATION, user(['ADMINISTRATOR']))),
    [
      'dashboard',
      'patients',
      'appointments',
      'clinical',
      'billing',
      'administration',
    ],
  );
  assert.deepEqual(ids(visibleItems(BASELINE_NAVIGATION, user(['DENTIST']))), [
    'dashboard',
    'patients',
    'appointments',
    'clinical',
    'billing',
  ]);
  assert.deepEqual(
    ids(visibleItems(BASELINE_NAVIGATION, user(['SECRETARY_ASSISTANT']))),
    shared,
  );
});

test('C04 / FC-16: missing claims fail closed; permissionsAll needs every one', () => {
  assert.deepEqual(visibleItems(BASELINE_NAVIGATION, null), []);
  assert.deepEqual(visibleItems(BASELINE_NAVIGATION, { roles: 'ADMIN' }), []);
  const guarded = [
    {
      id: 'x',
      label: 'X',
      path: '/app/x',
      visibility: { rolesAny: [], permissionsAll: ['a', 'b'] },
    },
  ];
  assert.deepEqual(visibleItems(guarded, user(['DENTIST'], ['a'])), []);
  assert.deepEqual(ids(visibleItems(guarded, user(['DENTIST'], ['b', 'a']))), [
    'x',
  ]);
});

test('C04: the active item matches whole path segments, not raw prefixes', () => {
  assert.equal(
    activeItemId(BASELINE_NAVIGATION, '/app/billing/invoices/1'),
    'billing',
  );
  assert.equal(
    activeItemId(BASELINE_NAVIGATION, '/app/appointments/new'),
    'appointments',
  );
  assert.equal(activeItemId(BASELINE_NAVIGATION, '/app/billingx'), null);
  assert.equal(
    activeItemId(BASELINE_NAVIGATION, '/app/dashboard'),
    'dashboard',
  );
});
