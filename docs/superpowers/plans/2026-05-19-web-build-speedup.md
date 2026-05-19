# Web Static Build Speedup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the HTTP/Wrangler build path with a two-phase build (DB → JSON snapshot → Astro static render) so `apps/web` builds in ~6–16 min instead of ~2 h.

**Architecture:** A new `apps/web/scripts/generate-snapshot.ts` calls `@qafiyah/db` directly to dump all build data into `apps/web/.data/*.json` (~10 bulk queries). A new `apps/web/src/lib/data/*` loader reads those files with module-scope caching. Every `getStaticPaths` returns `{ params, props }` with full page data, so page bodies never fetch. A new `apps/web/scripts/build.ts` orchestrates `generate-snapshot → astro build`. The Wrangler subprocess, BUILD_API_URL injection, retrying fetch, and NODE_OPTIONS=12 GB hack are deleted.

**Tech Stack:** Bun, Astro 6, Vite 7, TypeScript, Vitest, Drizzle ORM + postgres.js (via `@qafiyah/db`), Valibot (via `@qafiyah/contracts`), neverthrow, ts-pattern.

**Spec:** `docs/superpowers/specs/2026-05-19-web-build-speedup-design.md`

**Conventions for this plan:**

- All commands assume cwd = repo root (`/Users/alwaleed.alqahani/Developer/qafiyah`) unless noted.
- Tests run with `bun --filter @qafiyah/web run test` for web tests and `bun --filter @qafiyah/db run test` for db tests.
- Type-checks run with `bun run types` (repo-wide) or `bun --filter @qafiyah/web run types`.
- Commits use Conventional Commits (`feat`, `refactor`, `chore`, `test`, `docs`); `commitlint` enforces this. Pre-commit hook runs `bun run ci`, which includes a `smoke` step that hits a live dev server — if smoke fails for environmental reasons unrelated to the change (DB not seeded, port conflict), confirm with the user before using `--no-verify`. Don't bypass silently.
- Branch: all work happens on `feat/web-build-speedup`. Final merge to `main` follows project norms (PR or fast-forward).
- Date used inside generated files: `2026-05-19`.

---

## Task 1: Create branch, gitignore, and verify clean baseline

**Files:**

- Modify: `.gitignore`

- [ ] **Step 1: Confirm working tree state**

Run: `git status`

Expected: branch is `main`. There are pre-existing unstaged changes in `apps/api/src/middlewares/db.middleware.test.ts`, `apps/api/src/middlewares/db.middleware.ts`, and `apps/web/src/lib/api/rpc.ts` (these predate this plan; leave them untouched). An uncommitted spec at `docs/superpowers/specs/2026-05-19-web-build-speedup-design.md` is expected.

If any other unstaged or staged changes appear, stop and ask the user.

- [ ] **Step 2: Create the feature branch**

Run: `git checkout -b feat/web-build-speedup`

Expected: `Switched to a new branch 'feat/web-build-speedup'`.

- [ ] **Step 3: Add `apps/web/.data/` to `.gitignore`**

Append the following to `.gitignore`:

```gitignore

# Web build snapshot (regenerated each build)
apps/web/.data/
```

- [ ] **Step 4: Verify gitignore rule works**

Run: `mkdir -p apps/web/.data && touch apps/web/.data/test.json && git status --porcelain apps/web/.data && rm -rf apps/web/.data`

Expected: no output (the file is ignored).

- [ ] **Step 5: Commit**

```bash
git add .gitignore
git commit -m "chore(web): ignore generated build snapshot directory"
```

If the pre-commit `smoke` step fails for environmental reasons, ask the user before using `--no-verify`.

---

## Task 2: Add bulk per-entity poem-listing queries to `@qafiyah/db`

These queries return all rows in one round-trip, joined by parent slug. Used only by the snapshot generator.

**Files:**

- Modify: `packages/db/src/eras.queries.ts`
- Modify: `packages/db/src/meters.queries.ts`
- Modify: `packages/db/src/rhymes.queries.ts`
- Modify: `packages/db/src/themes.queries.ts`
- Modify: `packages/db/src/poets.queries.ts`
- Modify: `packages/db/src/eras.queries.test.ts`
- Modify: `packages/db/src/meters.queries.test.ts`
- Modify: `packages/db/src/rhymes.queries.test.ts`
- Modify: `packages/db/src/themes.queries.test.ts`
- Modify: `packages/db/src/poets.queries.test.ts`

The 5 functions share a shape:

```ts
listAll<Entity>Poems(db): Promise<Result<ReadonlyMap<<Entity>Slug, readonly PoemListRow[]>, ListAll<Entity>PoemsError>>
```

The Map preserves DB order (ORDER BY parent slug, poem id). Empty parents are absent from the map.

- [ ] **Step 1: Write failing test for `listAllEraPoems`**

Append to `packages/db/src/eras.queries.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { withTestDb } from './test-utils'
import { listAllEraPoems } from './eras.queries'

describe('listAllEraPoems', () => {
  it('returns a Map keyed by era slug containing all poems for that era', async () => {
    await withTestDb(async (db) => {
      const result = await listAllEraPoems(db)
      expect(result.isOk()).toBe(true)
      if (result.isErr()) return
      const map = result.value
      // At least one era is present.
      expect(map.size).toBeGreaterThan(0)
      // Each value is a non-empty list of PoemListRow.
      for (const [, poems] of map) {
        expect(poems.length).toBeGreaterThan(0)
        expect(poems[0]).toMatchObject({
          title: expect.any(String),
          slug: expect.any(String),
          poetName: expect.any(String),
          poetSlug: expect.any(String),
          meterName: expect.any(String),
          meterSlug: expect.any(String),
        })
      }
    })
  })
})
```

- [ ] **Step 2: Run the failing test**

Run: `bun --filter @qafiyah/db run test -- listAllEraPoems`

Expected: FAIL with `listAllEraPoems is not exported` or compile error.

- [ ] **Step 3: Implement `listAllEraPoems`**

Append to `packages/db/src/eras.queries.ts` (after `listEraPoems`):

```ts
export type ListAllEraPoemsError = ExecuteAsError

export async function listAllEraPoems(
  db: DbClient
): Promise<Result<ReadonlyMap<EraSlug, readonly PoemListRow[]>, ListAllEraPoemsError>> {
  const rawPoemsResult = await executeAs(
    db,
    sql`
      SELECT
        e.slug AS parent_slug,
        p.title AS title,
        p.slug AS slug,
        pt.name AS poet_name,
        pt.slug AS poet_slug,
        m.name AS meter_name,
        m.slug AS meter_slug
      FROM public.poems p
      JOIN public.poets pt ON p.poet_id = pt.id
      JOIN public.meters m ON p.meter_id = m.id
      JOIN public.eras e ON pt.era_id = e.id
      ORDER BY e.slug, p.id
    `,
    parentScopedPoemRowSchema
  )
  if (rawPoemsResult.isErr()) return err(rawPoemsResult.error)

  const grouped = new Map<EraSlug, PoemListRow[]>()
  for (const row of rawPoemsResult.value) {
    const eraSlug = asEraSlug(row.parent_slug)
    const list = grouped.get(eraSlug)
    const entry: PoemListRow = {
      title: row.title,
      slug: row.slug,
      poetName: row.poet_name,
      poetSlug: row.poet_slug,
      meterName: row.meter_name,
      meterSlug: row.meter_slug,
    }
    if (list) list.push(entry)
    else grouped.set(eraSlug, [entry])
  }
  return ok(grouped)
}
```

- [ ] **Step 4: Add the `parentScopedPoemRowSchema` to `packages/db/src/row-schemas.ts`**

Append:

```ts
export const parentScopedPoemRowSchema = v.object({
  parent_slug: v.string(),
  title: v.string(),
  slug: poemSlugSchema,
  poet_name: v.string(),
  poet_slug: poetSlugSchema,
  meter_name: v.string(),
  meter_slug: meterSlugSchema,
})
```

And update the import statement near the top of `packages/db/src/eras.queries.ts` to include `parentScopedPoemRowSchema`:

```ts
import {
  type PoemListRow,
  parentScopedPoemRowSchema,
  parentStatsRowSchema,
  rawPoemRowSchema,
} from './row-schemas'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun --filter @qafiyah/db run test -- listAllEraPoems`

Expected: PASS.

- [ ] **Step 6: Repeat steps 1–5 for the remaining 4 entities**

Apply the same template to:

- `meters.queries.ts` → `listAllMeterPoems(db): Promise<Result<ReadonlyMap<MeterSlug, readonly PoemListRow[]>, ExecuteAsError>>`. SQL change: `JOIN public.meters m2 ON p.meter_id = m2.id` and `SELECT m2.slug AS parent_slug` (no era join needed); `ORDER BY m2.slug, p.id`. The list still uses `m.name AS meter_name, m.slug AS meter_slug` for the inner meter (same row — drop alias `m2`, just `SELECT m.slug AS parent_slug, ...` is fine since each poem has exactly one meter).
- `rhymes.queries.ts` → `listAllRhymePoems(db): Promise<Result<ReadonlyMap<RhymeSlug, readonly PoemListRow[]>, ExecuteAsError>>`. Read existing `listRhymePoems` for the join pattern (likely `JOIN public.rhymes r ON p.rhyme_id = r.id`); copy that join into the bulk query with `SELECT r.slug AS parent_slug`.
- `themes.queries.ts` → `listAllThemePoems(db): Promise<Result<ReadonlyMap<ThemeSlug, readonly PoemListRow[]>, ExecuteAsError>>`. Same pattern, theme join.
- `poets.queries.ts` → `listAllPoetPoems(db): Promise<Result<ReadonlyMap<PoetSlug, readonly PoemListRow[]>, ExecuteAsError>>`. `SELECT pt.slug AS parent_slug` and group by `PoetSlug`.

For each: write the test first (test pattern from Step 1, swap names), confirm it fails, implement, confirm it passes. Use `asMeterSlug`, `asRhymeSlug`, `asThemeSlug`, `asPoetSlug` from `./brand` as appropriate.

- [ ] **Step 7: Type-check the db package**

Run: `bun --filter @qafiyah/db run types`

Expected: no errors.

- [ ] **Step 8: Run the full db test suite**

Run: `bun --filter @qafiyah/db run test`

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/db/src
git commit -m "feat(db): add bulk listAll<Entity>Poems queries for build-time snapshotting

Five new query functions return a ReadonlyMap<EntitySlug, readonly PoemListRow[]>
in one round-trip each. Used by apps/web's upcoming snapshot generator; not
called by apps/api. Existing paginated queries are unchanged."
```

---

## Task 3: Snapshot loader (`loader.ts`)

The loader is a single file responsible for read-once-then-cache JSON reads from `apps/web/.data/`.

**Files:**

- Create: `apps/web/src/lib/data/loader.ts`
- Create: `apps/web/src/lib/data/loader.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/data/loader.test.ts`:

```ts
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { __resetLoaderCacheForTests, readSnapshotFile, setSnapshotDirForTests } from './loader'

describe('readSnapshotFile', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'qafiyah-loader-'))
    setSnapshotDirForTests(tempDir)
    __resetLoaderCacheForTests()
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    setSnapshotDirForTests(null)
    __resetLoaderCacheForTests()
  })

  it('parses and returns JSON from the snapshot directory', () => {
    writeFileSync(join(tempDir, 'thing.json'), JSON.stringify({ a: 1, b: 'two' }))
    const result = readSnapshotFile<{ a: number; b: string }>('thing')
    expect(result).toEqual({ a: 1, b: 'two' })
  })

  it('returns the cached value on subsequent reads (no fs hit)', () => {
    writeFileSync(join(tempDir, 'thing.json'), JSON.stringify({ a: 1 }))
    const first = readSnapshotFile<{ a: number }>('thing')
    // Mutate the file on disk; cache should win.
    writeFileSync(join(tempDir, 'thing.json'), JSON.stringify({ a: 999 }))
    const second = readSnapshotFile<{ a: number }>('thing')
    expect(second).toBe(first)
    expect(second.a).toBe(1)
  })

  it('throws a clear error when the snapshot file is missing', () => {
    expect(() => readSnapshotFile('does-not-exist')).toThrow(
      /snapshot file .* not found.*regenerate/i
    )
  })
})
```

- [ ] **Step 2: Run the failing test**

Run: `bun --filter @qafiyah/web run test -- loader.test`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the loader**

Create `apps/web/src/lib/data/loader.ts`:

```ts
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const DEFAULT_SNAPSHOT_DIR = resolve(import.meta.dirname, '..', '..', '..', '.data')

let snapshotDirOverride: string | null = null
const cache = new Map<string, unknown>()

export function setSnapshotDirForTests(dir: string | null): void {
  snapshotDirOverride = dir
}

export function __resetLoaderCacheForTests(): void {
  cache.clear()
}

