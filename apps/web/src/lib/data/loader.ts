import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DEFAULT_SNAPSHOT_DIR = resolve(import.meta.dirname, '..', '..', '..', '.data');

let snapshotDirOverride: string | null = null;
const cache = new Map<string, unknown>();

export function setSnapshotDirForTests(dir: string | null): void {
  snapshotDirOverride = dir;
}

export function __resetLoaderCacheForTests(): void {
  cache.clear();
}

function snapshotDir(): string {
  return snapshotDirOverride ?? DEFAULT_SNAPSHOT_DIR;
}

export function readSnapshotFile<T>(name: string): T {
  const hit = cache.get(name);
  if (hit !== undefined) return hit as T;

  const path = join(snapshotDir(), `${name}.json`);
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (cause) {
    // biome-ignore lint/nursery/useErrorCause: cause is already passed below
    throw new Error(
      `snapshot file '${name}.json' not found at ${path}. ` +
        `Run 'bun apps/web/scripts/generate-snapshot.ts' first to regenerate.`,
      { cause }
    );
  }
  const parsed = JSON.parse(raw) as T;
  cache.set(name, parsed);
  return parsed;
}
