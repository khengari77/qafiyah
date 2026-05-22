import { Client, HttpConnection } from '@elastic/elasticsearch';
import { err, ok, type Result } from 'neverthrow';

export type SearchClient = Client;

export type CreateSearchClientError = {
  readonly kind: 'invalid_url';
  readonly rawUrl: string;
  readonly message: string;
};

export function createSearchClient(
  elasticsearchUrl: string
): Result<SearchClient, CreateSearchClientError> {
  let parsed: URL;
  try {
    parsed = new URL(elasticsearchUrl);
  } catch (cause) {
    return err({
      kind: 'invalid_url',
      rawUrl: elasticsearchUrl,
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return err({
      kind: 'invalid_url',
      rawUrl: elasticsearchUrl,
      message: `Unsupported protocol: ${parsed.protocol}`,
    });
  }
  // @WARN: Connection: HttpConnection is REQUIRED under the Bun runtime — the
  // client's default undici-based transport throws "response.headers undefined"
  // on every request under Bun. The Node-http connection works under both Bun
  // (api + worker runtimes) and Node (vitest). Do not remove.
  return ok(
    new Client({
      node: parsed.toString(),
      Connection: HttpConnection,
      requestTimeout: 10_000,
      maxRetries: 2,
    })
  );
}
