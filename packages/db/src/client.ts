import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export type DbClient = PostgresJsDatabase<Record<string, never>>;

export function createDb(databaseUrl: string): DbClient {
  const url = new URL(databaseUrl);
  const client = postgres({
    host: url.hostname,
    port: Number.parseInt(url.port, 10) || 5432,
    database: url.pathname.slice(1),
    user: url.username,
    password: url.password,
    ssl: false,
    max: 2,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false,
    transform: { undefined: null },
    onnotice: () => {},
  });
  return drizzle(client) as DbClient;
}
