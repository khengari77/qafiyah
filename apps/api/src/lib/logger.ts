import type { Context } from 'hono';
import type { AppContext } from '../types';

export type DomainFields = {
  readonly poet_id?: string | undefined;
  readonly era?: string | undefined;
  readonly result_count?: number | undefined;
  readonly poem_id?: string | undefined;
  readonly meter?: string | undefined;
  readonly rhyme?: string | undefined;
  readonly theme?: string | undefined;
  readonly verse_id?: string | undefined;
  readonly query_text?: string | undefined;
  readonly query_length?: number | undefined;
  readonly results_count?: number | undefined;
  readonly search_type?: 'fulltext' | 'semantic' | undefined;
  readonly normalization_applied?: boolean | undefined;
  readonly page?: number | undefined;
  readonly page_size?: number | undefined;
  readonly total_pages?: number | undefined;
};

type ServiceMeta = {
  readonly name: 'qafiyah-api';
  readonly environment: string;
};

type ErrorInfo = {
  readonly type: string;
  readonly code: string;
  readonly message: string;
  readonly retriable: boolean;
};

type LogEventBase = {
  readonly request_id: string;
  readonly method: string;
  readonly path: string;
  readonly timestamp: string;
  readonly service: ServiceMeta;
};

type LogEvent = LogEventBase &
  DomainFields &
  (
    | {
        readonly kind: 'completed';
        readonly status_code: number;
        readonly duration_ms: number;
      }
    | {
        readonly kind: 'completed_error';
        readonly status_code: number;
        readonly duration_ms: number;
        readonly error: ErrorInfo;
      }
  );

// @WARN: builder is intentionally mutable, the logger middleware accumulates
//   fields onto it during the request lifecycle (status_code/duration_ms after
//   next(); error from onError; domain fields from enrichContext) before
//   projecting into a readonly LogEvent at emit time. Mirror DomainFields
//   structurally but strip the `readonly` modifier.
export type LogEventBuilder = {
  request_id: string;
  method: string;
  path: string;
  timestamp: string;
  service: { name: 'qafiyah-api'; environment: string };
  status_code?: number;
  duration_ms?: number;
  error?: { type: string; code: string; message: string; retriable: boolean };
  poet_id?: string;
  era?: string;
  result_count?: number;
  poem_id?: string;
  meter?: string;
  rhyme?: string;
  theme?: string;
  verse_id?: string;
  query_text?: string;
  query_length?: number;
  results_count?: number;
  search_type?: 'fulltext' | 'semantic';
  normalization_applied?: boolean;
  page?: number;
  page_size?: number;
  total_pages?: number;
};

export function enrichContext(c: Context<AppContext>, data: Readonly<DomainFields>): void {
  const event = c.var.logEvent;
  if (!event) return;
  // @WARN: builder mutation, see LogEventBuilder docstring.
  Object.assign(event, data);
}

export function shouldEmit(event: Readonly<LogEventBuilder>): boolean {
  if (event.service.environment !== 'production') return true;
  const status = event.status_code ?? 200;
  const duration = event.duration_ms ?? 0;
  if (status >= 500) return true;
  if (duration > 2000) return true;
  if (event.results_count === 0) return true;
  return Math.random() < 0.05;
}

export function toLogEvent(event: Readonly<LogEventBuilder>): LogEvent | null {
  const { status_code, duration_ms, error, ...rest } = event;
  if (status_code === undefined || duration_ms === undefined) return null;
  if (error) {
    return {
      ...rest,
      kind: 'completed_error',
      status_code,
      duration_ms,
      error,
    };
  }
  return {
    ...rest,
    kind: 'completed',
    status_code,
    duration_ms,
  };
}
