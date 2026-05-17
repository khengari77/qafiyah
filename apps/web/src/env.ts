import { defineEnv } from 'envin';
import * as v from 'valibot';

// @NOTE: import.meta.env augmentation is resolved by astro/client at check time, not plain tsc
const _rawEnv = (
  import.meta as unknown as { env: Record<string, string | boolean | number | undefined> }
).env;

const _env = defineEnv({
  clientPrefix: 'PUBLIC_',
  client: {
    PUBLIC_API_URL: v.optional(v.pipe(v.string(), v.url())),
  },
  env: _rawEnv,
});

export const env = {
  PUBLIC_API_URL: _env.PUBLIC_API_URL,
  DEV: _rawEnv['DEV'] === true,
  // @NOTE: BUILD_API_URL is a build-time-only variable; accessing it via _env
  // would throw in the browser (envin rejects server-only vars on the client).
  BUILD_API_URL: _rawEnv['BUILD_API_URL'] as string | undefined,
};
