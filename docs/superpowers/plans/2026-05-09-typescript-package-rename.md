# TypeScript Package Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename `packages/tsconfig` → `packages/typescript` (`@qafiyah/tsconfig` → `@qafiyah/typescript`), replace the single base config with four runtime presets (base, cloudflare, node, astro), and update all apps to extend the right preset with no redundant overrides.

**Architecture:** The shared package owns all strictness flags in `base.json` and all runtime-specific settings in three thin preset files. Each app's `tsconfig.json` extends exactly one preset and only declares settings that are unique to that app (paths, types, outDir). `apps/web` is brought into the package for the first time via `astro.json`.

**Tech Stack:** TypeScript 5.8.2, pnpm workspaces, Turborepo, Hono (api), Cloudflare Workers (api), Node.js (bot), Astro (web), Drizzle (db)

---

## File Map

**Rename (git mv):**
- `packages/tsconfig/` → `packages/typescript/`

**Modify:**
- `packages/typescript/package.json` — update name to `@qafiyah/typescript`
- `packages/typescript/base.json` — rewrite: remove runtime settings, add two new strict flags
- `apps/api/package.json` — rename dep `@qafiyah/tsconfig` → `@qafiyah/typescript` (in `dependencies`)
- `apps/api/tsconfig.json` — extend `@qafiyah/typescript/cloudflare.json`, trim redundant settings
- `apps/bot/package.json` — rename dep (in `devDependencies`)
- `apps/bot/tsconfig.json` — extend `@qafiyah/typescript/node.json`, trim redundant settings
- `apps/web/package.json` — add `@qafiyah/typescript: workspace:*` to `devDependencies`
- `apps/web/tsconfig.json` — extend `@qafiyah/typescript/astro.json`, drop `astro/tsconfigs/strict`
- `packages/db/package.json` — rename dep (in `dependencies`)
- `packages/db/tsconfig.json` — update extends path to `@qafiyah/typescript/base.json`

**Create:**
- `packages/typescript/cloudflare.json`
- `packages/typescript/node.json`
- `packages/typescript/astro.json`

**Delete:**
- `packages/typescript/nextjs.json` (unused)
- `packages/typescript/react-library.json` (unused)

---

## Task 1: Rename the package directory and update package metadata

**Files:**
- Rename: `packages/tsconfig/` → `packages/typescript/`
- Modify: `packages/typescript/package.json`

- [ ] **Step 1: Rename directory with git to preserve history**

```bash
git mv packages/tsconfig packages/typescript
```

Expected: no output, no error.

- [ ] **Step 2: Verify the rename**

```bash
ls packages/typescript/
```

Expected output:
```
base.json  nextjs.json  package.json  react-library.json
```

- [ ] **Step 3: Update the package name in package.json**

Write `packages/typescript/package.json`:

```json
{
  "name": "@qafiyah/typescript",
  "version": "0.0.0",
  "license": "MIT",
  "private": true,
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/typescript/package.json
git commit -m "refactor(tsconfig): rename package to @qafiyah/typescript"
```

---

## Task 2: Rewrite base.json and create runtime presets

**Files:**
- Modify: `packages/typescript/base.json`
- Delete: `packages/typescript/nextjs.json`, `packages/typescript/react-library.json`
- Create: `packages/typescript/cloudflare.json`
- Create: `packages/typescript/node.json`
- Create: `packages/typescript/astro.json`

The current `base.json` bundles runtime settings (`module`, `moduleResolution`, `lib`, `declaration`, `declarationMap`) with strictness flags. Those runtime settings belong in presets. Two new strict flags are added: `noImplicitOverride` and `noPropertyAccessFromIndexSignature`.

- [ ] **Step 1: Rewrite base.json**

