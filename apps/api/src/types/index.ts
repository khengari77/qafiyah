import type { DbClient } from '@qafiyah/db';

export type Bindings = {
  DATABASE_URL?: string;
};

export type AppContext = {
  Bindings: Bindings;
  Variables: {
    db: DbClient;
  };
};
