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
    expect(taxonomyIndexUrl('eras')).toBe('/eras');
    expect(taxonomyIndexUrl('collections')).toBe('/collections');
  });
});

describe('taxonomyUrl', () => {
  it('returns the bare term URL for the first page', () => {
    expect(taxonomyUrl('eras', 'jahili')).toBe('/eras/jahili');
    expect(taxonomyUrl('eras', 'jahili', 1)).toBe('/eras/jahili');
  });
  it('appends ?page=N for pages beyond the first', () => {
    expect(taxonomyUrl('meters', 'tawil', 3)).toBe('/meters/tawil?page=3');
  });
});

describe('poetsUrl', () => {
  it('returns bare /poets for the first page', () => {
    expect(poetsUrl()).toBe('/poets');
    expect(poetsUrl(1)).toBe('/poets');
  });
  it('appends ?page=N beyond the first page', () => {
    expect(poetsUrl(2)).toBe('/poets?page=2');
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
