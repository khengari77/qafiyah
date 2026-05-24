#!/usr/bin/env bun
import postgres from 'postgres';

type RhymeRow = { readonly id: number; readonly letter: string };
type PoemRow = { readonly id: number; readonly content: string };

const BATCH_SIZE = 5000;
const DB_URL = process.env.DATABASE_URL ?? 'postgres://qafiyah:qafiyah@127.0.0.1:5433/qafiyah';

// Rhyme letter extraction (inlined from src/extract-rhymes.ts to avoid parent imports)
const RHYME_LETTERS: ReadonlySet<string> = new Set([
  'ا',
  'أ',
  'إ',
  'آ',
  'ى',
  'ء',
  'ؤ',
  'ئ',
  'ة',
  'ب',
  'ت',
  'ث',
  'ج',
  'ح',
  'خ',
  'د',
  'ذ',
  'ر',
  'ز',
  'س',
  'ش',
  'ص',
  'ض',
  'ط',
  'ظ',
  'ع',
  'غ',
  'ف',
  'ق',
  'ك',
  'ل',
  'م',
  'ن',
  'ه',
  'و',
  'ي',
]);

function extractRhymeLetter(content: string): string | null {
  const lines = content.split('*').map((s) => s.trim());
  const ajuz: string[] = [];
  for (let i = 1; i < lines.length; i += 2) {
    const line = lines[i];
    if (line !== undefined) ajuz.push(line);
  }
  if (ajuz.length === 0) return null;

  const finals: string[] = [];
  for (const line of ajuz) {
    const last = line.at(-1);
    if (last !== undefined && RHYME_LETTERS.has(last)) finals.push(last);
  }
  if (finals.length === 0) return null;

  // Two-line poem (single ajuz): accept its letter as the rhyme.
  if (ajuz.length === 1) return finals[0] ?? null;

  // Longer poems: first letter that repeats wins.
  const seen = new Set<string>();
  for (const c of finals) {
    if (seen.has(c)) return c;
    seen.add(c);
  }
  return null;
}

async function runExtraction(): Promise<void> {
  const client = postgres(DB_URL, { max: 4, prepare: false });

  try {
    const rhymeRows = (await client<RhymeRow[]>`
      SELECT id, letter FROM rhymes ORDER BY id
    `) as readonly RhymeRow[];
    if (rhymeRows.length !== 36) {
      throw new Error(`expected 36 rhyme rows, got ${rhymeRows.length}`);
    }
    const letterToId = new Map<string, number>();
    for (const r of rhymeRows) letterToId.set(r.letter, r.id);

    const totalRow = (
      await client<{ count: string }[]>`
      SELECT count(*)::text AS count FROM poems
    `
    )[0];
    if (!totalRow) throw new Error('failed to count poems');
    const total = Number(totalRow.count);
    console.log(`[extract] processing ${total} poems in batches of ${BATCH_SIZE}`);

    let afterId = 0;
    let processed = 0;
    let withRhyme = 0;
    let withoutRhyme = 0;
    const distribution = new Map<string, number>();

    while (true) {
      const batch = (await client<PoemRow[]>`
        SELECT id, content FROM poems
        WHERE id > ${afterId}
        ORDER BY id
        LIMIT ${BATCH_SIZE}
      `) as readonly PoemRow[];
      if (batch.length === 0) break;

      const updates: { poem_id: number; rhyme_id: number }[] = [];
      for (const poem of batch) {
        const letter = extractRhymeLetter(poem.content);
        processed++;
        if (letter === null) {
          withoutRhyme++;
          continue;
        }
        const rhymeId = letterToId.get(letter);
        if (rhymeId === undefined) {
          withoutRhyme++;
          continue;
        }
        withRhyme++;
        distribution.set(letter, (distribution.get(letter) ?? 0) + 1);
        updates.push({ poem_id: poem.id, rhyme_id: rhymeId });
      }

      if (updates.length > 0) {
        await client`
          UPDATE poems p
          SET rhyme_id = u.rhyme_id
          FROM (VALUES ${client(updates.map((u) => [u.poem_id, u.rhyme_id]))})
            AS u(poem_id, rhyme_id)
          WHERE p.id = u.poem_id
        `;
      }

      const last = batch[batch.length - 1];
      if (!last) break;
      afterId = last.id;
      console.log(`[extract] ${processed}/${total} processed`);
    }

    console.log('\n[extract] summary');
    console.log(`  processed:    ${processed}`);
    console.log(`  with rhyme:   ${withRhyme}`);
    console.log(`  without:      ${withoutRhyme}`);
    console.log('  distribution (letter → count):');
    for (const r of rhymeRows) {
      const c = distribution.get(r.letter) ?? 0;
      console.log(`    ${r.letter}  ${c}`);
    }
  } finally {
    await client.end();
  }
}

await runExtraction();
