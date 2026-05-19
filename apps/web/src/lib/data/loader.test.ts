import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetLoaderCacheForTests, readSnapshotFile, setSnapshotDirForTests } from './loader';

describe('readSnapshotFile', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'qafiyah-loader-'));
    setSnapshotDirForTests(tempDir);
    __resetLoaderCacheForTests();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    setSnapshotDirForTests(null);
    __resetLoaderCacheForTests();
  });

  it('parses and returns JSON from the snapshot directory', () => {
    writeFileSync(join(tempDir, 'thing.json'), JSON.stringify({ a: 1, b: 'two' }));
    const result = readSnapshotFile<{ a: number; b: string }>('thing');
    expect(result).toEqual({ a: 1, b: 'two' });
  });

  it('returns the cached value on subsequent reads (no fs hit)', () => {
    writeFileSync(join(tempDir, 'thing.json'), JSON.stringify({ a: 1 }));
    const first = readSnapshotFile<{ a: number }>('thing');
    writeFileSync(join(tempDir, 'thing.json'), JSON.stringify({ a: 999 }));
    const second = readSnapshotFile<{ a: number }>('thing');
    expect(second).toBe(first);
    expect(second.a).toBe(1);
  });

  it('throws a clear error when the snapshot file is missing', () => {
    expect(() => readSnapshotFile('does-not-exist')).toThrow(
      /snapshot file .* not found.*regenerate/i
    );
  });
});
