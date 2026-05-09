import { removeTashkeel } from './remove-tashkeel';

export function processPoemContent(content: string) {
  const cleanContent = content.replace(/"/g, '');

  const lines = cleanContent.split('*');
  const lineCount = lines.length;

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
