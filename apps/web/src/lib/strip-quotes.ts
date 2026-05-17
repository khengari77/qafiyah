const DOUBLE_QUOTE_REGEX = /"/g;

export function stripQuotes(text: string): string {
  return text.replace(DOUBLE_QUOTE_REGEX, '');
}
