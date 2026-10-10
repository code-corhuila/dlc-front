import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { renderPublicFrame } from '../../src/layout/publicFrame.ts';

const setup = () => {
  const { document } = new Window();
  const frame = renderPublicFrame(document);
  document.body.append(frame.root);
  return { document, frame };
};

test('public frame: header with brand, deferred links and Login (mockup p. 1-3)', () => {
  const { document } = setup();
  const header = document.querySelector('header[role="banner"]');
  assert.equal(
    header.querySelector('.dlc-public-brand img').getAttribute('alt'),
    '',
  );
  assert.equal(
    header.querySelector('.dlc-public-brand').textContent.trim(),
    'DI LUCCA',
  );
  const deferred = [
    ...header.querySelectorAll('.dlc-public-nav [aria-disabled="true"]'),
  ];
  assert.deepEqual(
    deferred.map((el) => el.textContent),
    ['Citas', 'Servicios', 'Contacto'],
  );
  const login = header.querySelector('a.dlc-public-login');
  assert.equal(login.textContent, 'Login');
  assert.equal(login.getAttribute('href'), '/login');
});

test('public frame: footer with copyright and deferred legal links', () => {
  const { document } = setup();
  const footer = document.querySelector('footer[role="contentinfo"]');
  assert.match(
    footer.textContent,
    /© 2026 DI LUCCA\. Todos los derechos reservados\./,
  );
  assert.deepEqual(
    [...footer.querySelectorAll('[aria-disabled="true"]')].map(
      (el) => el.textContent,
    ),
    ['Privacidad', 'Términos', 'Cookies'],
  );
});

test('public frame: IAM content is mounted in an empty host inside main', () => {
  const { frame } = setup();
  assert.equal(frame.main.tagName, 'MAIN');
  assert.equal(frame.main.getAttribute('tabindex'), '-1');
  assert.equal(frame.host.id, 'public-host');
  assert.equal(frame.host.childElementCount, 0);
  frame.setActive('/login');
});
