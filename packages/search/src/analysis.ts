// Shared Arabic analysis: fold alef/ya/ta-marbuta variants, strip tatweel and
// diacritics, then (for the stemmed variant) apply Arabic stopwords + stemming.
export const ANALYSIS = {
  char_filter: {
    arabic_letter_folding: {
      type: 'mapping',
      mappings: ['أ => ا', 'إ => ا', 'آ => ا', 'ٱ => ا', 'ى => ي', 'ة => ه', 'ـ => '],
    },
  },
  filter: {
    arabic_stop_filter: { type: 'stop', stopwords: '_arabic_' },
    arabic_stemmer_filter: { type: 'stemmer', language: 'arabic' },
  },
  analyzer: {
    arabic_normalized: {
      type: 'custom',
      char_filter: ['arabic_letter_folding'],
      tokenizer: 'standard',
      filter: ['lowercase', 'decimal_digit', 'arabic_normalization'],
    },
    arabic_stemmed: {
      type: 'custom',
      char_filter: ['arabic_letter_folding'],
      tokenizer: 'standard',
      filter: [
        'lowercase',
        'decimal_digit',
        'arabic_stop_filter',
        'arabic_normalization',
        'arabic_stemmer_filter',
      ],
    },
  },
} as const;
