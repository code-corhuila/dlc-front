import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import {
  renderDashboard,
  renderNotFound,
  renderUnavailable,
} from '../../src/layout/pages.ts';
import { BASELINE_NAVIGATION } from '../../src/layout/navigation.ts';

const doc = () => new Window().document;

test('C04: global 404 has a focusable heading and a way back', () => {
  const page = renderNotFound(doc());
  const heading = page.querySelector('h1');
  assert.equal(heading.textContent, 'Página no encontrada');
  assert.equal(heading.getAttribute('tabindex'), '-1');
  assert.equal(page.querySelector('a').getAttribute('href'), '/app/dashboard');
});

test('C07: PORTAL_UNAVAILABLE notice offers an explicit retry', () => {
  let retries = 0;
  const notice = renderUnavailable(doc(), { onRetry: () => (retries += 1) });
  assert.equal(notice.getAttribute('role'), 'alert');
  assert.equal(notice.dataset.code, 'PORTAL_UNAVAILABLE');
  assert.match(notice.textContent, /no está disponible/);
  notice.querySelector('button').click();
  assert.equal(retries, 1);
});

test('C04: dashboard shows role shortcuts and an analytics host, no business data', () => {
  const document = doc();
  const dashboard = renderDashboard(document, {
    userName: 'Dra. Sarah Ruiz',
    user: { roles: ['SECRETARY_ASSISTANT'], permissions: [] },
    navigation: BASELINE_NAVIGATION,
  });
  assert.equal(dashboard.root.querySelector('h1').textContent, 'Panel');
  assert.match(dashboard.root.textContent, /Dra\. Sarah Ruiz/);
  const shortcuts = [...dashboard.root.querySelectorAll('.dlc-shortcut')];
  assert.deepEqual(
    shortcuts.map((a) => a.getAttribute('href')),
    ['/app/patients', '/app/appointments/calendar', '/app/billing'],
  );
  assert.equal(
    dashboard.analyticsHost.getAttribute('aria-label'),
    'Analítica clínica',
  );
  assert.equal(dashboard.analyticsHost.childElementCount, 0);
});
