/** localStorage double holding the dlc-session-control-v1 record. */
export function memoryStorage(initial) {
  const items = new Map(
    initial === undefined ? [] : [['dlc-session-control-v1', initial]],
  );
  return {
    items,
    getItem: (k) => (items.has(k) ? items.get(k) : null),
    setItem: (k, v) => void items.set(k, String(v)),
  };
}

/** BroadcastChannel double recording posted messages. */
export function channel() {
  const sent = [];
  return { sent, postMessage: (m) => sent.push(m) };
}
