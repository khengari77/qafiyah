import {
  buildRandomPoemUrl,
  fetchRandomPoemText,
  type PoemSlug,
  poemSlugSchema,
  type RandomPoemTransportError,
} from '@qafiyah/contracts';
import { err, ok, type Result } from 'neverthrow';
import * as v from 'valibot';

export type FetchRandomPoemSlugError =
  | RandomPoemTransportError
  | {
      readonly kind: 'invalid_slug';
      readonly url: string;
      readonly raw: string;
      readonly issues: readonly string[];
    };

export async function fetchRandomPoemSlug(
  baseUrl: string
): Promise<Result<PoemSlug, FetchRandomPoemSlugError>> {
  const textResult = await fetchRandomPoemText(baseUrl, 'slug');
  if (textResult.isErr()) return err(textResult.error);
  const slug = textResult.value;
  const parsed = v.safeParse(poemSlugSchema, slug);
  if (!parsed.success) {
    return err({
      kind: 'invalid_slug',
      url: buildRandomPoemUrl(baseUrl, 'slug'),
      raw: slug,
      issues: parsed.issues.map((i) => i.message),
    });
  }
  return ok(parsed.output);
}
