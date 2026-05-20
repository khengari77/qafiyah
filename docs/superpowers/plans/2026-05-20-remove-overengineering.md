# Remove Overengineering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inline single-caller abstractions, delete dead code, and strip unused parameters across the Qafiyah monorepo — without changing any runtime behavior.

**Architecture:** These are pure refactors. Existing tests are the safety net: each task runs the relevant test/typecheck **before** the change (green), makes the change, then runs again (still green). No new behavior is introduced, so no new failing tests are written — the discipline here is "characterize, then refactor under green."

**Tech Stack:** Bun, Turborepo, TypeScript, Hono + oRPC + Valibot (api), Astro 6 + React 19 (web), Drizzle (db), Vitest, Biome.

---

## Scope & Rationale

Eight changes survived audit. The following audit suggestions were **deliberately rejected** — do not implement them:

- **`buildPagination` / `listEnvelope` / `listEnvelopeWithMeta`** (api/procedures/envelope.ts) — 3–11 real callers each. Legitimate DRY helpers, not overengineering.
- **Consolidating the 6 `as*Slug` brand functions into `asSlug<T>`** (packages/db/brand.ts) — makes the cast *less* safe (caller picks the type param) and touches ~73 sites for negative benefit.
- **`slugWithCounts` schema** (packages/contracts/schemas.ts) — 3 callers with an identical shape; valid composition.
- **Extracting duplicate procedure error-handling into a shared helper** — that *adds* an abstraction; opposite of this task's intent.
- **Search component folder "fragmentation"** and **`constants.ts` size** — subjective / intentional per CLAUDE.md.
- **`ApiOutputs` type duplicated in `rpc.ts` vs `server/types.ts`** — `rpc.ts` is browser code; importing from `@/lib/server/*` would breach the server-only boundary. The one-line duplication is the correct tradeoff.
- **`DEFAULT_PAGE` export** — verified it is NOT exported from `packages/contracts/src/index.ts`; nothing to do.
- **`useFontSize` hook** (web/poem-display.tsx) — single caller, but substantial cohesive logic; inlining bloats the component for no gain.
- **`stripKind` helper** (api/lib/problem.ts) — 2 callers and the name documents intent ("drop the internal `kind` field before serializing"). Keep.
- **`sanitizeMetaText`** (web/poem-page.ts) — 7 callers, name reveals intent. Keep.

---

## File Structure

| File | Change |
| --- | --- |
| `apps/api/src/lib/problem.ts` | Delete `buildProblemResponse`; inline into `transformOrpcResponse` |
| `apps/api/src/routes/poems.routes.ts` | Delete `parseOption` + `ParseOptionError`; inline into `/random` |
| `apps/api/src/middlewares/favicon.middleware.ts` | Drop the `emoji` factory param; export a plain middleware |
| `apps/api/src/middlewares/favicon.middleware.test.ts` | Update to import the plain middleware |
| `apps/api/src/app.ts` | Update favicon middleware usage |
| `apps/web/src/components/ui/card.tsx` | Delete 4 unused subcomponents |
| `apps/web/src/lib/api/rpc.ts` | Delete `makeBrowserClient`; inline the one-liner |
| `apps/web/src/components/random-poem-button.tsx` | Inline `useRandomPoemNavigation` hook |
| `apps/web/src/lib/poem-page.ts` | Export `buildPoemLayout`; delete pass-through `buildPoemPage` |
| `apps/web/src/pages/poems/[slug].astro` | Call `buildPoemLayout` directly |
| `packages/contracts/src/schemas.ts` | Delete `resourceResponse` |
| `packages/contracts/src/poems.ts` | Inline `resourceResponse` shape |

---

## Task 1: Inline `buildProblemResponse` (api)

`buildProblemResponse` (problem.ts:99-104) has exactly one caller — `transformOrpcResponse` at line 178.

**Files:**
- Modify: `apps/api/src/lib/problem.ts:99-104` (delete) and `:178` (inline)
- Test: `apps/api/src/lib/problem.test.ts` (if present) + `apps/api/src/app.test.ts`

- [ ] **Step 1: Run the api test suite to confirm green baseline**

Run: `bun --filter @qafiyah/api run test`
Expected: PASS (all tests green before any change).

- [ ] **Step 2: Delete the `buildProblemResponse` function**

Remove lines 99-104 in `apps/api/src/lib/problem.ts`:

```ts
function buildProblemResponse(problem: ProblemDetail): Response {
  return new Response(JSON.stringify(stripKind(problem)), {
    status: parseHttpStatus(problem.status),
    headers: { 'Content-Type': 'application/problem+json' },
  });
}
```

