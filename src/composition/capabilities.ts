import type { RequestStatus } from './shell.ts';

export type NavigationCapability = Readonly<{
  request: (target: {
    path: unknown;
    replace?: boolean;
  }) => Promise<RequestStatus>;
}>;

/** C02/C04: scoped to one mount; disposal rejects calls with CANCELLED. */
export function createNavigationCapability(
  signal: AbortSignal,
  request: NavigationCapability['request'],
): NavigationCapability {
  return Object.freeze({
    request: (target: { path: unknown; replace?: boolean }) =>
      signal.aborted
        ? Promise.reject(new Error('CANCELLED'))
        : request({ path: target.path, replace: target.replace === true }),
  });
}