function snapshotDir(): string {
  return snapshotDirOverride ?? DEFAULT_SNAPSHOT_DIR
}

export function readSnapshotFile<T>(name: string): T {
  const hit = cache.get(name)
  if (hit !== undefined) return hit as T

  const path = join(snapshotDir(), `${name}.json`)
  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch (cause) {
    throw new Error(
      `snapshot file '${name}.json' not found at ${path}. ` +
        `Run 'bun apps/web/scripts/generate-snapshot.ts' first to regenerate.`,
      { cause }
    )
  }
  const parsed = JSON.parse(raw) as T
  cache.set(name, parsed)
  return parsed
}
```

- [ ] **Step 4: Run the test**

Run: `bun --filter @qafiyah/web run test -- loader.test`

Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/data/loader.ts apps/web/src/lib/data/loader.test.ts
git commit -m "feat(web): add snapshot loader with module-scope caching"
```

---

## Task 4: Poems data accessor (`data/poems.ts`)

**Files:**

- Create: `apps/web/src/lib/data/poems.ts`
- Create: `apps/web/src/lib/data/poems.test.ts`

The accessor reads `poems.json` (shape: `Record<PoemSlug, PoemDetail>`) and exposes:

- `allPoems(): ReadonlyMap<PoemSlug, PoemDetail>` — all entries
- `getPoem(slug: PoemSlug): PoemDetail` — throws if unknown
- `allPoemSlugs(): readonly PoemSlug[]` — keys, for routes that only need slugs

`PoemDetail` is `v.InferOutput<typeof poemDetail>` from `@qafiyah/contracts` (already exported).

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/data/poems.test.ts`:

```ts
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PoemSlug } from '@qafiyah/contracts'
import { __resetLoaderCacheForTests, setSnapshotDirForTests } from './loader'
import { allPoems, allPoemSlugs, getPoem } from './poems'

const FIXTURE: Record<string, unknown> = {
  'poem-a': {
    title: 'Poem A',
    slug: 'poem-a',
    verses: [['line 1a', 'line 1b']],
    verseCount: 1,
    sample: 'sample',
    keywords: 'k1,k2',
    poet: { name: 'Poet 1', slug: 'poet-1' },
    era: { name: 'Era 1', slug: 'era-1' },
    meter: { name: 'Meter 1', slug: 'meter-1' },
    theme: { name: 'Theme 1', slug: 'theme-1' },
    relatedPoems: [],
  },
}

describe('poems data accessor', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'qafiyah-poems-'))
    writeFileSync(join(tempDir, 'poems.json'), JSON.stringify(FIXTURE))
    setSnapshotDirForTests(tempDir)
    __resetLoaderCacheForTests()
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    setSnapshotDirForTests(null)
    __resetLoaderCacheForTests()
  })

  it('allPoems returns a Map with one entry per poem', () => {
    const map = allPoems()
    expect(map.size).toBe(1)
    const entry = map.get('poem-a' as PoemSlug)
    expect(entry?.title).toBe('Poem A')
  })

  it('getPoem returns the poem for a known slug', () => {
    const poem = getPoem('poem-a' as PoemSlug)
    expect(poem.poet.name).toBe('Poet 1')
  })

  it('getPoem throws a clear error for an unknown slug', () => {
    expect(() => getPoem('missing' as PoemSlug)).toThrow(/poem 'missing' not found in snapshot/i)
  })

  it('allPoemSlugs returns the slugs', () => {
    expect(allPoemSlugs()).toEqual(['poem-a'])
  })
})
```

- [ ] **Step 2: Run the failing test**

Run: `bun --filter @qafiyah/web run test -- poems.test`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the accessor**

Create `apps/web/src/lib/data/poems.ts`:

```ts
import type { PoemSlug, poemDetail } from '@qafiyah/contracts'
import type * as v from 'valibot'
import { readSnapshotFile } from './loader'

type PoemDetail = v.InferOutput<typeof poemDetail>

let memo: ReadonlyMap<PoemSlug, PoemDetail> | null = null

function buildMap(): ReadonlyMap<PoemSlug, PoemDetail> {
  if (memo) return memo
  const raw = readSnapshotFile<Record<string, PoemDetail>>('poems')
  const map = new Map<PoemSlug, PoemDetail>()
  for (const [slug, detail] of Object.entries(raw)) {
    map.set(slug as PoemSlug, detail)
  }
  memo = map
  return map
}

export function allPoems(): ReadonlyMap<PoemSlug, PoemDetail> {
  return buildMap()
}

export function allPoemSlugs(): readonly PoemSlug[] {
  return [...buildMap().keys()]
}

export function getPoem(slug: PoemSlug): PoemDetail {
  const hit = buildMap().get(slug)
  if (!hit) throw new Error(`poem '${slug}' not found in snapshot`)
  return hit
}

// Used by tests to clear the in-module memo when swapping snapshot dirs.
export function __resetPoemsMemoForTests(): void {
  memo = null
}
```

Update the test imports to also clear this memo in `beforeEach`. Modify `poems.test.ts` to import `__resetPoemsMemoForTests` and call it in `beforeEach` after `__resetLoaderCacheForTests()`:

```ts
import { __resetLoaderCacheForTests, setSnapshotDirForTests } from './loader'
import { __resetPoemsMemoForTests, allPoems, allPoemSlugs, getPoem } from './poems'
// ...
beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'qafiyah-poems-'))
  writeFileSync(join(tempDir, 'poems.json'), JSON.stringify(FIXTURE))
  setSnapshotDirForTests(tempDir)
  __resetLoaderCacheForTests()
  __resetPoemsMemoForTests()
})
```

- [ ] **Step 4: Run the tests**

Run: `bun --filter @qafiyah/web run test -- poems.test`

Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/data/poems.ts apps/web/src/lib/data/poems.test.ts
git commit -m "feat(web): add poems snapshot accessor"
```

---

## Task 5: Poets data accessor (`data/poets.ts`)

**Files:**

- Create: `apps/web/src/lib/data/poets.ts`
- Create: `apps/web/src/lib/data/poets.test.ts`

This accessor reads two snapshot files:

- `poets.json` — `Poet[]` (each with `poemsCount`)
- `poet-poems.json` — `Record<PoetSlug, PoemListItem[]>`

Exposes:

- `allPoets(): readonly Poet[]`
- `poetsTotalPages(): number` — `Math.ceil(allPoets().length / POEMS_PER_PAGE)` (current code uses POEMS_PER_PAGE for the poets index, see `apps/web/src/pages/poets/page/[page].astro:39`)
- `getPoetsPage(page: number): { poets: readonly Poet[]; pagination: { totalItems: number; totalPages: number; page: number; pageSize: number } }` — throws if page is out of range
- `getPoetPoemsPage(slug: PoetSlug, page: number): { poems: readonly PoemListItem[]; poet: { name: string; slug: PoetSlug; poemsCount: number }; pagination: { totalItems: number; totalPages: number; page: number; pageSize: number } }` — throws on unknown poet or out-of-range page

The Poet type comes from `apps/web/src/lib/api/rpc.ts`'s existing `Poet` export. We don't want a circular dep, so we re-derive it: `Poet = v.InferOutput<typeof slugWithPoemCount(poetSlugSchema)>` once we import the contract schemas.

Simpler: define a local type that matches the contract:

```ts
type Poet = { readonly slug: PoetSlug; readonly name: string; readonly poemsCount: number }
type PoemListItem = v.InferOutput<typeof poemListItem>
```

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/data/poets.test.ts`:

```ts
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PoetSlug } from '@qafiyah/contracts'
import { __resetLoaderCacheForTests, setSnapshotDirForTests } from './loader'
import { __resetPoetsMemoForTests, allPoets, getPoetPoemsPage, getPoetsPage } from './poets'

const POETS_FIXTURE = [
  { slug: 'poet-a', name: 'Poet A', poemsCount: 65 },
  { slug: 'poet-b', name: 'Poet B', poemsCount: 1 },
]

function makePoemListItem(i: number) {
  return {
    title: `Poem ${i}`,
    slug: `poem-${i}`,
    poet: { name: 'Poet A', slug: 'poet-a' },
    meter: { name: 'Meter X', slug: 'meter-x' },
  }
}

const POET_POEMS_FIXTURE = {
  'poet-a': Array.from({ length: 65 }, (_, i) => makePoemListItem(i + 1)),
  'poet-b': [makePoemListItem(99)],
}

describe('poets data accessor', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'qafiyah-poets-'))
    writeFileSync(join(tempDir, 'poets.json'), JSON.stringify(POETS_FIXTURE))
    writeFileSync(join(tempDir, 'poet-poems.json'), JSON.stringify(POET_POEMS_FIXTURE))
    setSnapshotDirForTests(tempDir)
    __resetLoaderCacheForTests()
    __resetPoetsMemoForTests()
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    setSnapshotDirForTests(null)
    __resetLoaderCacheForTests()
    __resetPoetsMemoForTests()
  })

  it('allPoets returns all poets', () => {
    expect(allPoets()).toHaveLength(2)
  })

  it('getPoetsPage slices and returns pagination metadata', () => {
    const result = getPoetsPage(1)
    expect(result.poets).toHaveLength(2) // POEMS_PER_PAGE = 30, only 2 poets total
    expect(result.pagination).toEqual({ totalItems: 2, totalPages: 1, page: 1, pageSize: 30 })
  })

  it('getPoetsPage throws on out-of-range page', () => {
    expect(() => getPoetsPage(99)).toThrow(/poets page 99 out of range/i)
  })

  it('getPoetPoemsPage returns the page slice + meta', () => {
    const result = getPoetPoemsPage('poet-a' as PoetSlug, 2)
    expect(result.poems).toHaveLength(30)
    expect(result.poems[0]?.slug).toBe('poem-31')
    expect(result.poet).toEqual({ slug: 'poet-a', name: 'Poet A', poemsCount: 65 })
    expect(result.pagination).toEqual({ totalItems: 65, totalPages: 3, page: 2, pageSize: 30 })
  })

  it('getPoetPoemsPage throws on unknown poet', () => {
    expect(() => getPoetPoemsPage('missing' as PoetSlug, 1)).toThrow(/poet 'missing'/i)
  })

  it('getPoetPoemsPage throws on out-of-range page for a known poet', () => {
    expect(() => getPoetPoemsPage('poet-b' as PoetSlug, 5)).toThrow(/page 5 out of range/i)
  })
})
```

- [ ] **Step 2: Run the failing test**

Run: `bun --filter @qafiyah/web run test -- poets.test`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the accessor**

Create `apps/web/src/lib/data/poets.ts`:

```ts
import { POEMS_PER_PAGE } from '@qafiyah/constants'
import type { PoetSlug, poemListItem } from '@qafiyah/contracts'
import type * as v from 'valibot'
import { readSnapshotFile } from './loader'

type Poet = { readonly slug: PoetSlug; readonly name: string; readonly poemsCount: number }
type PoemListItem = v.InferOutput<typeof poemListItem>

type Pagination = {
  readonly totalItems: number
  readonly totalPages: number
  readonly page: number
  readonly pageSize: number
}

let poetsMemo: readonly Poet[] | null = null
let poetPoemsMemo: ReadonlyMap<PoetSlug, readonly PoemListItem[]> | null = null

function loadPoets(): readonly Poet[] {
  if (poetsMemo) return poetsMemo
  poetsMemo = readSnapshotFile<Poet[]>('poets')
  return poetsMemo
}

function loadPoetPoems(): ReadonlyMap<PoetSlug, readonly PoemListItem[]> {
  if (poetPoemsMemo) return poetPoemsMemo
  const raw = readSnapshotFile<Record<string, PoemListItem[]>>('poet-poems')
  const map = new Map<PoetSlug, readonly PoemListItem[]>()
  for (const [slug, list] of Object.entries(raw)) {
    map.set(slug as PoetSlug, list)
  }
  poetPoemsMemo = map
  return map
}

function paginationFor(totalItems: number, page: number): Pagination {
  return {
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / POEMS_PER_PAGE)),
    page,
    pageSize: POEMS_PER_PAGE,
  }
}

export function allPoets(): readonly Poet[] {
  return loadPoets()
}

export function getPoetsPage(page: number): { poets: readonly Poet[]; pagination: Pagination } {
  const poets = loadPoets()
  const pagination = paginationFor(poets.length, page)
  if (page < 1 || page > pagination.totalPages) {
    throw new Error(`poets page ${page} out of range (totalPages=${pagination.totalPages})`)
  }
  const start = (page - 1) * POEMS_PER_PAGE
  return { poets: poets.slice(start, start + POEMS_PER_PAGE), pagination }
}

