import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export type DbClient = PostgresJsDatabase<Readonly<Record<string, never>>>;

export type DbMode = 'edge' | 'long-lived';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', 'host.docker.internal']);

export function detectDbMode(databaseUrl: string): DbMode {
  return LOCAL_HOSTS.has(new URL(databaseUrl).hostname) ? 'long-lived' : 'edge';
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

export function createDb(databaseUrl: string, options?: { readonly mode?: DbMode }): DbClient {
  const url = new URL(databaseUrl);
  const port = Number.parseInt(url.port, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(
      `createDb: DATABASE_URL must include an explicit valid port (got "${url.port || '<empty>'}")`
    );
  }
  const mode = options?.mode ?? detectDbMode(databaseUrl);
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
  return drizzle<Readonly<Record<string, never>>>(client);
}
