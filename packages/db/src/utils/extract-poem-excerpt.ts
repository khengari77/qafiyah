export type RandomPoemLines = {
  poem_id: number;
  poet_name: string;
  content: string;
};

export function extractPoemExcerpt(poem: RandomPoemLines): string {
  const lines = poem.content.split('*');
  const lineCount = lines.length;

  if (lineCount < 2) {
    throw new Error('Poem has insufficient content for formatting');
  }

  const maxStartIndex = Math.max(0, lineCount - 2);
  const randomIndex = Math.floor(Math.random() * (maxStartIndex / 2)) * 2;

  const line1 = lines[randomIndex] || '';
  const line2 = lines[randomIndex + 1] || '';

  return `${line1}\n${line2}\n\n${poem.poet_name}`.replace(/"/g, '').trim();
}
