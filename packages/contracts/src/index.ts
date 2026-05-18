import { erasContract } from './eras';
import { metersContract } from './meters';
import { poemsContract } from './poems';
import { poetsContract } from './poets';
import { rhymesContract } from './rhymes';
import { searchRouterContract } from './search';
import { themesContract } from './themes';

export const contract = {
  eras: erasContract,
  meters: metersContract,
  poems: poemsContract,
  poets: poetsContract,
  rhymes: rhymesContract,
  themes: themesContract,
  search: searchRouterContract,
};

export type AppContract = typeof contract;

export {
  type EraSlug,
  eraSlugSchema,
  type MeterSlug,
  meterSlugSchema,
  type PoemSlug,
  type PoetSlug,
  poemSlugSchema,
  poetSlugSchema,
  type RhymeSlug,
  rhymeSlugSchema,
  type ThemeSlug,
  themeSlugSchema,
} from './brands';
export { poemResource } from './poems';
export { pagination, poemListItem, subRef } from './schemas';
export {
  cleanArabicQuery,
  poemSearchResult,
  poetSearchResult,
  searchInputSchema,
} from './search';
