import type { Context } from 'hono';
import type { AppContext } from '../../types';
import type { DomainFields, ErrorInfo, LogEventBuilder, ServiceMeta } from './types';

declare const LogHandleBrand: unique symbol;

// Opaque handle used as the context-stored log marker. The builder shape is
// internal; consumers (middleware, error handler, procedures) interact via
// the helpers in this module.
export type LogHandle = { readonly [LogHandleBrand]: true };

function asBuilder(handle: LogHandle): LogEventBuilder {
  return handle as unknown as LogEventBuilder;
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

// Read-only view of the underlying builder; for emit-time use only.
export function readBuilder(handle: LogHandle): Readonly<LogEventBuilder> {
  return asBuilder(handle);
}
