import type { Frame } from '../layout/frame.ts';
import type {
  NavigationDescriptor,
  NavigationUser,
} from '../layout/navigation.ts';
import {
  renderDashboard,
  renderHome,
  renderNotFound,
  renderServiceError,
  renderUnavailable,
  markAvailable,
} from '../layout/pages.ts';
import type { createLifecycle, Outcome } from './lifecycle.ts';
import { validateNavigationTarget } from './navigationTarget.ts';
import { resolveRoute, type PortalId, type PortalRoute } from './routes.ts';

/** History API adapter carrying the shell index of each entry (C04). */
export type HistoryPort = Readonly<{
  current: () => URL;
  index: () => number;
  push: (url: URL, index: number) => void;
  replace: (url: URL, index: number) => void;
  go: (delta: number) => void;
  onPop: (listener: (url: URL, index: number) => void) => void;
}>;

export type ShellDeps = Readonly<{
  document: Document;
  /** Authenticated app frame and public brand frame (IAM Login/Recovery). */
  frames: Readonly<{ app: Frame; public: Frame }>;
  /** Element that holds the active frame (document.body in the browser). */
  root: HTMLElement;
  lifecycle: ReturnType<typeof createLifecycle>;
  history: HistoryPort;
  isAuthenticated: () => boolean;
  /** C05 state: unavailable/expired block protected mounting with their own page. */
  sessionState?: () => string;
  retrySession?: () => void;
  user: () => NavigationUser & { name: string };
  navigation: () => readonly NavigationDescriptor[];
  onRetry: () => void;
  reload: () => void;
  /** C07 recovery watch: probes a down portal and announces when it answers again. */
  probe?: (portalId: PortalId) => Promise<boolean>;
  /** Liveness of an active portal's entry (owner decision: drop a portal that went down). */
  reachable?: (portalId: PortalId) => Promise<boolean>;
  /** Called when an active portal is dropped, so its recovery can be probed. */
  onLost?: (portalId: PortalId) => void;
  schedule?: (tick: () => Promise<void>, ms: number) => () => void;
  /** Safe C07 record: code and identifiers only, never content or credentials. */
  /** Safe C07 record: codes and opaque identifiers only (core/telemetry). */
  telemetry?: (event: Readonly<Record<string, string | number>>) => void;
}>;

export type RequestStatus = Readonly<{
  status: 'applied' | 'cancelled' | 'rejected';
}>;
type Mode = 'push' | 'replace' | 'pop';

