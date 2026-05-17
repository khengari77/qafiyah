// Allows Arabic letters and whitespace; strips everything else.
// Covers: Basic Arabic (U+0600–U+06FF), Supplement (U+0750–U+077F), Extended-A (U+08A0–U+08FF).
export const NON_ARABIC_AND_SPACE_REGEX = /[^؀-ۿݐ-ݿࢠ-ࣿ\s]/g;

// Same range but Basic Arabic block only; used in pure display contexts.
export const NON_ARABIC_BASIC_REGEX = /[^؀-ۿ\s]/g;

// Arabic diacritical marks (tashkeel):
//   U+0610–U+061A  extended Arabic signs (sallallahou, etc.)
//   U+064B–U+065F  vowel marks (fathatan, kasratan, fatha, damma, kasra, shadda, sukun, …)
//   U+06D6–U+06ED  Quranic annotation marks
export const TASHKEEL_REGEX = /[ؐ-ًؚ-ٟۖ-ۭ]/g;
