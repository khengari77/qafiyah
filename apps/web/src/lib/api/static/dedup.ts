import { ORPCError } from '@orpc/client';

// @WARN: cached promise is keyed by string and stored as `Promise<unknown>`. The
//   dedup helper trusts that callers use a stable key→type mapping (e.g. always
//   pair 'eras:list' with `Era[]`). The cast at the call site documents the
//   key→type contract that TypeScript cannot infer through a string map.
const memo = new Map<string, Promise<unknown>>();

export function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit) return hit as Promise<T>;
  const p = fn();
  memo.set(key, p);
  return p;
}

export function isNotFound(err: unknown): boolean {
  return err instanceof ORPCError && err.code === 'NOT_FOUND';
}
