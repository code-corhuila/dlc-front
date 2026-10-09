export type RequestTarget = Readonly<{
  path: string;
  headers: Readonly<Record<string, string>>;
}>;

export type TargetValidation =
  { ok: true; target: RequestTarget } | { ok: false; error: 'INVALID_REQUEST' };

// C06 / FC-13: an internal shape check, not operation approval or authorization.
export function validateRequestTarget(input: unknown): TargetValidation {
  const invalid = { ok: false, error: 'INVALID_REQUEST' } as const;
  if (!isRecord(input) || typeof input.path !== 'string') return invalid;
  const path = input.path;
  if (!path.startsWith('/api/v1/') || path.length === 8) return invalid;

  // Check each segment before a browser can normalize traversal or separators.
  for (const segment of path.slice(1).split('/')) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return invalid;
    }
    // Residual percent signs are rejected to prevent nested encoding ambiguity.
    if (
      !decoded ||
      decoded === '.' ||
      decoded === '..' ||
      // eslint-disable-next-line no-control-regex -- C06 rejects control characters on purpose
      /[\s\u0000-\u001f\u007f/\\?#%]/u.test(decoded)
    )
      return invalid;
  }

  const source = input.headers === undefined ? {} : input.headers;
  if (!isRecord(source)) return invalid;
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(source)) {
    const key = name.toLowerCase();
    if (
      !allowedHeaders.has(key) ||
      Object.hasOwn(headers, key) ||
      typeof value !== 'string' ||
      // eslint-disable-next-line no-control-regex -- C06 rejects control characters on purpose
      /[\u0000-\u001f\u007f]/u.test(value)
    ) {
      return invalid;
    }
    headers[key] = value;
  }
  return { ok: true, target: { path, headers } };
}

const allowedHeaders = new Set([
  'accept',
  'content-type',
  'if-match',
  'idempotency-key',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
