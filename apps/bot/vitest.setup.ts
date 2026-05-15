import { vi } from 'vitest';

vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Pre-seed so env.ts validates cleanly at module import time.
process.env['TWITTER_APP_KEY'] = 'test_key';
process.env['TWITTER_APP_SECRET'] = 'test_secret';
process.env['TWITTER_ACCESS_TOKEN'] = 'test_token';
process.env['TWITTER_ACCESS_SECRET'] = 'test_secret';