- [ ] **Step 3: Inline the body at the call site**

In `transformOrpcResponse`, replace:

```ts
  const problem = orpcErrorToProblem(body, response.status, instance);
  return buildProblemResponse(problem);
```

with:

```ts
  const problem = orpcErrorToProblem(body, response.status, instance);
  return new Response(JSON.stringify(stripKind(problem)), {
    status: parseHttpStatus(problem.status),
    headers: { 'Content-Type': 'application/problem+json' },
  });
```

- [ ] **Step 4: Run tests + types to confirm still green**

Run: `bun --filter @qafiyah/api run test` then `bun run types`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/problem.ts
git commit -m "refactor(api): inline single-caller buildProblemResponse"
```

---

## Task 2: Inline `parseOption` (api)

`parseOption` (poems.routes.ts:39-42) and its companion type `ParseOptionError` (line 37) are used only once, at line 46.

**Files:**
- Modify: `apps/api/src/routes/poems.routes.ts:37`, `:39-42` (delete), `:46` (inline)

- [ ] **Step 1: Confirm green baseline**

Run: `bun --filter @qafiyah/api run test`
Expected: PASS.

- [ ] **Step 2: Delete the type and function**

Remove lines 37-42 in `apps/api/src/routes/poems.routes.ts`:

```ts
type ParseOptionError = { readonly kind: 'invalid_option'; readonly raw: string | undefined };

function parseOption(raw: string | undefined): Result<RandomPoemOption, ParseOptionError> {
  const parsed = v.safeParse(optionSchema, raw);
  return parsed.success ? ok(parsed.output) : err({ kind: 'invalid_option', raw });
}
```

- [ ] **Step 3: Inline at the call site**

Replace line 46:

```ts
    const optionResult = parseOption(c.req.query('option'));
```

with:

```ts
    const parsed = v.safeParse(optionSchema, c.req.query('option'));
    const optionResult = parsed.success
      ? ok(parsed.output)
      : err({ kind: 'invalid_option' as const, raw: c.req.query('option') });
```

- [ ] **Step 4: Remove now-unused imports if any**

Check whether `Result` (from `neverthrow`) is still used elsewhere in the file — it is, by `fetchRandomPoemBody` (line 24), so keep the `Result` import. `ok`/`err` remain used. No import changes needed.

- [ ] **Step 5: Run tests + types**

Run: `bun --filter @qafiyah/api run test` then `bun run types`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/poems.routes.ts
git commit -m "refactor(api): inline single-caller parseOption helper"
```

---

## Task 3: Remove unused `emoji` parameter from favicon middleware (api)

`serveEmojiFavicon` is a factory whose only caller (app.ts:44) always passes the `FAVICON_EMOJI` constant. The parameterization is unused flexibility. Convert it to a plain middleware constant, keeping the isolated test.

**Files:**
- Modify: `apps/api/src/middlewares/favicon.middleware.ts`
- Modify: `apps/api/src/middlewares/favicon.middleware.test.ts`
- Modify: `apps/api/src/app.ts:25`, `:44`

- [ ] **Step 1: Confirm green baseline**

Run: `bun --filter @qafiyah/api run test`
Expected: PASS (favicon.middleware.test.ts green).

- [ ] **Step 2: Rewrite the middleware without the factory**

Replace the entire contents of `apps/api/src/middlewares/favicon.middleware.ts`:

```ts
import type { MiddlewareHandler } from 'hono';
import { FAVICON_CACHE_CONTROL, FAVICON_EMOJI, FAVICON_PATH } from '@/constants';

export const faviconMiddleware: MiddlewareHandler = async (c, next) => {
  if (c.req.path === FAVICON_PATH) {
    c.header('Content-Type', 'image/svg+xml');
    c.header('Cache-Control', FAVICON_CACHE_CONTROL);
    return c.body(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" x="-0.1em" font-size="90">${FAVICON_EMOJI}</text></svg>`
    );
  }
  await next();
  return;
};
```

- [ ] **Step 3: Update the test to import the plain middleware**

Replace the contents of `apps/api/src/middlewares/favicon.middleware.test.ts`. The "uses the provided emoji" test no longer applies (emoji is fixed); assert the constant emoji instead:

```ts
/**
 * Tests for favicon middleware
 */

import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { FAVICON_EMOJI } from '@/constants';
import type { AppContext } from '@/types';
import { faviconMiddleware } from './favicon.middleware';

