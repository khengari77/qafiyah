import type { Context } from 'hono';
import type { AppContext } from '../types';

export type DomainFields = {
  poet_id?: string | undefined;
  era?: string | undefined;
  result_count?: number | undefined;
  poem_id?: string | undefined;
  meter?: string | undefined;
  rhyme?: string | undefined;
  theme?: string | undefined;
  verse_id?: string | undefined;
  query_text?: string | undefined;
  query_length?: number | undefined;
  results_count?: number | undefined;
  search_type?: 'fulltext' | 'semantic' | undefined;
  normalization_applied?: boolean | undefined;
  page?: number | undefined;
  page_size?: number | undefined;
  total_pages?: number | undefined;
};

export type LogEvent = {
  request_id: string;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  timestamp: string;
  service: {
    name: 'qafiyah-api';
    environment: string;
  };
  error?: {
    type: string;
    code: string;
    message: string;
    retriable: boolean;
  };
} & DomainFields;

export function enrichContext(c: Context<AppContext>, data: DomainFields): void {
  const event = c.var.logEvent;
  if (!event) return;
  Object.assign(event, data);
}

export function shouldEmit(event: Partial<LogEvent>): boolean {
  if (event.service?.environment !== 'production') return true;
  const status = event.status_code ?? 200;
  const duration = event.duration_ms ?? 0;
  if (status >= 500) return true;
  if (duration > 2000) return true;
  if (event.results_count === 0) return true;
  return Math.random() < 0.05;
}
