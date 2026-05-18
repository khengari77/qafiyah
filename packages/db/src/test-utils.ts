import { vi } from 'vitest';
import type { DbClient } from './client';

type DrizzleChain = {
  readonly where: (...args: readonly unknown[]) => DrizzleChain;
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
