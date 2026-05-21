import { describe, expect, it } from 'vitest';
import { POEMS_INDEX_BODY, POETS_INDEX_BODY } from './indices';

describe('index bodies', () => {
  it('use strict (explicit) mappings — no dynamic mapping', () => {
    expect(POEMS_INDEX_BODY.mappings.dynamic).toBe('strict');
    expect(POETS_INDEX_BODY.mappings.dynamic).toBe('strict');
  });
  it('expose exact/normalized/stemmed sub-fields on poem title', () => {
    const title = POEMS_INDEX_BODY.mappings.properties.title;
    expect(title.analyzer).toBe('arabic_normalized');
    expect(title.fields.exact.type).toBe('keyword');
    expect(title.fields.stemmed.analyzer).toBe('arabic_stemmed');
  });
  it('fold ta-marbuta and ya in the char filter', () => {
    const maps = POEMS_INDEX_BODY.settings.analysis.char_filter.arabic_letter_folding.mappings;
    expect(maps).toContain('ة => ه');
    expect(maps).toContain('ى => ي');
  });
});
