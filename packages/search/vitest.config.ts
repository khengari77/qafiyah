import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    // Integration tests share one Elasticsearch instance; run test files serially
    // so their index/alias setup + teardown can't race across parallel workers.
    fileParallelism: false,
    // Integration tests hit a real ES; allow time for index ops.
    testTimeout: 30_000,
  },
});
