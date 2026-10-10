import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createLifecycle } from '../../src/composition/lifecycle.ts';
import { createShell } from '../../src/composition/shell.ts';
import { renderFrame } from '../../src/layout/frame.ts';
import { BASELINE_NAVIGATION } from '../../src/layout/navigation.ts';
import { renderPublicFrame } from '../../src/layout/publicFrame.ts';

const ORIGIN = 'https://dlc.test';
const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const user = {
  id: 'u1',
  name: 'Administrador DI-LUCCA',
  roles: ['ADMINISTRATOR'],
  permissions: [],
};

/** In-memory History API double with shell indexes. */
function fakeHistory(start) {
  const entries = [{ url: new URL(start, ORIGIN), index: 0 }];
  let at = 0;
  const log = [];
  let pop = () => {};
  return {
    log,
    entries,
    current: () => entries[at].url,
    index: () => entries[at].index,
    push(url, index) {
      entries.splice(at + 1, Infinity, { url, index });
      at += 1;
      log.push(`push ${url.pathname}`);
    },
    replace(url, index) {
      entries[at] = { url, index };
      log.push(`replace ${url.pathname}`);
    },
    go(delta) {
      at += delta;
      log.push(`go ${delta}`);
      pop(entries[at].url, entries[at].index);
    },
    back() {
      at -= 1;
      pop(entries[at].url, entries[at].index);
    },
    onPop(listener) {
      pop = listener;
    },
  };
}

/** C02 test-double portal: renders its id and local path. */
function portal(portalId, options = {}) {
  return {
    portalId,
    contractVersion: 1,
    async mount(host, context) {
      if (options.fail) throw new Error('down');
      host.innerHTML = `<h1 tabindex="-1">${portalId}</h1><p>${context.route.localPath}</p>`;
      return {
        updateRoute: async (route) => {
          host.querySelector('p').textContent = route.localPath;
        },
        canLeave: async () => options.canLeave?.() ?? true,
        unmount: async () => {
          host.textContent = '';
        },
      };
    },
  };
}

async function setup(start, portals = {}, { authenticated = true } = {}) {
  const window = new Window({ url: ORIGIN + start });
  const { document } = window;
  const frame = renderFrame(document, {
    user,
    navigation: BASELINE_NAVIGATION,
    path: start,
    onLogout: () => {},
  });
  const publicFrame = renderPublicFrame(document);
  let n = 0;
  const retries = [];
  const lifecycle = createLifecycle({
    container: frame.host,
    deadlines: { load: 50, mount: 50, update: 50, leave: 50, unmount: 50 },
    uuid: () => `id-${++n}`,
    loadEntry: async (id) => {
      if (!portals[id]) throw new Error('PORTAL_DISABLED');
      return portals[id];
    },
    createContext: (base) => base,
  });
  const history = fakeHistory(start);
  const shell = createShell({
    document,
    frames: { app: frame, public: publicFrame },
    root: document.body,
    lifecycle,
    history,
    isAuthenticated: () => authenticated,
    user: () => user,
    navigation: () => BASELINE_NAVIGATION,
    onRetry: () => retries.push('retry'),
    reload: () => retries.push('reload'),
  });
  await shell.start();
  return { document, frame, history, shell, retries };
}

const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();

test('C04: "/" replaces to the dashboard; Clinical mounts Analytics in its host', async () => {
  const { document, history } = await setup('/', {
    clinical: portal('clinical'),
  });
  assert.deepEqual(history.log, ['replace /app/dashboard']);
  const analytics = document.querySelector('.dlc-analytics-host');
  assert.match(text(analytics), /clinical\s*\/analytics/);
  assert.ok(document.querySelector('.dlc-shortcut[href="/app/billing"]'));
  assert.equal(document.activeElement.textContent, 'Panel');
});

test('FC-15: Clinical failing on the dashboard keeps shortcuts usable', async () => {
  const { document, retries } = await setup('/app/dashboard', {});
  const analytics = document.querySelector('.dlc-analytics-host');
  const notice = analytics.querySelector('[data-code="PORTAL_UNAVAILABLE"]');
  assert.ok(notice);
  assert.equal(document.querySelectorAll('.dlc-shortcut').length, 5);
  notice.querySelector('button').click();
  assert.deepEqual(retries, ['retry']);
});

