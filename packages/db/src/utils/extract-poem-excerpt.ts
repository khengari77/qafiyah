declare const PoemIdBrand: unique symbol;
export type PoemId = number & { readonly [PoemIdBrand]: 'PoemId' };

export type RandomPoemLines = {
  readonly poem_id: PoemId;
  readonly poet_name: string;
  readonly content: string;
};

export function extractPoemExcerpt(poem: RandomPoemLines, startIndex: number): string {
  const lines = poem.content.split('*');
  if (lines.length < 2) {
    throw new Error('Poem has insufficient content for formatting');
  }
  const line1 = lines[startIndex] || '';
  const line2 = lines[startIndex + 1] || '';
  return `${line1}\n${line2}\n\n${poem.poet_name}`.replace(/"/g, '').trim();
}
