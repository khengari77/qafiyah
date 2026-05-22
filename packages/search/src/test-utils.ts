// biome-ignore lint/style/noProcessEnv: test-only helper reads env directly to gate integration tests
const ES_URL = process.env['ELASTICSEARCH_URL'] ?? '';

// Integration tests hit a real Elasticsearch and are opt-in: they run only when
// ELASTICSEARCH_URL is set. CI sets none, so the suites `describe.skipIf` out
// cleanly instead of failing in beforeAll. Mirrors packages/db's TEST_DATABASE_URL gate.
export const ES_TEST_URL = ES_URL;
export const RUN_ES_INTEGRATION = ES_URL !== '';