export function getPoetPoemsPage(
  slug: PoetSlug,
  page: number
): {
  poems: readonly PoemListItem[]
  poet: Poet
  pagination: Pagination
} {
  const poems = loadPoetPoems().get(slug)
  if (!poems) throw new Error(`poet '${slug}' not found in snapshot`)
  const poet = loadPoets().find((p) => p.slug === slug)
  if (!poet) throw new Error(`poet meta for '${slug}' not found in poets snapshot`)
  const pagination = paginationFor(poems.length, page)
  if (page < 1 || page > pagination.totalPages) {
    throw new Error(
      `poet '${slug}' page ${page} out of range (totalPages=${pagination.totalPages})`
    )
  }
  const start = (page - 1) * POEMS_PER_PAGE
  return { poems: poems.slice(start, start + POEMS_PER_PAGE), poet, pagination }
}

export function __resetPoetsMemoForTests(): void {
  poetsMemo = null
  poetPoemsMemo = null
}
```

- [ ] **Step 4: Run the tests**

Run: `bun --filter @qafiyah/web run test -- poets.test`

Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/data/poets.ts apps/web/src/lib/data/poets.test.ts
git commit -m "feat(web): add poets snapshot accessor with pagination"
```

---

## Task 6: Collections data accessor (`data/collections.ts`)

Covers eras, meters, rhymes, themes — identical shape, parameterized by name.

**Files:**

- Create: `apps/web/src/lib/data/collections.ts`
- Create: `apps/web/src/lib/data/collections.test.ts`

Exposes per entity:

- `allEras(): readonly Era[]`, `allMeters()`, `allRhymes()`, `allThemes()`
- `getEraPoemsPage(slug, page)`, `getMeterPoemsPage(slug, page)`, `getRhymePoemsPage(slug, page)`, `getThemePoemsPage(slug, page)` — same return shape as `getPoetPoemsPage`

Note: `Era` has `poemsCount` AND `poetsCount`. `Meter`, `Rhyme`, `Theme` have `poemsCount` only (see existing `apps/web/src/lib/api/rpc.ts` types). Local types match those shapes.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/data/collections.test.ts`:

```ts
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { EraSlug, MeterSlug, RhymeSlug, ThemeSlug } from '@qafiyah/contracts'
import { __resetLoaderCacheForTests, setSnapshotDirForTests } from './loader'
import {
  __resetCollectionsMemoForTests,
  allEras,
  allMeters,
  allRhymes,
  allThemes,
  getEraPoemsPage,
  getMeterPoemsPage,
  getRhymePoemsPage,
  getThemePoemsPage,
} from './collections'

const ERAS_FIXTURE = [{ slug: 'jahili', name: 'الجاهلي', poetsCount: 12, poemsCount: 31 }]
const METERS_FIXTURE = [{ slug: 'albasit', name: 'البسيط', poemsCount: 31 }]
const RHYMES_FIXTURE = [{ slug: 'rhyme-1', name: 'باء', poemsCount: 31 }]
const THEMES_FIXTURE = [{ slug: 'theme-1', name: 'مدح', poemsCount: 31 }]

function makePoem(i: number) {
  return {
    title: `Poem ${i}`,
    slug: `poem-${i}`,
    poet: { name: 'Poet', slug: 'poet-x' },
    meter: { name: 'Meter', slug: 'meter-x' },
  }
}

const POEMS = Array.from({ length: 31 }, (_, i) => makePoem(i + 1))
const ERA_POEMS_FIXTURE = { jahili: POEMS }
const METER_POEMS_FIXTURE = { albasit: POEMS }
const RHYME_POEMS_FIXTURE = { 'rhyme-1': POEMS }
const THEME_POEMS_FIXTURE = { 'theme-1': POEMS }

describe('collections data accessor', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'qafiyah-collections-'))
    writeFileSync(join(tempDir, 'eras.json'), JSON.stringify(ERAS_FIXTURE))
    writeFileSync(join(tempDir, 'meters.json'), JSON.stringify(METERS_FIXTURE))
    writeFileSync(join(tempDir, 'rhymes.json'), JSON.stringify(RHYMES_FIXTURE))
    writeFileSync(join(tempDir, 'themes.json'), JSON.stringify(THEMES_FIXTURE))
    writeFileSync(join(tempDir, 'era-poems.json'), JSON.stringify(ERA_POEMS_FIXTURE))
    writeFileSync(join(tempDir, 'meter-poems.json'), JSON.stringify(METER_POEMS_FIXTURE))
    writeFileSync(join(tempDir, 'rhyme-poems.json'), JSON.stringify(RHYME_POEMS_FIXTURE))
    writeFileSync(join(tempDir, 'theme-poems.json'), JSON.stringify(THEME_POEMS_FIXTURE))
    setSnapshotDirForTests(tempDir)
    __resetLoaderCacheForTests()
    __resetCollectionsMemoForTests()
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    setSnapshotDirForTests(null)
    __resetLoaderCacheForTests()
    __resetCollectionsMemoForTests()
  })

  it('allEras returns all eras', () => {
    expect(allEras()).toHaveLength(1)
    expect(allEras()[0]?.poetsCount).toBe(12)
  })

  it('allMeters / allRhymes / allThemes return their lists', () => {
    expect(allMeters()).toHaveLength(1)
    expect(allRhymes()).toHaveLength(1)
    expect(allThemes()).toHaveLength(1)
  })

  it('getEraPoemsPage paginates correctly (page 2 of 31 items, pageSize 30)', () => {
    const result = getEraPoemsPage('jahili' as EraSlug, 2)
    expect(result.poems).toHaveLength(1)
    expect(result.poems[0]?.slug).toBe('poem-31')
    expect(result.era).toEqual({ slug: 'jahili', name: 'الجاهلي', poetsCount: 12, poemsCount: 31 })
    expect(result.pagination).toEqual({ totalItems: 31, totalPages: 2, page: 2, pageSize: 30 })
  })

  it('getMeterPoemsPage returns the page + meter meta', () => {
    const result = getMeterPoemsPage('albasit' as MeterSlug, 1)
    expect(result.poems).toHaveLength(30)
    expect(result.meter.slug).toBe('albasit')
  })

  it('getRhymePoemsPage returns the page + rhyme meta', () => {
    const result = getRhymePoemsPage('rhyme-1' as RhymeSlug, 1)
    expect(result.rhyme.slug).toBe('rhyme-1')
  })

  it('getThemePoemsPage returns the page + theme meta', () => {
    const result = getThemePoemsPage('theme-1' as ThemeSlug, 1)
    expect(result.theme.slug).toBe('theme-1')
  })

  it('throws on unknown era slug', () => {
    expect(() => getEraPoemsPage('missing' as EraSlug, 1)).toThrow(/era 'missing'/i)
  })

  it('throws on out-of-range page', () => {
    expect(() => getMeterPoemsPage('albasit' as MeterSlug, 99)).toThrow(/page 99 out of range/i)
  })
})
```

- [ ] **Step 2: Run the failing test**

Run: `bun --filter @qafiyah/web run test -- collections.test`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the accessor**

Create `apps/web/src/lib/data/collections.ts`:

```ts
import { POEMS_PER_PAGE } from '@qafiyah/constants'
import type { EraSlug, MeterSlug, RhymeSlug, ThemeSlug, poemListItem } from '@qafiyah/contracts'
import type * as v from 'valibot'
import { readSnapshotFile } from './loader'

type Era = {
  readonly slug: EraSlug
  readonly name: string
  readonly poetsCount: number
  readonly poemsCount: number
}
type Meter = { readonly slug: MeterSlug; readonly name: string; readonly poemsCount: number }
type Rhyme = { readonly slug: RhymeSlug; readonly name: string; readonly poemsCount: number }
type Theme = { readonly slug: ThemeSlug; readonly name: string; readonly poemsCount: number }
type PoemListItem = v.InferOutput<typeof poemListItem>

type Pagination = {
  readonly totalItems: number
  readonly totalPages: number
  readonly page: number
  readonly pageSize: number
}

type Memo = {
  eras: readonly Era[] | null
  meters: readonly Meter[] | null
  rhymes: readonly Rhyme[] | null
  themes: readonly Theme[] | null
  eraPoems: ReadonlyMap<EraSlug, readonly PoemListItem[]> | null
  meterPoems: ReadonlyMap<MeterSlug, readonly PoemListItem[]> | null
  rhymePoems: ReadonlyMap<RhymeSlug, readonly PoemListItem[]> | null
  themePoems: ReadonlyMap<ThemeSlug, readonly PoemListItem[]> | null
}

const memo: Memo = {
  eras: null,
  meters: null,
  rhymes: null,
  themes: null,
  eraPoems: null,
  meterPoems: null,
  rhymePoems: null,
  themePoems: null,
}

function loadList<T>(snapshotName: string, memoKey: keyof Memo): readonly T[] {
  const hit = memo[memoKey] as readonly T[] | null
  if (hit) return hit
  const list = readSnapshotFile<T[]>(snapshotName)
  memo[memoKey] = list as never
  return list
}

function loadPoemsMap<Slug extends string>(
  snapshotName: string,
  memoKey: keyof Memo
): ReadonlyMap<Slug, readonly PoemListItem[]> {
  const hit = memo[memoKey] as ReadonlyMap<Slug, readonly PoemListItem[]> | null
  if (hit) return hit
  const raw = readSnapshotFile<Record<string, PoemListItem[]>>(snapshotName)
  const map = new Map<Slug, readonly PoemListItem[]>()
  for (const [slug, list] of Object.entries(raw)) {
    map.set(slug as Slug, list)
  }
  memo[memoKey] = map as never
  return map
}

function paginationFor(totalItems: number, page: number): Pagination {
  return {
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / POEMS_PER_PAGE)),
    page,
    pageSize: POEMS_PER_PAGE,
  }
}

function pageSlice<T>(items: readonly T[], page: number): readonly T[] {
  const start = (page - 1) * POEMS_PER_PAGE
  return items.slice(start, start + POEMS_PER_PAGE)
}

export function allEras(): readonly Era[] {
  return loadList<Era>('eras', 'eras')
}
export function allMeters(): readonly Meter[] {
  return loadList<Meter>('meters', 'meters')
}
export function allRhymes(): readonly Rhyme[] {
  return loadList<Rhyme>('rhymes', 'rhymes')
}
export function allThemes(): readonly Theme[] {
  return loadList<Theme>('themes', 'themes')
}

export function getEraPoemsPage(
  slug: EraSlug,
  page: number
): { poems: readonly PoemListItem[]; era: Era; pagination: Pagination } {
  const poems = loadPoemsMap<EraSlug>('era-poems', 'eraPoems').get(slug)
  if (!poems) throw new Error(`era '${slug}' not found in snapshot`)
  const era = allEras().find((e) => e.slug === slug)
  if (!era) throw new Error(`era meta for '${slug}' not found`)
  const pagination = paginationFor(poems.length, page)
  if (page < 1 || page > pagination.totalPages) {
    throw new Error(`era '${slug}' page ${page} out of range (totalPages=${pagination.totalPages})`)
  }
  return { poems: pageSlice(poems, page), era, pagination }
}

export function getMeterPoemsPage(
  slug: MeterSlug,
  page: number
): { poems: readonly PoemListItem[]; meter: Meter; pagination: Pagination } {
  const poems = loadPoemsMap<MeterSlug>('meter-poems', 'meterPoems').get(slug)
  if (!poems) throw new Error(`meter '${slug}' not found in snapshot`)
  const meter = allMeters().find((m) => m.slug === slug)
  if (!meter) throw new Error(`meter meta for '${slug}' not found`)
  const pagination = paginationFor(poems.length, page)
  if (page < 1 || page > pagination.totalPages) {
    throw new Error(
      `meter '${slug}' page ${page} out of range (totalPages=${pagination.totalPages})`
    )
  }
  return { poems: pageSlice(poems, page), meter, pagination }
}

export function getRhymePoemsPage(
  slug: RhymeSlug,
  page: number
): { poems: readonly PoemListItem[]; rhyme: Rhyme; pagination: Pagination } {
  const poems = loadPoemsMap<RhymeSlug>('rhyme-poems', 'rhymePoems').get(slug)
  if (!poems) throw new Error(`rhyme '${slug}' not found in snapshot`)
  const rhyme = allRhymes().find((r) => r.slug === slug)
  if (!rhyme) throw new Error(`rhyme meta for '${slug}' not found`)
  const pagination = paginationFor(poems.length, page)
  if (page < 1 || page > pagination.totalPages) {
    throw new Error(
      `rhyme '${slug}' page ${page} out of range (totalPages=${pagination.totalPages})`
    )
  }
  return { poems: pageSlice(poems, page), rhyme, pagination }
}