test('C04: request mounts the owner, updates history, active item and focus', async () => {
  const { document, history, shell } = await setup('/app/dashboard', {
    patient: portal('patient'),
  });
  assert.deepEqual(await shell.request({ path: '/app/patients/new' }), {
    status: 'applied',
  });
  assert.equal(history.current().pathname, '/app/patients/new');
  assert.match(
    text(document.querySelector('#composition-host')),
    /patient\s*\/new/,
  );
  assert.equal(
    document.querySelector('nav a[aria-current]').textContent.trim(),
    'Pacientes',
  );
  assert.equal(document.activeElement.textContent, 'patient');
  await shell.request({ path: '/app/patients' });
  assert.match(
    text(document.querySelector('#composition-host')),
    /patient\s*\/$/,
  );
});

test('FC-06: legacy alias pushes the canonical clinical path', async () => {
  const { history, shell } = await setup('/app/dashboard', {
    clinical: portal('clinical'),
  });
  await shell.request({ path: `/app/patients/${uuid}` });
  assert.equal(history.current().pathname, `/app/clinical/${uuid}`);
  assert.deepEqual(history.log.slice(-1), [`push /app/clinical/${uuid}`]);
});

test('C04: invalid targets are rejected; unknown deep links show the shell 404', async () => {
  const { document, history, shell } = await setup('/app/unknown', {});
  assert.match(
    text(document.querySelector('#composition-host')),
    /Página no encontrada/,
  );
  assert.deepEqual(await shell.request({ path: '//evil.test/x' }), {
    status: 'rejected',
  });
  assert.deepEqual(await shell.request({ path: '/app/nothing' }), {
    status: 'rejected',
  });
  assert.equal(history.current().pathname, '/app/unknown');
});

test('FC-07: refused leave cancels and keeps URL; cancelled Back is compensated', async () => {
  let allow = false;
  const { history, shell } = await setup('/app/dashboard', {
    clinical: portal('clinical'),
    billing: portal('billing', { canLeave: () => allow }),
  });
  allow = true;
  await shell.request({ path: '/app/billing' });
  allow = false;
  assert.deepEqual(await shell.request({ path: '/app/patients' }), {
    status: 'cancelled',
  });
  assert.equal(history.current().pathname, '/app/billing');
  history.back();
  await shell.settled();
  assert.equal(history.current().pathname, '/app/billing');
  assert.deepEqual(history.log.slice(-1), ['go 1']);
});

test('C07: a failed portal shows a local notice; retry re-attempts', async () => {
  const { document, retries } = await setup('/app/billing', {
    billing: portal('billing', { fail: true }),
  });
  const host = document.querySelector('#composition-host');
  assert.ok(host.querySelector('[data-code="PORTAL_UNAVAILABLE"]'));
  assert.ok(document.querySelector('.dlc-sidebar nav a'));
  host.querySelector('button').click();
  assert.deepEqual(retries, ['retry']);
});

test('C04: anonymous protected deep link goes to IAM login with a one-time return', async () => {
  const { history, shell } = await setup(
    '/app/billing?x=1',
    {
      iam: portal('iam'),
    },
    { authenticated: false },
  );
  assert.equal(history.current().pathname, '/login');
  assert.equal(shell.consumeReturn(), '/app/billing');
  assert.equal(shell.consumeReturn(), null);
});

test('C04: same-origin link clicks are routed through the shell', async () => {
  const { document, history } = await setup('/app/dashboard', {
    clinical: portal('clinical'),
    billing: portal('billing'),
  });
  document.querySelector('.dlc-shortcut[href="/app/billing"]').click();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(history.current().pathname, '/app/billing');
});

test('IAM public routes use the public frame; protected routes swap back', async () => {
  const { document, shell } = await setup('/login', {
    iam: portal('iam'),
    billing: portal('billing'),
  });
  assert.ok(
    document.querySelector('.dlc-public #public-host [data-portal="iam"]'),
  );
  assert.equal(document.querySelector('.dlc-shell'), null);
  await shell.request({ path: '/app/billing' });
  assert.equal(document.querySelector('.dlc-public'), null);
  assert.ok(document.querySelector('.dlc-shell [data-portal="billing"]'));
});

test('IAM moving from /login to /app/administration remounts in the app frame', async () => {
  const { document, shell } = await setup('/app/dashboard', {
    iam: portal('iam'),
  });
  await shell.request({ path: '/login' });
  await shell.request({ path: '/app/administration' });
  assert.equal(document.querySelector('.dlc-dashboard'), null);
  assert.equal(document.querySelector('.dlc-public'), null);
  assert.ok(document.querySelector('.dlc-shell [data-portal="iam"]'));
});
