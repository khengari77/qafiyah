import { PROD_DOMAIN } from '@qafiyah/constants';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

type ProblemDetail = {
  type: string;
  title: string;
  status: number;
  code: string;
  detail?: string;
  errors?: { path?: string; message: string }[];
};

const ERROR_BASE = `https://${PROD_DOMAIN}/errors`;

function codeToType(code: string): string {
  const kebab = code.toLowerCase().replace(/_/g, '-');
  return `${ERROR_BASE}/${kebab}`;
}

const TITLES: Record<string, string> = {
  NOT_FOUND: 'Resource not found',
  POEM_PARSE_ERROR: 'Poem data could not be parsed',
  INPUT_VALIDATION_FAILED: 'Validation failed',
  BAD_REQUEST: 'Bad request',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service unavailable',
};

function titleForCode(code: string, fallback: string): string {
  return TITLES[code] ?? fallback;
}

export function makeProblem(args: {
  code: string;
  status: number;
  detail?: string;
  title?: string;
  errors?: ProblemDetail['errors'];
}): ProblemDetail {
  return {
    type: codeToType(args.code),
    title: args.title ?? titleForCode(args.code, args.code),
    status: args.status,
    code: args.code,
    ...(args.detail !== undefined && { detail: args.detail }),
    ...(args.errors !== undefined && { errors: args.errors }),
  };
}

function problemResponse(problem: ProblemDetail): Response {
  return new Response(JSON.stringify(problem), {
    status: problem.status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

export function sendProblem(c: Context, problem: ProblemDetail): Response {
  return c.body(JSON.stringify(problem), problem.status as ContentfulStatusCode, {
    'Content-Type': 'application/problem+json',
  });
}

type OrpcErrorBody = {
  code?: string;
  message?: string;
  status?: number;
  data?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractValidationErrors(data: unknown): ProblemDetail['errors'] | undefined {
  if (!isObject(data)) return undefined;
  const issues = data['issues'];
  if (!Array.isArray(issues)) return undefined;
  return issues.flatMap((issue) => {
    if (!isObject(issue)) return [];
    const message = typeof issue['message'] === 'string' ? issue['message'] : 'Invalid value';
    const path = Array.isArray(issue['path'])
      ? issue['path']
          .map((seg) =>
            isObject(seg) && typeof seg['key'] === 'string' ? seg['key'] : String(seg)
          )
          .join('.')
      : undefined;
    return [path ? { path, message } : { message }];
  });
}

function orpcErrorToProblem(body: unknown, status: number): ProblemDetail {
  const error = isObject(body) ? (body as OrpcErrorBody) : {};
  const code = typeof error.code === 'string' ? error.code : 'INTERNAL_SERVER_ERROR';
  const message = typeof error.message === 'string' ? error.message : undefined;
  const validationErrors = extractValidationErrors(error.data);
  const detailFromData =
    isObject(error.data) && typeof error.data['message'] === 'string'
      ? (error.data['message'] as string)
      : undefined;

  const detail = detailFromData ?? message;
  return makeProblem({
    code,
    status,
    ...(detail !== undefined && { detail }),
    ...(validationErrors && validationErrors.length > 0 && { errors: validationErrors }),
  });
}

export async function transformOrpcResponse(response: Response): Promise<Response> {
  if (response.status < 400) return response;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return response;

  let body: unknown;
  try {
    body = await response.clone().json();
  } catch {
    return response;
  }

  const problem = orpcErrorToProblem(body, response.status);
  return problemResponse(problem);
}
