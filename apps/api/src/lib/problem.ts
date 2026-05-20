import type { ContractErrorCode } from '@qafiyah/contracts';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { match, P } from 'ts-pattern';
import { ERROR_BASE_URL } from '@/constants';

// @ANCHOR: ContractErrorCode keeps shared codes (NOT_FOUND, POEM_PARSE_ERROR,
//   INPUT_VALIDATION_FAILED, INTERNAL_SERVER_ERROR) in sync with @qafiyah/contracts.
//   BAD_REQUEST and SERVICE_UNAVAILABLE are API-only and live here.
export type ProblemCode = ContractErrorCode | 'BAD_REQUEST' | 'SERVICE_UNAVAILABLE';

type ValidationIssue = {
  readonly path?: string;
  readonly message: string;
};

type ProblemBase = {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly code: string;
  readonly instance?: string;
  readonly detail?: string;
};

type ProblemDetail =
  | (ProblemBase & {
      readonly kind: 'validation';
      readonly code: 'INPUT_VALIDATION_FAILED';
      readonly status: 400;
      readonly errors: readonly ValidationIssue[];
    })
  | (ProblemBase & {
      readonly kind: 'generic';
    });

function problemCodeToTypeUrl(code: string): string {
  const kebab = code.toLowerCase().replace(/_/g, '-');
  return `${ERROR_BASE_URL}/${kebab}`;
}

const TITLES = {
  NOT_FOUND: 'Resource not found',
  POEM_PARSE_ERROR: 'Poem data could not be parsed',
  INPUT_VALIDATION_FAILED: 'Validation failed',
  BAD_REQUEST: 'Bad request',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service unavailable',
} as const satisfies Readonly<Record<ProblemCode, string>>;

function titleForCode(code: ProblemCode): string {
  return TITLES[code];
}

const PROBLEM_CODES = new Set(Object.keys(TITLES) as readonly ProblemCode[]);
function asProblemCode(raw: string): ProblemCode {
  return PROBLEM_CODES.has(raw as ProblemCode) ? (raw as ProblemCode) : 'INTERNAL_SERVER_ERROR';
}

function parseHttpStatus(statusCode: number): ContentfulStatusCode {
  if (statusCode < 100 || statusCode > 599) {
    throw new Error(`parseHttpStatus: ${statusCode} is not a valid HTTP status code`);
  }
  return statusCode as ContentfulStatusCode;
}

export function makeProblem(args: {
  readonly code: ProblemCode;
  readonly status: number;
  readonly detail?: string;
  readonly title?: string;
  readonly instance?: string;
  readonly errors?: readonly ValidationIssue[];
}): ProblemDetail {
  const base = {
    type: problemCodeToTypeUrl(args.code),
    title: args.title ?? titleForCode(args.code),
    status: args.status,
    code: args.code,
    ...(args.instance !== undefined && { instance: args.instance }),
    ...(args.detail !== undefined && { detail: args.detail }),
  };
  return match({ code: args.code, errors: args.errors })
    .with({ code: 'INPUT_VALIDATION_FAILED', errors: P.array() }, ({ errors }) => ({
      ...base,
      kind: 'validation' as const,
      code: 'INPUT_VALIDATION_FAILED' as const,
      status: 400 as const,
      errors,
    }))
    .otherwise(() => ({ ...base, kind: 'generic' as const }));
}

function stripKind(problem: ProblemDetail): Omit<ProblemDetail, 'kind'> {
  const { kind: _kind, ...rest } = problem;
  return rest;
}

export function sendProblem(c: Context, problem: ProblemDetail): Response {
  const withInstance =
    problem.instance === undefined ? { ...problem, instance: c.req.path } : problem;
  return c.body(JSON.stringify(stripKind(withInstance)), parseHttpStatus(withInstance.status), {
    'Content-Type': 'application/problem+json',
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractValidationErrors(data: unknown): readonly ValidationIssue[] | undefined {
  if (!isObject(data)) return undefined;
  const issues = data['issues'];
  if (!Array.isArray(issues)) return undefined;
  return issues.flatMap((issue): readonly ValidationIssue[] => {
    if (!isObject(issue)) return [];
    const message = typeof issue['message'] === 'string' ? issue['message'] : 'Invalid value';
    const path = Array.isArray(issue['path'])
      ? issue['path']
          .map((segment) =>
            isObject(segment) && typeof segment['key'] === 'string'
              ? segment['key']
              : String(segment)
          )
          .join('.')
      : undefined;
    return [path ? { path, message } : { message }];
  });
}

function orpcErrorToProblem(
  body: unknown,
  status: number,
  instance: string | undefined
): ProblemDetail {
  const error = isObject(body) ? body : {};
  const rawCode = error['code'];
  const code = asProblemCode(typeof rawCode === 'string' ? rawCode : 'INTERNAL_SERVER_ERROR');
  const rawMessage = error['message'];
  const message = typeof rawMessage === 'string' ? rawMessage : undefined;
  const validationErrors = extractValidationErrors(error['data']);
  const dataMessage = isObject(error['data']) ? error['data']['message'] : undefined;
  const detailFromData = typeof dataMessage === 'string' ? dataMessage : undefined;

  const detail = detailFromData ?? message;
  return makeProblem({
    code,
    status,
    ...(instance !== undefined && { instance }),
    ...(detail !== undefined && { detail }),
    ...(validationErrors && validationErrors.length > 0 && { errors: validationErrors }),
  });
}

export async function transformOrpcResponse(
  response: Response,
  instance?: string
): Promise<Response> {
  if (response.status < 400) return response;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return response;

  let body: unknown;
  try {
    body = await response.clone().json();
  } catch {
    return response;
  }

  const problem = orpcErrorToProblem(body, response.status, instance);
  return new Response(JSON.stringify(stripKind(problem)), {
    status: parseHttpStatus(problem.status),
    headers: { 'Content-Type': 'application/problem+json' },
  });
}
