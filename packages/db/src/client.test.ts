import { describe, expect, it, vi } from 'vitest';

vi.mock('postgres', () => ({ default: vi.fn().mockReturnValue({}) }));
vi.mock('drizzle-orm/postgres-js', () => ({ drizzle: vi.fn().mockReturnValue({}) }));

import { createDb } from './client';

describe('createDb', () => {
  it('returns a db instance for a valid URL', () => {
    const db = createDb('postgres://user:pass@localhost:5432/dbname');
    expect(db).toBeDefined();
  });

  it('throws when URL has no port', () => {
    expect(() => createDb('postgres://user:pass@localhost/db')).toThrow('explicit valid port');
  });

  it('throws when port is 0', () => {
    expect(() => createDb('postgres://user:pass@localhost:0/db')).toThrow('explicit valid port');
  });
});
