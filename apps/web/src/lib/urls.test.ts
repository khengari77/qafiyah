import { describe, expect, it } from 'vitest';
import {
  normalizePoetSlug,
  poemUrl,
  poetsUrl,
  poetUrl,
  taxonomyIndexUrl,
  taxonomyUrl,
} from './urls';

describe('normalizePoetSlug', () => {
  it('lowercases and strips the cat-poet- prefix', () => {
    expect(normalizePoetSlug('cat-poet-Mutanabbi')).toBe('mutanabbi');
    expect(normalizePoetSlug('ABU-TAMMAM')).toBe('abu-tammam');
    expect(normalizePoetSlug('cat-poet-abc')).toBe('abc');
  });
});

describe('taxonomyIndexUrl', () => {
  it('returns the bare section URL', () => {
    expect(taxonomyIndexUrl('meters')).toBe('/meters');
    expect(taxonomyIndexUrl('collections')).toBe('/collections');
  });
});

describe('taxonomyUrl', () => {
  it('returns the bare term URL for the first page', () => {
    expect(taxonomyUrl('meters', 'tawil')).toBe('/meters/tawil');
    expect(taxonomyUrl('meters', 'tawil', 1)).toBe('/meters/tawil');
  });
  it('appends ?page=N for pages beyond the first', () => {
    expect(taxonomyUrl('rhymes', 'meem', 3)).toBe('/rhymes/meem?page=3');
  });
});

describe('poetsUrl', () => {
  it('returns bare /poets with no options', () => {
    expect(poetsUrl()).toBe('/poets');
    expect(poetsUrl({ page: 1 })).toBe('/poets');
  });
  it('appends ?page=N beyond the first page', () => {
    expect(poetsUrl({ page: 2 })).toBe('/poets?page=2');
  });
  it('adds era and page, omitting empties, in era→q→page order', () => {
    expect(poetsUrl({ era: 'jahili' })).toBe('/poets?era=jahili');
    expect(poetsUrl({ era: 'jahili', page: 3 })).toBe('/poets?era=jahili&page=3');
  });
  it('encodes an Arabic q and round-trips it', () => {
    const url = poetsUrl({ q: 'متنبي' });
    expect(url.startsWith('/poets?')).toBe(true);
    expect(new URL(url, 'http://x').searchParams.get('q')).toBe('متنبي');
  });
});

describe('poetUrl', () => {
  it('normalizes the slug and omits page 1', () => {
    expect(poetUrl('cat-poet-Mutanabbi')).toBe('/poets/mutanabbi');
    expect(poetUrl('cat-poet-Mutanabbi', 1)).toBe('/poets/mutanabbi');
  });
  it('appends ?page=N beyond the first page', () => {
    expect(poetUrl('cat-poet-Mutanabbi', 4)).toBe('/poets/mutanabbi?page=4');
  });
});

describe('poemUrl', () => {
  it('returns the poem URL', () => {
    expect(poemUrl('TnKK')).toBe('/poems/TnKK');
  });
});
