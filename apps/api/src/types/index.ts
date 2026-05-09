import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export type Bindings = {
  DATABASE_URL?: string;
};

export type AppContext = {
  Bindings: Bindings;
  Variables: {
    db: PostgresJsDatabase<Record<string, never>>;
  };
};
