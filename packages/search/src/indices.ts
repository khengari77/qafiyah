import { ANALYSIS } from './analysis';

// text analyzed as normalized, with an exact keyword sub-field and a stemmed
// sub-field — boosted exact > normalized > stemmed at query time.
const arabicText = {
  type: 'text',
  analyzer: 'arabic_normalized',
  fields: {
    // ignore_above: long fields like content exceed Lucene's keyword term
    // limit; over-limit values skip the keyword index (no error) while short
    // titles/names stay exact-matchable for the exact-boost clause.
    exact: { type: 'keyword', ignore_above: 256 },
    stemmed: { type: 'text', analyzer: 'arabic_stemmed' },
  },
} as const;

const settings = { number_of_shards: 1, number_of_replicas: 0, analysis: ANALYSIS } as const;

export const POEMS_INDEX_BODY = {
  settings,
  mappings: {
    dynamic: 'strict',
    properties: {
      id: { type: 'integer' },
      slug: { type: 'keyword' },
      hash: { type: 'keyword', index: false },
      title: arabicText,
      content: arabicText,
      poetName: arabicText,
      titleDisplay: { type: 'keyword', index: false },
      poetNameDisplay: { type: 'keyword', index: false },
      poetSlug: { type: 'keyword' },
      eraSlug: { type: 'keyword' },
      eraName: { type: 'keyword', index: false },
      meterSlug: { type: 'keyword' },
      meterName: { type: 'keyword', index: false },
      themeSlug: { type: 'keyword' },
      rhymeSlug: { type: 'keyword' },
      collectionSlug: { type: 'keyword' },
    },
  },
} as const;

export const POETS_INDEX_BODY = {
  settings,
  mappings: {
    dynamic: 'strict',
    properties: {
      id: { type: 'integer' },
      slug: { type: 'keyword' },
      hash: { type: 'keyword', index: false },
      name: arabicText,
      nameDisplay: { type: 'keyword', index: false },
      eraSlug: { type: 'keyword' },
      eraName: { type: 'keyword', index: false },
    },
  },
} as const;
