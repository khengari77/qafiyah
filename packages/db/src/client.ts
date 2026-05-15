import {
  POSTGRES_CONNECT_TIMEOUT_SECONDS,
  POSTGRES_IDLE_TIMEOUT_SECONDS,
  POSTGRES_POOL_MAX,
} from '@qafiyah/constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export type DbClient = PostgresJsDatabase<Record<string, never>>;

export function createDb(databaseUrl: string): DbClient {
  const url = new URL(databaseUrl);
  const port = Number.parseInt(url.port, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(
      `createDb: DATABASE_URL must include an explicit valid port (got "${url.port || '<empty>'}")`
    );
  }
  const client = postgres({
    host: url.hostname,
    port,
    database: url.pathname.slice(1),
    user: url.username,
    password: url.password,
    ssl: false,
    max: POSTGRES_POOL_MAX,
    idle_timeout: POSTGRES_IDLE_TIMEOUT_SECONDS,
    connect_timeout: POSTGRES_CONNECT_TIMEOUT_SECONDS,
    prepare: false,
    transform: { undefined: null },
    onnotice: () => {},
  });
  return drizzle(client) as DbClient;
}
