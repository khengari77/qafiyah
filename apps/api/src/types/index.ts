import type { DbClient } from '@qafiyah/db';
import type { Bindings } from '@/env';
import type { LogEvent } from '@/lib/logger';

export type { Bindings };

export type AppContext = {
  Bindings: Bindings;
  Variables: {
    db: DbClient;
    logEvent?: Partial<LogEvent>;
  };
};
