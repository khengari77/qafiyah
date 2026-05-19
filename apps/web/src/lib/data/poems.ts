import type { PoemSlug, poemDetail } from '@qafiyah/contracts';
import type * as v from 'valibot';
import { readSnapshotFile } from './loader';

type PoemDetail = v.InferOutput<typeof poemDetail>;

let memo: ReadonlyMap<PoemSlug, PoemDetail> | null = null;

function buildMap(): ReadonlyMap<PoemSlug, PoemDetail> {
  if (memo) return memo;
  const raw = readSnapshotFile<Record<string, PoemDetail>>('poems');
  const map = new Map<PoemSlug, PoemDetail>();
  for (const [slug, detail] of Object.entries(raw)) {
    map.set(slug as PoemSlug, detail);
  }
  memo = map;
  return map;
}

export function allPoems(): ReadonlyMap<PoemSlug, PoemDetail> {
  return buildMap();
}

export function allPoemSlugs(): readonly PoemSlug[] {
  return [...buildMap().keys()];
}

export function getPoem(slug: PoemSlug): PoemDetail {
  const hit = buildMap().get(slug);
  if (!hit) throw new Error(`poem '${slug}' not found in snapshot`);
  return hit;
}

export function __resetPoemsMemoForTests(): void {
  memo = null;
}
