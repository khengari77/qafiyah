## TypeScript

- `type`>>`interface`. No `enum`/`any`. `readonly` everywhere.
- Enums→`as const`+derived union. Discriminated unions>boolean flags/optional fields.
- Branded: `type UserId = string & { readonly __brand: unique symbol }`.
- Narrow via `unknown`+guards; no casts. Exhaustive `switch` with `never` fallback.
- Validate at entry points; trust types downstream.
- Lookup tables>`if/else`. Named exports only. `satisfies`>annotations when inference matters.

## Business Logic

- Pure by default. Inject deps as args. One abstraction level/fn. Compute derived; don't store.
- Abstract only when: repeats 3×, hard to test, types allow invalid states, or immutable updates hurt.
- Delete dead code.

## Naming

- Skip abstraction if name doesn't come naturally. Reveal intent (`getUsersWithExpiredPlans`). Domain = vocabulary.
- Consistent across boundaries. Booleans: `is`/`has`/`can`. Fns: verb+noun. Handlers: `handle`; props: `on`.
- No abbreviations unless universal (`req`,`res`,`id`). Similar names→similar behavior.
- Exceptions: React/DOM (`ref`,`props`); canvas `ctx`; Result `ok`/`err`; event params; loop `i`; dep-required names.

## Errors

- Fail loudly at boundaries. `Result<T,E>` for fallible logic; `throw` for truly unexpected. Log with enough context to reproduce.

## Files & Modules

- One primary export/file. 4+exports→split. Co-locate until shared (2+places→`types/`|`utils/`). `lowercase-kebab.ts`.

## Testing

- Behavior not implementation. One concept/test. Unit→pure fns; integration→side-effectful flows. Mock only at boundaries (network/DB/time); never mock what you own.
