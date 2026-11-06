import assert from 'node:assert/strict';
import test from 'node:test';
import { createLogoutMarker } from '../../../src/core/session/logoutMarker.ts';

function tabStorage() {
  const items = new Map();
  return {
    items,
    getItem: (k) => (items.has(k) ? items.get(k) : null),
    setItem: (k, v) => void items.set(k, String(v)),
    removeItem: (k) => void items.delete(k),
  };
}

test('FC-11: an unconfirmed server logout survives a reload of the same tab', () => {
  const storage = tabStorage();
  createLogoutMarker(storage).mark();
  // A new page load in the same tab reads the same sessionStorage.
  assert.equal(createLogoutMarker(storage).pending(), true);
  assert.deepEqual([...storage.items], [['dlc-logout-unconfirmed-v1', '1']]);
});

test('FC-11: a confirmed logout or a new sign-in clears the marker', () => {
  const storage = tabStorage();
  const marker = createLogoutMarker(storage);
  marker.mark();
  marker.clear();
  assert.equal(marker.pending(), false);
  assert.equal(storage.items.size, 0);
});

test('FC-11: unexpected marker values or refused storage never show the notice', () => {
  const storage = tabStorage();
  storage.setItem('dlc-logout-unconfirmed-v1', 'yes');
  assert.equal(createLogoutMarker(storage).pending(), false);
  const refused = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('denied');
    },
    removeItem: () => {
      throw new Error('denied');
    },
  };
  const marker = createLogoutMarker(refused);
  assert.doesNotThrow(() => marker.mark());
  assert.doesNotThrow(() => marker.clear());
  assert.equal(marker.pending(), false);
});
