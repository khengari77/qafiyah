export const DEFAULT_PAGE = '1';

export const EXAMPLE_ERA_SLUG = 'abbasid';
export const EXAMPLE_METER_SLUG = 'altawil';
export const EXAMPLE_POET_SLUG = 'abu-nawas';
export const EXAMPLE_POEM_SLUG = '887d1dcd-fb04-4f09-a448-d08287dface0';
export const EXAMPLE_RHYME_SLUG = '464b68f4-d67b-40b2-9d85-21452b121b9a';
export const EXAMPLE_THEME_SLUG = '61a2570d-9acc-493d-a05d-7dd2404c17ff';

export const inputValidationErrorMap = {
  INPUT_VALIDATION_FAILED: { status: 400, message: 'Input validation failed' },
} as const;

export const internalServerErrorMap = {
  INTERNAL_SERVER_ERROR: { status: 500, message: 'Internal server error' },
} as const;
