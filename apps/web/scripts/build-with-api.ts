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
import { err, ok, type Result } from 'neverthrow';

const HOST = '127.0.0.1';
const READY_TIMEOUT_MS = 30_000;
const READY_POLL_MS = 200;

const webDir = path.resolve(import.meta.dir, '..');
const repoRoot = path.resolve(webDir, '..', '..');

type BuildStage =
  | 'probe_port'
  | 'start_api'
  | 'wait_for_port'
  | 'spawn_build'
  | 'await_build_exit'
  | 'kill_api';

type WaitForPortError = {
  readonly kind: 'port_timeout';
  readonly hostname: string;
  readonly port: number;
  readonly timeoutMs: number;
  readonly pollIntervalMs: number;
  readonly hints: readonly string[];
};

type BuildError = {
  readonly stage: BuildStage;
  readonly cause: WaitForPortError | { readonly kind: 'unknown'; readonly message: string };
};

async function probePort(port: number, hostname: string): Promise<boolean> {
  try {
    // Bun.connect requires at least one of `data` or `drain` on `socket` — see
    // also scripts/check-port.ts. The socket is closed immediately, so the
    // handler is never invoked.
    const sock = await Bun.connect({ hostname, port, socket: { data() { /* noop */ } } });
    sock.end();
    return true;
  } catch {
    return false;
  }
}

async function waitForPort(
  port: number,
  hostname: string,
  timeoutMs: number
): Promise<Result<void, WaitForPortError>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await probePort(port, hostname)) return ok(undefined);
    await Bun.sleep(READY_POLL_MS);
  }
  return err({
    kind: 'port_timeout',
    hostname,
    port,
    timeoutMs,
    pollIntervalMs: READY_POLL_MS,
    hints: [
      `Did 'bun db:setup' succeed?`,
      `Is DATABASE_URL set in apps/api/.dev.vars?`,
      `Try running 'bun --filter=@qafiyah/api dev' manually to see errors.`,
    ],
  });
}

async function main(): Promise<Result<number, BuildError>> {
  const alreadyUp = await probePort(DEV_API_PORT, HOST);
  let api: Bun.Subprocess | null = null;

  if (alreadyUp) {
    console.log('[build-with-api] API already running on port', DEV_API_PORT, ', reusing.');
  } else {
    console.log('[build-with-api] Starting wrangler dev for @qafiyah/api...');
    api = Bun.spawn(['bun', '--filter=@qafiyah/api', 'run', 'dev'], {
      cwd: repoRoot,
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
      onExit(proc, exitCode) {
        if (exitCode !== null && exitCode !== 0 && proc.signalCode !== 'SIGTERM') {
          console.error(
            JSON.stringify({
              source: 'build-with-api',
              stage: 'api_subprocess_exit',
              exitCode,
              signalCode: proc.signalCode,
            })
          );
          process.exit(exitCode);
        }
      },
    });
    const ready = await waitForPort(DEV_API_PORT, HOST, READY_TIMEOUT_MS);
    if (ready.isErr()) {
      api.kill('SIGTERM');
      await Bun.sleep(500);
      return err({ stage: 'wait_for_port', cause: ready.error });
    }
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

  return ok(buildExitCode);
}

const result = await main().catch(
  (cause): Result<number, BuildError> =>
    err({
      stage: 'await_build_exit',
      cause: {
        kind: 'unknown',
        message: cause instanceof Error ? cause.message : String(cause),
      },
    })
);

if (result.isErr()) {
  console.error(
    JSON.stringify({
      source: 'build-with-api',
      stage: result.error.stage,
      host: HOST,
      port: DEV_API_PORT,
      webDir,
      repoRoot,
      error: result.error.cause,
    })
  );
  process.exit(1);
}

process.exit(result.value);
