/**
 * Test utilities for Hono API testing
 * Provides helpers for creating test contexts and mocking database
 */

import type { DbClient } from '@qafiyah/db';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import * as v from 'valibot';
import { vi } from 'vitest';
import type { AppContext, Bindings } from '@/types';

/**
 * Creates a chainable query builder mock that handles Drizzle's query patterns
 */
function createQueryBuilder(mockData: readonly unknown[] = []) {
  const limitFn = vi.fn();
  limitFn.mockReturnValue({
    offset: vi.fn().mockResolvedValue(mockData),
  });
  limitFn.mockResolvedValue(mockData);

  const whereFn = vi.fn().mockReturnValue({
    limit: limitFn,
  });

  const builder = {
    from: vi.fn().mockResolvedValue(mockData),
    where: whereFn,
    limit: limitFn,
    offset: vi.fn().mockResolvedValue(mockData),
  };

  return builder;
}

// test-only: returns a DbClient-shaped object that only implements the subset of
// the interface actually used by the procedure under test.
function fakeDb<T extends object>(partial: T): DbClient {
  return partial as unknown as DbClient;
}

/**
 * Creates a mock database instance
 */
export function createMockDb(defaultData: readonly unknown[] = []): DbClient {
  const defaultBuilder = createQueryBuilder(defaultData);

  return fakeDb({
    select: vi.fn().mockReturnValue(defaultBuilder),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn().mockResolvedValue([]),
    $count: vi.fn().mockResolvedValue(0),
  });
}

/**
 * Test client type with $get helper
 */
type TestClientWithGet = {
  readonly $get: (path: string, init?: RequestInit) => Promise<Response>;
};

/**
 * Creates a test middleware that injects the database into context
 */
function createDbTestMiddleware(db: DbClient) {
  return createMiddleware<AppContext>(async (c, next) => {
    c.set('db', db);
    await next();
  });
}

/**
 * Creates a test client for a Hono app with mocked database and bindings
 */
export function createTestClient<T extends Hono<AppContext>>(
  app: T,
  options?: {
    readonly db?: DbClient;
    readonly bindings?: Partial<Bindings>;
  }
): TestClientWithGet {
  const db = options?.db ?? createMockDb();
  const bindings = {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    ...options?.bindings,
  } satisfies Bindings;

  const testApp = new Hono<AppContext>();
  testApp.use(createDbTestMiddleware(db));
  testApp.route('/', app);

  return {
    $get: (path: string, init?: RequestInit): Promise<Response> => {
      return Promise.resolve(
        testApp.fetch(
          new Request(`http://localhost${path}`, {
            method: 'GET',
            ...init,
          }),
          bindings
        )
      );
    },
  };
}

/**
 * Parses a JSON response body against a Valibot schema and returns the typed result.
 * Replaces ad-hoc `(await res.json()) as MyShape` casts in tests.
 */
export async function parseJson<TSchema extends v.GenericSchema>(
  res: Response,
  schema: TSchema
): Promise<v.InferOutput<TSchema>> {
  const body: unknown = await res.json();
  return v.parse(schema, body);
}
