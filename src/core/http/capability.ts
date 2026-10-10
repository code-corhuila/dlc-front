import { authorizeOperation } from './catalog.ts';
import type { HttpRequest, HttpResult } from './client.ts';
import { userMessage } from './messages.ts';

type Client = Readonly<{
  request: (input: HttpRequest) => Promise<HttpResult>;
}>;
export type PortalRequest = Omit<HttpRequest, 'public'>;

/** C02/C06 `context.http` for one mount: catalogue-checked, cancelled with the mount. */
export function createHttpCapability(
  client: Client,
  portalId: string,
  mountSignal: AbortSignal,
) {
  return Object.freeze({
    request: async (input: PortalRequest): Promise<HttpResult> => {
      if (mountSignal.aborted) throw new Error('CANCELLED');
      const allowed = authorizeOperation(portalId, input);
      if (!allowed.ok)
        return {
          ok: false,
          status: 0,
          error: 'INVALID_REQUEST',
          message: userMessage(0, 'INVALID_REQUEST', false),
          details: null,
          traceId: '',
          correlationId: '',
          kind: 'contract',
          retryable: false,
        };
      const signal = input.signal
        ? AbortSignal.any([input.signal, mountSignal])
        : mountSignal;
      return client.request({
        ...input,
        signal,
        public: allowed.operation.public,
      });
    },
  });
}
