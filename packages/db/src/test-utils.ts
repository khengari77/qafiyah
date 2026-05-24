import { vi } from 'vitest';
import { createDb, type DbClient } from './client';

type DrizzleChain = {
  readonly where: (...args: readonly unknown[]) => DrizzleChain;
  readonly orderBy: (...args: readonly unknown[]) => DrizzleChain;
  readonly limit: (...args: readonly unknown[]) => DrizzleChain;
  readonly offset: (...args: readonly unknown[]) => DrizzleChain;
  readonly then: Promise<unknown>['then'];
  readonly catch: Promise<unknown>['catch'];
  readonly finally: Promise<unknown>['finally'];
};

export function makeChain(data: readonly unknown[]): DrizzleChain {
  const promise = Promise.resolve(data);
  const chain: DrizzleChain = {
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    // biome-ignore lint/suspicious/noThenProperty: intentional thenable for drizzle chain mock
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  return chain;
}

// test-only: returns a DbClient-shaped object that only implements the subset of
// the interface actually used by the query under test. Centralizes the cast so
// individual tests stay free of `as unknown as DbClient`.
export function castPartialAsDbClient<T extends object>(partial: T): DbClient {
  return partial as unknown as DbClient;
}

// biome-ignore lint/style/noProcessEnv: test-only helper reads env directly to gate integration tests
const TEST_DATABASE_URL = process.env['TEST_DATABASE_URL'] ?? '';

// Integration test helper — skips the callback when TEST_DATABASE_URL is absent.
// Usage: await withTestDb(async (db) => { ... });
export async function withTestDb(fn: (db: DbClient) => Promise<void>): Promise<void> {
  if (TEST_DATABASE_URL === '') return;
  const db = createDb(TEST_DATABASE_URL)._unsafeUnwrap();
  await fn(db);
}
