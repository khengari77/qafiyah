import { removeTashkeel } from './remove-tashkeel';

type ProcessedPoemContent = {
  readonly verses: readonly (readonly [string, string])[];
  readonly verseCount: number;
  readonly sample: string;
  readonly keywords: string;
};

export function processPoemContent(content: string): ProcessedPoemContent {
  const cleanContent = content.replace(/"/g, '');

  const lines = cleanContent.split('*');
  const lineCount = lines.length;

  // @WARN: verses is built mutably for performance, then projected as readonly on return.
  const verses: [string, string][] = new Array(Math.ceil(lineCount / 2));

  for (let i = 0, j = 0; i < lineCount; i += 2, j++) {
    verses[j] = [lines[i] || '', lines[i + 1] || ''];
  }

  const verseCount = verses.length;

  const firstThreeLines = lines.slice(0, 3).join(' * ');
  const sample = removeTashkeel(firstThreeLines);

  const allText = lines.join(' ');
  const keywords = removeTashkeel(allText.split(' ').join(','));

  return {
    verses,
    verseCount,
    sample,
    keywords,
  };
}
