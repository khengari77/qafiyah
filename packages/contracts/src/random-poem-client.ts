import { API_RANDOM_POEM_PATH } from '@qafiyah/constants';
import { err, ok, type Result, ResultAsync } from 'neverthrow';

export const RANDOM_POEM_OPTIONS = ['slug', 'lines'] as const;
export type RandomPoemOption = (typeof RANDOM_POEM_OPTIONS)[number];

export type RandomPoemTransportError =
  | {
      readonly kind: 'network';
      readonly url: string;
      readonly message: string;
      readonly name?: string;
    }
  | { readonly kind: 'rate_limited'; readonly url: string }
  | { readonly kind: 'http_error'; readonly url: string; readonly status: number }
  | { readonly kind: 'empty_response'; readonly url: string };

export function buildRandomPoemUrl(baseUrl: string, option: RandomPoemOption): string {
  return `${baseUrl}${API_RANDOM_POEM_PATH}?option=${option}`;
}

export async function fetchRandomPoemText(
  baseUrl: string,
  option: RandomPoemOption
): Promise<Result<string, RandomPoemTransportError>> {
  const url = buildRandomPoemUrl(baseUrl, option);
  const fetchResult = await ResultAsync.fromPromise(
    fetch(url),
    (cause): RandomPoemTransportError => ({
      kind: 'network',
      url,
      message: cause instanceof Error ? cause.message : String(cause),
      ...(cause instanceof Error && cause.name ? { name: cause.name } : {}),
    })
  );
  if (fetchResult.isErr()) return err(fetchResult.error);
  const response = fetchResult.value;
  if (response.status === 429) return err({ kind: 'rate_limited', url });
  if (!response.ok) return err({ kind: 'http_error', url, status: response.status });
  const text = (await response.text()).trim();
  if (!text) return err({ kind: 'empty_response', url });
  return ok(text);
}
