const PARENS_REGEX = /[()]/g;
const ARABIC_AL_PREFIX_REGEX = /^ال/;

export function normalizeRhymePattern(pattern: string): string {
  return pattern.replace(PARENS_REGEX, '').replace(ARABIC_AL_PREFIX_REGEX, '').trim();
}
