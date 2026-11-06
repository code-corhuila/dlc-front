/**
 * C05 shared session control: the localStorage record dlc-session-control-v1 holds only
 * {generation, blocked}; BroadcastChannel dlc-session-v1 carries only {generation, kind}.
 * No identity, token or credential is ever stored or broadcast. Callers update it under
 * the dlc-auth-v1 lock.
 */
export type ControlRecord = Readonly<{ generation: number; blocked: boolean }>;
export type ControlKind = 'established' | 'cleared';

export type SessionControlDeps = Readonly<{
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  channel: Pick<BroadcastChannel, 'postMessage'>;
}>;

export const CONTROL_KEY = 'dlc-session-control-v1';
export const CHANNEL_NAME = 'dlc-session-v1';

export function parseControl(raw: string | null): ControlRecord | null {
  if (raw === null) return { generation: 0, blocked: false };
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      return null;
    const { generation, blocked, ...rest } = value as Record<string, unknown>;
    if (
      !Number.isSafeInteger(generation) ||
      (generation as number) < 0 ||
      typeof blocked !== 'boolean' ||
      Object.keys(rest).length > 0
    )
      return null;
    return { generation: generation as number, blocked };
  } catch {
    return null;
  }
}

export function createSessionControl(deps: SessionControlDeps) {
  /** Current record; null means invalid data, which fails closed. */
  function read(): ControlRecord | null {
    try {
      return parseControl(deps.storage.getItem(CONTROL_KEY));
    } catch {
      return null;
    }
  }

  /** Next generation: established clears the block, cleared sets it; both are announced. */
  function advance(kind: ControlKind): ControlRecord {
    const next = {
      generation: (read()?.generation ?? 0) + 1,
      blocked: kind === 'cleared',
    };
    try {
      deps.storage.setItem(CONTROL_KEY, JSON.stringify(next));
    } catch {
      // Storage refused: other tabs still learn the change from the channel.
    }
    deps.channel.postMessage({ generation: next.generation, kind });
    return next;
  }

  return Object.freeze({ read, advance });
}

export type SessionControl = ReturnType<typeof createSessionControl>;