describe('favicon.middleware', () => {
  it('should serve favicon as SVG when path is /favicon.ico', async () => {
    const app = new Hono<AppContext>();
    app.use(faviconMiddleware);
    app.get('/test', (c) => c.text('ok'));

    const res = await app.fetch(new Request('http://localhost/favicon.ico'));

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('<svg');
    expect(text).toContain(FAVICON_EMOJI);
    expect(res.headers.get('Content-Type')).toBe('image/svg+xml');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=2592000, immutable');
  });

  it('should not interfere with other routes', async () => {
    const app = new Hono<AppContext>();
    app.use(faviconMiddleware);
    app.get('/test', (c) => c.text('ok'));

    const res = await app.fetch(new Request('http://localhost/test'));

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('ok');
  });
});
```

- [ ] **Step 4: Update app.ts**

In `apps/api/src/app.ts`, change the import on line 25:

```ts
import { faviconMiddleware } from './middlewares/favicon.middleware';
```

and the usage on line 44:

```ts
app.use(faviconMiddleware);
```

Then remove `FAVICON_EMOJI` from the `./constants` import block (lines 9-21) **only if** it is no longer referenced in app.ts — it isn't after this change, so delete the `FAVICON_EMOJI,` line from that import.

- [ ] **Step 5: Run tests + types**

Run: `bun --filter @qafiyah/api run test` then `bun run types`
Expected: PASS, 2 favicon tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/middlewares/favicon.middleware.ts apps/api/src/middlewares/favicon.middleware.test.ts apps/api/src/app.ts
git commit -m "refactor(api): drop unused emoji param from favicon middleware"
```

---

## Task 4: Delete dead Card subcomponents (web)

`card.tsx` defines `CardHeader`, `CardTitle`, `CardDescription`, `CardFooter` (lines 16-53) but the export (line 55) only exports `Card` and `CardContent`. The four are unreachable dead code (0 callers, confirmed by repo grep).

**Files:**
- Modify: `apps/web/src/components/ui/card.tsx`

- [ ] **Step 1: Confirm nothing imports the dead components**

Run: `grep -rn "CardHeader\|CardTitle\|CardDescription\|CardFooter" apps/web/src`
Expected: matches only inside `card.tsx` itself.

- [ ] **Step 2: Delete the four unused component definitions**

Remove lines 16-53 in `apps/web/src/components/ui/card.tsx` (the `CardHeader`, `CardTitle`, `CardDescription`, and `CardFooter` blocks). The file should end as:

```ts
import * as React from 'react';

import { cn } from '@/lib/utils';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-xl border bg-card text-card-foreground shadow', className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export { Card, CardContent };
```

- [ ] **Step 3: Typecheck + build the web app**

Run: `bun run types` then `bun --filter @qafiyah/web run build`
Expected: PASS, no missing-export errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/card.tsx
git commit -m "refactor(web): delete unused Card subcomponents"
```

---

## Task 5: Inline `makeBrowserClient` (web)

`makeBrowserClient` (rpc.ts:10-12) is a single-line wrapper called exactly once (line 14).

**Files:**
- Modify: `apps/web/src/lib/api/rpc.ts:10-14`

- [ ] **Step 1: Replace the function with a direct assignment**

In `apps/web/src/lib/api/rpc.ts`, replace lines 10-14:

```ts
function makeBrowserClient(): ContractRouterClient<AppContract> {
  return createORPCClient(new OpenAPILink(contract, { url: BROWSER_BASE_URL }));
}

