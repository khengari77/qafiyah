/**
 * Test utilities for Hono API testing
 * Provides helpers for creating test contexts and mocking database
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { vi } from 'vitest';
import type { AppContext, Bindings } from '../types';

/**
 * Creates a chainable query builder mock that handles Drizzle's query patterns
 * Drizzle supports:
 * - db.select().from(table) -> Promise
 * - db.select().from(table).limit(n).offset(n) -> Promise
 * - db.select({...}).from(table).where(...).limit(1) -> Promise
 */
function createQueryBuilder(mockData: unknown[] = []) {
  // Create a flexible limit function
  const limitFn = vi.fn();
  // Default: limit() returns an object with offset()
  limitFn.mockReturnValue({
    offset: vi.fn().mockResolvedValue(mockData),
  });
  // But can also be called directly and return a promise
  limitFn.mockResolvedValue(mockData);

  // Create where that returns a builder with limit
  const whereFn = vi.fn().mockReturnValue({
    limit: limitFn,
  });

  // Create a builder
  const builder = {
    from: vi.fn().mockResolvedValue(mockData),
    where: whereFn,
    limit: limitFn,
    offset: vi.fn().mockResolvedValue(mockData),
  };

  return builder;
}

/**
 * Creates a mock database instance
 * In a real scenario, you might want to use a test database or a more sophisticated mock
 */
export function createMockDb(
  defaultData: unknown[] = []
): PostgresJsDatabase<Record<string, never>> {
  // This is a basic mock - in production tests, you might want to use
  // a real test database or a more sophisticated mocking library
  const defaultBuilder = createQueryBuilder(defaultData);

  return {
    select: vi.fn().mockReturnValue(defaultBuilder),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn().mockResolvedValue([]),
    $count: vi.fn().mockResolvedValue(0),
  } as unknown as PostgresJsDatabase<Record<string, never>>;
}

/**
 * Test client type with $get helper
 */
type TestClientWithGet = {
  $get: (path: string, init?: RequestInit) => Promise<Response>;
  [key: string]: unknown;
};

/**
 * Creates a test middleware that injects the database into context
 */
function createDbTestMiddleware(db: PostgresJsDatabase<Record<string, never>>) {
  return createMiddleware<AppContext>(async (c, next) => {
    c.set('db', db);
    await next();
  });
}

/**
 * Creates a test client for a Hono app with mocked database and bindings
 * Returns an object with a fetch method and a $get helper for convenience
 */
export function createTestClient<T extends Hono<AppContext>>(
  app: T,
  options?: {
    db?: PostgresJsDatabase<Record<string, never>>;
    bindings?: Partial<Bindings>;
  }
): TestClientWithGet {
  const db = options?.db ?? createMockDb();
  const bindings: Bindings = {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    DEV_DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    ...options?.bindings,
  };

  // Create a test app with the db middleware
  const testApp = new Hono<AppContext>();
  testApp.use(createDbTestMiddleware(db));
  testApp.route('/', app);

  // Return a simple object with $get helper method
  return {
    $get: (path: string, init?: RequestInit) => {
      return testApp.fetch(
        new Request(`http://localhost${path}`, {
          method: 'GET',
          ...init,
        }),
        bindings
      );
    },
  } as TestClientWithGet;
}

/**
 * Helper to create a test app with mocked database
 */
export function createTestApp() {
  const db = createMockDb();
  return { db };
}

/**
 * Type helper for API response JSON
 */
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T | Record<string, unknown>;
  error?: string;
  status?: number;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems?: number;
    totalResults?: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};
