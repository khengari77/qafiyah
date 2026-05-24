import { describe, expect, it } from 'vitest';
import { collectionsContract } from './collections';
import { erasContract } from './eras';
import { contract } from './index';
import { metersContract } from './meters';
import { poemsContract } from './poems';
import { poetsContract } from './poets';
import { rhymesContract } from './rhymes';
import { searchContract } from './search';
import { themesContract } from './themes';

describe('contract structure', () => {
  it('collectionsContract has list and listPoems', () => {
    expect(collectionsContract).toHaveProperty('list');
    expect(collectionsContract).toHaveProperty('listPoems');
  });

  it('erasContract has list and listPoems', () => {
    expect(erasContract).toHaveProperty('list');
    expect(erasContract).toHaveProperty('listPoems');
  });

  it('metersContract has list and listPoems', () => {
    expect(metersContract).toHaveProperty('list');
    expect(metersContract).toHaveProperty('listPoems');
  });

  it('poemsContract has listPoemSlugs and getPoemBySlug', () => {
    expect(poemsContract).toHaveProperty('listPoemSlugs');
    expect(poemsContract).toHaveProperty('getPoemBySlug');
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

  it('searchContract has search', () => {
    expect(searchContract).toHaveProperty('search');
  });

  it('root contract assembles all domain contracts', () => {
    expect(contract).toHaveProperty('collections');
    expect(contract).toHaveProperty('eras');
    expect(contract).toHaveProperty('meters');
    expect(contract).toHaveProperty('poems');
    expect(contract).toHaveProperty('poets');
    expect(contract).toHaveProperty('rhymes');
    expect(contract).toHaveProperty('themes');
    expect(contract).toHaveProperty('search');
  });
});
