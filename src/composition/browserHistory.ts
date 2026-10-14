import type { HistoryPort } from './shell.ts';

type BrowserWindow = Pick<Window, 'history' | 'location' | 'addEventListener'>;

/** History API adapter; each entry carries its shell index (C04). */
export function browserHistory(window: BrowserWindow): HistoryPort {
  const index = () => {
    const state: unknown = window.history.state;
    const value = (state as { dlcIndex?: unknown } | null)?.dlcIndex;
    return typeof value === 'number' ? value : 0;
  };
  return {
    current: () => new URL(window.location.href),
    index,
    push: (url, dlcIndex) => window.history.pushState({ dlcIndex }, '', url),
    replace: (url, dlcIndex) =>
      window.history.replaceState({ dlcIndex }, '', url),
    go: (delta) => window.history.go(delta),
    onPop: (listener) =>
      window.addEventListener('popstate', () =>
        listener(new URL(window.location.href), index()),
      ),
  };
}
