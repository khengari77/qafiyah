export const DEFAULT_PAGE = '1';

export const EXAMPLE_ERA_SLUG = 'abbasid';
export const EXAMPLE_METER_SLUG = 'altawil';
export const EXAMPLE_POET_SLUG = 'abu-nawas';
export const EXAMPLE_POEM_SLUG = '887d1dcd-fb04-4f09-a448-d08287dface0';
export const EXAMPLE_RHYME_SLUG = 'meem';
export const EXAMPLE_THEME_SLUG = '61a2570d-9acc-493d-a05d-7dd2404c17ff';

export const inputValidationErrorMap = {
  INPUT_VALIDATION_FAILED: { status: 400, message: 'Input validation failed' },
} as const;

export const internalServerErrorMap = {
  INTERNAL_SERVER_ERROR: { status: 500, message: 'Internal server error' },
} as const;

// Error codes emitted by any contract endpoint. Combines the shared maps above
// with per-route codes (NOT_FOUND, POEM_PARSE_ERROR). The API derives its public
// RFC 9457 ProblemCode from this union, so adding a key here is the single
// source the boundary trusts.
export type ContractErrorCode =
  | keyof typeof inputValidationErrorMap
  | keyof typeof internalServerErrorMap
  | 'NOT_FOUND'
  | 'POEM_PARSE_ERROR';
