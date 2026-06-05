import { publicProcedure } from './procedures/base';
import { get as getCollection, list as listCollections } from './procedures/collections.procedures';
import { get as getEra, list as listEras } from './procedures/eras.procedures';
import { get as getMeter, list as listMeters } from './procedures/meters.procedures';
import {
  count as countPoems,
  get as getPoem,
  listSlugs as listPoemSlugs,
  list as listPoems,
} from './procedures/poems.procedures';
import { get as getPoet, list as listPoets } from './procedures/poets.procedures';
import { get as getRhyme, list as listRhymes } from './procedures/rhymes.procedures';
import { search } from './procedures/search.procedures';
import { get as getTheme, list as listThemes } from './procedures/themes.procedures';

const routes = {
  collections: { list: listCollections, get: getCollection },
  eras: { list: listEras, get: getEra },
  meters: { list: listMeters, get: getMeter },
  poems: { list: listPoems, get: getPoem, listSlugs: listPoemSlugs, count: countPoems },
  poets: { list: listPoets, get: getPoet },
  rhymes: { list: listRhymes, get: getRhyme },
  themes: { list: listThemes, get: getTheme },
  search: { search },
};

export const router = publicProcedure.router(routes);
export const routerNamespaces = Object.keys(routes);
