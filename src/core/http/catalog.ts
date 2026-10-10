import { OPERATIONS } from './__generated__/catalog.ts';

export type Operation = (typeof OPERATIONS)[number];
export type Authorization =
  | Readonly<{ ok: true; operation: Operation }>
  | Readonly<{ ok: false; error: 'INVALID_REQUEST' }>;

// C05: cookie-changing and MFA-completion operations go through session controls only.
const CONTROLLED = new Set([
  'AuthRotaterefreshtoken',
  'AuthLogout',
  'AuthVerifyMFAchallenge',
  'AuthConfirmMFAenrollment',
]);
const CSRF_PATH = '/api/v1/auth/csrf';

const matches = (template: string, path: string) => {
  const [a, b] = [template.split('/'), path.split('/')];
  return (
    a.length === b.length &&
    a.every(
      (part, i) => part === b[i] || (/^\{\w+\}$/.test(part) && b[i] !== ''),
    )
  );
};

/** C06: only catalogued operations, with their security and idempotency rules. */
export function authorizeOperation(
  portalId: string,
  input: Readonly<{
    method: string;
    path: string;
    headers?: Readonly<Record<string, string>>;
  }>,
): Authorization {
  const invalid = { ok: false, error: 'INVALID_REQUEST' } as const;
  const method = String(input.method).toUpperCase();
  const operation = OPERATIONS.find(
    (op) => op.method === method && matches(op.path, input.path),
  );
  if (
    !operation ||
    CONTROLLED.has(operation.operationId) ||
    operation.path === CSRF_PATH
  )
    return invalid;
  // Public Auth operations are available only to IAM's scoped capability.
  if (operation.public && portalId !== 'iam') return invalid;
  if (operation.idempotent) {
    const key = Object.entries(input.headers ?? {}).find(
      ([name]) => name.toLowerCase() === 'idempotency-key',
    )?.[1];
    if (typeof key !== 'string' || key.length < 8 || key.length > 128)
      return invalid;
  }
  return { ok: true, operation };
}
