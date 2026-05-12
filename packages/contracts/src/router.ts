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
