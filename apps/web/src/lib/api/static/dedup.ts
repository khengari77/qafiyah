// @WARN: cached promise is keyed by string and stored as `Promise<unknown>`. The
//   sharePromise helper trusts that callers use a stable key→type mapping (e.g.
//   always pair 'eras:list' with `Era[]`). The cast at the call site documents
//   the key→type contract that TypeScript cannot infer through a string map.
const pendingByKey = new Map<string, Promise<unknown>>();

export function sharePromise<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = pendingByKey.get(key);
  if (hit) return hit as Promise<T>;
  const promise = fn();
  pendingByKey.set(key, promise);
  return promise;
}
