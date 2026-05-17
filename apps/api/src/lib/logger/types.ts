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

export type ServiceMeta = {
  readonly name: 'qafiyah-api';
  readonly environment: string;
};

export type ErrorInfo = {
  readonly type: string;
  readonly code: string;
  readonly message: string;
  readonly retriable: boolean;
};

export type LogEventBase = {
  readonly request_id: string;
  readonly method: string;
  readonly path: string;
  readonly timestamp: string;
  readonly service: ServiceMeta;
};

export type LogEvent = LogEventBase &
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

// Internal mutable builder, only constructed/mutated via the helpers in
// `logger/builder.ts`. Not exported from `logger/index.ts`.
export type LogEventBuilder = Mutable<LogEventBase> &
  Mutable<DomainFields> & {
    status_code?: number;
    duration_ms?: number;
    error?: ErrorInfo;
  };
