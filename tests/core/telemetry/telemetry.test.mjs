import assert from 'node:assert/strict';
import test from 'node:test';
import { createTelemetry } from '../../../src/core/telemetry/telemetry.ts';

const setup = () => {
  const sent = [];
  let t = 1000;
  const telemetry = createTelemetry({
    sink: (e) => sent.push(e),
    now: () => (t += 5),
    limit: 3,
  });
  return { telemetry, sent };
};

test('C07 / FC-17: only allowlisted identifiers and codes are recorded', () => {
  const { telemetry, sent } = setup();
  telemetry.record({
    code: 'PORTAL_RENDER_FAILED',
    stage: 'mount',
    portalId: 'clinical',
    release: '0.1.0-demo',
    mountId: 'm-1',
    compositionId: 'c-1',
    correlationId: 'r-1',
    traceId: 't-1',
    status: 500,
    durationMs: 12,
    token: 'Bearer abc',
    query: { q: ['Ana García'] },
    body: { diagnosis: 'x' },
    message: 'stack trace',
  });
  assert.deepEqual(sent, [
    {
      at: 1005,
      code: 'PORTAL_RENDER_FAILED',
      stage: 'mount',
      portalId: 'clinical',
      release: '0.1.0-demo',
      mountId: 'm-1',
      compositionId: 'c-1',
      correlationId: 'r-1',
      traceId: 't-1',
      status: 500,
      durationMs: 12,
    },
  ]);
});

test('C07: values that are not plain identifiers are dropped; events without a valid code are ignored', () => {
  const { telemetry, sent } = setup();
  telemetry.record({
    code: 'TIMEOUT',
    portalId: 'ana@example.com',
    correlationId: 'a b',
    status: '500',
  });
  telemetry.record({ code: 'lowercase code' });
  telemetry.record({ stage: 'mount' });
  assert.deepEqual(sent, [{ at: 1005, code: 'TIMEOUT' }]);
});

test('C07: a bounded in-memory log keeps the latest events; a failing sink is isolated', () => {
  const telemetry = createTelemetry({
    sink: () => {
      throw new Error('x');
    },
    now: () => 1,
    limit: 2,
  });
  for (const code of ['A', 'B', 'C']) telemetry.record({ code });
  assert.deepEqual(
    telemetry.recent().map((e) => e.code),
    ['B', 'C'],
  );
});
