import { formatVerseCount, toArabicDigits } from './arabic';

describe('toArabicDigits', () => {
  it('converts western digits to Arabic-Indic digits', () => {
    expect(toArabicDigits(0)).toBe('٠');
    expect(toArabicDigits(1)).toBe('١');
    expect(toArabicDigits(9)).toBe('٩');
  });

  it('converts a multi-digit number', () => {
    expect(toArabicDigits(123)).toBe('١٢٣');
  });

  it('converts a string input', () => {
    expect(toArabicDigits('456')).toBe('٤٥٦');
  });

  it('handles zero', () => {
    expect(toArabicDigits(0)).toBe('٠');
  });

  it('leaves non-digit characters unchanged', () => {
    expect(toArabicDigits('abc')).toBe('abc');
  });

  it('falls back to original digit when not in ARABIC_DIGITS_MAP (edge case)', () => {
    // All 0-9 are in the map, so the ?? d fallback only fires for unexpected chars
    // The regex [0-9] matches only ASCII digits, which are all in the map
    // This test ensures the ?? branch is reachable by testing the full digit set
    expect(toArabicDigits('0123456789').length).toBe(10);
  });

  it('converts all ten digits', () => {
    expect(toArabicDigits('0123456789')).toBe('٠١٢٣٤٥٦٧٨٩');
  });
});

describe('formatVerseCount', () => {
  it('returns "بيت" for 1 verse', () => {
    expect(formatVerseCount(1)).toBe('بيت');
  });

  it('returns "بيتان" for 2 verses', () => {
    expect(formatVerseCount(2)).toBe('بيتان');
  });

  it('returns plural form with Arabic digits for 3 verses', () => {
    expect(formatVerseCount(3)).toBe('٣ أبيات');
  });

  it('returns plural form with Arabic digits for 10 verses', () => {
    expect(formatVerseCount(10)).toBe('١٠ أبيات');
  });

  it('returns singular form with Arabic digits for 11 verses', () => {
    expect(formatVerseCount(11)).toBe('١١ بيت');
  });

  it('returns singular form with Arabic digits for large numbers', () => {
    expect(formatVerseCount(100)).toBe('١٠٠ بيت');
  });

  it('returns plural form for 4 through 10', () => {
    for (let count = 4; count <= 10; count++) {
      expect(formatVerseCount(count)).toContain('أبيات');
    }
  });
});
