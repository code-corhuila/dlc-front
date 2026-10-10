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
import { createHttpCapability } from './core/http/capability.ts';
import { createHttpClient } from './core/http/client.ts';
import { createTelemetry } from './core/telemetry/telemetry.ts';
import { renderFrame } from './layout/frame.ts';
import { orderNavigation } from './layout/navigation.ts';
import { renderServiceError, renderUpdateBanner } from './layout/pages.ts';
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

/** C01 required browser facilities; no insecure fallback when missing (FC-18). */
const supported = () =>
  typeof AbortController === 'function' &&
  typeof BroadcastChannel === 'function' &&
  typeof history.pushState === 'function' &&
  'locks' in navigator &&
  typeof crypto?.randomUUID === 'function';

async function boot() {
  if (!supported()) {
    const page = renderPublicFrame(document);
    page.host.append(renderServiceError(document, 'UNSUPPORTED_BROWSER'));
    document.body.append(page.root);
    return;
  }
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
    // The owner (Patients) interprets the query; the shell only routes it (C04).
    onSearch: (term) =>
      void shell.request({
        path: `/app/patients?q=${encodeURIComponent(term)}`,
      }),
  });
  if (!registry.ok) {
    // C07: frame plus registry-unavailable state; no arbitrary entries are loaded.
    document.body.append(frame.root);
    frame.host.replaceChildren(
      renderServiceError(document, 'REGISTRY_UNAVAILABLE', () =>
        location.reload(),
      ),
    );
    return;
  }

  const telemetry = createTelemetry({
    sink: (event) => console.info('dlc-front', event),
  });
  const transport = createHttpClient({
    fetch: (url, init) => fetch(url, init),
    // The Auth adapter holds the access token privately; portals never see it (C05).
    accessToken: () =>
      session.getSnapshot().state === 'authenticated'
        ? (auth.accessToken?.() ?? null)
        : null,
    onUnauthorized: () => session.invalidate('UNAUTHORIZED'),
    uuid: () => crypto.randomUUID(),
  });
  // C07: record failed requests by code and ids only; cancellations are expected.
  const httpClient = {
    request: async (input: Parameters<typeof transport.request>[0]) => {
      const result = await transport.request(input);
      if (!result.ok && result.kind !== 'cancelled')
        telemetry.record({
          code: result.error,
          stage: 'http',
          status: result.status,
          correlationId: result.correlationId,
          traceId: result.traceId,
        });
      return result;
    },
  };

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
        http: createHttpCapability(httpClient, base.portalId, base.signal),
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
    sessionState: () => session.getSnapshot().state,
    // Explicit retry re-runs session resolution from a clean page (C05).
    retrySession: () => location.reload(),
    user: currentUser,
    navigation: () => navigation,
    onRetry: loader.invalidate,
    reload: () => location.reload(),
    probe: loader.probe,
    telemetry: telemetry.record,
  });
  session.subscribe(() => {
    frame.setUser?.(currentUser());
    void shell.sessionChanged();
  });
  await shell.start();

  // New releases are announced, never applied silently (registry stays no-store, C01).
  const timer = setInterval(async () => {
    const latest = await loader.revision();
    if (latest === null || latest === registry.revision) return;
    clearInterval(timer);
    document.body.append(renderUpdateBanner(document, () => location.reload()));
  }, 30000);
}

void boot();
