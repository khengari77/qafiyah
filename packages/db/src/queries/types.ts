import type { MeterSlug, PoemSlug, PoetSlug } from '@qafiyah/contracts';

export type PoemListRow = {
  readonly title: string;
  readonly slug: PoemSlug;
  readonly poetName: string;
  readonly poetSlug: PoetSlug;
  readonly meterName: string;
  readonly meterSlug: MeterSlug;
};
