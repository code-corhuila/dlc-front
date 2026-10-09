import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { DEADLINES, createLifecycle } from '../../src/composition/lifecycle.ts';

const route = (localPath = '/') => ({
  globalPath: '/app/x' + localPath,
  basePath: '/app/x',
  localPath,
  query: {},
  fragment: '',
});
const never = () => new Promise(() => {});
const later = (ms, value) =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));
const fast = { load: 30, mount: 30, update: 30, leave: 30, unmount: 30 };

/** C02 test-double portal recording every lifecycle call. */
function double(portalId, log, overrides = {}) {
  const contexts = [];
  return {
    contexts,
    module: {
      portalId,
      contractVersion: 1,
      mount:
        overrides.mount ??
        (async (host, context) => {
          contexts.push(context);
          log.push(`${portalId}:mount`);
          host.textContent = portalId;
          return {
            updateRoute: async (r) =>
              log.push(`${portalId}:update:${r.localPath}`),
            canLeave: overrides.canLeave ?? (async () => true),
            unmount:
              overrides.unmount ??
              (async () => log.push(`${portalId}:unmount`)),
          };
        }),
    },
  };
}

function setup(portals, deadlines = fast) {
  const { document } = new Window();
  const container = document.createElement('section');
  let n = 0;
  const lifecycle = createLifecycle({
    container,
    deadlines,
    uuid: () => `id-${++n}`,
    loadEntry: async (portalId) => {
      const p = portals[portalId];
      if (!p) throw new Error('missing');
      return typeof p === 'function' ? p() : p.module;
    },
    createContext: (base) => ({ ...base, extra: 'capability' }),
  });
  return { lifecycle, container };
}

test('C02 deadlines: 10 s for load/mount/update/leave and 2 s for unmount', () => {
  assert.deepEqual(DEADLINES, {
    load: 10000,
    mount: 10000,
    update: 10000,
    leave: 10000,
    unmount: 2000,
  });
});

test('FC-01: mounts the selected entry into a fresh host with a plain context', async () => {
  const log = [];
  const clinical = double('clinical', log);
  const { lifecycle, container } = setup({ clinical });
  const outcome = await lifecycle.show('clinical', route('/analytics'));
  assert.deepEqual(outcome, { status: 'active' });
  assert.deepEqual(lifecycle.state(), {
    phase: 'ACTIVE',
    portalId: 'clinical',
  });
  const host = container.querySelector('[data-portal="clinical"]');
  assert.equal(host.textContent, 'clinical');
  const [context] = clinical.contexts;
  assert.deepEqual(Object.keys(context).sort(), [
    'compositionId',
    'contractVersion',
    'extra',
    'mountId',
    'portalId',
    'route',
    'signal',
  ]);
  assert.equal(context.contractVersion, 1);
  assert.equal(context.route.localPath, '/analytics');
  assert.equal(context.signal.aborted, false);
});

test('FC-02: invalid entry or mount failure stays local as PORTAL_UNAVAILABLE', async () => {
  const log = [];
  const portals = {
    billing: { module: { portalId: 'iam', contractVersion: 1, mount() {} } },
    patient: double('patient', log, {
      mount: async () => {
        throw new Error('boom');
      },
    }),
    clinical: double('clinical', log),
  };
  const { lifecycle, container } = setup(portals);
  const unavailable = { status: 'failed', code: 'PORTAL_UNAVAILABLE' };
  assert.deepEqual(await lifecycle.show('billing', route()), unavailable);
  assert.deepEqual(await lifecycle.show('patient', route()), unavailable);
  assert.deepEqual(await lifecycle.show('absent', route()), unavailable);
  assert.equal(lifecycle.state().phase, 'FAILED');
  assert.equal(container.childElementCount, 0);
  assert.deepEqual(await lifecycle.show('clinical', route()), {
    status: 'active',
  });
});

test('C02: a handle missing lifecycle functions is rejected and cleaned', async () => {
  const log = [];
  const iam = double('iam', log, {
    mount: async () => ({ unmount: async () => log.push('iam:unmount') }),
  });
  const { lifecycle } = setup({ iam });
  assert.equal((await lifecycle.show('iam', route())).status, 'failed');
  assert.deepEqual(log, ['iam:unmount']);
});

test('C02: same owner asks canLeave then updates the same instance', async () => {
  const log = [];
  const patient = double('patient', log);
  const { lifecycle } = setup({ patient });
  await lifecycle.show('patient', route('/'));
  assert.deepEqual(await lifecycle.show('patient', route('/new')), {
    status: 'active',
  });
  assert.deepEqual(log, ['patient:mount', 'patient:update:/new']);
});