export function getThemePoemsPage(
  slug: ThemeSlug,
  page: number
): { poems: readonly PoemListItem[]; theme: Theme; pagination: Pagination } {
  const poems = loadPoemsMap<ThemeSlug>('theme-poems', 'themePoems').get(slug)
  if (!poems) throw new Error(`theme '${slug}' not found in snapshot`)
  const theme = allThemes().find((t) => t.slug === slug)
  if (!theme) throw new Error(`theme meta for '${slug}' not found`)
  const pagination = paginationFor(poems.length, page)
  if (page < 1 || page > pagination.totalPages) {
    throw new Error(
      `theme '${slug}' page ${page} out of range (totalPages=${pagination.totalPages})`
    )
  }
  return { poems: pageSlice(poems, page), theme, pagination }
}

export function __resetCollectionsMemoForTests(): void {
  memo.eras = null
  memo.meters = null
  memo.rhymes = null
  memo.themes = null
  memo.eraPoems = null
  memo.meterPoems = null
  memo.rhymePoems = null
  memo.themePoems = null
}
```

- [ ] **Step 4: Run the tests**

Run: `bun --filter @qafiyah/web run test -- collections.test`

Expected: 9 PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/data/collections.ts apps/web/src/lib/data/collections.test.ts
git commit -m "feat(web): add collections snapshot accessor with pagination"
```

---

## Task 7: Snapshot generator skeleton (env, DB connect, atomic write)

The generator is a single Bun script. This task lays the foundation: env loading, DB client, output directory, atomic write helper. It does NOT yet write entity files.

**Files:**

- Create: `apps/web/scripts/generate-snapshot.ts`

- [ ] **Step 1: Create the skeleton**

Create `apps/web/scripts/generate-snapshot.ts`:

```ts
#!/usr/bin/env bun

// biome-ignore-all lint/suspicious/noConsole: build supervisor logs progress.

/**
 * Reads the production-shaped poetry data straight from Postgres via @qafiyah/db
 * and dumps it as JSON snapshot files under apps/web/.data/. Astro's static build
 * then reads from those files via apps/web/src/lib/data/* — no HTTP, no Wrangler.
 */

import { mkdir, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createDb, type DbClient } from '@qafiyah/db'

const HERE = import.meta.dir
const WEB_DIR = resolve(HERE, '..')
const OUTPUT_DIR = resolve(WEB_DIR, '.data')

type GeneratorError =
  | { readonly kind: 'missing_env'; readonly name: string }
  | { readonly kind: 'db_connect'; readonly message: string }
  | { readonly kind: 'query_failed'; readonly entity: string; readonly message: string }
  | { readonly kind: 'write_failed'; readonly path: string; readonly message: string }

function reportAndExit(error: GeneratorError): never {
  console.error(JSON.stringify({ source: 'generate-snapshot', error, output_dir: OUTPUT_DIR }))
  process.exit(1)
}

function readDatabaseUrl(): string {
  const url = process.env['DATABASE_URL']
  if (!url) reportAndExit({ kind: 'missing_env', name: 'DATABASE_URL' })
  return url
}

async function writeJsonAtomic(name: string, value: unknown): Promise<void> {
  const finalPath = resolve(OUTPUT_DIR, `${name}.json`)
  const tmpPath = `${finalPath}.tmp`
  try {
    await writeFile(tmpPath, JSON.stringify(value), 'utf8')
    await rename(tmpPath, finalPath)
  } catch (cause) {
    reportAndExit({
      kind: 'write_failed',
      path: finalPath,
      message: cause instanceof Error ? cause.message : String(cause),
    })
  }
}

async function main(): Promise<void> {
  const databaseUrl = readDatabaseUrl()

  const dbResult = createDb(databaseUrl, { mode: 'long-lived' })
  if (dbResult.isErr()) {
    reportAndExit({
      kind: 'db_connect',
      message: JSON.stringify(dbResult.error),
    })
  }
  const db: DbClient = dbResult.value

  await mkdir(OUTPUT_DIR, { recursive: true })

  // Entity dumps are added in subsequent tasks.

  // Voids the "unused variable" lint for db until later tasks consume it.
  void db

  console.log(
    JSON.stringify({ source: 'generate-snapshot', status: 'done', output_dir: OUTPUT_DIR })
  )
}

await main()
```

- [ ] **Step 2: Smoke-run the skeleton**

Ensure `DATABASE_URL` is set (e.g., from `apps/api/.dev.vars`):

Run:

```bash
export DATABASE_URL="$(grep -E '^DATABASE_URL' apps/api/.dev.vars | head -1 | cut -d '=' -f2- | tr -d '"')"
bun apps/web/scripts/generate-snapshot.ts
```

Expected: prints `{"source":"generate-snapshot","status":"done","output_dir":"..."}`. The `.data` directory exists and is empty.

If `DATABASE_URL` is empty, ensure the local DB is running via `bun run db:setup` and re-read `.dev.vars`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/scripts/generate-snapshot.ts
git commit -m "feat(web): scaffold generate-snapshot script (env, db client, atomic write)"
```

---

## Task 8: Snapshot generator — entity lists (eras, meters, rhymes, themes, poets)

Add the simple bulk dumps. These come from `listEras`, `listMeters`, `listRhymes`, `listThemes`, and an unpaginated full-poets read.

**Files:**

- Modify: `apps/web/scripts/generate-snapshot.ts`

Note: `listPoets` is paginated. For a full dump, the snapshot generator iterates pages until exhausted. Implementation below.

- [ ] **Step 1: Add the entity-list dumps**

Replace the body of `main()` in `apps/web/scripts/generate-snapshot.ts` (between `await mkdir(...)` and the final `console.log`) with:

```ts
console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'eras' }))
const erasResult = await erasQueries.listEras(db)
if (erasResult.isErr()) {
  reportAndExit({ kind: 'query_failed', entity: 'eras', message: JSON.stringify(erasResult.error) })
}
await writeJsonAtomic('eras', erasResult.value)

console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'meters' }))
const metersResult = await metersQueries.listMeters(db)
if (metersResult.isErr()) {
  reportAndExit({
    kind: 'query_failed',
    entity: 'meters',
    message: JSON.stringify(metersResult.error),
  })
}
await writeJsonAtomic('meters', metersResult.value)

console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'rhymes' }))
const rhymesResult = await rhymesQueries.listRhymes(db)
if (rhymesResult.isErr()) {
  reportAndExit({
    kind: 'query_failed',
    entity: 'rhymes',
    message: JSON.stringify(rhymesResult.error),
  })
}
await writeJsonAtomic('rhymes', rhymesResult.value)

console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'themes' }))
const themesResult = await themesQueries.listThemes(db)
if (themesResult.isErr()) {
  reportAndExit({
    kind: 'query_failed',
    entity: 'themes',
    message: JSON.stringify(themesResult.error),
  })
}
await writeJsonAtomic('themes', themesResult.value)

console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'poets' }))
const poets: Array<{ slug: string; name: string; poemsCount: number }> = []
for (let page = 1; ; page++) {
  const pageResult = await poetsQueries.listPoets(db, page)
  if (pageResult.isErr()) {
    reportAndExit({
      kind: 'query_failed',
      entity: 'poets',
      message: JSON.stringify(pageResult.error),
    })
  }
  poets.push(...pageResult.value.poets)
  if (page >= pageResult.value.totalPages) break
}
await writeJsonAtomic('poets', poets)
```

And update the imports at the top of the file:

```ts
import {
  createDb,
  type DbClient,
  erasQueries,
  metersQueries,
  poetsQueries,
  rhymesQueries,
  themesQueries,
} from '@qafiyah/db'
```

Remove the `void db;` line (db is now used).

- [ ] **Step 2: Smoke-run**

Run:

```bash
bun apps/web/scripts/generate-snapshot.ts
ls apps/web/.data/
```

Expected: prints stage logs and `done`. `apps/web/.data/` contains `eras.json`, `meters.json`, `rhymes.json`, `themes.json`, `poets.json`. Each is a non-empty JSON array.

Verify one file:

Run: `bun -e 'const x = require("./apps/web/.data/eras.json"); console.log(x.length, x[0]);'`

Expected: prints a non-zero count and a row matching `EraStatsRow`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/scripts/generate-snapshot.ts
git commit -m "feat(web): dump eras/meters/rhymes/themes/poets in snapshot generator"
```

---

## Task 9: Snapshot generator — per-entity poem lists (era-poems, meter-poems, rhyme-poems, theme-poems, poet-poems)

Uses the bulk queries added in Task 2 and emits `Record<Slug, PoemListItem[]>` files — `PoemListItem` shape matches the contract (`{ title, slug, poet: {name, slug}, meter: {name, slug} }`).

**Files:**

- Modify: `apps/web/scripts/generate-snapshot.ts`

- [ ] **Step 1: Add a row-to-item mapper inline**

Append before `async function main()` in `apps/web/scripts/generate-snapshot.ts`:

```ts
type PoemListRow = {
  readonly title: string
  readonly slug: string
  readonly poetName: string
  readonly poetSlug: string
  readonly meterName: string
  readonly meterSlug: string
}

type PoemListItem = {
  readonly title: string
  readonly slug: string
  readonly poet: { readonly name: string; readonly slug: string }
  readonly meter: { readonly name: string; readonly slug: string }
}

function toPoemListItem(row: PoemListRow): PoemListItem {
  return {
    title: row.title,
    slug: row.slug,
    poet: { name: row.poetName, slug: row.poetSlug },
    meter: { name: row.meterName, slug: row.meterSlug },
  }
}

function mapToRecord<Slug extends string>(
  map: ReadonlyMap<Slug, readonly PoemListRow[]>
): Record<Slug, PoemListItem[]> {
  const out: Record<string, PoemListItem[]> = {}
  for (const [slug, rows] of map) {
    out[slug] = rows.map(toPoemListItem)
  }
  return out as Record<Slug, PoemListItem[]>
}
```

- [ ] **Step 2: Wire the bulk dumps**

Append to `main()`, after the existing `poets` block:

```ts
console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'era-poems' }))
const eraPoemsResult = await erasQueries.listAllEraPoems(db)
if (eraPoemsResult.isErr()) {
  reportAndExit({
    kind: 'query_failed',
    entity: 'era-poems',
    message: JSON.stringify(eraPoemsResult.error),
  })
}
await writeJsonAtomic('era-poems', mapToRecord(eraPoemsResult.value))

console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'meter-poems' }))
const meterPoemsResult = await metersQueries.listAllMeterPoems(db)
if (meterPoemsResult.isErr()) {
  reportAndExit({
    kind: 'query_failed',
    entity: 'meter-poems',
    message: JSON.stringify(meterPoemsResult.error),
  })
}
await writeJsonAtomic('meter-poems', mapToRecord(meterPoemsResult.value))

console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'rhyme-poems' }))
const rhymePoemsResult = await rhymesQueries.listAllRhymePoems(db)
if (rhymePoemsResult.isErr()) {
  reportAndExit({
    kind: 'query_failed',
    entity: 'rhyme-poems',
    message: JSON.stringify(rhymePoemsResult.error),
  })
}
await writeJsonAtomic('rhyme-poems', mapToRecord(rhymePoemsResult.value))

console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'theme-poems' }))
const themePoemsResult = await themesQueries.listAllThemePoems(db)
if (themePoemsResult.isErr()) {
  reportAndExit({
    kind: 'query_failed',
    entity: 'theme-poems',
    message: JSON.stringify(themePoemsResult.error),
  })
}
await writeJsonAtomic('theme-poems', mapToRecord(themePoemsResult.value))

console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'poet-poems' }))
const poetPoemsResult = await poetsQueries.listAllPoetPoems(db)
if (poetPoemsResult.isErr()) {
  reportAndExit({
    kind: 'query_failed',
    entity: 'poet-poems',
    message: JSON.stringify(poetPoemsResult.error),
  })
}
await writeJsonAtomic('poet-poems', mapToRecord(poetPoemsResult.value))
```

- [ ] **Step 3: Smoke-run**

Run:

```bash
bun apps/web/scripts/generate-snapshot.ts
ls -lh apps/web/.data/
```

Expected: 10 JSON files now exist (5 from Task 8 + 5 from Task 9). Each `*-poems.json` is a non-empty object.

Verify:

Run: `bun -e 'const x = require("./apps/web/.data/era-poems.json"); console.log(Object.keys(x).length, "eras have poems");'`

Expected: prints something > 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web/scripts/generate-snapshot.ts
git commit -m "feat(web): dump per-entity poem lists in snapshot generator"
```

---

## Task 10: Snapshot generator — poem details with related poems (parallel)

For every poem slug, call `poemsQueries.getPoemBySlug(db, slug)` (which internally invokes the existing Postgres function returning the poem + its related list). Run with concurrency = 20 to match the `long-lived` pool size from `packages/db/src/client.ts`.

**Files:**

- Modify: `apps/web/scripts/generate-snapshot.ts`

- [ ] **Step 1: Add a concurrency helper and the poem-details dump**

Append before `async function main()`:

```ts
async function mapWithConcurrency<In, Out>(
  inputs: readonly In[],
  concurrency: number,
  fn: (input: In) => Promise<Out>
): Promise<Out[]> {
  const results: Out[] = new Array(inputs.length)
  let cursor = 0
  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++
      if (i >= inputs.length) return
      const input = inputs[i]
      if (input === undefined) return
      results[i] = await fn(input)
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, inputs.length) }, () => worker())
  await Promise.all(workers)
  return results
}
```

Then append to `main()`, after the existing `poet-poems` block:

```ts
console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'poem-slugs' }))
const slugsResult = await poemsQueries.listAllPoemSlugs(db)
if (slugsResult.isErr()) {
  reportAndExit({
    kind: 'query_failed',
    entity: 'poem-slugs',
    message: JSON.stringify(slugsResult.error),
  })
}
const slugs = slugsResult.value

