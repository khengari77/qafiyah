import { describe, expect, it } from 'vitest';
import { erasContract } from './eras';
import { metersContract } from './meters';
import { poemsContract } from './poems';
import { poetsContract } from './poets';
import { rhymesContract } from './rhymes';
import { contract } from './router';
import { searchRouterContract } from './search';
import { themesContract } from './themes';

describe('contract structure', () => {
  it('erasContract has list and listPoems', () => {
    expect(erasContract).toHaveProperty('list');
    expect(erasContract).toHaveProperty('listPoems');
  });

  it('metersContract has list and listPoems', () => {
    expect(metersContract).toHaveProperty('list');
    expect(metersContract).toHaveProperty('listPoems');
  });

  it('poemsContract has listSlugs and getBySlug', () => {
    expect(poemsContract).toHaveProperty('listSlugs');
    expect(poemsContract).toHaveProperty('getBySlug');
  });

  it('poetsContract has list and listPoems', () => {
    expect(poetsContract).toHaveProperty('list');
    expect(poetsContract).toHaveProperty('listPoems');
  });

  it('rhymesContract has list and listPoems', () => {
    expect(rhymesContract).toHaveProperty('list');
    expect(rhymesContract).toHaveProperty('listPoems');
  });

  it('themesContract has list and listPoems', () => {
    expect(themesContract).toHaveProperty('list');
    expect(themesContract).toHaveProperty('listPoems');
  });

  it('searchRouterContract has search', () => {
    expect(searchRouterContract).toHaveProperty('search');
  });

  it('root contract assembles all domain contracts', () => {
    expect(contract).toHaveProperty('eras');
    expect(contract).toHaveProperty('meters');
    expect(contract).toHaveProperty('poems');
    expect(contract).toHaveProperty('poets');
    expect(contract).toHaveProperty('rhymes');
    expect(contract).toHaveProperty('themes');
    expect(contract).toHaveProperty('search');
  });
});
