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
  // @NOTE: BUILD_API_URL is a Node-only build-time variable injected by
  // scripts/build-with-api.ts. Vite's import.meta.env only exposes PUBLIC_*
  // vars, so we read from process.env directly and guard for the browser
  // (where `process` is undefined).
  BUILD_API_URL:
    typeof process === 'undefined'
      ? undefined
      : (process.env['BUILD_API_URL'] as string | undefined),
};
