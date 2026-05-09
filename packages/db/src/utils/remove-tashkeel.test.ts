import { removeTashkeel } from './remove-tashkeel';

describe('removeTashkeel', () => {
  it('removes fatha (ـَ)', () => {
    expect(removeTashkeel('كَتَبَ')).toBe('كتب');
  });

  it('removes kasra (ـِ)', () => {
    expect(removeTashkeel('بِسْمِ')).toBe('بسم');
  });

  it('removes damma (ـُ)', () => {
    expect(removeTashkeel('يَكْتُبُ')).toBe('يكتب');
  });

  it('removes shadda (ـّ)', () => {
    expect(removeTashkeel('مُحَمَّد')).toBe('محمد');
  });

  it('removes sukun (ـْ)', () => {
    expect(removeTashkeel('عَلْم')).toBe('علم');
  });

  it('removes tanwin fath (ـً)', () => {
    expect(removeTashkeel('كِتَابًا')).toBe('كتابا');
  });

  it('leaves plain Arabic letters intact', () => {
    expect(removeTashkeel('شعر')).toBe('شعر');
  });

  it('returns empty string for empty input', () => {
    expect(removeTashkeel('')).toBe('');
  });

  it('strips all diacritics from a fully vowelled word', () => {
    expect(removeTashkeel('الرَّحِيمِ')).toBe('الرحيم');
  });

  it('leaves non-Arabic text unchanged', () => {
    expect(removeTashkeel('hello')).toBe('hello');
  });
});
