import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { browserHistory } from '../../src/composition/browserHistory.ts';
import { createNavigationCapability } from '../../src/composition/capabilities.ts';
import { orderNavigation } from '../../src/layout/navigation.ts';

test('C04: browser history adapter stores the shell index in history state', () => {
  const window = new Window({ url: 'https://dlc.test/app/dashboard' });
  const history = browserHistory(window);
  assert.equal(history.index(), 0);
  history.push(new URL('https://dlc.test/app/billing'), 1);
  assert.equal(history.current().pathname, '/app/billing');
  assert.equal(history.index(), 1);
  history.replace(new URL('https://dlc.test/app/billing/x'), 1);
  assert.equal(window.history.state.dlcIndex, 1);
  const pops = [];
  history.onPop((url, index) => pops.push([url.pathname, index]));
  window.dispatchEvent(new window.PopStateEvent('popstate'));
  assert.deepEqual(pops, [['/app/billing/x', 1]]);
});

test('C02: navigation capability is plain, frozen and expires with the mount', async () => {
  const controller = new AbortController();
  const calls = [];
  const navigation = createNavigationCapability(
    controller.signal,
    async (t) => {
      calls.push(t);
      return { status: 'applied' };
    },
  );
  assert.ok(Object.isFrozen(navigation));
  assert.deepEqual(await navigation.request({ path: '/app/billing' }), {
    status: 'applied',
  });
  controller.abort();
  await assert.rejects(
    navigation.request({ path: '/app/billing' }),
    /CANCELLED/,
  );
  assert.equal(calls.length, 1);
});

test('C04: registry navigation follows the baseline sidebar order', () => {
  const item = (id) => ({ id, label: id, path: `/app/${id}`, visibility: {} });
  assert.deepEqual(
    orderNavigation([
      item('administration'),
      item('patients'),
      item('extra'),
      item('dashboard'),
      item('clinical'),
    ]).map((i) => i.id),
    ['dashboard', 'patients', 'clinical', 'administration', 'extra'],
  );
});
