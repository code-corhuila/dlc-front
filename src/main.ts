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
import { createAuthAdapter } from './core/session/authAdapter.ts';
import { loadAuthConfig } from './core/session/authConfig.ts';
import {
  CHANNEL_NAME,
  CONTROL_KEY,
  createSessionControl,
} from './core/session/sessionControl.ts';
import type { Establishment } from './core/session/session.ts';
import { createHttpCapability } from './core/http/capability.ts';
import { createHttpClient, type HttpClientDeps } from './core/http/client.ts';
import { createTelemetry } from './core/telemetry/telemetry.ts';
import { renderFrame } from './layout/frame.ts';
import { orderNavigation } from './layout/navigation.ts';
import {
  renderLogoutUnconfirmed,
  renderServiceError,
  renderUpdateBanner,
} from './layout/pages.ts';
import { renderPublicFrame } from './layout/publicFrame.ts';

const NO_USER = { id: '', name: '', roles: [], permissions: [] };
type PreviewAuthPort = AuthPort & {
  demoFetch?: HttpClientDeps['fetch'];
  remote?: (message: unknown) => 'established' | 'cleared' | null;
  remoteRecord?: (raw: string | null) => 'established' | 'cleared' | null;
};
type AuthHooks = Readonly<{
  ended: () => void;
  renewed: (est: Establishment) => void;
  changed: (kind: 'established' | 'cleared' | null | undefined) => void;
}>;

/** Without Auth deployment data or the dev double, the session is unavailable. */
const unavailableAuth: PreviewAuthPort = {
  restore: () => Promise.reject(new Error('AUTH_NOT_CONFIGURED')),
  complete: () => Promise.reject(new Error('AUTH_NOT_CONFIGURED')),
  logout: () => Promise.resolve(),
};

/**
 * C05: deployments with /auth-config.json use the real Auth adapter; malformed data fails
 * closed. Only when it is absent may the local preview load its development double.
 */
async function loadAuthPort(hooks: AuthHooks): Promise<PreviewAuthPort> {
  const config = await loadAuthConfig({
    fetch: (url, init) => fetch(url, init),
  });
  if (config.status === 'configured') {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    const adapter = createAuthAdapter({
      fetch: (url, init) => fetch(url, init),
      uuid: () => crypto.randomUUID(),
      now: () => Date.now(),
      issuer: config.issuer,
      audience: config.audience,
      locks: navigator.locks,
      control: createSessionControl({
        // Storage access may throw (blocked site data); the control fails closed.
        storage: {
          getItem: (key) => localStorage.getItem(key),
          setItem: (key, value) => localStorage.setItem(key, value),
        },
        channel,
      }),
      onSessionEnded: hooks.ended,
      onRenewed: hooks.renewed,
    });
    // FC-12: other tabs announce only {generation, kind}; storage events also notify.
    channel.onmessage = (event) => hooks.changed(adapter.remote(event.data));
    addEventListener('storage', (event) => {
      if (event.key === CONTROL_KEY)
        hooks.changed(adapter.remoteRecord(event.newValue));
    });
    return adapter;
  }
  if (config.status === 'invalid') return unavailableAuth;
  try {
    const url = '/dev-auth.js';
    const module = (await import(url)) as {
      createAuthPort: () => PreviewAuthPort;
    };
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
    loadAuthPort({
      ended: () => session.invalidate('UNAUTHORIZED'),
      renewed: (est) => session.renewed(est),
      // Cleared elsewhere: clean up here; established elsewhere: serialized restore.
      changed: (kind) => {
        if (kind === 'cleared') session.invalidate('LOGOUT');
        if (kind === 'established') void session.start();
      },
    }),
  ]);
  const session = createSession(auth, {
    expiry: {
      now: () => Date.now(),
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (timer) => clearTimeout(timer as number),
    },
  });
  await session.start();

  // C05/FC-11: local sign-out is immediate; an unconfirmed revocation stays visible with
  // an explicit retry until Auth confirms it. Nothing is retried automatically.
  let logoutNotice: HTMLElement | null = null;
  async function logout() {
    logoutNotice?.remove();
    logoutNotice = null;
    const result = await session.logout();
    if (result.ok) return;
    logoutNotice = renderLogoutUnconfirmed(document, () => void logout());
    document.body.append(logoutNotice);
  }

  const navigation = registry.ok ? orderNavigation(registry.navigation) : [];
  const currentUser = () => {
    const { user, permissions } = session.getSnapshot();
    return user ? { ...user, permissions } : NO_USER;
  };
  const frame = renderFrame(document, {
    user: currentUser(),
    navigation,
    path: location.pathname,
    onLogout: () => void logout(),
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
    fetch: (url, init) => auth.demoFetch?.(url, init) ?? fetch(url, init),
    // The Auth adapter holds the access token privately; portals never see it (C05).
    accessToken: () =>
      session.getSnapshot().state !== 'authenticated'
        ? null
        : auth.freshAccessToken
          ? auth.freshAccessToken()
          : (auth.accessToken?.() ?? null),
    // C05: a protected 401 ends the session here and blocks restoration in every tab.
    onUnauthorized: () => {
      session.invalidate('UNAUTHORIZED');
      void auth.block?.();
    },
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
                retryRestore: () => session.retryRestore(),
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
    reachable: loader.reachable,
    onLost: loader.markImportFailed,
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
