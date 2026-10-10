import { browserHistory } from './composition/browserHistory.ts';
import { createNavigationCapability } from './composition/capabilities.ts';
import { createLifecycle } from './composition/lifecycle.ts';
import { createEntryLoader } from './composition/loader.ts';
import { createShell } from './composition/shell.ts';
import {
  createSession,
  scopeSession,
  type AuthPort,
} from './core/session/session.ts';
import { renderFrame } from './layout/frame.ts';
import { orderNavigation } from './layout/navigation.ts';
import { renderUnavailable } from './layout/pages.ts';
import { renderPublicFrame } from './layout/publicFrame.ts';

const NO_USER = { id: '', name: '', roles: [], permissions: [] };

/** Until the Auth adapter exists, a deployment without the dev double is unavailable. */
const unavailableAuth: AuthPort = {
  restore: () => Promise.reject(new Error('AUTH_NOT_CONFIGURED')),
  complete: () => Promise.reject(new Error('AUTH_NOT_CONFIGURED')),
  logout: () => Promise.resolve(),
};

/** The development Auth double is served only by the local preview (fixtures/). */
async function loadAuthPort(): Promise<AuthPort> {
  try {
    const url = '/dev-auth.js';
    const module = (await import(url)) as { createAuthPort: () => AuthPort };
    return module.createAuthPort();
  } catch {
    return unavailableAuth;
  }
}

async function boot() {
  const loader = createEntryLoader({
    fetch: (url, init) => fetch(url, init),
    importModule: (url) => import(url),
  });
  const [registry, auth] = await Promise.all([
    loader.registry(),
    loadAuthPort(),
  ]);
  const session = createSession(auth);
  await session.start();

  const navigation = registry.ok ? orderNavigation(registry.navigation) : [];
  const currentUser = () => {
    const { user, permissions } = session.getSnapshot();
    return user ? { ...user, permissions } : NO_USER;
  };
  const frame = renderFrame(document, {
    user: currentUser(),
    navigation,
    path: location.pathname,
    onLogout: () => void session.logout(),
  });
  if (!registry.ok) {
    // C07: frame plus registry-unavailable state; no arbitrary entries are loaded.
    document.body.append(frame.root);
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
        session: scopeSession(session, base.signal),
        reportFailure: (failure: unknown) =>
          void shell.reportFailure(base.mountId, failure),
        // C05: only IAM may complete authentication or control the session.
        ...(base.portalId === 'iam'
          ? {
              iamSession: Object.freeze({
                complete: session.complete,
                logout: session.logout,
                retryRestore: () => session.start(),
              }),
            }
          : {}),
      }),
  });
  const shell = createShell({
    document,
    frames: { app: frame, public: renderPublicFrame(document) },
    root: document.body,
    lifecycle,
    history: browserHistory(window),
    isAuthenticated: () => session.getSnapshot().state === 'authenticated',
    user: currentUser,
    navigation: () => navigation,
    onRetry: loader.invalidate,
    reload: () => location.reload(),
    telemetry: (event) => console.info('dlc-front', event),
  });
  session.subscribe(() => {
    frame.setUser?.(currentUser());
    void shell.sessionChanged();
  });
  await shell.start();
}

void boot();
