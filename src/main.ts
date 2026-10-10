import { browserHistory } from './composition/browserHistory.ts';
import { createNavigationCapability } from './composition/capabilities.ts';
import { createLifecycle } from './composition/lifecycle.ts';
import { createEntryLoader } from './composition/loader.ts';
import { createShell } from './composition/shell.ts';
import { renderFrame } from './layout/frame.ts';
import { orderNavigation } from './layout/navigation.ts';
import { renderUnavailable } from './layout/pages.ts';
import { renderPublicFrame } from './layout/publicFrame.ts';

// Development placeholder until the C05 session port and Auth double land.
const user = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Administrador DI-LUCCA',
  roles: ['ADMINISTRATOR'],
  permissions: [],
};

async function boot() {
  const loader = createEntryLoader({
    fetch: (url, init) => fetch(url, init),
    importModule: (url) => import(url),
  });
  const registry = await loader.registry();
  const navigation = registry.ok ? orderNavigation(registry.navigation) : [];
  const frame = renderFrame(document, {
    user,
    navigation,
    path: location.pathname,
    onLogout: () => undefined,
  });
  if (!registry.ok) {
    document.body.append(frame.root);
    // C07: frame plus registry-unavailable state; no arbitrary entries are loaded.
    frame.host.replaceChildren(
      renderUnavailable(document, { onRetry: () => location.reload() }),
    );
    return;
  }

  const lifecycle = createLifecycle({
    container: frame.host,
    loadEntry: loader.loadEntry,
    uuid: () => crypto.randomUUID(),
    createContext: (base) =>
      Object.freeze({
        ...base,
        navigation: createNavigationCapability(base.signal, (target) =>
          shell.request(target),
        ),
      }),
  });
  const shell = createShell({
    document,
    frames: { app: frame, public: renderPublicFrame(document) },
    root: document.body,
    lifecycle,
    history: browserHistory(window),
    isAuthenticated: () => true,
    user: () => user,
    navigation: () => navigation,
    onRetry: loader.invalidate,
    reload: () => location.reload(),
  });
  await shell.start();
}

void boot();
