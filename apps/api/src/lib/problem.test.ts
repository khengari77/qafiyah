import { describe, expect, it } from 'vitest';
import { makeProblem, transformOrpcResponse } from './problem';

describe('makeProblem', () => {
  it('builds a problem detail with known error code', () => {
    const problem = makeProblem({ code: 'NOT_FOUND', status: 404 });

    expect(problem.status).toBe(404);
    expect(problem.code).toBe('NOT_FOUND');
    expect(problem.title).toBe('Resource not found');
    expect(problem.type).toContain('not-found');
  });

  it('uses code as title fallback for unknown codes', () => {
    const problem = makeProblem({ code: 'SOME_UNKNOWN_CODE', status: 400 });

    expect(problem.title).toBe('SOME_UNKNOWN_CODE');
  });

  it('uses explicit title when provided', () => {
    const problem = makeProblem({ code: 'NOT_FOUND', status: 404, title: 'Custom title' });

    expect(problem.title).toBe('Custom title');
  });

  it('includes detail when provided', () => {
    const problem = makeProblem({ code: 'NOT_FOUND', status: 404, detail: 'Poem missing' });

    expect(problem.detail).toBe('Poem missing');
  });

  it('omits detail when not provided', () => {
    const problem = makeProblem({ code: 'NOT_FOUND', status: 404 });

    expect('detail' in problem).toBe(false);
  });

  it('includes instance when provided', () => {
    const problem = makeProblem({ code: 'NOT_FOUND', status: 404, instance: '/v1/poems/missing' });

    expect(problem.instance).toBe('/v1/poems/missing');
  });

  it('omits instance when not provided', () => {
    const problem = makeProblem({ code: 'NOT_FOUND', status: 404 });

    expect('instance' in problem).toBe(false);
  });

  it('includes errors array when provided', () => {
    const errors = [{ path: 'slug', message: 'Required' }];
    const problem = makeProblem({ code: 'INPUT_VALIDATION_FAILED', status: 400, errors });

    expect(problem.errors).toEqual(errors);
  });

  it('omits errors when not provided', () => {
    const problem = makeProblem({ code: 'NOT_FOUND', status: 404 });

    expect('errors' in problem).toBe(false);
  });

  it('converts code to kebab-case in type URL', () => {
    const problem = makeProblem({ code: 'POEM_PARSE_ERROR', status: 500 });

    expect(problem.type).toContain('poem-parse-error');
  });

  it('maps all known error codes to human-readable titles', () => {
    const cases: Array<[string, string]> = [
      ['NOT_FOUND', 'Resource not found'],
      ['POEM_PARSE_ERROR', 'Poem data could not be parsed'],
      ['INPUT_VALIDATION_FAILED', 'Validation failed'],
      ['BAD_REQUEST', 'Bad request'],
      ['INTERNAL_SERVER_ERROR', 'Internal server error'],
      ['SERVICE_UNAVAILABLE', 'Service unavailable'],
    ];

    for (const [code, expectedTitle] of cases) {
      expect(makeProblem({ code, status: 400 }).title).toBe(expectedTitle);
    }
  });
});

