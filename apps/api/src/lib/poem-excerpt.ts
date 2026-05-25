import { DOUBLE_QUOTE_REGEX, MAX_TWEET_LENGTH } from '@qafiyah/constants';
import { err, ok, type Result } from 'neverthrow';

type PoemWithContent = {
  readonly poetName: string;
  readonly content: string;
};

export type ExtractExcerptError = {
  readonly kind: 'insufficient_content';
  readonly lineCount: number;
};

export type BuildPoemExcerptError =
  | ExtractExcerptError
  | { readonly kind: 'excerpt_too_long'; readonly length: number; readonly max: number };

export function pickExcerptStartIndex(content: string): number {
  const lineCount = content.split('*').length;
  const maxStartIndex = Math.max(0, lineCount - 2);
  return Math.floor(Math.random() * (maxStartIndex / 2)) * 2;
}

export function extractPoemExcerpt(
  poem: PoemWithContent,
  startIndex: number
): Result<string, ExtractExcerptError> {
  const lines = poem.content.split('*');
  if (lines.length < 2) {
    return err({ kind: 'insufficient_content', lineCount: lines.length });
  }
  const line1 = lines[startIndex] || '';
  const line2 = lines[startIndex + 1] || '';
  return ok(`${line1}\n${line2}\n\n${poem.poetName}`.replace(DOUBLE_QUOTE_REGEX, '').trim());
}

export function buildPoemExcerpt(poem: PoemWithContent): Result<string, BuildPoemExcerptError> {
  const startIndex = pickExcerptStartIndex(poem.content);
  const excerptResult = extractPoemExcerpt(poem, startIndex);
  if (excerptResult.isErr()) return err(excerptResult.error);
  const excerpt = excerptResult.value;
  if (excerpt.length > MAX_TWEET_LENGTH) {
    return err({ kind: 'excerpt_too_long', length: excerpt.length, max: MAX_TWEET_LENGTH });
  }
  return ok(excerpt);
}
