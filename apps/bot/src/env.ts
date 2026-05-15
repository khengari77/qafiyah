import * as dotenv from 'dotenv';
import { defineEnv } from 'envin';
import * as v from 'valibot';

dotenv.config();

const _env = defineEnv({
  server: {
    TWITTER_APP_KEY: v.pipe(v.string(), v.minLength(1)),
    TWITTER_APP_SECRET: v.pipe(v.string(), v.minLength(1)),
    TWITTER_ACCESS_TOKEN: v.pipe(v.string(), v.minLength(1)),
    TWITTER_ACCESS_SECRET: v.pipe(v.string(), v.minLength(1)),
  },
  env: process.env,
});

export const env = {
  TWITTER_APP_KEY: _env.TWITTER_APP_KEY,
  TWITTER_APP_SECRET: _env.TWITTER_APP_SECRET,
  TWITTER_ACCESS_TOKEN: _env.TWITTER_ACCESS_TOKEN,
  TWITTER_ACCESS_SECRET: _env.TWITTER_ACCESS_SECRET,
};
