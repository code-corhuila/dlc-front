import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { renderFrame } from '../../src/layout/frame.ts';
import { BASELINE_NAVIGATION } from '../../src/layout/navigation.ts';

const admin = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Administrador DI-LUCCA',
  roles: ['ADMINISTRATOR'],
  permissions: [],
};

function setup(user = admin, path = '/app/dashboard') {
  const { document } = new Window();
  const calls = [];
  const frame = renderFrame(document, {
    user,
    navigation: BASELINE_NAVIGATION,
    path,
    onLogout: () => calls.push('logout'),
  });
  document.body.append(frame.root);
  return { document, frame, calls };
}

test('frame exposes landmarks: banner, labelled navigation and main', () => {
  const { document } = setup();
  assert.ok(document.querySelector('header[role="banner"]'));
  assert.equal(
    document.querySelector('nav').getAttribute('aria-label'),
    'Principal',
  );
  assert.ok(document.querySelector('main#content'));
});

test('sidebar shows the role-visible items with the active one marked', () => {
  const { document } = setup(admin, '/app/billing/invoices/7');
  const links = [...document.querySelectorAll('nav a')];
  assert.deepEqual(
    links.map((a) => [a.textContent.trim(), a.getAttribute('href')]),
    [
      ['Dashboard', '/app/dashboard'],
      ['Pacientes', '/app/patients'],
      ['Citas', '/app/appointments/calendar'],
      ['Clínica', '/app/clinical'],
      ['Facturación', '/app/billing'],
      ['Administración', '/app/administration'],
    ],
  );
  const current = links.filter(
    (a) => a.getAttribute('aria-current') === 'page',
  );
  assert.deepEqual(
    current.map((a) => a.textContent.trim()),
    ['Facturación'],
  );
});

test('secretary does not see Clinical nor Administration', () => {
  const { document } = setup({ ...admin, roles: ['SECRETARY_ASSISTANT'] });
  const labels = [...document.querySelectorAll('nav a')].map((a) =>
    a.textContent.trim(),
  );
  assert.equal(labels.includes('Clínica'), false);
  assert.equal(labels.includes('Administración'), false);
});

test('user identity is shown in the top bar and the sidebar footer', () => {
  const { document } = setup();
  assert.match(
    document.querySelector('.dlc-user-chip').textContent,
    /Administrador DI-LUCCA/,
  );
  assert.equal(
    document.querySelector('.dlc-user-chip .dlc-avatar').textContent,
    'A',
  );
  assert.equal(
    document.querySelector('.dlc-sidebar-user .dlc-avatar').textContent,
    'AD',
  );
  assert.equal(document.querySelector('.dlc-role').textContent, 'ADMIN');
});

test('deferred search is rendered but disabled (C04)', () => {
  const { document } = setup();
  const search = document.querySelector('input[type="search"]');
  assert.equal(
    search.getAttribute('placeholder'),
    'Buscar pacientes, citas...',
  );
  assert.equal(search.disabled, true);
  assert.equal(search.getAttribute('aria-label'), 'Buscar pacientes, citas');
});

test('logout is a labelled shell action (C05)', () => {
  const { document, calls } = setup();
  const button = document.querySelector('button[aria-label="Cerrar sesión"]');
  button.click();
  assert.deepEqual(calls, ['logout']);
});

test('the composition host is an empty region owned by the shell', () => {
  const { frame } = setup();
  assert.equal(frame.host.id, 'composition-host');
  assert.equal(frame.host.childElementCount, 0);
});

test('C04: setActive moves aria-current; main is a focus fallback', () => {
  const { document, frame } = setup(admin, '/app/dashboard');
  frame.setActive('/app/clinical/3f2504e0-4f89-41d3-9a0c-0305e82c3301');
  const current = [...document.querySelectorAll('nav a[aria-current="page"]')];
  assert.deepEqual(
    current.map((a) => a.textContent.trim()),
    ['Clínica'],
  );
  frame.setActive('/app/unknown');
  assert.equal(document.querySelectorAll('nav a[aria-current]').length, 0);
  assert.equal(frame.main.getAttribute('tabindex'), '-1');
});

test('C05: setUser re-renders the role menu and identity for a new persona', () => {
  const { document, frame } = setup(admin, '/app/administration');
  frame.setUser({
    id: 'u-2',
    name: 'Laura Secretaría',
    roles: ['SECRETARY_ASSISTANT'],
    permissions: [],
  });
  const labels = [...document.querySelectorAll('nav a')].map((a) =>
    a.textContent.trim(),
  );
  assert.equal(labels.includes('Administración'), false);
  assert.equal(
    document.querySelector('.dlc-chip-name').textContent,
    'Laura Secretaría',
  );
  assert.equal(
    document.querySelector('.dlc-sidebar-user .dlc-avatar').textContent,
    'LA',
  );
  assert.equal(document.querySelector('.dlc-role').textContent, 'SECRETARÍA');
  assert.equal(document.querySelectorAll('nav a[aria-current]').length, 0);
});

test('icon-only sidebar keeps an accessible name and tooltip per link', () => {
  const { document } = setup();
  for (const link of document.querySelectorAll('nav a')) {
    assert.equal(link.getAttribute('aria-label'), link.textContent.trim());
    assert.equal(link.getAttribute('title'), link.textContent.trim());
  }
});
