#!/usr/bin/env bun
import { err, ok, type Result } from 'neverthrow';

const portArg = Bun.argv[2];
const port = Number.parseInt(portArg ?? '', 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(
    `[predev] usage: check-port.ts <port>  (got "${portArg ?? ''}"; expected integer 1–65535)`
  );
  process.exit(2);
}

type ProbeError = {
  readonly kind: 'unknown_listen_failure';
  readonly host: string;
  readonly port: number;
  readonly code?: string;
  readonly message: string;
};

function probe(host: string): Result<'busy' | 'free', ProbeError> {
  try {
    // Bun.listen requires at least one of `data` or `drain` on `socket`. The
    // listener is stopped immediately, so the handler is never invoked.
    Bun.listen({
      hostname: host,
      port,
      socket: {
        data() {
          /* unused: listener is stopped synchronously */
        },
      },
    }).stop(true);
    return ok('free');
  } catch (cause) {
    const code =
      cause instanceof Error &&
      'code' in cause &&
      typeof (cause as { code?: unknown }).code === 'string'
        ? (cause as { code: string }).code
        : undefined;
    if (code === 'EADDRINUSE') return ok('busy');
    return err({
      kind: 'unknown_listen_failure',
      host,
      port,
      ...(code !== undefined && { code }),
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }
}

for (const host of ['127.0.0.1', '::1'] as const) {
  const result = probe(host);
  if (result.isErr()) {
    // ::1 binding can fail benignly on hosts with IPv6 disabled; warn and continue.
    // Other hosts: surface the error but don't block dev.
    console.warn(
      `[predev] note: could not probe ${host}:${port}: ${result.error.message}${result.error.code ? ` (${result.error.code})` : ''}; treating as free`
    );
    continue;
  }
  if (result.value === 'busy') {
    console.error(`\n[predev] port ${port} is already in use.`);
    console.error('[predev] another dev server is probably still running.');
    console.error('[predev] run `bun run clean:dev` to clear orphans, then try again.\n');
    process.exit(1);
  }
}
