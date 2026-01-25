/**
 * Database mock utilities for testing
 * Provides a more sophisticated mock that handles Drizzle ORM query builder patterns
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { vi } from 'vitest';

/**
 * Creates a chainable mock query builder that mimics Drizzle's query builder pattern
 */
function createQueryBuilder(mockData: unknown[] = []) {
  const builder = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue(mockData),
    select: vi.fn().mockReturnThis(),
  };
  return builder;
}

/**
 * Creates a mock database with configurable responses
 */
export function createMockDb(
  mockData: { select?: Record<string, unknown[]>; execute?: unknown[]; count?: number } = {}
): PostgresJsDatabase<Record<string, never>> {
  const selectData = mockData.select ?? {};
  const executeData = mockData.execute ?? [];
  const count = mockData.count ?? 0;

  // Create a mock that handles the query builder pattern
  const mockSelect = vi.fn((...args: unknown[]) => {
    // Try to determine which table/view is being queried
    // This is a simplified approach - in real tests you might want more sophisticated matching
    const tableName = args[0]?.constructor?.name ?? 'unknown';

    // Return a query builder that resolves with mock data
    return createQueryBuilder(selectData[tableName] ?? []);
  });

  return {
    select: mockSelect,
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn().mockResolvedValue(executeData),
    $count: vi.fn().mockResolvedValue(count),
  } as unknown as PostgresJsDatabase<Record<string, never>>;
}

/**
 * Helper to create a mock database with specific table responses
 */
export function createMockDbWithData(data: { [tableName: string]: unknown[] }) {
  return createMockDb({ select: data });
}
