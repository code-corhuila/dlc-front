/**
 * C07 safe telemetry: codes, stages and opaque identifiers only. Queries, bodies, tokens,
 * identities, messages and clinical or financial content are never recorded.
 */
export type TelemetryEvent = Readonly<{
  at: number;
  code: string;
  stage?: string;
  portalId?: string;
  release?: string;
  mountId?: string;
  compositionId?: string;
  correlationId?: string;
  traceId?: string;
  status?: number;
  durationMs?: number;
}>;

const CODE = /^[A-Z][A-Z0-9_]{0,63}$/;
const ID = /^[A-Za-z0-9._-]{1,128}$/;
const ID_FIELDS = [
  'stage',
  'portalId',
  'release',
  'mountId',
  'compositionId',
  'correlationId',
  'traceId',
] as const;
const NUMBER_FIELDS = ['status', 'durationMs'] as const;

export type TelemetryDeps = Readonly<{
  sink: (event: TelemetryEvent) => void;
  now?: () => number;
  limit?: number;
}>;

export function createTelemetry(deps: TelemetryDeps) {
  const limit = deps.limit ?? 100;
  const log: TelemetryEvent[] = [];

  function record(input: Readonly<Record<string, unknown>>) {
    if (typeof input.code !== 'string' || !CODE.test(input.code)) return;
    const event: Record<string, unknown> = {
      at: (deps.now ?? Date.now)(),
      code: input.code,
    };
    for (const field of ID_FIELDS) {
      const value = input[field];
      if (typeof value === 'string' && ID.test(value)) event[field] = value;
    }
    for (const field of NUMBER_FIELDS) {
      const value = input[field];
      if (typeof value === 'number' && Number.isFinite(value))
        event[field] = value;
    }
    const safe = Object.freeze(event) as TelemetryEvent;
    log.push(safe);
    if (log.length > limit) log.shift();
    try {
      deps.sink(safe);
    } catch {
      // Telemetry never affects the shell or a portal.
    }
  }

  return { record, recent: () => [...log] };
}
