import {
  HTTP_INTERNAL_SERVER_ERROR,
  LOG_PROD_SAMPLE_RATE,
  LOG_SLOW_REQUEST_MS,
} from '../../constants';
import { type LogHandle, readBuilder } from './builder';
import type { LogEvent, LogEventBuilder } from './types';

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
