#!/usr/bin/env bun

// biome-ignore-all lint/suspicious/noConsole: build supervisor logs progress.

/**
 * Orchestrates: (1) generate-snapshot.ts dumps DB → JSON, (2) astro build reads
 * those JSON files via apps/web/src/lib/data/*. No Wrangler, no HTTP, no
 * NODE_OPTIONS=12288 hack — those were artefacts of the old per-page HTTP build.
 */

import path from 'node:path';

const webDir = path.resolve(import.meta.dir, '..');

async function run(cmd: string[], cwd: string): Promise<number> {
  const proc = Bun.spawn(cmd, { cwd, stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' });
  return await proc.exited;
}

async function main(): Promise<number> {
  console.log('[build] generate-snapshot');
  const snapshotExit = await run(
    ['bun', path.join(webDir, 'scripts', 'generate-snapshot.ts')],
    webDir
  );
  if (snapshotExit !== 0) {
    console.error('[build] snapshot generation failed; aborting');
    return snapshotExit;
  }

  console.log('[build] astro build');
  const buildExit = await run(['astro', 'build'], webDir);
  return buildExit;
}

const exitCode = await main();
process.exit(exitCode);
