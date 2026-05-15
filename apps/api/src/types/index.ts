import type { DbClient } from '@qafiyah/db';
import type { Bindings } from '@/env';

export type { Bindings };

export type AppContext = {
  Bindings: Bindings;
  Variables: {
    db: DbClient;
  };
};