test('FC-05: different owner unmounts the old portal before mounting the new', async () => {
  const log = [];
  const portals = {
    iam: double('iam', log),
    clinical: double('clinical', log),
  };
  const { lifecycle, container } = setup(portals);
  await lifecycle.show('iam', route());
  await lifecycle.show('clinical', route());
  await lifecycle.show('iam', route());
  assert.deepEqual(log, [
    'iam:mount',
    'iam:unmount',
    'clinical:mount',
    'clinical:unmount',
    'iam:mount',
  ]);
  assert.equal(container.childElementCount, 1);
});

test('FC-07: refused, rejected or slow canLeave cancels voluntary navigation', async () => {
  for (const canLeave of [
    async () => false,
    async () => {
      throw new Error('x');
    },
    never,
  ]) {
    const log = [];
    const portals = {
      patient: double('patient', log, { canLeave }),
      billing: double('billing', log),
    };
    const { lifecycle } = setup(portals);
    await lifecycle.show('patient', route());
    assert.deepEqual(await lifecycle.show('billing', route()), {
      status: 'cancelled',
    });
    assert.deepEqual(lifecycle.state(), {
      phase: 'ACTIVE',
      portalId: 'patient',
    });
    assert.deepEqual(log, ['patient:mount']);
  }
});

test('FC-07: forced cleanup cannot be vetoed', async () => {
  const log = [];
  const patient = double('patient', log, { canLeave: async () => false });
  const { lifecycle, container } = setup({ patient });
  await lifecycle.show('patient', route());
  await lifecycle.clear();
  assert.deepEqual(log, ['patient:mount', 'patient:unmount']);
  assert.deepEqual(lifecycle.state(), { phase: 'IDLE', portalId: null });
  assert.equal(container.childElementCount, 0);
});

test('FC-03: a newer target supersedes a slow mount and its late handle is cleaned', async () => {
  const log = [];
  let slowContext;
  const slow = double('clinical', log, {
    mount: async (host, context) => {
      slowContext = context;
      await later(15);
      return {
        updateRoute: async () => {},
        canLeave: async () => true,
        unmount: async () => log.push('clinical:late-unmount'),
      };
    },
  });
  const { lifecycle, container } = setup(
    { clinical: slow, billing: double('billing', log) },
    { ...fast, mount: 200 },
  );
  const first = lifecycle.show('clinical', route());
  await later(1);
  const second = await lifecycle.show('billing', route());
  assert.deepEqual(await first, { status: 'superseded' });
  assert.deepEqual(second, { status: 'active' });
  assert.equal(slowContext.signal.aborted, true);
  await later(20);
  assert.ok(log.includes('clinical:late-unmount'));
  assert.equal(container.querySelectorAll('[data-portal]').length, 1);
});

test('C02: a mount over its deadline fails and the late handle is unmounted', async () => {
  const log = [];
  const slow = double('billing', log, {
    mount: async () => {
      await later(60);
      return {
        updateRoute: async () => {},
        canLeave: async () => true,
        unmount: async () => log.push('billing:late-unmount'),
      };
    },
  });
  const { lifecycle } = setup({ billing: slow });
  assert.equal((await lifecycle.show('billing', route())).status, 'failed');
  await later(50);
  assert.deepEqual(log, ['billing:late-unmount']);
});

test('FC-04: cleanup over its deadline quarantines only that portal', async () => {
  const log = [];
  const portals = {
    appointments: double('appointments', log, { unmount: never }),
    billing: double('billing', log),
  };
  const { lifecycle, container } = setup(portals);
  await lifecycle.show('appointments', route());
  assert.deepEqual(await lifecycle.show('billing', route()), {
    status: 'active',
  });
  assert.deepEqual(await lifecycle.show('appointments', route()), {
    status: 'quarantined',
  });
  assert.equal(container.querySelector('[data-portal="appointments"]'), null);
  assert.deepEqual(lifecycle.state(), { phase: 'ACTIVE', portalId: 'billing' });
});

test('C02: a failed route update ends the mount with a local failure', async () => {
  const log = [];
  const patient = double('patient', log, {
    mount: async () => ({
      updateRoute: async () => {
        throw new Error('route');
      },
      canLeave: async () => true,
      unmount: async () => log.push('patient:unmount'),
    }),
  });
  const { lifecycle, container } = setup({ patient });
  await lifecycle.show('patient', route('/'));
  assert.deepEqual(await lifecycle.show('patient', route('/x')), {
    status: 'failed',
    code: 'PORTAL_UNAVAILABLE',
  });
  assert.deepEqual(lifecycle.state(), { phase: 'FAILED', portalId: null });
  assert.deepEqual(log, ['patient:unmount']);
  assert.equal(container.childElementCount, 0);
});
