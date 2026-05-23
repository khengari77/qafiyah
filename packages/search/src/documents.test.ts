import { describe, expect, it } from 'vitest';
import { docHash, toPoemDoc, toPoetDoc } from './documents';

// Arabic tashkeel (diacritics) range — moved to top level per biome/performance rule.
const TASHKEEL_RE = /[ً-ْ]/;

const poemSource = {
  id: 18,
  slug: '00000000-0000-0000-0000-000000000000',
  title: 'مَن مُبلِغٌ',
  content: 'الشطر الأول*الشطر الثاني',
  poetName: 'المُتنبّي',
  poetSlug: 'mutanabbi',
  eraName: 'عباسي',
  eraSlug: 'abbasid',
  meterName: 'الطويل',
  meterSlug: 'tawil',
  themeSlug: 'love',
  rhymeSlug: 'meem',
};

describe('toPoemDoc', () => {
  it('strips diacritics from matching fields but keeps display originals', () => {
    const doc = toPoemDoc(poemSource);
    expect(doc.title).not.toMatch(TASHKEEL_RE); // no tashkeel in matching field
    expect(doc.titleDisplay).toBe('مَن مُبلِغٌ');
    expect(doc.content).toContain('*');
    expect(doc.poetSlug).toBe('mutanabbi');
  });
  it('hash is deterministic', () => {
    expect(docHash(toPoemDoc(poemSource))).toBe(docHash(toPoemDoc(poemSource)));
  });
});

describe('toPoetDoc', () => {
  it('maps name/bio with display + filter fields', () => {
    const doc = toPoetDoc({
      id: 2630,
      slug: 'abu-mohammed-faqasi',
      name: 'أبو محمد',
      bio: 'عبدُ اللهِ',
      eraName: 'إسلامي',
      eraSlug: 'islamic',
    });
    expect(doc.nameDisplay).toBe('أبو محمد');
    expect(doc.eraSlug).toBe('islamic');
  });
});
