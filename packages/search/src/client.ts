import { Client } from '@elastic/elasticsearch';
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
  return ok(new Client({ node: parsed.toString(), requestTimeout: 10_000, maxRetries: 2 }));
}