console.log(
  JSON.stringify({ source: 'generate-snapshot', stage: 'poem-details', count: slugs.length })
)
const startedAt = Date.now()
const details = await mapWithConcurrency(slugs, 20, async (slug) => {
  const result = await poemsQueries.getPoemBySlug(db, slug)
  if (result.isErr()) {
    reportAndExit({
      kind: 'query_failed',
      entity: `poem:${slug}`,
      message: JSON.stringify(result.error),
    })
  }
  return [slug, result.value] as const
})
const elapsed = Date.now() - startedAt

const poemsRecord: Record<string, unknown> = {}
for (const [slug, detail] of details) {
  // Match the contract's poemDetail output shape (apps/api/src/procedures/poems.procedures.ts:toPoemDetail).
  poemsRecord[slug] = {
    title: detail.displayTitle,
    slug,
    verses: detail.parsedContent.verses.map((verse) => [verse[0], verse[1]]),
    verseCount: detail.parsedContent.verseCount,
    sample: detail.parsedContent.sample,
    keywords: detail.parsedContent.keywords,
    poet: { name: detail.metadata.poetName, slug: detail.metadata.poetSlug },
    era: { name: detail.metadata.eraName, slug: detail.metadata.eraSlug },
    meter: { name: detail.metadata.meterName, slug: detail.metadata.meterSlug },
    theme: { name: detail.metadata.themeName, slug: detail.metadata.themeSlug },
    relatedPoems: detail.relatedPoems.map((row) => ({
      title: row.title,
      slug: row.slug,
      poet: { name: row.poetName, slug: row.poetSlug },
      meter: { name: row.meterName, slug: row.meterSlug },
    })),
  }
}
await writeJsonAtomic('poems', poemsRecord)
console.log(
  JSON.stringify({
    source: 'generate-snapshot',
    stage: 'poem-details-done',
    count: details.length,
    elapsed_ms: elapsed,
  })
)
```

Add `poemsQueries` to the imports if not already present.

- [ ] **Step 2: Smoke-run (DB must be up; this is the longest stage)**

Run:

```bash
time bun apps/web/scripts/generate-snapshot.ts
```

Expected: prints stage logs; `poem-details-done` arrives with `count` matching the poem total and `elapsed_ms` in the ~5–30 s range on a local DB. `apps/web/.data/poems.json` exists and is several hundred MB.

Quick spot-check:

Run: `bun -e 'const x = require("./apps/web/.data/poems.json"); const keys = Object.keys(x); console.log(keys.length, "poems"); console.log(JSON.stringify(x[keys[0]], null, 2).slice(0, 500));'`

Expected: count matches `slugs.length`. First poem's JSON looks well-formed: has `title`, `verses`, `poet`, `relatedPoems`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/scripts/generate-snapshot.ts
git commit -m "feat(web): dump poem details with related poems (parallel pool=20)"
```

---

## Task 11: Snapshot generator — meta file with per-entity content hashes

Emits `snapshot-meta.json` so a future incremental layer can compare hashes. We do not consume the hashes in this iteration.

**Files:**

- Modify: `apps/web/scripts/generate-snapshot.ts`

- [ ] **Step 1: Add hashing helper and meta dump**

Append before `async function main()`:

```ts
import { createHash } from 'node:crypto'

function sha256OfStableJson(value: unknown): string {
  // Stable stringify: sort object keys recursively.
  function sort(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(sort)
    if (v && typeof v === 'object') {
      const entries = Object.entries(v as Record<string, unknown>).sort(([a], [b]) =>
        a < b ? -1 : a > b ? 1 : 0
      )
      const out: Record<string, unknown> = {}
      for (const [k, val] of entries) out[k] = sort(val)
      return out
    }
    return v
  }
  return createHash('sha256')
    .update(JSON.stringify(sort(value)), 'utf8')
    .digest('hex')
}
```

Also add to the imports block at the top of the file:

```ts
import { poemDetail, poemListItem } from '@qafiyah/contracts'
import * as v from 'valibot'
```

(Combine the new `node:crypto` import with the existing `node:fs/promises` and `node:path` imports at the top — keep the imports block tidy.)

At the very end of `main()`, before the final `console.log({ status: 'done' })`, append:

```ts
// Validate that the first record of each entity conforms to its contract schema.
// Spec §6.6: belt-and-suspenders runtime check against silent schema drift between
// @qafiyah/db query shapes and @qafiyah/contracts Valibot schemas.
console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'validate-contracts' }))
const firstPoemKey = Object.keys(poemsRecord)[0]
if (firstPoemKey) {
  const sample = poemsRecord[firstPoemKey]
  const parsed = v.safeParse(poemDetail, sample)
  if (!parsed.success) {
    reportAndExit({
      kind: 'query_failed',
      entity: 'contract:poemDetail',
      message: parsed.issues.map((i) => i.message).join('; '),
    })
  }
}
function sampleListItem(record: Record<string, PoemListItem[]>): PoemListItem | null {
  for (const list of Object.values(record)) {
    if (list.length > 0) return list[0] ?? null
  }
  return null
}
for (const [name, record] of [
  ['era-poems', mapToRecord(eraPoemsResult.value)],
  ['meter-poems', mapToRecord(meterPoemsResult.value)],
  ['rhyme-poems', mapToRecord(rhymePoemsResult.value)],
  ['theme-poems', mapToRecord(themePoemsResult.value)],
  ['poet-poems', mapToRecord(poetPoemsResult.value)],
] as const) {
  const item = sampleListItem(record)
  if (!item) continue
  const parsed = v.safeParse(poemListItem, item)
  if (!parsed.success) {
    reportAndExit({
      kind: 'query_failed',
      entity: `contract:poemListItem(${name})`,
      message: parsed.issues.map((i) => i.message).join('; '),
    })
  }
}

console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'meta' }))
const perPageHashes: Record<string, string> = {}

for (const poem of Object.entries(poemsRecord)) {
  perPageHashes[`/poems/${poem[0]}`] = sha256OfStableJson(poem[1])
}
// Index-style pages (one per page number per parent slug) — hash the page slice.
function addCollectionHashes<E extends { slug: string }>(
  routePrefix: string,
  parents: readonly E[],
  poemsByParent: Record<string, PoemListItem[]>
): void {
  const PAGE_SIZE = 30
  for (const parent of parents) {
    const list = poemsByParent[parent.slug] ?? []
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
    for (let p = 1; p <= totalPages; p++) {
      const slice = list.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE)
      perPageHashes[`${routePrefix}/${parent.slug}/page/${p}`] = sha256OfStableJson({
        parent,
        slice,
      })
    }
  }
}

const eraPoemsRecord = mapToRecord(eraPoemsResult.value)
const meterPoemsRecord = mapToRecord(meterPoemsResult.value)
const rhymePoemsRecord = mapToRecord(rhymePoemsResult.value)
const themePoemsRecord = mapToRecord(themePoemsResult.value)
const poetPoemsRecord = mapToRecord(poetPoemsResult.value)

addCollectionHashes('/eras', erasResult.value, eraPoemsRecord)
addCollectionHashes('/meters', metersResult.value, meterPoemsRecord)
addCollectionHashes('/rhymes', rhymesResult.value, rhymePoemsRecord)
addCollectionHashes('/themes', themesResult.value, themePoemsRecord)
addCollectionHashes('/poets', poets, poetPoemsRecord)

// Poets index pages
const POETS_PAGE_SIZE = 30
const poetsIndexPages = Math.max(1, Math.ceil(poets.length / POETS_PAGE_SIZE))
for (let p = 1; p <= poetsIndexPages; p++) {
  perPageHashes[`/poets/page/${p}`] = sha256OfStableJson(
    poets.slice((p - 1) * POETS_PAGE_SIZE, p * POETS_PAGE_SIZE)
  )
}

const dbHost = new URL(databaseUrl).hostname
await writeJsonAtomic('snapshot-meta', {
  generated_at: new Date().toISOString(),
  db_host: dbHost,
  entity_counts: {
    poems: Object.keys(poemsRecord).length,
    poets: poets.length,
    eras: erasResult.value.length,
    meters: metersResult.value.length,
    rhymes: rhymesResult.value.length,
    themes: themesResult.value.length,
  },
  per_page_hashes: perPageHashes,
})
```

Note: This code references `poemsRecord`, `eraPoemsResult`, `meterPoemsResult`, `rhymePoemsResult`, `themePoemsResult`, `poetPoemsResult`, `erasResult`, `metersResult`, `rhymesResult`, `themesResult`, `poets`, and `databaseUrl` — all defined in earlier sections of `main()`. If any are out of scope (because they were declared with `const` inside an `if` block), promote them to the top of `main()` so they remain visible at this end-of-function point. The straightforward approach: keep all dumps as plain top-level `const`s inside `main()`'s body.

`PoemListItem` is already defined in the file (Task 9). `mapToRecord` is already defined.

- [ ] **Step 2: Smoke-run**

Run: `bun apps/web/scripts/generate-snapshot.ts`

Expected: completes successfully. `apps/web/.data/snapshot-meta.json` exists. Inspect it:

Run: `bun -e 'const x = require("./apps/web/.data/snapshot-meta.json"); console.log("counts:", x.entity_counts); console.log("page-hash entries:", Object.keys(x.per_page_hashes).length);'`

Expected: counts present, page-hash entries ≈ poems count + sum-of-pages-across-collections.

- [ ] **Step 3: Type-check**

Run: `bun --filter @qafiyah/web run types`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/scripts/generate-snapshot.ts
git commit -m "feat(web): emit snapshot-meta.json with per-page content hashes"
```

---

## Task 12: Migrate `/poems/[slug].astro` to read from snapshot

This is the heaviest route (~100k pages). The migration is mechanical: replace HTTP fetch with `allPoems()` from the data layer, return full page data as `Astro.props`, and read it directly.

**Files:**

- Modify: `apps/web/src/pages/poems/[slug].astro`
- Modify: `apps/web/src/lib/poem-page.ts`

The current `loadPoemPage(slug)` fetches the poem from the API and builds the layout. We refactor it to take an already-loaded `Poem` plus a slug, and just compute the layout.

- [ ] **Step 1: Refactor `loadPoemPage` to take a `Poem` directly**

Replace the bottom of `apps/web/src/lib/poem-page.ts` (lines 95–110 in the existing file) — the `loadPoemPage` export — with:

```ts
export type LoadPoemPageError = never

export function buildPoemPage(
  poem: Poem,
  slug: PoemSlug
): { readonly poem: Poem; readonly layout: PoemLayoutProps } {
  return { poem, layout: buildPoemLayout(poem, slug) }
}
```

Remove the imports of `fetchPoem`, `err`, `Result`, and any `neverthrow` usage in this file (only used by the deleted `loadPoemPage`). Remove the `ApiFetchError` import line entirely.

- [ ] **Step 2: Rewrite `/poems/[slug].astro`**

Replace the entire contents of `apps/web/src/pages/poems/[slug].astro` with:

```astro
---
import type { GetStaticPaths } from 'astro';
import { PoemDisplay } from '@/components/poem-display';
import Layout from '@/layouts/layout.astro';
import { allPoems } from '@/lib/data/poems';
import { buildPoemPage } from '@/lib/poem-page';

export const getStaticPaths = (() => {
  const poems = allPoems();
  return Array.from(poems, ([slug, detail]) => {
    const { poem, layout } = buildPoemPage(detail, slug);
    return { params: { slug }, props: { poem, layout } };
  });
}) satisfies GetStaticPaths;

const { poem, layout } = Astro.props as Awaited<
  ReturnType<typeof getStaticPaths>
>[number]['props'];
---

<Layout
  title={layout.title}
  description={layout.description}
  keywords={layout.keywords}
  canonical={layout.canonical}
  ogType="article"
  ogTitle={layout.ogTitle}
  ogDescription={layout.ogDescription}
  twitterTitle={layout.twitterTitle}
  twitterDescription={layout.twitterDescription}
  jsonLd={layout.jsonLd}
>
  <PoemDisplay
    client:idle
    title={poem.title}
    poet={poem.poet}
    era={poem.era}
    meter={poem.meter}
    theme={poem.theme}
    verses={poem.verses}
    verseCount={poem.verseCount}
    relatedPoems={poem.relatedPoems}
  />