Write `packages/typescript/base.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "strict": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 2: Delete the two unused preset files**

```bash
git rm packages/typescript/nextjs.json packages/typescript/react-library.json
```

Expected: both files staged for deletion with no error.

- [ ] **Step 3: Create cloudflare.json**

Write `packages/typescript/cloudflare.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ESNext"],
    "jsx": "react-jsx",
    "noEmit": true
  }
}
```

- [ ] **Step 4: Create node.json**

Write `packages/typescript/node.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "declaration": true,
    "declarationMap": true
  }
}
```

- [ ] **Step 5: Create astro.json**

Write `packages/typescript/astro.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "allowJs": true,
    "noEmit": true
  }
}
```

- [ ] **Step 6: Verify package contents**

```bash
ls packages/typescript/
```

Expected — exactly five files:
```
astro.json  base.json  cloudflare.json  node.json  package.json
```

- [ ] **Step 7: Commit everything in this task**

```bash
git add packages/typescript/base.json packages/typescript/cloudflare.json packages/typescript/node.json packages/typescript/astro.json
git commit -m "refactor(tsconfig): rewrite base.json, add runtime presets, drop unused configs"
```

---

## Task 3: Update all package.json dependency references

All apps must rename `@qafiyah/tsconfig` → `@qafiyah/typescript` before running `pnpm install`. Do all four package.json updates in this task, then install once in Task 4.

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/bot/package.json`
- Modify: `apps/web/package.json`
- Modify: `packages/db/package.json`

- [ ] **Step 1: Update apps/api/package.json**

In `apps/api/package.json`, in the `dependencies` section, replace:
```json
"@qafiyah/tsconfig": "workspace:*",
```
with:
```json
"@qafiyah/typescript": "workspace:*",
```

- [ ] **Step 2: Update apps/bot/package.json**

In `apps/bot/package.json`, in the `devDependencies` section, replace:
```json
"@qafiyah/tsconfig": "workspace:*",
```
with:
```json
"@qafiyah/typescript": "workspace:*",
```

- [ ] **Step 3: Update apps/web/package.json**

In `apps/web/package.json`, add to the `devDependencies` section:
```json
"@qafiyah/typescript": "workspace:*",
```

`apps/web` previously had no reference to the shared tsconfig package at all — this is the first time it's added.

- [ ] **Step 4: Update packages/db/package.json**

In `packages/db/package.json`, in the `dependencies` section, replace:
```json
"@qafiyah/tsconfig": "workspace:*",
```
with:
```json
"@qafiyah/typescript": "workspace:*",
```

- [ ] **Step 5: Confirm zero remaining references to @qafiyah/tsconfig in package.json files**

```bash
grep -r "@qafiyah/tsconfig" . --include="package.json" --exclude-dir=node_modules
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add apps/api/package.json apps/bot/package.json apps/web/package.json packages/db/package.json
git commit -m "chore: rename @qafiyah/tsconfig dep to @qafiyah/typescript across all packages"
```

---

## Task 4: Reinstall workspace packages

With all `package.json` files updated, pnpm can now resolve `@qafiyah/typescript` in the workspace.

**Files:**
- Auto-modified: `pnpm-lock.yaml`

- [ ] **Step 1: Reinstall**

```bash
pnpm install
```

Expected: pnpm links `@qafiyah/typescript` in all workspaces and regenerates `pnpm-lock.yaml`. No errors.

- [ ] **Step 2: Commit the updated lockfile**

```bash
git add pnpm-lock.yaml
git commit -m "chore: update lockfile after tsconfig package rename"
```

---

## Task 5: Update apps/api tsconfig.json

**Files:**
- Modify: `apps/api/tsconfig.json`

- [ ] **Step 1: Rewrite apps/api/tsconfig.json**

Write `apps/api/tsconfig.json`:

