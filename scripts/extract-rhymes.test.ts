import { describe, expect, it } from 'vitest';
import { extractRhymeLetter, RHYME_LETTERS } from './extract-rhymes';

describe('RHYME_LETTERS', () => {
  it('contains exactly the 36 canonical qafiyah letters', () => {
    expect(RHYME_LETTERS.size).toBe(36);
    for (const ch of [
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
    ]) {
      expect(RHYME_LETTERS.has(ch)).toBe(true);
    }
  });
});

describe('extractRhymeLetter', () => {
  it('returns the only ajuz letter for a 2-line poem', () => {
    expect(extractRhymeLetter('قف نبك من ذكرى حبيب ومنزل*بسقط اللوى بين الدخول فحومل')).toBe('ل');
  });

  it('returns the repeated letter for a 4-line poem where finals repeat', () => {
    expect(extractRhymeLetter('a*xم*b*yم')).toBe('م');
  });

  it('returns the repeated letter when repetition is between lines 3 and 5', () => {
    expect(extractRhymeLetter('a*xب*c*yر*e*zر')).toBe('ر');
  });

  it('returns null when ajuz finals never repeat', () => {
    expect(extractRhymeLetter('a*xب*c*yم*e*zر')).toBeNull();
  });

  it('ignores ajuz lines whose final char is not a rhyme letter', () => {
    // line[1] ends in '!', line[3] ends in 'م', line[5] ends in 'م'
    expect(extractRhymeLetter('a*hello!*c*دم*e*ولم')).toBe('م');
  });

  it('returns null for empty content', () => {
    expect(extractRhymeLetter('')).toBeNull();
  });

  it('returns null when only the sadr (index 0) is present', () => {
    expect(extractRhymeLetter('بداية القصيدة')).toBeNull();
  });

  it('trims surrounding whitespace before reading the final char', () => {
    expect(extractRhymeLetter('a*xم   ')).toBe('م');
  });

  it('returns null when the only ajuz line ends in a non-rhyme char', () => {
    expect(extractRhymeLetter('a*xyz123')).toBeNull();
  });
});
