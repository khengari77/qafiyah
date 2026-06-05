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
  it('collectionsContract has list and get', () => {
    expect(collectionsContract).toHaveProperty('list');
    expect(collectionsContract).toHaveProperty('get');
  });

  it('erasContract has list and get', () => {
    expect(erasContract).toHaveProperty('list');
    expect(erasContract).toHaveProperty('get');
  });

  it('metersContract has list and get', () => {
    expect(metersContract).toHaveProperty('list');
    expect(metersContract).toHaveProperty('get');
  });

  it('poemsContract has list, get, listSlugs and count', () => {
    expect(poemsContract).toHaveProperty('list');
    expect(poemsContract).toHaveProperty('get');
    expect(poemsContract).toHaveProperty('listSlugs');
    expect(poemsContract).toHaveProperty('count');
  });

  it('poetsContract has list and get', () => {
    expect(poetsContract).toHaveProperty('list');
    expect(poetsContract).toHaveProperty('get');
  });

  it('rhymesContract has list and get', () => {
    expect(rhymesContract).toHaveProperty('list');
    expect(rhymesContract).toHaveProperty('get');
  });

  it('themesContract has list and get', () => {
    expect(themesContract).toHaveProperty('list');
    expect(themesContract).toHaveProperty('get');
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
