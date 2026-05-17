// Allows Arabic letters and whitespace; strips everything else.
// Covers: Basic Arabic (U+0600–U+06FF), Supplement (U+0750–U+077F), Extended-A (U+08A0–U+08FF).
export const NON_ARABIC_AND_SPACE_REGEX = /[^؀-ۿݐ-ݿࢠ-ࣿ\s]/g;
