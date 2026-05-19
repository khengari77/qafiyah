import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import { err, ok, type Result } from 'neverthrow';
import postgres from 'postgres';

export type DbClient = PostgresJsDatabase<Readonly<Record<string, never>>>;

export type DbMode = 'edge' | 'long-lived';

export type InvalidUrlError = {
  readonly kind: 'invalid_url';
  readonly rawUrl: string;
  readonly message: string;
};

export type CreateDbError =
  | InvalidUrlError
  | {
      readonly kind: 'invalid_port';
      readonly rawPort: string;
      readonly databaseUrlHost: string;
    };

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', 'host.docker.internal']);

function parseDbUrl(databaseUrl: string): Result<URL, InvalidUrlError> {
  try {
    return ok(new URL(databaseUrl));
  } catch (cause) {
    return err({
      kind: 'invalid_url',
      rawUrl: databaseUrl,
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }
}

function modeForHostname(hostname: string): DbMode {
  return LOCAL_HOSTS.has(hostname) ? 'long-lived' : 'edge';
}

export function detectDbMode(databaseUrl: string): Result<DbMode, InvalidUrlError> {
  return parseDbUrl(databaseUrl).map((url) => modeForHostname(url.hostname));
}

const PROFILES = {
  edge: {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 5,
    max_lifetime: 60,
    prepare: false,
    fetch_types: false,
    application_name: 'qafiyah-edge',
  },
  'long-lived': {
    max: 20,
    idle_timeout: 300,
    connect_timeout: 30,
    max_lifetime: 1_800,
    prepare: true,
    fetch_types: true,
    application_name: 'qafiyah-long-lived',
  },
} as const;

export function createDb(
  databaseUrl: string,
  options?: { readonly mode?: DbMode }
): Result<DbClient, CreateDbError> {
  const urlResult = parseDbUrl(databaseUrl);
  if (urlResult.isErr()) return err(urlResult.error);
  const url = urlResult.value;
  const port = Number.parseInt(url.port, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return err({
      kind: 'invalid_port',
      rawPort: url.port,
      databaseUrlHost: url.hostname,
    });
  }
  const mode = options?.mode ?? modeForHostname(url.hostname);
  const profile = PROFILES[mode];
  const client = postgres({
    host: url.hostname,
    port,
    database: url.pathname.slice(1),
    user: url.username,
    password: url.password,
    ssl: false,
    max: profile.max,
    idle_timeout: profile.idle_timeout,
    connect_timeout: profile.connect_timeout,
    max_lifetime: profile.max_lifetime,
    prepare: profile.prepare,
    fetch_types: profile.fetch_types,
    connection: { application_name: profile.application_name },
    transform: { undefined: null },
    onnotice: () => undefined,
  });
  return ok(drizzle<Readonly<Record<string, never>>>(client));
}
