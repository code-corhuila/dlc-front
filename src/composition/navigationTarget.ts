import { resolveRoute } from './routes.ts';

export type TargetResult =
  | Readonly<{ ok: true; url: URL }>
  | Readonly<{ ok: false; error: 'INVALID_ROUTE' }>;

const INVALID: TargetResult = { ok: false, error: 'INVALID_ROUTE' };
// Slashes and their confusables; NFKC already folds fullwidth forms and dots (bot finding #5.1).
const SEPARATORS = /[/\\⁄∕⧸⧹]/u;

/** C04 `navigation.request` target: a recognized same-origin absolute path. */
export function validateNavigationTarget(
  path: unknown,
  origin: string,
): TargetResult {
  if (
    typeof path !== 'string' ||
    !path.startsWith('/') ||
    path.startsWith('//')
  )
    return INVALID;
  // eslint-disable-next-line no-control-regex -- control characters are rejected on purpose
  if (/[\\\u0000-\u001f\u007f]/u.test(path)) return INVALID;
  const pathname = path.split(/[?#]/u, 1)[0]!;
  for (const segment of pathname.slice(1).split('/')) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment).normalize('NFKC');
    } catch {
      return INVALID;
    }
    if (decoded === '.' || decoded === '..' || SEPARATORS.test(decoded))
      return INVALID;
  }
  const url = new URL(path, origin);
  if (url.origin !== origin) return INVALID;
  // Authentication is decided later by the shell; here only recognition matters.
  return resolveRoute(url, true).kind === 'not-found'
    ? INVALID
    : { ok: true, url };
}
