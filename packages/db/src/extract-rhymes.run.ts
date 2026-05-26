#!/usr/bin/env bun
import postgres from 'postgres';

const DB_URL = process.env['DATABASE_URL'] ?? 'postgres://qafiyah:qafiyah@127.0.0.1:5433/qafiyah';

async function runExtraction(): Promise<void> {
  const client = postgres(DB_URL, { max: 4, prepare: false });

  try {
    const result = await client`
      UPDATE public.poems
      SET rhyme_id = (
        SELECT id FROM public.rhymes
        WHERE letter = public.extract_rhyme_letter(poems.content)
        LIMIT 1
      )
      WHERE true
      RETURNING id
    `;
    console.log(`[extract] updated ${result.count} poems`);

    const unmatched = await client`
      SELECT count(*) AS n FROM public.poems WHERE rhyme_id IS NULL
    `;
    console.log(`[extract] ${unmatched[0]?.['n'] ?? 0} poems with no rhyme match`);
  } finally {
    await client.end();
  }
}

await runExtraction();
