export type PortalId =
  'iam' | 'patient' | 'appointments' | 'billing' | 'clinical';

/** C04 route handed to a portal: plain data, no secrets. */
export type PortalRoute = Readonly<{
  globalPath: string;
  basePath: string;
  localPath: string;
  query: Readonly<Record<string, readonly string[]>>;
  fragment: string;
}>;

export type Resolution =
  | Readonly<{ kind: 'redirect'; to: string; replace: true }>
  | Readonly<{ kind: 'not-found' }>
  | Readonly<{ kind: 'home' }>
  | Readonly<{ kind: 'sign-in'; returnPath: string }>
  | Readonly<{
      kind: 'portal' | 'dashboard';
      portalId: PortalId;
      basePath: string;
      localPath: string;
      route: PortalRoute;
      protected: boolean;
    }>;

// C01 global route selection, literals before prefixes; `public` bases are IAM entry steps.
const OWNERS: readonly (readonly [string, PortalId, boolean])[] = [
  ['/login', 'iam', false],
  ['/recover-password', 'iam', false],
  ['/app/administration', 'iam', true],
  ['/app/patients', 'patient', true],
  ['/app/appointments', 'appointments', true],
  ['/app/billing', 'billing', true],
  ['/app/clinical', 'clinical', true],
];
const DASHBOARD = '/app/dashboard';
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const segments = (path: string) => path.split('/').filter(Boolean);

function within(path: string, base: string): string | null {
  const [p, b] = [segments(path), segments(base)];
  if (b.some((segment, index) => p[index] !== segment)) return null;
  return '/' + p.slice(b.length).join('/');
}

function toRoute(url: URL, basePath: string, localPath: string): PortalRoute {
  const query: Record<string, string[]> = {};
  url.searchParams.forEach((value, key) => (query[key] ??= []).push(value));
  return {
    globalPath: url.pathname,
    basePath,
    localPath,
    query,
    fragment: url.hash.replace(/^#/, ''),
  };
}

/** Selects the owner of a same-origin URL (C04); the portal interprets localPath. */
export function resolveRoute(url: URL, authenticated: boolean): Resolution {
  const path = url.pathname;
  // Owner decision: the public Home (mockup p. 1) replaces C04's anonymous redirect to Login.
  if (path === '/')
    return authenticated
      ? { kind: 'redirect', to: DASHBOARD, replace: true }
      : { kind: 'home' };
  if (segments(path).join('/') === 'app')
    return { kind: 'redirect', to: DASHBOARD, replace: true };

  const legacy = segments(path);
  if (
    legacy.length === 3 &&
    within(path, '/app/patients') &&
    UUID.test(legacy[2]!)
  )
    return {
      kind: 'redirect',
      to: `/app/clinical/${legacy[2]}${url.search}${url.hash}`,
      replace: true,
    };

  const protect = (r: Resolution): Resolution =>
    r.kind !== 'not-found' && 'protected' in r && r.protected && !authenticated
      ? { kind: 'sign-in', returnPath: path }
      : r;

  const dashboardLocal = within(path, DASHBOARD);
  if (dashboardLocal === '/')
    return protect({
      kind: 'dashboard',
      portalId: 'clinical',
      basePath: DASHBOARD,
      localPath: '/analytics',
      route: toRoute(url, DASHBOARD, '/analytics'),
      protected: true,
    });

  for (const [basePath, portalId, isProtected] of OWNERS) {
    const localPath = within(path, basePath);
    if (localPath !== null)
      return protect({
        kind: 'portal',
        portalId,
        basePath,
        localPath,
        route: toRoute(url, basePath, localPath),
        protected: isProtected,
      });
  }
  return { kind: 'not-found' };
}
