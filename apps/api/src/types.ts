import type { DbClient } from '@qafiyah/db';
import type { Bindings } from '@/env';
import type { LogHandle } from '@/lib/logger';

export type { Bindings };

export type AppContext = {
  readonly Bindings: Bindings;
  readonly Variables: {
    readonly db: DbClient;
    readonly logEvent?: LogHandle;
  };
};
