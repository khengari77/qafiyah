// Mirrors arabic-count-format's `ArabicNounForms`. Declared locally to keep
// @qafiyah/constants free of runtime dependencies.
export type ArabicNounForms = {
  readonly singular: string;
  readonly dual: string;
  readonly plural: string;
};
