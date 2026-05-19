import { erasContract } from './eras';
import { metersContract } from './meters';
import { poemsContract } from './poems';
import { poetsContract } from './poets';
import { rhymesContract } from './rhymes';
import { searchContract } from './search';
import { themesContract } from './themes';

export const contract = {
  eras: erasContract,
  meters: metersContract,
  poems: poemsContract,
  poets: poetsContract,
  rhymes: rhymesContract,
  themes: themesContract,
  search: searchContract,
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
export type { ContractErrorCode } from './constants';
export { poemDetail } from './poems';
export {
  buildRandomPoemUrl,
  fetchRandomPoemText,
  type RandomPoemOption,
  type RandomPoemTransportError,
} from './random-poem-client';
export { namedSlugRef, pagination, poemListItem, slugWithPoemCount } from './schemas';
export {
  cleanArabicQuery,
  poemSearchResult,
  poetSearchResult,
  sanitizeArabicInput,
} from './search';
