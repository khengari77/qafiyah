import type { MeterSlug } from '@qafiyah/contracts';
import { apiServer } from '../rpc';
import type { Meter, MeterPoemsResponse } from '../types';
import { dedup, isNotFound } from './dedup';

export function fetchMeters(): Promise<readonly Meter[]> {
  return dedup('meters:list', async () => (await apiServer.meters.list()).data);
}

export async function fetchMeterPoemPage(
  slug: MeterSlug,
  page: number
): Promise<MeterPoemsResponse | null> {
  try {
    return await apiServer.meters.listPoems({ slug, page: page.toString() });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}
