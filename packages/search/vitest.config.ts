import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    // Integration tests (added later) hit a real ES; allow time for index ops.
    testTimeout: 30_000,
  },
});
