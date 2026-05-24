export const RHYME_LETTERS: ReadonlySet<string> = new Set([
  'ا',
  'أ',
  'إ',
  'آ',
  'ى',
  'ء',
  'ؤ',
  'ئ',
  'ة',
  'ب',
  'ت',
  'ث',
  'ج',
  'ح',
  'خ',
  'د',
  'ذ',
  'ر',
  'ز',
  'س',
  'ش',
  'ص',
  'ض',
  'ط',
  'ظ',
  'ع',
  'غ',
  'ف',
  'ق',
  'ك',
  'ل',
  'م',
  'ن',
  'ه',
  'و',
  'ي',
]);

export function extractRhymeLetter(content: string): string | null {
  const lines = content.split('*').map((s) => s.trim());
  const ajuz: string[] = [];
  for (let i = 1; i < lines.length; i += 2) {
    const line = lines[i];
    if (line !== undefined) ajuz.push(line);
  }
  if (ajuz.length === 0) return null;

  const finals: string[] = [];
  for (const line of ajuz) {
    const last = line.at(-1);
    if (last !== undefined && RHYME_LETTERS.has(last)) finals.push(last);
  }
  if (finals.length === 0) return null;

  // Two-line poem (single ajuz): accept its letter as the rhyme.
  if (ajuz.length === 1) return finals[0] ?? null;

  // Longer poems: first letter that repeats wins.
  const seen = new Set<string>();
  for (const c of finals) {
    if (seen.has(c)) return c;
    seen.add(c);
  }
  return null;
}
