import type { Frame } from '../layout/frame.ts';
import type {
  NavigationDescriptor,
  NavigationUser,
} from '../layout/navigation.ts';
import {
  renderDashboard,
  renderNotFound,
  renderUnavailable,
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
  frame: Frame;
  lifecycle: ReturnType<typeof createLifecycle>;
  history: HistoryPort;
  isAuthenticated: () => boolean;
  user: () => NavigationUser & { name: string };
  navigation: () => readonly NavigationDescriptor[];
  onRetry: () => void;
  reload: () => void;
}>;

export type RequestStatus = Readonly<{
  status: 'applied' | 'cancelled' | 'rejected';
}>;
type Mode = 'push' | 'replace' | 'pop';

/** Compositor-only control of global history and the composition area (C04, C07). */
export function createShell(deps: ShellDeps) {
  const { document, frame, lifecycle, history } = deps;
  let index = history.index();
  let sequence = 0;
  let slot: string | null = null; // `${portalId}` when a portal owns the main host.
  let safeReturn: string | null = null;
  let suppressPop = false;
  let last: Promise<unknown> = Promise.resolve();

  function commit(url: URL, mode: Mode, popIndex: number) {
    if (mode === 'push') history.push(url, ++index);
    else if (mode === 'replace') history.replace(url, index);
    else index = popIndex;
    frame.setActive(url.pathname);
  }

  function focusContent() {
    const heading = frame.host.querySelector<HTMLElement>('h1[tabindex]');
    (heading ?? frame.main).focus();
  }

  function notice(container: HTMLElement, outcome: Outcome) {
    const quarantined = outcome.status === 'quarantined';
    container.replaceChildren(
      renderUnavailable(document, {
        onRetry: () => {
          if (quarantined) return deps.reload();
          deps.onRetry();
          void transition(history.current(), 'replace', index);
        },
      }),
    );
  }

  async function mountInto(
    id: PortalId,
    route: PortalRoute,
    container: HTMLElement,
  ) {
    const outcome = await lifecycle.show(id, route, container);
    if (outcome.status === 'failed' || outcome.status === 'quarantined')
      notice(container, outcome);
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
        url = new URL('/login', url);
      } else if (resolution.kind === 'redirect')
        url = new URL(resolution.to, url);
      else break;
      if (mode === 'pop') mode = 'replace';
      resolution = resolveRoute(url, deps.isAuthenticated());
    }

    const sameSlot =
      resolution.kind === 'portal' && slot === resolution.portalId;
    if (!sameSlot && !(await lifecycle.leave())) return 'cancelled';
    if (mine !== sequence) return 'cancelled';

    if (resolution.kind === 'portal') {
      if (!sameSlot) frame.host.replaceChildren();
      slot = resolution.portalId;
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
      await mountInto(
        resolution.portalId,
        resolution.route,
        page.analyticsHost,
      );
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
    /** Safe return pathname, consumed once on session establishment (C04). */
    consumeReturn: () => {
      const value = safeReturn;
      safeReturn = null;
      return value;
    },
    settled: () => last.then(() => undefined),
  };
}