/** Compositor-only control of global history and the composition area (C04, C07). */
export function createShell(deps: ShellDeps) {
  const { document, lifecycle, history } = deps;
  let frame = deps.frames.app;
  let index = history.index();
  let sequence = 0;
  let slot: string | null = null; // `${portalId}` when a portal owns the main host.
  let safeReturn: string | null = null;
  let suppressPop = false;
  let last: Promise<unknown> = Promise.resolve();
  let authenticated = deps.isAuthenticated();

  function commit(url: URL, mode: Mode, popIndex: number) {
    if (mode === 'push') history.push(url, ++index);
    else if (mode === 'replace') history.replace(url, index);
    else index = popIndex;
    frame.setActive(url.pathname);
  }

  function use(kind: 'app' | 'public') {
    frame = deps.frames[kind];
    if (frame.root.parentNode !== deps.root)
      deps.root.replaceChildren(frame.root);
  }

  function focusContent() {
    const heading = frame.host.querySelector<HTMLElement>('h1[tabindex]');
    (heading ?? frame.main).focus();
  }

  const schedule =
    deps.schedule ??
    ((tick: () => Promise<void>, ms: number) => {
      const id = setInterval(() => void tick(), ms);
      return () => clearInterval(id);
    });

  /** Ends a live mount whose entry stopped answering and shows the local notice (C07). */
  async function lose(portalId: PortalId, mountId: string) {
    const container = await lifecycle.fail(mountId);
    if (!container) return;
    deps.telemetry?.({ code: 'PORTAL_LOST', portalId, mountId });
    deps.onLost?.(portalId);
    if (container === frame.host) slot = null;
    notice(
      container,
      { status: 'failed', code: 'PORTAL_UNAVAILABLE' },
      portalId,
    );
  }

  let watched: string | null = null;
  function watchLive(portalId: PortalId) {
    const reachable = deps.reachable;
    const mountId = lifecycle.activeMountId();
    if (!reachable || !mountId || mountId === watched) return;
    watched = mountId; // One watcher per mount, even across same-owner route updates.
    let misses = 0;
    const stop = schedule(async () => {
      if (lifecycle.activeMountId() !== mountId) return stop();
      // Two consecutive misses avoid dropping a portal on a single slow answer.
      misses = (await reachable(portalId)) ? 0 : misses + 1;
      if (misses < 2 || lifecycle.activeMountId() !== mountId) return;
      stop();
      await lose(portalId, mountId);
    }, 5000);
  }

  function notice(
    container: HTMLElement,
    outcome: Outcome,
    portalId?: PortalId,
  ) {
    const quarantined = outcome.status === 'quarantined';
    const card = renderUnavailable(document, {
      onRetry: () => {
        if (quarantined) return deps.reload();
        deps.onRetry();
        void transition(history.current(), 'replace', index);
      },
    });
    container.replaceChildren(card);
    if (!portalId || !deps.probe || quarantined) return;
    const probe = deps.probe;
    const stop = schedule(async () => {
      if (!card.isConnected) return stop();
      if (await probe(portalId)) {
        stop();
        markAvailable(card, deps.reload);
      }
    }, 5000);
  }

  async function mountInto(
    id: PortalId,
    route: PortalRoute,
    container: HTMLElement,
  ) {
    const outcome = await lifecycle.show(id, route, container);
    if (outcome.status === 'active') watchLive(id);
    if (outcome.status === 'failed' || outcome.status === 'quarantined') {
      deps.telemetry?.({
        code: outcome.status === 'failed' ? outcome.code : 'PORTAL_QUARANTINED',
        portalId: id,
        stage: 'load',
      });
      notice(container, outcome, id);
    }
    return outcome;
  }

  async function transition(target: URL, requested: Mode, popIndex: number) {
    const mine = ++sequence;
    let url = target;
    let mode = requested;
    let resolution = resolveRoute(url, deps.isAuthenticated());
    for (let hops = 0; hops < 3; hops++) {
      if (resolution.kind === 'sign-in') {
        safeReturn = resolution.returnPath;
        const state = deps.sessionState?.();
        if (state === 'unavailable' || state === 'expired') {
          if (!(await lifecycle.leave()) || mine !== sequence)
            return 'cancelled';
          slot = null;
          use('public');
          frame.host.replaceChildren(
            renderServiceError(
              document,
              state === 'expired' ? 'SESSION_EXPIRED' : 'SESSION_UNAVAILABLE',
              deps.retrySession,
            ),
          );
          commit(url, mode, popIndex);
          focusContent();
          return 'applied';
        }
        url = new URL('/login', url);
      } else if (resolution.kind === 'redirect')
        url = new URL(resolution.to, url);
      else break;
      if (mode === 'pop') mode = 'replace';
      resolution = resolveRoute(url, deps.isAuthenticated());
    }

    // A slot is one owner inside one frame: IAM in the public and the app frame differ.
    const slotKey =
      resolution.kind === 'portal'
        ? `${resolution.protected ? 'app' : 'public'}:${resolution.portalId}`
        : null;
    const sameSlot = slotKey !== null && slot === slotKey;
    if (!sameSlot && !(await lifecycle.leave())) return 'cancelled';
    if (mine !== sequence) return 'cancelled';

    if (resolution.kind === 'portal') {
      use(resolution.protected ? 'app' : 'public');
      if (!sameSlot) frame.host.replaceChildren();
      slot = slotKey;
      const outcome = await mountInto(
        resolution.portalId,
        resolution.route,
        frame.host,
      );
      if (outcome.status === 'cancelled') return 'cancelled';
      commit(url, mode, popIndex);
      if (outcome.status === 'active') focusContent();
      return 'applied';
    }

    slot = null;
    if (resolution.kind === 'home') {
      use('public');
      frame.host.replaceChildren(renderHome(document));
      commit(url, mode, popIndex);
      focusContent();
      return 'applied';
    }
    use('app');
    if (resolution.kind === 'dashboard') {
      const user = deps.user();
      const page = renderDashboard(document, {
        userName: user.name,
        user,
        navigation: deps.navigation(),
      });
      frame.host.replaceChildren(page.root);
      commit(url, mode, popIndex);
      focusContent();
      const analytics = await mountInto(
        resolution.portalId,
        resolution.route,
        page.analyticsHost,
      );
      // Clinical renders the mockup header itself; the shell heading stays for focus only.
      if (analytics.status === 'active') page.root.dataset.analytics = 'active';
      return 'applied';
    }
    frame.host.replaceChildren(renderNotFound(document));
    commit(url, mode, popIndex);
    focusContent();
    return 'applied';
  }

  function run(url: URL, mode: Mode, popIndex = index) {
    const pending = transition(url, mode, popIndex);
    last = pending;
    return pending;
  }

  /** C07: the live mount reported a fatal failure; end it and contain it locally. */
  async function reportFailure(mountId: string, failure: unknown) {
    const code = (failure as { code?: unknown } | null)?.code;
    if (code !== 'PORTAL_RENDER_FAILED' && code !== 'PORTAL_TASK_FAILED')
      return false;
    const portalId = lifecycle.state().portalId;
    const container = await lifecycle.fail(mountId);
    if (!container || !portalId) return false;
    deps.telemetry?.({ code, portalId, mountId });
    if (container === frame.host) slot = null;
    notice(
      container,
      { status: 'failed', code: 'PORTAL_UNAVAILABLE' },
      portalId,
    );
    return true;
  }

  /** C05: session ended → forced cleanup and Login; established → safe return once. */
  async function sessionChanged() {
    const now = deps.isAuthenticated();
    if (now === authenticated) return;
    authenticated = now;
    const current = history.current();
    if (!now) {
      await lifecycle.clear();
      slot = null;
      frame.host.replaceChildren();
      await run(current, 'replace');
      return;
    }
    const back = safeReturn;
    safeReturn = null;
    const resolved = resolveRoute(current, true);
    const onPublic = resolved.kind === 'portal' && !resolved.protected;
    const target = back ?? (onPublic ? '/app/dashboard' : null);
    await run(target ? new URL(target, current) : current, 'replace');
  }

  async function request(input: {
    path: unknown;
    replace?: boolean;
  }): Promise<RequestStatus> {
    const target = validateNavigationTarget(
      input.path,
      history.current().origin,
    );
    if (!target.ok) return { status: 'rejected' };
    const status = await run(target.url, input.replace ? 'replace' : 'push');
    return { status: status === 'applied' ? 'applied' : 'cancelled' };
  }

  history.onPop((url, popped) => {
    if (suppressPop) {
      suppressPop = false;
      return;
    }
    const previous = index;
    void run(url, 'pop', popped).then((status) => {
      if (status !== 'cancelled') return;
      suppressPop = true; // Compensating traversal restores the previous URL.
      history.go(previous - popped);
    });
  });

  document.addEventListener('click', (event) => {
    const anchor = (event.target as Element | null)?.closest?.('a[href]');
    if (!(anchor instanceof document.defaultView!.HTMLAnchorElement)) return;
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    if (
      (anchor.target && anchor.target !== '_self') ||
      anchor.hasAttribute('download')
    )
      return;
    const url = new URL(anchor.href, history.current());
    if (url.origin !== history.current().origin) return;
    event.preventDefault();
    void run(url, 'push');
  });

  return {
    start: () => run(history.current(), 'replace'),
    request,
    reportFailure,
    sessionChanged,
    /** Safe return pathname, consumed once on session establishment (C04). */
    consumeReturn: () => {
      const value = safeReturn;
      safeReturn = null;
      return value;
    },
    settled: () => last.then(() => undefined),
  };
}
