import { type LogHandle, readBuilder } from './builder';
import type { LogEvent, LogEventBuilder } from './types';

const PROD_SAMPLE_RATE = 0.05;
const SLOW_REQUEST_MS = 2000;
const SERVER_ERROR_STATUS = 500;

export function shouldEmit(handle: LogHandle): boolean {
  const event = readBuilder(handle);
  if (event.service.environment !== 'production') return true;
  const status = event.status_code ?? 200;
  const duration = event.duration_ms ?? 0;
  if (status >= SERVER_ERROR_STATUS) return true;
  if (duration > SLOW_REQUEST_MS) return true;
  if (event.results_count === 0) return true;
  return Math.random() < PROD_SAMPLE_RATE;
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
