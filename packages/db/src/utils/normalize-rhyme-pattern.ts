export function normalizeRhymePattern(pattern: string): string {
  return pattern.replace(/[()]/g, '').replace(/^ال/, '').trim();
}