export const apiBrowser = makeBrowserClient();
```

with:

```ts
export const apiBrowser: ContractRouterClient<AppContract> = createORPCClient(
  new OpenAPILink(contract, { url: BROWSER_BASE_URL })
);
```

- [ ] **Step 2: Confirm `ContractRouterClient` import is still used**

It is (now in the annotation above). No import changes.

- [ ] **Step 3: Typecheck + build**

Run: `bun run types` then `bun --filter @qafiyah/web run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/api/rpc.ts
git commit -m "refactor(web): inline single-caller makeBrowserClient"
```

---

## Task 6: Inline `useRandomPoemNavigation` (web)

The hook (random-poem-button.tsx:14-30) has one consumer, `RandomPoemButton` (line 33), in the same file. Inline it.

**Files:**
- Modify: `apps/web/src/components/random-poem-button.tsx`

- [ ] **Step 1: Inline the hook body into the component**

Replace lines 14-34 (the `useRandomPoemNavigation` function plus the `const { handleClick, status } = ...` line) so the component owns its state directly:

```tsx
export function RandomPoemButton() {
  const [status, setStatus] = useState<RandomPoemStatus>({ kind: 'idle' });

  const handleClick = async () => {
    if (status.kind === 'loading') return;
    setStatus({ kind: 'loading' });
    const result = await fetchRandomPoemSlug(API_URL);
    if (result.isErr()) {
      console.error('fetchRandomPoemSlug failed', result.error);
      setStatus({ kind: 'error' });
      return;
    }
    window.location.href = `/poems/${result.value}`;
  };

  const isLoading = status.kind === 'loading';
```

(Keep the existing `RandomPoemStatus` type at lines 9-12 and the rest of the JSX from line 36 onward unchanged.)

- [ ] **Step 2: Typecheck + build**

Run: `bun run types` then `bun --filter @qafiyah/web run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/random-poem-button.tsx
git commit -m "refactor(web): inline single-caller useRandomPoemNavigation hook"
```

---

## Task 7: Inline pass-through `buildPoemPage` (web)

`buildPoemPage` (poem-page.ts:102-107) just bundles `{ poem, layout: buildPoemLayout(...) }`. Its single caller (`[slug].astro:14`) immediately destructures both back out, and `poem` is just the `detail` it already has. Export `buildPoemLayout` and call it directly.

**Files:**
- Modify: `apps/web/src/lib/poem-page.ts:79`, `:102-107`
- Modify: `apps/web/src/pages/poems/[slug].astro:5`, `:14`

- [ ] **Step 1: Export `buildPoemLayout` and delete `buildPoemPage`**

In `apps/web/src/lib/poem-page.ts`, change line 79 from:

```ts
function buildPoemLayout(poem: Poem, slug: PoemSlug): PoemLayoutProps {
```

to:

```ts
export function buildPoemLayout(poem: Poem, slug: PoemSlug): PoemLayoutProps {
```

Then delete lines 102-107 (the entire `buildPoemPage` function):

```ts
export function buildPoemPage(
  poem: Poem,
  slug: PoemSlug
): { readonly poem: Poem; readonly layout: PoemLayoutProps } {
  return { poem, layout: buildPoemLayout(poem, slug) };
}
```

- [ ] **Step 2: Update the Astro page**

In `apps/web/src/pages/poems/[slug].astro`, change the import on line 5:

```ts
import { buildPoemLayout } from '@/lib/poem-page';
```

and replace line 14:

```ts
const { poem, layout } = buildPoemPage(detail, slug as PoemSlug);
```

with:

```ts
const poem = detail;
const layout = buildPoemLayout(detail, slug as PoemSlug);
```

- [ ] **Step 3: Typecheck + build**

Run: `bun run types` then `bun --filter @qafiyah/web run build`
Expected: PASS, page renders the same props.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/poem-page.ts "apps/web/src/pages/poems/[slug].astro"
git commit -m "refactor(web): inline pass-through buildPoemPage wrapper"
```

---

## Task 8: Inline `resourceResponse` schema (contracts)

`resourceResponse` (schemas.ts:74-75) wraps an item as `{ data: item }` and has one caller: `poems.ts:40`.

**Files:**
- Modify: `packages/contracts/src/schemas.ts:74-75` (delete)
- Modify: `packages/contracts/src/poems.ts:11`, `:40`

- [ ] **Step 1: Inline the shape at the poems contract**

In `packages/contracts/src/poems.ts`, change line 40 from:

```ts
  .output(resourceResponse(poemDetail));
```

to:

```ts
  .output(v.object({ data: poemDetail }));
```

`v` is already imported (line 2). Then remove `resourceResponse` from the import on line 11:

```ts
import { listResponse, namedSlugRef, poemListItem, slugInput } from './schemas';
```

- [ ] **Step 2: Delete the schema helper**

Remove lines 74-75 in `packages/contracts/src/schemas.ts`:

```ts
export const resourceResponse = <TItem extends v.GenericSchema>(item: TItem) =>
  v.object({ data: item });
```

- [ ] **Step 3: Typecheck the whole monorepo (contracts feeds api + web)**

Run: `bun run types`
Expected: PASS — `apps/web/src/lib/api/rpc.ts` (`Poem = DataField<...getPoemBySlug>`) and the api still resolve `{ data: poemDetail }` identically.

- [ ] **Step 4: Run the api test suite (consumes the contract)**

Run: `bun --filter @qafiyah/api run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/schemas.ts packages/contracts/src/poems.ts
git commit -m "refactor(contracts): inline single-caller resourceResponse schema"
```

---

## Final Verification

- [ ] **Run the full CI gate**

Run: `bun run ci`
Expected: format + lint + types + test + knip + madge + audit all PASS. (knip will confirm no newly-orphaned exports were left behind.)

- [ ] **Sanity-check the running stack**

Run: `bun run db:up` then `bun --filter @qafiyah/web run dev` (with the api up) and curl a poem page + `/api/v1/poems/random?option=lines` to confirm unchanged output.