describe('transformOrpcResponse', () => {
  it('passes through 2xx responses unchanged', async () => {
    const original = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await transformOrpcResponse(original);

    expect(result.status).toBe(200);
  });

  it('transforms 404 oRPC error to problem+json', async () => {
    const orpcBody = { code: 'NOT_FOUND', message: 'Resource not found' };
    const response = new Response(JSON.stringify(orpcBody), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await transformOrpcResponse(response, '/v1/poems/missing');

    expect(result.status).toBe(404);
    expect(result.headers.get('Content-Type')).toBe('application/problem+json');
    const body = (await result.json()) as { code: string; type: string; instance: string };
    expect(body.code).toBe('NOT_FOUND');
    expect(body.type).toContain('not-found');
    expect(body.instance).toBe('/v1/poems/missing');
  });

  it('omits instance when no requestPath is provided', async () => {
    const orpcBody = { code: 'NOT_FOUND' };
    const response = new Response(JSON.stringify(orpcBody), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await transformOrpcResponse(response);

    const body = (await result.json()) as { instance?: string };
    expect(body.instance).toBeUndefined();
  });

  it('transforms 400 validation error with issues to problem+json with errors', async () => {
    const orpcBody = {
      code: 'INPUT_VALIDATION_FAILED',
      message: 'Validation failed',
      data: {
        issues: [{ message: 'Required', path: [{ key: 'slug' }] }],
      },
    };
    const response = new Response(JSON.stringify(orpcBody), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await transformOrpcResponse(response, '/v1/eras/bad/poems');

    expect(result.status).toBe(400);
    const body = (await result.json()) as {
      errors: Array<{ path: string; message: string }>;
      instance: string;
    };
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]?.path).toBe('slug');
    expect(body.errors[0]?.message).toBe('Required');
    expect(body.instance).toBe('/v1/eras/bad/poems');
  });

  it('passes through non-JSON error responses unchanged', async () => {
    const response = new Response('plain text error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });

    const result = await transformOrpcResponse(response);

    expect(result.headers.get('Content-Type')).toBe('text/plain');
  });

  it('passes through error responses with unparseable JSON unchanged', async () => {
    const response = new Response('{broken json', {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await transformOrpcResponse(response);

    expect(result.status).toBe(500);
  });

  it('handles validation issues with path-less entries', async () => {
    const orpcBody = {
      code: 'INPUT_VALIDATION_FAILED',
      data: {
        issues: [{ message: 'Invalid value' }],
      },
    };
    const response = new Response(JSON.stringify(orpcBody), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await transformOrpcResponse(response);

    const body = (await result.json()) as { errors: Array<{ message: string }> };
    expect(body.errors?.[0]).toEqual({ message: 'Invalid value' });
  });

  it('handles non-object body gracefully', async () => {
    const response = new Response(JSON.stringify('just a string'), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await transformOrpcResponse(response);

    expect(result.status).toBe(500);
    expect(result.headers.get('Content-Type')).toBe('application/problem+json');
  });

  it('drops non-object issues in the issues array without crashing', async () => {
    const orpcBody = {
      code: 'INPUT_VALIDATION_FAILED',
      data: {
        issues: ['not-an-object', 42, { message: 'Valid issue' }],
      },
    };
    const response = new Response(JSON.stringify(orpcBody), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await transformOrpcResponse(response);

    const body = (await result.json()) as { errors: Array<{ message: string }> };
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]?.message).toBe('Valid issue');
  });

  it('falls back to "Invalid value" when issue message is not a string', async () => {
    const orpcBody = {
      code: 'INPUT_VALIDATION_FAILED',
      data: { issues: [{ message: 42 }] },
    };
    const response = new Response(JSON.stringify(orpcBody), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await transformOrpcResponse(response);

    const body = (await result.json()) as { errors: Array<{ message: string }> };
    expect(body.errors?.[0]?.message).toBe('Invalid value');
  });

  it('converts non-object path segments to strings', async () => {
    const orpcBody = {
      code: 'INPUT_VALIDATION_FAILED',
      data: { issues: [{ message: 'Error', path: ['plain-string'] }] },
    };
    const response = new Response(JSON.stringify(orpcBody), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await transformOrpcResponse(response);

    const body = (await result.json()) as { errors: Array<{ path: string }> };
    expect(body.errors?.[0]?.path).toBe('plain-string');
  });

  it('passes through error responses with no Content-Type header', async () => {
    const response = new Response(null, { status: 503 });

    const result = await transformOrpcResponse(response);

    expect(result.status).toBe(503);
  });

  it('uses data.message as detail when present', async () => {
    const orpcBody = {
      code: 'POEM_PARSE_ERROR',
      data: { message: 'Content is malformed' },
    };
    const response = new Response(JSON.stringify(orpcBody), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await transformOrpcResponse(response);

    const body = (await result.json()) as { detail: string };
    expect(body.detail).toBe('Content is malformed');
  });
});
