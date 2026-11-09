import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BASELINE_NAVIGATION,
  activeItemId,
  orderNavigation,
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

const MOCKUP_MENU = [
  ...BASELINE_NAVIGATION,
  {
    id: 'procedures',
    label: 'Procedimientos',
    path: '/app/billing/procedures',
    visibility: { rolesAny: [], permissionsAll: [] },
  },
  {
    id: 'availability',
    label: 'Horarios y Slots',
    path: '/app/appointments/availability',
    visibility: { rolesAny: [], permissionsAll: [] },
  },
  {
    id: 'clinical-assignments',
    label: 'Asignaciones clínicas',
    path: '/app/appointments/clinical-assignments',
    visibility: {
      rolesAny: ['ADMINISTRATOR', 'SECRETARY_ASSISTANT'],
      permissionsAll: [],
    },
  },
];

test('mockup sidebar order: owner sub-areas sit next to their owners', () => {
  assert.deepEqual(
    orderNavigation(MOCKUP_MENU).map((item) => item.id),
    [
      'dashboard',
      'patients',
      'procedures',
      'appointments',
      'availability',
      'clinical-assignments',
      'clinical',
      'billing',
      'administration',
    ],
  );
});

test('registry: Appointments availability is managed by reception roles only', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const file of [
    'portal-registry.json',
    'portal-registry.clinical-live.json',
  ]) {
    const registry = JSON.parse(
      await readFile(
        new URL(`../../fixtures/${file}`, import.meta.url),
        'utf8',
      ),
    );
    const appointments = registry.portals.find(
      (portal) => portal.portalId === 'appointments',
    );
    const item = appointments.navigation.find(
      (entry) => entry.id === 'availability',
    );
    assert.deepEqual(item.visibility, {
      rolesAny: ['ADMINISTRATOR', 'SECRETARY_ASSISTANT'],
      permissionsAll: [],
    });
    assert.deepEqual(
      visibleItems([item], { roles: ['DENTIST'], permissions: [] }),
      [],
    );
  }
});

test('registry: Appointments offers clinical assignments to reception roles only', async () => {
  const { readFile } = await import('node:fs/promises');
  const registry = JSON.parse(
    await readFile(
      new URL('../../fixtures/portal-registry.json', import.meta.url),
      'utf8',
    ),
  );
  const appointments = registry.portals.find(
    (portal) => portal.portalId === 'appointments',
  );
  const item = appointments.navigation.find(
    (entry) => entry.id === 'clinical-assignments',
  );
  assert.deepEqual(
    item,
    MOCKUP_MENU.find((entry) => entry.id === 'clinical-assignments'),
  );
  assert.deepEqual(
    visibleItems([item], { roles: ['DENTIST'], permissions: [] }),
    [],
  );
  assert.equal(
    visibleItems([item], { roles: ['SECRETARY_ASSISTANT'], permissions: [] })
      .length,
    1,
  );
});

test('C04: the most specific owner entry is active', () => {
  const active = (path) => activeItemId(MOCKUP_MENU, path);
  assert.equal(active('/app/billing/procedures/9'), 'procedures');
  assert.equal(active('/app/billing/invoices/7'), 'billing');
  assert.equal(active('/app/appointments/availability'), 'availability');
  assert.equal(active('/app/appointments/new'), 'appointments');
  assert.equal(
    active('/app/appointments/clinical-assignments'),
    'clinical-assignments',
  );
});