</Layout>
```

- [ ] **Step 3: Type-check**

Run: `bun --filter @qafiyah/web run types`

Expected: no errors related to `pages/poems/[slug].astro` or `lib/poem-page.ts`. (Errors for other pages that still import from `lib/api/static/*` are expected and resolved in later tasks.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/poems/[slug].astro apps/web/src/lib/poem-page.ts
git commit -m "refactor(web): migrate /poems/[slug] to snapshot loader + Astro.props"
```

---

## Task 13: Migrate `/poets/page/[page].astro`

**Files:**

- Modify: `apps/web/src/pages/poets/page/[page].astro`

- [ ] **Step 1: Rewrite the page**

Replace the entire contents of `apps/web/src/pages/poets/page/[page].astro` with:

```astro
---
import type { GetStaticPaths } from 'astro';
import Breadcrumbs from '@/components/breadcrumbs.astro';
import { CAT_POET_PREFIX_REGEX, SCHEMA_ORG_CONTEXT, SITE_NAME_AR, SITE_URL } from '@/constants';
import Layout from '@/layouts/layout.astro';
import { allPoets, getPoetsPage } from '@/lib/data/poets';
import { toArabicDigits } from '@/lib/arabic';
import { breadcrumbListJsonLd } from '@/lib/breadcrumbs';
import { stripQuotes } from '@/lib/utils';

export const getStaticPaths = (() => {
  const poets = allPoets();
  const totalPages = Math.max(1, Math.ceil(poets.length / 30));
  return Array.from({ length: totalPages }, (_, i) => {
    const page = i + 1;
    const { poets: pagePoets, pagination } = getPoetsPage(page);
    return { params: { page: page.toString() }, props: { poets: pagePoets, pagination } };
  });
}) satisfies GetStaticPaths;

const { poets, pagination } = Astro.props as Awaited<
  ReturnType<typeof getStaticPaths>
>[number]['props'];
const pageNumber = pagination.page;
const totalPoets = pagination.totalItems;
const totalPages = pagination.totalPages;
const hasNextPage = pageNumber < totalPages;
const hasPrevPage = pageNumber > 1;
const nextPageUrl = `/poets/page/${pageNumber + 1}`;
const prevPageUrl = `/poets/page/${pageNumber - 1}`;
const headerTip = `صـ ${toArabicDigits(pageNumber)} من ${toArabicDigits(totalPages)}`;

const title = `${SITE_NAME_AR} | الشعراء | صفحة (${toArabicDigits(pageNumber.toString())})`;
const description = `الشعراء على ${SITE_NAME_AR} — الصفحة ${toArabicDigits(pageNumber)} من ${toArabicDigits(totalPages)}. تصفح دواوين ${toArabicDigits(totalPoets)} شاعرٍ من العصر الجاهلي إلى الحديث.`;

const collectionJsonLd = {
  '@context': SCHEMA_ORG_CONTEXT,
  '@type': 'CollectionPage',
  name: 'قائمة الشعراء',
  url: `${SITE_URL}/poets/page/${pageNumber}`,
  description: `قائمة بجميع الشعراء في موقع ${SITE_NAME_AR} - الصفحة ${toArabicDigits(pageNumber)} من ${toArabicDigits(totalPages)}`,
  isPartOf: { '@type': 'WebSite', name: SITE_NAME_AR, url: SITE_URL },
  numberOfItems: totalPoets,
  itemListElement: poets.map((poet, index) => {
    const poetSlug = String(poet.slug ?? '')
      .toLowerCase()
      .replace(CAT_POET_PREFIX_REGEX, '');
    return {
      '@type': 'ListItem',
      position: index + 1,
      item: { '@type': 'Person', name: poet.name, url: `${SITE_URL}/poets/${poetSlug}/page/1` },
    };
  }),
};

const crumbItems = [
  { name: SITE_NAME_AR, path: '/' },
  { name: 'الشعراء', path: '/poets/page/1' },
];
const crumbsJsonLd = breadcrumbListJsonLd(crumbItems);
---

<Layout
  title={title}
  description={description}
  canonical={`/poets/page/${pageNumber}`}
  prevUrl={hasPrevPage ? prevPageUrl : undefined}
  nextUrl={hasNextPage ? nextPageUrl : undefined}
  jsonLd={[collectionJsonLd, crumbsJsonLd]}
>
  <section class="w-full flex justify-center items-center flex-col relative overflow-hidden my-14 xs:my-20 lg:my-28">
    <div class="flex justify-start flex-col items-start gap-6 xs:gap-8 sm:gap-14 w-full 3xl:gap-16">
      {pageNumber > 1 && <Breadcrumbs items={crumbItems} />}
      <h1 class="text-lg xxs:text-2xl xs:text-4xl xl:text-4xl font-medium">
        {`جميع الشعراء (${toArabicDigits(totalPoets)} شاعر)`}
      </h1>
      <div class="grid grid-cols-1 2xl:grid-cols-2 w-full gap-1 sm:gap-4 2xl:gap-6">
        {poets.length > 0 ? poets.map((poet) => {
          const poetSlug = String(poet.slug ?? '').toLowerCase().replace(CAT_POET_PREFIX_REGEX, '');
          return (
            <a
              href={`/poets/${poetSlug}/page/1`}
              class="hover:cursor-pointer group xxs:gap-2 xs:gap-4 sm:p-8 md:p-10 xs:p-6 p-4 flex-col flex justify-start items-start bg-zinc-100/50 rounded-md border border-zinc-300/50 hover:border-zinc-300/80"
            >
              <p class="text-zinc-800 hover:text-zinc-500 hover:underline duration-300 group-hover:underline-offset-auto group-hover:text-zinc-500 group-hover:underline text-sm xxs:text-base xs:text-2xl sm:text-2xl lg:text-2xl 2xl:text-2xl text-wrap">
                {stripQuotes(poet.name)}
              </p>
              <p class="text-xs xs:text-lg sm:text-xl lg:text-lg text-zinc-600/80 group-hover:text-zinc-500 duration-300 text-wrap">
                {`${toArabicDigits(poet.poemsCount)} قصيدة`}
              </p>
            </a>
          );
        }) : (
          <p class="text-center text-zinc-500">لا يوجد المزيد من الشعراء</p>
        )}
      </div>
      {totalPages > 1 && (
        <nav class="flex flex-row-reverse w-full justify-between items-center gap-4 text-base md:text-lg mt-8" aria-label="ترقيم الصفحات">
          {hasNextPage ? (
            <a href={nextPageUrl} rel="next" class="border py-0.5 px-3 rounded-md border-zinc-200 text-zinc-800">التالي</a>
          ) : (
            <span class="border py-0.5 px-3 rounded-md border-zinc-200 cursor-not-allowed text-zinc-500" aria-disabled="true">التالي</span>
          )}
          <p class="text-zinc-500 text-base">{headerTip}</p>
          {hasPrevPage ? (
            <a href={prevPageUrl} rel="prev" class="border py-0.5 px-3 rounded-md border-zinc-200 text-zinc-800">السابق</a>
          ) : (
            <span class="border py-0.5 px-3 rounded-md border-zinc-200 cursor-not-allowed text-zinc-500" aria-disabled="true">السابق</span>
          )}
        </nav>
      )}
    </div>
  </section>
</Layout>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/poets/page/[page].astro
git commit -m "refactor(web): migrate /poets/page/[page] to snapshot loader + Astro.props"
```

---

## Task 14: Migrate `/poets/[slug]/page/[page].astro`

**Files:**

- Modify: `apps/web/src/pages/poets/[slug]/page/[page].astro`

- [ ] **Step 1: Rewrite the page**

Replace the entire contents of `apps/web/src/pages/poets/[slug]/page/[page].astro` with:

```astro
---
import type { GetStaticPaths } from 'astro';
import { formatArabicCount } from 'arabic-count-format';
import Breadcrumbs from '@/components/breadcrumbs.astro';
import { POEMS_NOUN_FORMS, SCHEMA_ORG_CONTEXT, SITE_NAME_AR, SITE_URL } from '@/constants';
import Layout from '@/layouts/layout.astro';
import { allPoets, getPoetPoemsPage } from '@/lib/data/poets';
import { toArabicDigits } from '@/lib/arabic';
import { breadcrumbListJsonLd } from '@/lib/breadcrumbs';
import { generatePageNumbers } from '@/lib/page-numbers';
import { stripQuotes } from '@/lib/utils';

export const getStaticPaths = (() => {
  const poets = allPoets();
  const out: Array<{
    params: { slug: string; page: string };
    props: Awaited<ReturnType<typeof getPoetPoemsPage>>;
  }> = [];
  for (const poet of poets) {
    for (const page of generatePageNumbers(poet.poemsCount)) {
      out.push({
        params: { slug: poet.slug, page: page.toString() },
        props: getPoetPoemsPage(poet.slug, page),
      });
    }
  }
  return out;
}) satisfies GetStaticPaths;

const { poems, poet, pagination } = Astro.props as Awaited<
  ReturnType<typeof getStaticPaths>
>[number]['props'];
const slug = poet.slug;
const pageNumber = pagination.page;
const totalPages = pagination.totalPages;
const hasNextPage = pageNumber < totalPages;
const hasPrevPage = pageNumber > 1;
const nextPageUrl = `/poets/${slug}/page/${pageNumber + 1}`;
const prevPageUrl = `/poets/${slug}/page/${pageNumber - 1}`;
const headerTip = `صـ ${toArabicDigits(pageNumber)} من ${toArabicDigits(totalPages)}`;

const poemsLabel = formatArabicCount({
  count: poet.poemsCount,
  nounForms: POEMS_NOUN_FORMS,
});

const title = `${SITE_NAME_AR} | ديوان «${poet.name}» | صفحة (${toArabicDigits(pageNumber.toString())})`;
const description = `ديوان الشاعر ${poet.name} على ${SITE_NAME_AR} — الصفحة ${toArabicDigits(pageNumber)} من ${toArabicDigits(totalPages)}، عدد القصائد: ${toArabicDigits(poet.poemsCount)}.`;

const personJsonLd = {
  '@context': SCHEMA_ORG_CONTEXT,
  '@type': 'Person',
  name: poet.name,
  url: `${SITE_URL}/poets/${slug}/page/1`,
  description: `ديوان ${poet.name} (${poemsLabel})`,
  mainEntityOfPage: {
    '@type': 'CollectionPage',
    name: `ديوان ${poet.name}`,
    url: `${SITE_URL}/poets/${slug}/page/1`,
  },
  workExample: poems.slice(0, 10).map((poem) => ({
    '@type': 'CreativeWork',
    name: poem.title,
    description: `قصيدة (${poem.title}) على ${poem.meter.name}`,
    url: `${SITE_URL}/poems/${poem.slug}`,
  })),
};

const crumbItems = [
  { name: SITE_NAME_AR, path: '/' },
  { name: 'الشعراء', path: '/poets/page/1' },
  { name: poet.name, path: `/poets/${slug}/page/1` },
];
const crumbsJsonLd = breadcrumbListJsonLd(crumbItems);
---

<Layout
  title={title}
  description={description}
  canonical={`/poets/${slug}/page/${pageNumber}`}
  prevUrl={hasPrevPage ? prevPageUrl : undefined}
  nextUrl={hasNextPage ? nextPageUrl : undefined}
  ogTitle={`${SITE_NAME_AR} | ديوان ${poet.name}`}
  ogDescription={description}
  twitterTitle={`${SITE_NAME_AR} | ديوان ${poet.name}`}
  twitterDescription={description}
  jsonLd={[personJsonLd, crumbsJsonLd]}
>
  <section class="w-full flex justify-center items-center flex-col relative overflow-hidden my-14 xs:my-20 lg:my-28">
    <div class="flex justify-start flex-col items-start gap-6 xs:gap-8 sm:gap-14 w-full 3xl:gap-16">
      <Breadcrumbs items={crumbItems} />
      <h1 class="text-lg xxs:text-2xl xs:text-4xl xl:text-4xl font-medium">
        {`${poet.name} (${toArabicDigits(poet.poemsCount)} قصيدة)`}
      </h1>
      <div class="grid grid-cols-1 2xl:grid-cols-2 w-full gap-1 sm:gap-4 2xl:gap-6">
        {poems.length > 0 ? poems.map((poem) => (
          <a
            href={`/poems/${poem.slug}`}
            class="hover:cursor-pointer group xxs:gap-2 xs:gap-4 sm:p-8 md:p-10 xs:p-6 p-4 flex-col flex justify-start items-start bg-zinc-100/50 rounded-md border border-zinc-300/50 hover:border-zinc-300/80"
          >
            <p class="text-zinc-800 hover:text-zinc-500 hover:underline duration-300 group-hover:underline-offset-auto group-hover:text-zinc-500 group-hover:underline text-sm xxs:text-base xs:text-2xl sm:text-2xl lg:text-2xl 2xl:text-2xl text-wrap">
              {stripQuotes(poem.title)}
            </p>
            <p class="text-xs xs:text-lg sm:text-xl lg:text-lg text-zinc-600/80 group-hover:text-zinc-500 duration-300 text-wrap">
              {poem.meter.name}
            </p>
          </a>
        )) : (
          <p class="text-center text-zinc-500">لا توجد قصائد لهذا الشاعر.</p>
        )}
      </div>
      {totalPages > 1 && (
        <nav class="flex flex-row-reverse w-full justify-between items-center gap-4 text-base md:text-lg mt-8" aria-label="ترقيم الصفحات">
          {hasNextPage ? (
            <a href={nextPageUrl} rel="next" class="border py-0.5 px-3 rounded-md border-zinc-200 text-zinc-800">التالي</a>
          ) : (
            <span class="border py-0.5 px-3 rounded-md border-zinc-200 cursor-not-allowed text-zinc-500" aria-disabled="true">التالي</span>
          )}
          <p class="text-zinc-500 text-base">{headerTip}</p>
          {hasPrevPage ? (
            <a href={prevPageUrl} rel="prev" class="border py-0.5 px-3 rounded-md border-zinc-200 text-zinc-800">السابق</a>
          ) : (
            <span class="border py-0.5 px-3 rounded-md border-zinc-200 cursor-not-allowed text-zinc-500" aria-disabled="true">السابق</span>
          )}
        </nav>
      )}
    </div>
  </section>
</Layout>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/poets/[slug]/page/[page].astro
git commit -m "refactor(web): migrate /poets/[slug]/page/[page] to snapshot loader + Astro.props"
```

---

## Task 15: Migrate `/eras` (index + `[slug]/page/[page]`)

**Files:**

- Modify: `apps/web/src/pages/eras/index.astro`
- Modify: `apps/web/src/pages/eras/[slug]/page/[page].astro`

- [ ] **Step 1: Rewrite `eras/index.astro`**

Replace the contents of `apps/web/src/pages/eras/index.astro`. Only the frontmatter `fetchEras` line changes (and its import). The body stays identical. Apply this exact diff:

Replace:

```ts
import { fetchEras } from '@/lib/api/static/collections'
import { toArabicDigits } from '@/lib/arabic'
import { unwrapForBoundary } from '@/lib/astro-boundary'
```

With:

```ts
import { allEras } from '@/lib/data/collections'
import { toArabicDigits } from '@/lib/arabic'
```

Replace:

```ts
const eras = unwrapForBoundary(await fetchEras(), 'fetchEras')
```

With:

```ts
const eras = allEras()
```

Everything else in the file stays the same.

- [ ] **Step 2: Rewrite `eras/[slug]/page/[page].astro`**

Replace the entire contents of `apps/web/src/pages/eras/[slug]/page/[page].astro` with:

```astro
---
import type { GetStaticPaths } from 'astro';
import Breadcrumbs from '@/components/breadcrumbs.astro';
import { SCHEMA_ORG_CONTEXT, SITE_NAME_AR, SITE_URL } from '@/constants';
import Layout from '@/layouts/layout.astro';
import { allEras, getEraPoemsPage } from '@/lib/data/collections';
import { toArabicDigits } from '@/lib/arabic';
import { breadcrumbListJsonLd } from '@/lib/breadcrumbs';
import { generatePageNumbers } from '@/lib/page-numbers';
import { stripQuotes } from '@/lib/utils';

export const getStaticPaths = (() => {
  const out: Array<{
    params: { slug: string; page: string };
    props: ReturnType<typeof getEraPoemsPage>;
  }> = [];
  for (const era of allEras()) {
    for (const page of generatePageNumbers(era.poemsCount)) {
      out.push({
        params: { slug: era.slug, page: page.toString() },
        props: getEraPoemsPage(era.slug, page),
      });
    }
  }
  return out;
}) satisfies GetStaticPaths;

const { poems, era, pagination } = Astro.props as Awaited<
  ReturnType<typeof getStaticPaths>
>[number]['props'];
const slug = era.slug;
const pageNumber = pagination.page;
const totalPages = pagination.totalPages;
const hasNextPage = pageNumber < totalPages;
const hasPrevPage = pageNumber > 1;
const nextPageUrl = `/eras/${slug}/page/${pageNumber + 1}`;
const prevPageUrl = `/eras/${slug}/page/${pageNumber - 1}`;
const headerTip = `صـ ${toArabicDigits(pageNumber)} من ${toArabicDigits(totalPages)}`;
const eraTitle = `${era.name}ين`;

const title = `${SITE_NAME_AR} | قصائد ال${era.name}ين | صفحة (${toArabicDigits(pageNumber.toString())})`;
const description = `قصائد العصر ال${era.name} على ${SITE_NAME_AR} — الصفحة ${toArabicDigits(pageNumber)} من ${toArabicDigits(totalPages)}، ${toArabicDigits(era.poemsCount)} قصيدة من شعراء العصر ال${era.name}.`;

const collectionJsonLd = {
  '@context': SCHEMA_ORG_CONTEXT,
  '@type': 'Collection',
  name: `قصائد العصر ال${era.name}`,
  url: `${SITE_URL}/eras/${slug}/page/${pageNumber}`,
  description: `مجموعة قصائد من العصر ال${era.name} - الصفحة ${toArabicDigits(pageNumber)} من ${toArabicDigits(totalPages)}`,
  mainEntityOfPage: {
    '@type': 'CollectionPage',
    name: `قصائد العصر ال${era.name}`,
    url: `${SITE_URL}/eras/${slug}/page/1`,
  },
  numberOfItems: era.poemsCount,
  itemListElement: poems.map((poem, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: { '@type': 'CreativeWork', name: poem.title, url: `${SITE_URL}/poems/${poem.slug}` },
  })),
};

const crumbItems = [
  { name: SITE_NAME_AR, path: '/' },
  { name: 'العصور', path: '/eras' },
  { name: era.name, path: `/eras/${slug}/page/1` },
];
const crumbsJsonLd = breadcrumbListJsonLd(crumbItems);
---

<Layout
  title={title}
  description={description}
  canonical={`/eras/${slug}/page/${pageNumber}`}
  prevUrl={hasPrevPage ? prevPageUrl : undefined}
  nextUrl={hasNextPage ? nextPageUrl : undefined}
  jsonLd={[collectionJsonLd, crumbsJsonLd]}
>
  <section class="w-full flex justify-center items-center flex-col relative overflow-hidden my-14 xs:my-20 lg:my-28">
    <div class="flex justify-start flex-col items-start gap-6 xs:gap-8 sm:gap-14 w-full 3xl:gap-16">
      <Breadcrumbs items={crumbItems} />
      <h1 class="text-lg xxs:text-2xl xs:text-4xl xl:text-4xl font-medium">
        {`قصائد ${eraTitle} (${toArabicDigits(era.poemsCount)} قصيدة)`}
      </h1>
      <div class="grid grid-cols-1 2xl:grid-cols-2 w-full gap-1 sm:gap-4 2xl:gap-6">
        {poems.length > 0 ? poems.map((poem) => (
          <a
            href={`/poems/${poem.slug}`}
            class="hover:cursor-pointer group xxs:gap-2 xs:gap-4 sm:p-8 md:p-10 xs:p-6 p-4 flex-col flex justify-start items-start bg-zinc-100/50 rounded-md border border-zinc-300/50 hover:border-zinc-300/80"
          >
            <p class="text-zinc-800 hover:text-zinc-500 hover:underline duration-300 group-hover:underline-offset-auto group-hover:text-zinc-500 group-hover:underline text-sm xxs:text-base xs:text-2xl sm:text-2xl lg:text-2xl 2xl:text-2xl text-wrap">
              {stripQuotes(poem.title)}
            </p>
            <p class="text-xs xs:text-lg sm:text-xl lg:text-lg text-zinc-600/80 group-hover:text-zinc-500 duration-300 text-wrap">
              {`${poem.poet.name} • ${poem.meter.name}`}
            </p>
          </a>
        )) : (
          <p class="text-center text-zinc-500">لا توجد قصائد لهذا العصر.</p>
        )}
      </div>
      {totalPages > 1 && (
        <nav class="flex flex-row-reverse w-full justify-between items-center gap-4 text-base md:text-lg mt-8" aria-label="ترقيم الصفحات">
          {hasNextPage ? (
            <a href={nextPageUrl} rel="next" class="border py-0.5 px-3 rounded-md border-zinc-200 text-zinc-800">التالي</a>
          ) : (
            <span class="border py-0.5 px-3 rounded-md border-zinc-200 cursor-not-allowed text-zinc-500" aria-disabled="true">التالي</span>
          )}
          <p class="text-zinc-500 text-base">{headerTip}</p>
          {hasPrevPage ? (
            <a href={prevPageUrl} rel="prev" class="border py-0.5 px-3 rounded-md border-zinc-200 text-zinc-800">السابق</a>
          ) : (
            <span class="border py-0.5 px-3 rounded-md border-zinc-200 cursor-not-allowed text-zinc-500" aria-disabled="true">السابق</span>
          )}
        </nav>
      )}
    </div>
  </section>
</Layout>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/eras
git commit -m "refactor(web): migrate /eras index + dynamic to snapshot loader"
```

---

## Task 16: Migrate `/meters` (index + `[slug]/page/[page]`)

**Files:**

- Modify: `apps/web/src/pages/meters/index.astro`
- Modify: `apps/web/src/pages/meters/[slug]/page/[page].astro`

- [ ] **Step 1: Rewrite `meters/index.astro`**

In `apps/web/src/pages/meters/index.astro`:

Replace:

```ts
import { fetchMeters } from '@/lib/api/static/collections'
```

With:

```ts
import { allMeters } from '@/lib/data/collections'
```

Replace any `unwrapForBoundary(await fetchMeters(), 'fetchMeters')` invocation with `allMeters()`. If `unwrapForBoundary` is no longer used after this swap, remove its import.

- [ ] **Step 2: Rewrite `meters/[slug]/page/[page].astro`**

Replace the entire contents with the same template as Task 15 Step 2, but substitute:

- `eras` → `meters`
- `EraSlug` → `MeterSlug`
- `getEraPoemsPage` → `getMeterPoemsPage`
- `allEras` → `allMeters`
- `era` (variable, JSON-LD field, breadcrumb name) → `meter`
- All Arabic strings stay the same as the current `apps/web/src/pages/meters/[slug]/page/[page].astro` file (read the existing file to copy them — they differ from the eras strings).

The exact template (with Arabic strings from the existing meters file) for the frontmatter and Astro.props block:

```astro
---
import type { GetStaticPaths } from 'astro';
import Breadcrumbs from '@/components/breadcrumbs.astro';
import { SCHEMA_ORG_CONTEXT, SITE_NAME_AR, SITE_URL } from '@/constants';
import Layout from '@/layouts/layout.astro';
import { allMeters, getMeterPoemsPage } from '@/lib/data/collections';
import { toArabicDigits } from '@/lib/arabic';
import { breadcrumbListJsonLd } from '@/lib/breadcrumbs';
import { generatePageNumbers } from '@/lib/page-numbers';
import { stripQuotes } from '@/lib/utils';

export const getStaticPaths = (() => {
  const out: Array<{
    params: { slug: string; page: string };
    props: ReturnType<typeof getMeterPoemsPage>;
  }> = [];
  for (const meter of allMeters()) {
    for (const page of generatePageNumbers(meter.poemsCount)) {
      out.push({
        params: { slug: meter.slug, page: page.toString() },
        props: getMeterPoemsPage(meter.slug, page),
      });
    }
  }
  return out;
}) satisfies GetStaticPaths;

const { poems, meter, pagination } = Astro.props as Awaited<
  ReturnType<typeof getStaticPaths>
>[number]['props'];
const slug = meter.slug;
const pageNumber = pagination.page;
const totalPages = pagination.totalPages;
// ... (rest of the body: copy from current meters/[slug]/page/[page].astro
//      replacing era references with meter, exactly as it stands today)
```

Read the current file's body (HTML/JSON-LD/breadcrumbs/Arabic text) and copy it through unchanged below the frontmatter — only the data-source lines change.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/meters
git commit -m "refactor(web): migrate /meters index + dynamic to snapshot loader"
```

---

## Task 17: Migrate `/rhymes` (index + `[slug]/page/[page]`)

**Files:**

- Modify: `apps/web/src/pages/rhymes/index.astro`
- Modify: `apps/web/src/pages/rhymes/[slug]/page/[page].astro`

- [ ] **Step 1: Rewrite `rhymes/index.astro`**

In `apps/web/src/pages/rhymes/index.astro`:

Replace `import { fetchRhymes } from '@/lib/api/static/collections';` with `import { allRhymes } from '@/lib/data/collections';`, and replace `unwrapForBoundary(await fetchRhymes(), 'fetchRhymes')` with `allRhymes()`. Remove the `unwrapForBoundary` import if unused.

- [ ] **Step 2: Rewrite `rhymes/[slug]/page/[page].astro`**

Apply the same template as Task 16 Step 2, substituting `meter`→`rhyme`, `MeterSlug`→`RhymeSlug`, `allMeters`→`allRhymes`, `getMeterPoemsPage`→`getRhymePoemsPage`. Read the existing `rhymes/[slug]/page/[page].astro` and preserve all Arabic strings, JSON-LD field names, and breadcrumb labels exactly as they are today — only the data source changes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/rhymes
git commit -m "refactor(web): migrate /rhymes index + dynamic to snapshot loader"
```

---

## Task 18: Migrate `/themes` (index + `[slug]/page/[page]`)

**Files:**

- Modify: `apps/web/src/pages/themes/index.astro`
- Modify: `apps/web/src/pages/themes/[slug]/page/[page].astro`

- [ ] **Step 1: Rewrite `themes/index.astro`**

In `apps/web/src/pages/themes/index.astro`:

Replace `import { fetchThemes } from '@/lib/api/static/collections';` with `import { allThemes } from '@/lib/data/collections';`, and replace `unwrapForBoundary(await fetchThemes(), 'fetchThemes')` with `allThemes()`. Remove the `unwrapForBoundary` import if unused.

- [ ] **Step 2: Rewrite `themes/[slug]/page/[page].astro`**

Apply the same template substitution as Task 16/17 with `theme` / `ThemeSlug` / `allThemes` / `getThemePoemsPage`. Preserve existing Arabic strings and JSON-LD verbatim from today's file.

- [ ] **Step 3: Type-check the whole web package**

Run: `bun --filter @qafiyah/web run types`

Expected: type-check clean (or only failures from the to-be-deleted `lib/api/static/*` files referenced from nowhere — those are addressed in Task 21).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/themes
git commit -m "refactor(web): migrate /themes index + dynamic to snapshot loader"
```

---

## Task 19: New build orchestrator (`scripts/build.ts`)

The new orchestrator runs the snapshot generator, then `astro build`. No Wrangler subprocess.

**Files:**

- Create: `apps/web/scripts/build.ts`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Create the orchestrator**

Create `apps/web/scripts/build.ts`:

```ts
#!/usr/bin/env bun

// biome-ignore-all lint/suspicious/noConsole: build supervisor logs progress.

/**
 * Orchestrates: (1) generate-snapshot.ts dumps DB → JSON, (2) astro build reads
 * those JSON files via apps/web/src/lib/data/*. No Wrangler, no HTTP, no
 * NODE_OPTIONS=12288 hack — those were artefacts of the old per-page HTTP build.
 */

