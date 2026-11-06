/**
 * C05/FC-11: per-tab note (sessionStorage) that the server logout was not confirmed, so the
 * notice survives a reload. It holds only "1": no identity, token or credential. The shared
 * dlc-session-control-v1 record keeps exactly {generation, blocked}.
 */
export const LOGOUT_MARKER_KEY = 'dlc-logout-unconfirmed-v1';

export function createLogoutMarker(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
) {
  return Object.freeze({
    mark() {
      try {
        storage.setItem(LOGOUT_MARKER_KEY, '1');
      } catch {
        // Storage refused: the notice stays limited to the current page.
      }
    },
    clear() {
      try {
        storage.removeItem(LOGOUT_MARKER_KEY);
      } catch {
        // Nothing to clear when storage is unavailable.
      }
    },
    pending(): boolean {
      try {
        return storage.getItem(LOGOUT_MARKER_KEY) === '1';
      } catch {
        return false;
      }
    },
  });
}
