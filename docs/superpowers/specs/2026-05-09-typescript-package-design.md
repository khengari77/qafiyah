# TypeScript Package Rename & Consolidation

**Date:** 2026-05-09
**Status:** Approved

## Goal

Rename `packages/tsconfig` → `packages/typescript` (package name `@qafiyah/tsconfig` → `@qafiyah/typescript`), introduce runtime-specific presets, remove unused configs, and make every app extend a single source of truth for strictness.

## Package Structure

```
packages/typescript/
├── package.json       (name: @qafiyah/typescript, version: 0.0.0, private: true)
├── base.json          (strictness + language baseline, no runtime assumptions)
├── cloudflare.json    (extends base — ESNext/Bundler, noEmit — for Workers)
├── node.json          (extends base — ESNext/Bundler, emits — for Node.js)
└── astro.json         (extends base — DOM lib, react-jsx, noEmit — for Astro/browser)
```

Files deleted: `nextjs.json`, `react-library.json` (unused, YAGNI).

## File Contents

### `base.json`

Strictness flags only. No `module`, `moduleResolution`, `lib`, `declaration` — those go in presets.

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

New flags vs. current base: `noImplicitOverride`, `noPropertyAccessFromIndexSignature`.
Removed from base: `module`, `moduleResolution`, `lib`, `declaration`, `declarationMap`.

### `cloudflare.json`

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

### `node.json`

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

### `astro.json`

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

## App Changes

### `apps/api/tsconfig.json`

Before: extends `@qafiyah/tsconfig/base.json`, re-declares `strict`, `module`, `moduleResolution`, `skipLibCheck`.
After: extends `@qafiyah/typescript/cloudflare.json`, keeps only app-unique settings.

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

### `apps/bot/tsconfig.json`

Before: extends `@qafiyah/tsconfig/base.json`, re-declares `isolatedModules`, `skipLibCheck`, `module`, `moduleResolution`.
After: extends `@qafiyah/typescript/node.json`, keeps only output and watch config.

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

### `apps/web/tsconfig.json`

Before: extends `astro/tsconfigs/strict` (external), not using shared package at all.
After: extends `@qafiyah/typescript/astro.json`, keeps only path alias and Astro includes.

```json
{
  "extends": "@qafiyah/typescript/astro.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", ".astro/types.d.ts"],
  "exclude": ["node_modules", "dist", ".astro"]
}
```

### `packages/db/tsconfig.json`

Stays on CommonJS/node resolution (not changing db module format). Extends `@qafiyah/typescript/base.json`, keeps CJS-specific overrides.

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

## Dependency Updates

All `package.json` files that reference `@qafiyah/tsconfig` must be updated to `@qafiyah/typescript`:

- `apps/api/package.json` — `dependencies`
- `apps/bot/package.json` — `devDependencies`
- `packages/db/package.json` — `dependencies`
- `apps/web/package.json` — add `@qafiyah/typescript: workspace:*` to `devDependencies` (currently not present)

## Verification

After implementation:

1. `pnpm install` — resolves new workspace package name
2. `pnpm types` — zero TS errors across all workspaces
3. `pnpm lint` — zero Biome errors
4. `pnpm test` — all tests pass
5. `pnpm build` — full monorepo build succeeds
