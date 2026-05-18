import { publicProcedure } from './procedures/base';
import { listEraPoems, listEras } from './procedures/eras.procedures';
import { listMeterPoems, listMeters } from './procedures/meters.procedures';
import { getPoemBySlug, listPoemSlugs } from './procedures/poems.procedures';
import { listPoetPoems, listPoets } from './procedures/poets.procedures';
import { listRhymePoems, listRhymes } from './procedures/rhymes.procedures';
import { search } from './procedures/search.procedures';
import { listThemePoems, listThemes } from './procedures/themes.procedures';

const routes = {
  eras: {
    list: listEras,
    listPoems: listEraPoems,
  },
  meters: {
    list: listMeters,
    listPoems: listMeterPoems,
  },
  poems: {
    listPoemSlugs,
    getPoemBySlug,
  },
  poets: {
    list: listPoets,
    listPoems: listPoetPoems,
  },
  rhymes: {
    list: listRhymes,
    listPoems: listRhymePoems,
  },
  themes: {
    list: listThemes,
    listPoems: listThemePoems,
  },
  search: {
    search,
  },
};

export const router = publicProcedure.router(routes);
export const routerNamespaces = Object.keys(routes);
