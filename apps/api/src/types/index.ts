import type { DbClient } from '@qafiyah/db';
import type { Bindings } from '@/env';
import type { LogEventBuilder } from '@/lib/logger';

export type { Bindings };

export type AppContext = {
  readonly Bindings: Bindings;
  readonly Variables: {
    readonly db: DbClient;
    // @WARN: intentionally mutable — the logger middleware accumulates fields onto
    //   this builder over the request lifecycle (status_code, duration_ms, error,
    //   domain fields) before projecting into a readonly LogEvent at emit time.
    readonly logEvent?: LogEventBuilder;
  };
};
