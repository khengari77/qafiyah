#!/usr/bin/env bun

// biome-ignore-all lint/suspicious/noConsole: build supervisor logs progress to the developer.

/**
 * Supervisor script for `astro build`.
 * Auto-starts the local API (wrangler dev) on port 8787 if it's not already running,
 * waits for the port to accept connections, then runs `astro build` with
 * BUILD_API_URL injected so apps/web/src/lib/api/static.ts hits the local API.
 *
 * BUILD_API_URL is a server-only env var (no PUBLIC_ prefix) so it never leaks
 * into the browser bundle, PUBLIC_API_URL stays pointed at the production API.
 */

import path from 'node:path';
import { DEV_API_PORT } from '@qafiyah/constants';

const HOST = '127.0.0.1';
const READY_TIMEOUT_MS = 30_000;
const READY_POLL_MS = 200;

const webDir = path.resolve(import.meta.dir, '..');
const repoRoot = path.resolve(webDir, '..', '..');

async function probePort(port: number, hostname: string): Promise<boolean> {
  try {
    const sock = await Bun.connect({ hostname, port, socket: {} });
    sock.end();
    return true;
  } catch {
    return false;
  }
}

async function waitForPort(port: number, hostname: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await probePort(port, hostname)) return;
    await Bun.sleep(READY_POLL_MS);
  }
  throw new Error(
    `[build-with-api] API failed to listen on ${hostname}:${port} within ${timeoutMs}ms.\n` +
      `Hints:\n` +
      `  - Did 'bun db:setup' succeed?\n` +
      `  - Is DATABASE_URL set in apps/api/.dev.vars?\n` +
      `  - Try running 'bun --filter @qafiyah/api dev' manually to see errors.`
  );
}

async function main(): Promise<void> {
  const alreadyUp = await probePort(DEV_API_PORT, HOST);
  let api: Bun.Subprocess | null = null;

  if (alreadyUp) {
    console.log('[build-with-api] API already running on port', DEV_API_PORT, ', reusing.');
  } else {
    console.log('[build-with-api] Starting wrangler dev for @qafiyah/api...');
    api = Bun.spawn(['bun', '--filter', '@qafiyah/api', 'run', 'dev'], {
      cwd: repoRoot,
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
      onExit(proc, exitCode) {
        if (exitCode !== null && exitCode !== 0 && proc.signalCode !== 'SIGTERM') {
          console.error(`[build-with-api] API exited with code ${exitCode}`);
          process.exit(exitCode);
        }
      },
    });
    await waitForPort(DEV_API_PORT, HOST, READY_TIMEOUT_MS);
    console.log('[build-with-api] API is ready, starting astro build...');
  }

  const build = Bun.spawn(['astro', 'build'], {
    cwd: webDir,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
    env: {
      ...process.env,
      BUILD_API_URL: `http://${HOST}:${DEV_API_PORT}`,
    },
  });

  const buildExitCode = await build.exited;

  if (api) {
    api.kill('SIGTERM');
    await Bun.sleep(500);
  }

  process.exit(buildExitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
