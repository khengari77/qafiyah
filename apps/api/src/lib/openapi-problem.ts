import type { JSONSchema } from '@orpc/openapi';

/**
 * RFC 9457 Problem Details — the exact wire shape produced by `lib/problem.ts`.
 * Fed to the OpenAPI generator via `customErrorResponseBodySchema` so the spec
 * documents the real error body instead of oRPC's native error envelope. Kept
 * in sync with `makeProblem` by hand (one small, stable shape).
 */
export const PROBLEM_DETAIL_SCHEMA: JSONSchema = {
  type: 'object',
  required: ['type', 'title', 'status', 'code'],
  properties: {
    type: { type: 'string', format: 'uri' },
    title: { type: 'string' },
    status: { type: 'integer' },
    code: { type: 'string' },
    instance: { type: 'string' },
    detail: { type: 'string' },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        required: ['message'],
        properties: {
          path: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
};