```json
{
  "extends": "@qafiyah/typescript/cloudflare.json",
  "compilerOptions": {
    "jsxImportSource": "hono/jsx",
    "types": ["@cloudflare/workers-types/2023-07-01"],
    "paths": {
      "@qafiyah/schemas": ["../../packages/schemas/dist"],
      "@qafiyah/schemas/server": ["../../packages/schemas/dist/utils/server"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 2: Run type check for apps/api**

```bash
pnpm --filter @qafiyah/api types
```

Expected: exits 0 with no errors.

If TypeScript reports errors from the two new strict flags:
- **`noImplicitOverride`**: Find any class method that overrides a base class method and add the `override` keyword. Example: `override greet() {}`.
- **`noPropertyAccessFromIndexSignature`**: For any type with an explicit index signature (`[key: string]: T`), switch from dot notation (`obj.key`) to bracket notation (`obj['key']`).

Fix all errors before proceeding.

- [ ] **Step 3: Commit**

```bash
git add apps/api/tsconfig.json
git commit -m "refactor(api): extend @qafiyah/typescript/cloudflare preset"
```

---

## Task 6: Update apps/bot tsconfig.json

**Files:**
- Modify: `apps/bot/tsconfig.json`

- [ ] **Step 1: Rewrite apps/bot/tsconfig.json**

Write `apps/bot/tsconfig.json`:

```json
{
  "extends": "@qafiyah/typescript/node.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"],
  "watchOptions": {
    "excludeDirectories": ["node_modules", "dist"],
    "excludeFiles": ["dist/**/*"],
    "fallbackPolling": "dynamicPriority"
  }
}
```

- [ ] **Step 2: Run type check for apps/bot**

```bash
pnpm --filter @qafiyah/bot types
```

Expected: exits 0 with no errors. Fix any errors from `noImplicitOverride` or `noPropertyAccessFromIndexSignature` as described in Task 5, Step 2.

- [ ] **Step 3: Commit**

```bash
git add apps/bot/tsconfig.json
git commit -m "refactor(bot): extend @qafiyah/typescript/node preset"
```

---

## Task 7: Update apps/web tsconfig.json

**Files:**
- Modify: `apps/web/tsconfig.json`

`apps/web` previously extended `astro/tsconfigs/strict` directly. It now extends `@qafiyah/typescript/astro.json` which provides the same runtime settings (ESNext, Bundler, DOM lib, react-jsx) plus all strictness flags from `base.json`.

- [ ] **Step 1: Rewrite apps/web/tsconfig.json**

Write `apps/web/tsconfig.json`:

```json
{
  "extends": "@qafiyah/typescript/astro.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", ".astro/types.d.ts"],
  "exclude": ["node_modules", "dist", ".astro"]
}
```

- [ ] **Step 2: Run type check for apps/web**

```bash
pnpm --filter @qafiyah/web types
```

Expected: exits 0. The Astro checker runs first (`astro check`), then `tsc --noEmit`. A hint about converting an arrow function to async in `src/lib/api/static.ts:72` is pre-existing and not a failure. Fix any errors from `noImplicitOverride` or `noPropertyAccessFromIndexSignature` as described in Task 5, Step 2.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tsconfig.json
git commit -m "refactor(web): extend @qafiyah/typescript/astro preset"
```

---

## Task 8: Update packages/db tsconfig.json

**Files:**
- Modify: `packages/db/tsconfig.json`

`packages/db` uses CommonJS format. No runtime preset covers CJS + `node` resolution, so it extends `base.json` directly and declares its own module settings.

- [ ] **Step 1: Rewrite packages/db/tsconfig.json**

Write `packages/db/tsconfig.json`:

```json
{
  "extends": "@qafiyah/typescript/base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "target": "ES2020",
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 2: Run type check for packages/db**

```bash
pnpm --filter @qafiyah/db types
```

Expected: exits 0. Fix any errors from `noImplicitOverride` or `noPropertyAccessFromIndexSignature` as described in Task 5, Step 2.

- [ ] **Step 3: Commit**

```bash
git add packages/db/tsconfig.json
git commit -m "refactor(db): extend @qafiyah/typescript/base preset"
```

---

## Task 9: Final verification

All changes are in place. Run the full quality checklist from the repo root.

- [ ] **Step 1: Run full type check across all workspaces**

```bash
pnpm types
```

Expected: all packages pass, 0 errors. Turbo runs `types` across `@qafiyah/api`, `@qafiyah/bot`, `@qafiyah/web`, and `@qafiyah/db`.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: 0 errors, 0 warnings across all 142 files.

- [ ] **Step 3: Run tests**

```bash
pnpm test
```

Expected: all test suites pass.

- [ ] **Step 4: Confirm no remaining references to @qafiyah/tsconfig**

```bash
grep -r "@qafiyah/tsconfig" . --include="*.json" --exclude-dir=node_modules
```

Expected: no output (zero matches).

- [ ] **Step 5: Confirm the package directory is clean**

```bash
ls packages/typescript/
```

Expected — exactly five files:
```
astro.json  base.json  cloudflare.json  node.json  package.json
```
