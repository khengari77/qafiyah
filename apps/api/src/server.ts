import app from './app';
import { type Bindings, parseBindings } from './env';

// @NOTE: Bun globals — remove once tsconfig adds `types: ["bun"]` in Task 3.
declare const process: { env: Record<string, string | undefined>; exit(code: number): never };

const DEFAULT_PORT = 8787;

/**
 * Builds the Bun.serve `fetch` handler. Injects validated env as Hono's
 * `c.env` — the same contract Cloudflare's runtime and the API tests use
 * (`app.fetch(request, env)`), so app + middleware code stays unchanged.
 */
export function createFetchHandler(env: Bindings) {
  return (request: Request): Response | Promise<Response> => app.fetch(request, env);
}

function boot(): { port: number; fetch: ReturnType<typeof createFetchHandler> } {
  const result = parseBindings(process.env);
  if (result.isErr()) {
    console.error(JSON.stringify({ source: 'server', stage: 'boot', error: result.error }));
    process.exit(1);
  }
  const bindings = result._unsafeUnwrap();
  return {
    port: Number(process.env['PORT'] ?? DEFAULT_PORT),
    fetch: createFetchHandler(bindings),
  };
}

// Bun starts a server from the default export only when this is the entry
// module. Importing it in tests (import.meta.main === false) is side-effect free.
// @NOTE: `(import.meta as BunImportMeta).main` — remove cast once tsconfig adds `types: ["bun"]` in Task 3.
type BunImportMeta = ImportMeta & { main: boolean };
export default (import.meta as BunImportMeta).main ? boot() : null;
