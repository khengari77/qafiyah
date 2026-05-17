// Mirrors arabic-count-format's `ArabicNounForms`. Declared locally to keep
// @qafiyah/constants free of runtime dependencies.
export type ArabicNounForms = {
  readonly singular: string;
  readonly dual: string;
  readonly plural: string;
};

export const ERAS_NOUN_FORMS = {
  singular: 'عصر',
  dual: 'عصران',
  plural: 'عصور',
} as const satisfies ArabicNounForms;

export const METERS_NOUN_FORMS = {
  singular: 'بحر',
  dual: 'بحران',
  plural: 'بحور',
} as const satisfies ArabicNounForms;

export const THEMES_NOUN_FORMS = {
  singular: 'غرض',
  dual: 'غرضان',
  plural: 'أغراض',
} as const satisfies ArabicNounForms;

export const RHYMES_NOUN_FORMS = {
  singular: 'قافية',
  dual: 'قافيتان',
  plural: 'قوافي',
} as const satisfies ArabicNounForms;

export const POEMS_NOUN_FORMS = {
  singular: 'قصيدة',
  dual: 'قصيدتان',
  plural: 'قصائد',
} as const satisfies ArabicNounForms;

export const RESULTS_NOUN_FORMS = {
  singular: 'نتيجة',
  dual: 'نتيجتان',
  plural: 'نتائج',
} as const satisfies ArabicNounForms;
