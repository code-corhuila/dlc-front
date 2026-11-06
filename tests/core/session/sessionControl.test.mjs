import assert from 'node:assert/strict';
import test from 'node:test';
import { createSessionControl } from '../../../src/core/session/sessionControl.ts';
import { channel, memoryStorage } from './controlDoubles.mjs';

test('FC-11: an absent control record starts at generation 0, not blocked', () => {
  const control = createSessionControl({
    storage: memoryStorage(),
    channel: channel(),
  });
  assert.deepEqual(control.read(), { generation: 0, blocked: false });
});

test('FC-11: invalid control data fails closed (null)', () => {
  for (const raw of [
    'nope',
    '{}',
    '{"generation":-1,"blocked":false}',
    '{"generation":1.5,"blocked":false}',
    '{"generation":1,"blocked":"no"}',
    '{"generation":1,"blocked":false,"user":"x"}',
  ]) {
    const control = createSessionControl({
      storage: memoryStorage(raw),
      channel: channel(),
    });
    assert.equal(control.read(), null, raw);
  }
  const throwing = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {},
  };
  assert.equal(
    createSessionControl({ storage: throwing, channel: channel() }).read(),
    null,
  );
});

test('FC-11: advance persists only generation and blocked, and announces the kind', () => {
  const storage = memoryStorage('{"generation":4,"blocked":false}');
  const bus = channel();
  const control = createSessionControl({ storage, channel: bus });
  assert.deepEqual(control.advance('cleared'), {
    generation: 5,
    blocked: true,
  });
  assert.equal(
    storage.items.get('dlc-session-control-v1'),
    '{"generation":5,"blocked":true}',
  );
  assert.deepEqual(bus.sent, [{ generation: 5, kind: 'cleared' }]);
  assert.deepEqual(control.advance('established'), {
    generation: 6,
    blocked: false,
  });
  assert.deepEqual(bus.sent.at(-1), { generation: 6, kind: 'established' });
});

test('FC-11: a deliberate sign-in resets invalid control data', () => {
  const storage = memoryStorage('garbage');
  const control = createSessionControl({ storage, channel: channel() });
  assert.deepEqual(control.advance('established'), {
    generation: 1,
    blocked: false,
  });
  assert.deepEqual(control.read(), { generation: 1, blocked: false });
});
