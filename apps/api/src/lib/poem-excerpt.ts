import { DOUBLE_QUOTE_REGEX, MAX_TWEET_LENGTH } from '@qafiyah/constants';
import { err, ok, type Result } from 'neverthrow';

type PoemWithContent = {
  readonly poetName: string;
  readonly content: string;
};

export type BuildPoemExcerptError =
  | { readonly kind: 'insufficient_content'; readonly lineCount: number }
  | { readonly kind: 'excerpt_too_long'; readonly length: number; readonly max: number };

export function buildPoemExcerpt(poem: PoemWithContent): Result<string, BuildPoemExcerptError> {
  const lines = poem.content.split('*');
  if (lines.length < 2) {
    return err({ kind: 'insufficient_content', lineCount: lines.length });
  }
  const maxStartIndex = Math.max(0, lines.length - 2);
  const startIndex = Math.floor(Math.random() * (maxStartIndex / 2)) * 2;
  const line1 = lines[startIndex] || '';
  const line2 = lines[startIndex + 1] || '';
  const excerpt = `${line1}\n${line2}\n\n${poem.poetName}`.replace(DOUBLE_QUOTE_REGEX, '').trim();
  if (excerpt.length > MAX_TWEET_LENGTH) {
    return err({ kind: 'excerpt_too_long', length: excerpt.length, max: MAX_TWEET_LENGTH });
  }
  return ok(excerpt);
}
