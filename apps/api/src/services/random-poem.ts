import { type DbClient, poemsQueries } from '@qafiyah/db';

type RandomPoemOption = 'slug' | 'lines';

export async function getRandomPoemText(db: DbClient, option: RandomPoemOption): Promise<string> {
  if (option === 'lines') {
    const result = await poemsQueries.getRandomPoemLines(db);
    return result.formatted;
  }
  return poemsQueries.getRandomPoemSlug(db);
}
