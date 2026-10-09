import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseRegistry,
  validateEntryModule,
} from '../../src/composition/registry.ts';

const any = { rolesAny: [], permissionsAll: [] };
const portal = (portalId, repository, navigation = []) => ({
  portalId,
  repository,
  release: '1.0.0',
  entryUrl: `/portals/${portalId}/1.0.0/entry.js`,
  navigation,
});
const valid = () => ({
  contractVersion: 1,
  registryRevision: 'r-2026-10-09',
  portals: [
    portal('iam', 'dlc-iam-portal', [
      {
        id: 'administration',
        label: 'Administración',
        path: '/app/administration',
        visibility: { rolesAny: ['ADMINISTRATOR'], permissionsAll: [] },
      },
    ]),
    portal('patient', 'dlc-patient-portal', [
      {
        id: 'patients',
        label: 'Pacientes',
        path: '/app/patients',
        visibility: any,
      },
    ]),
    portal('clinical', 'dlc-clinical-portal', [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/app/dashboard',
        visibility: any,
      },
      {
        id: 'clinical',
        label: 'Clínica',
        path: '/app/clinical',
        visibility: any,
      },
    ]),
  ],
});

test('C01 / FC-01: a valid registry exposes each descriptor as available', () => {
  const result = parseRegistry(valid());
  assert.equal(result.ok, true);
  assert.equal(result.revision, 'r-2026-10-09');
  assert.equal(result.portals.clinical.status, 'available');
  assert.equal(
    result.portals.clinical.entryUrl,
    '/portals/clinical/1.0.0/entry.js',
  );
  assert.deepEqual(
    result.navigation.map((item) => item.id),
    ['administration', 'patients', 'dashboard', 'clinical'],
  );
  assert.equal(result.portals.billing, undefined);
});

test('C01 / FC-02: wrong version, duplicate or unknown ids reject the registry', () => {
  const reject = { ok: false, error: 'REGISTRY_INVALID' };
  assert.deepEqual(parseRegistry({ ...valid(), contractVersion: 2 }), reject);
  assert.deepEqual(parseRegistry({ ...valid(), registryRevision: '' }), reject);
  assert.deepEqual(parseRegistry(null), reject);
  const dup = valid();
  dup.portals.push(portal('iam', 'dlc-iam-portal'));
  assert.deepEqual(parseRegistry(dup), reject);
  const unknown = valid();
  unknown.portals.push(portal('pharmacy', 'dlc-pharmacy-portal'));
  assert.deepEqual(parseRegistry(unknown), reject);
});

test('C01 / FC-02: an invalid descriptor disables only that portal', () => {
  const cases = [
    { entryUrl: 'https://evil.test/portals/patient/1.0.0/entry.js' },
    { entryUrl: '/portals/patient/2.0.0/entry.js' },
    { release: '..', entryUrl: '/portals/patient/../entry.js' },
    { repository: 'dlc-billing-portal' },
    {
      navigation: [
        { id: 'x', label: 'X', path: '/app/billing', visibility: any },
      ],
    },
    { navigation: 'menu' },
    {
      navigation: [{ id: 'p', label: 'P', path: 'http://[', visibility: any }],
    },
  ];
  for (const change of cases) {
    const registry = valid();
    Object.assign(registry.portals[1], change);
    const result = parseRegistry(registry);
    assert.equal(result.ok, true);
    assert.equal(
      result.portals.patient.status,
      'disabled',
      JSON.stringify(change),
    );
    assert.equal(result.portals.clinical.status, 'available');
    assert.equal(
      result.navigation.some((item) => item.id === 'patients'),
      false,
    );
  }
});

test('C01: a navigation id claimed by two owners disables both (no precedence)', () => {
  const registry = valid();
  registry.portals[1].navigation.push({
    id: 'dashboard',
    label: 'Otro',
    path: '/app/patients/new',
    visibility: any,
  });
  const result = parseRegistry(registry);
  assert.equal(result.portals.patient.status, 'disabled');
  assert.equal(result.portals.clinical.status, 'disabled');
  assert.equal(result.portals.iam.status, 'available');
});

test('C01: entry module exports portalId, contractVersion 1 and mount', () => {
  const mount = async () => ({});
  assert.equal(
    validateEntryModule(
      { portalId: 'clinical', contractVersion: 1, mount },
      'clinical',
    ),
    true,
  );
  assert.equal(
    validateEntryModule(
      { portalId: 'iam', contractVersion: 1, mount },
      'clinical',
    ),
    false,
  );
  assert.equal(
    validateEntryModule(
      { portalId: 'clinical', contractVersion: 2, mount },
      'clinical',
    ),
    false,
  );
  assert.equal(
    validateEntryModule(
      { portalId: 'clinical', contractVersion: 1 },
      'clinical',
    ),
    false,
  );
});