import path from 'node:path'

const webDir = path.resolve(import.meta.dir, '..')

async function run(cmd: readonly string[], cwd: string): Promise<number> {
  const proc = Bun.spawn(cmd, { cwd, stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' })
  return await proc.exited
}

async function main(): Promise<number> {
  console.log('[build] generate-snapshot')
  const snapshotExit = await run(
    ['bun', path.join(webDir, 'scripts', 'generate-snapshot.ts')],
    webDir
  )
  if (snapshotExit !== 0) {
    console.error('[build] snapshot generation failed; aborting')
    return snapshotExit
  }

  console.log('[build] astro build')
  const buildExit = await run(['astro', 'build'], webDir)
  return buildExit
}

const exitCode = await main()
process.exit(exitCode)
```

- [ ] **Step 2: Wire `package.json`**

In `apps/web/package.json`, change the `build` script from:

```json
"build": "bun ./scripts/build-with-api.ts",
```

To:

```json
"build": "bun ./scripts/build.ts",
```

Leave `build:raw` (`astro build`) unchanged — useful for "re-render only" when `.data/` already exists.

- [ ] **Step 3: Commit**

```bash
git add apps/web/scripts/build.ts apps/web/package.json
git commit -m "feat(web): replace build-with-api orchestrator with snapshot+astro pipeline"
```

---

## Task 20: Remove `apiServer` + `retryingFetch` from `rpc.ts`

`apiBrowser` stays — it's used by the browser-side search island.

**Files:**

- Modify: `apps/web/src/lib/api/rpc.ts`

- [ ] **Step 1: Trim `rpc.ts`**

Replace the entire contents of `apps/web/src/lib/api/rpc.ts` with:

```ts
import { createORPCClient } from '@orpc/client'
import type { ContractRouterClient, InferContractRouterOutputs } from '@orpc/contract'
import { OpenAPILink } from '@orpc/openapi-client/fetch'
import { API_V1_PREFIX } from '@qafiyah/constants'
import { type AppContract, contract } from '@qafiyah/contracts'
import { API_URL } from '@/constants'

const BROWSER_BASE_URL = `${API_URL}${API_V1_PREFIX}`

function makeBrowserClient(): ContractRouterClient<AppContract> {
  return createORPCClient(new OpenAPILink(contract, { url: BROWSER_BASE_URL }))
}

export const apiBrowser = makeBrowserClient()

type ApiOutputs = InferContractRouterOutputs<AppContract>

type DataField<T> = T extends { data: infer D } ? D : never

// Collection items
export type Era = DataField<ApiOutputs['eras']['list']>[number]
export type Meter = DataField<ApiOutputs['meters']['list']>[number]
export type Rhyme = DataField<ApiOutputs['rhymes']['list']>[number]
export type Theme = DataField<ApiOutputs['themes']['list']>[number]
export type Poet = DataField<ApiOutputs['poets']['list']>[number]

// Full envelopes (carry data + pagination + meta)
export type EraPoemsResponse = ApiOutputs['eras']['listPoems']
export type MeterPoemsResponse = ApiOutputs['meters']['listPoems']
export type PoetPoemsResponse = ApiOutputs['poets']['listPoems']
export type RhymePoemsResponse = ApiOutputs['rhymes']['listPoems']
export type ThemePoemsResponse = ApiOutputs['themes']['listPoems']
export type PoetsResponse = ApiOutputs['poets']['list']

// Single resource
export type Poem = DataField<ApiOutputs['poems']['getPoemBySlug']>

// Search
type SearchResponse = ApiOutputs['search']['search']
type PoemsSearchEnvelope = Extract<SearchResponse, { searchType: 'poems' }>
type PoetsSearchEnvelope = Extract<SearchResponse, { searchType: 'poets' }>
export type PoemSearchResult = DataField<PoemsSearchEnvelope>[number]
export type PoetSearchResult = DataField<PoetsSearchEnvelope>[number]
```

- [ ] **Step 2: Remove `BUILD_API_URL` from `src/env.ts`**

Open `apps/web/src/env.ts`. Remove the `BUILD_API_URL` entry from both `server` and any references in this file. The exact diff depends on the current envin config — open the file, find every reference to `BUILD_API_URL`, and delete the matching lines/entries.

After editing, verify by:

Run: `grep -rn 'BUILD_API_URL' apps/web/src apps/web/scripts apps/web/astro.config.mjs apps/web/package.json`

Expected: no matches.

- [ ] **Step 3: Type-check**

Run: `bun --filter @qafiyah/web run types`

Expected: clean (errors only from files imported by no one — those die in Task 21).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/api/rpc.ts apps/web/src/env.ts
git commit -m "refactor(web): drop apiServer + retryingFetch + BUILD_API_URL (build no longer fetches over HTTP)"
```

---

## Task 21: Delete old `api/static/*` and `build-with-api.ts`

**Files:**

- Delete: `apps/web/scripts/build-with-api.ts`
- Delete: `apps/web/src/lib/api/static/dedup.ts`
- Delete: `apps/web/src/lib/api/static/poets.ts`
- Delete: `apps/web/src/lib/api/static/collections.ts`
- Delete: `apps/web/src/lib/api/static/result.ts`
- Delete: `apps/web/src/lib/api/static/poems.ts`

- [ ] **Step 1: Confirm no references remain**

Run: `grep -rn 'lib/api/static\|build-with-api' apps/web`

Expected: no matches.

If matches exist (e.g., a test file we missed), open and migrate it to use `lib/data/*` instead.

- [ ] **Step 2: Delete**

Run:

```bash
rm apps/web/scripts/build-with-api.ts
rm -rf apps/web/src/lib/api/static
```

- [ ] **Step 3: Run the web test suite**

Run: `bun --filter @qafiyah/web run test`

Expected: all tests pass.

- [ ] **Step 4: Run `knip` to confirm no dead exports**

Run: `bun run knip`

Expected: knip clean (or only pre-existing warnings unrelated to this change).

- [ ] **Step 5: Run `madge` to confirm no circulars**

Run: `bun run madge`

Expected: madge clean.

- [ ] **Step 6: Commit**

```bash
git add -A apps/web/scripts apps/web/src/lib/api
git commit -m "refactor(web): delete obsolete HTTP-build infrastructure"
```

---

## Task 22: Verify the new build produces correct output

Sanity-check the full pipeline end-to-end with a small subset. The full build is ~5–15 min; this task uses a partial verification because we don't need a full ~100k-page run to validate correctness.

**Files:** (no edits; verification only)

- [ ] **Step 1: Re-run the snapshot**

Run: `bun apps/web/scripts/generate-snapshot.ts`

Expected: completes successfully, all expected files in `apps/web/.data/`.

- [ ] **Step 2: Run `astro check` (lint + type)**

Run: `bun --filter @qafiyah/web run lint`

Expected: clean. (Biome warnings about the `as Awaited<ReturnType<...>>[number]['props']` cast are acceptable if any — confirm they're not errors.)

- [ ] **Step 3: Start the new build, kill after ~30 s (matching the CLAUDE.md guidance)**

Per `CLAUDE.md`: "Web build is ~2 hours. To verify quickly: run build, kill after ~20s." We use ~30 s now since startup is faster and we want to see first pages emitted.

Run (in one shell):

```bash
bun --filter @qafiyah/web run build
```

In another shell, after ~30 s:

```bash
ls -la apps/web/dist/ apps/web/dist/poems/ 2>/dev/null | head -20
```

Expected: `dist/` contains `index.html`, `404.html`, a `poems/` directory with multiple `<slug>/index.html` files, and entries for `poets/`, `eras/`, `meters/`, `rhymes/`, `themes/`. No "BUILD_API_URL" or fetch-error stack traces in the first build's output.

Kill the build:

Run: `bun run clean:dev`

- [ ] **Step 4: Verify SEO invariants on the partial output**

Run: `bun --filter @qafiyah/web run verify:seo`

Expected: passes for the subset of pages emitted before the kill. (If pages weren't fully emitted, the script will only check what exists.)

- [ ] **Step 5: Document expected runtime**

Append a single line to `CLAUDE.md`'s "Known Bug" or "Session Discipline" section if appropriate, recording the new build time as observed. Specifically, in `CLAUDE.md` under the `Session Discipline` section, replace the line:

```
- **Web build is ~2 hours.** To verify quickly: run build, kill after ~20s (enough for Wrangler + first `getStaticPaths` errors), then `bun run clean:dev`.
```

With:

```
- **Web build is ~10 min** (snapshot ~30 s + astro build ~5–10 min). To verify quickly: run build, kill after ~30s (enough for snapshot + first dist files), then `bun run clean:dev`.
```

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record new web build runtime expectations"
```

---

## Task 23: Final integration check — full build (optional, time-permitting)

This task runs the complete build. Skip if the user wants to merge early and validate in a separate session.

- [ ] **Step 1: Capture timing baseline**

Run: `time bun --filter @qafiyah/web run build 2>&1 | tee /tmp/qafiyah-build.log`

Expected: total wall time well under 30 min on a modern Mac; ideally 6–16 min. Inspect `/tmp/qafiyah-build.log` for any fetch-related stack traces (there should be none).

- [ ] **Step 2: Verify SEO on the full output**

Run: `bun --filter @qafiyah/web run verify:seo`

Expected: passes for all pages.

- [ ] **Step 3: Sample pages**

Spot-check a handful of HTML files to confirm titles, JSON-LD, and content render correctly:

Run:

```bash
head -50 apps/web/dist/poems/$(ls apps/web/dist/poems | head -1)/index.html
head -50 apps/web/dist/eras/$(ls apps/web/dist/eras | head -1)/page/1/index.html
```

Expected: well-formed HTML with proper Arabic content, `<title>`, canonical link, JSON-LD scripts.

- [ ] **Step 4: No commit needed**

This task is observation-only. Report build timing back to the user.

---

## Plan complete — handoff

After Task 22 (or 23), invoke `superpowers:finishing-a-development-branch` to integrate the work: decide between merging to `main`, opening a PR, or further refinement.
