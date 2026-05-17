import type { Context } from 'hono';
import {
  HTTP_INTERNAL_SERVER_ERROR,
  LOG_PROD_SAMPLE_RATE,
  LOG_SLOW_REQUEST_MS,
} from '../constants';
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

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

// Internal mutable builder, only constructed/mutated via the helpers in this module.
type LogEventBuilder = Mutable<LogEventBase> &
  Mutable<DomainFields> & {
    status_code?: number;
    duration_ms?: number;
    error?: ErrorInfo;
  };

declare const LogHandleBrand: unique symbol;

// Opaque handle used as the context-stored log marker. The builder shape is
// internal; consumers (middleware, error handler, procedures) interact via
// the helpers in this module.
export type LogHandle = { readonly [LogHandleBrand]: true };

function asBuilder(handle: LogHandle): LogEventBuilder {
  return handle as unknown as LogEventBuilder;
}

function readBuilder(handle: LogHandle): Readonly<LogEventBuilder> {
  return asBuilder(handle);
}

export function createLogHandle(init: {
  readonly request_id: string;
  readonly method: string;
  readonly path: string;
  readonly timestamp: string;
  readonly service: ServiceMeta;
}): LogHandle {
  return { ...init } as unknown as LogHandle;
}

export function enrichContext(c: Context<AppContext>, data: Readonly<DomainFields>): void {
  const handle = c.var.logEvent;
  if (!handle) return;
  Object.assign(asBuilder(handle), data);
}

export function recordResponse(handle: LogHandle, status_code: number, duration_ms: number): void {
  const b = asBuilder(handle);
  b.status_code = status_code;
  b.duration_ms = duration_ms;
}

export function recordError(handle: LogHandle, error: ErrorInfo): void {
  asBuilder(handle).error = error;
}

export function shouldEmit(handle: LogHandle): boolean {
  const event = readBuilder(handle);
  if (event.service.environment !== 'production') return true;
  const status = event.status_code ?? 200;
  const duration = event.duration_ms ?? 0;
  if (status >= HTTP_INTERNAL_SERVER_ERROR) return true;
  if (duration > LOG_SLOW_REQUEST_MS) return true;
  if (event.results_count === 0) return true;
  return Math.random() < LOG_PROD_SAMPLE_RATE;
}

export function toLogEvent(handle: LogHandle): LogEvent | null {
  const event = readBuilder(handle);
  const { status_code, duration_ms, error, ...rest } = event as LogEventBuilder;
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
