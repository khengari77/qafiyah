import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postgresMock } = vi.hoisted(() => ({ postgresMock: vi.fn().mockReturnValue({}) }));
vi.mock('postgres', () => ({ default: postgresMock }));
vi.mock('drizzle-orm/postgres-js', () => ({ drizzle: vi.fn().mockReturnValue({}) }));

import { createDb, detectDbMode } from './client';

describe('createDb', () => {
  beforeEach(() => {
    postgresMock.mockClear();
  });

  it('returns ok with a db instance for a valid URL', () => {
    const result = createDb('postgres://user:pass@localhost:5432/dbname');
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBeDefined();
  });

  it('returns invalid_port error when URL has no port', () => {
    const result = createDb('postgres://user:pass@localhost/db');
    const error = result._unsafeUnwrapErr();
    expect(error.kind).toBe('invalid_port');
    expect(error.rawPort).toBe('');
    expect(error.databaseUrlHost).toBe('localhost');
  });

  it('returns invalid_port error when port is 0', () => {
    const result = createDb('postgres://user:pass@localhost:0/db');
    const error = result._unsafeUnwrapErr();
    expect(error.kind).toBe('invalid_port');
    expect(error.rawPort).toBe('0');
  });

  it('applies the long-lived profile for a localhost URL', () => {
    createDb('postgres://user:pass@127.0.0.1:5433/db');
    const opts = postgresMock.mock.calls[0]?.[0];
    expect(opts.max).toBe(20);
    expect(opts.prepare).toBe(true);
    expect(opts.fetch_types).toBe(true);
    expect(opts.connection.application_name).toBe('qafiyah-long-lived');
  });

  it('applies the edge profile for a remote URL', () => {
    createDb('postgres://user:pass@db.example.com:5432/db');
    const opts = postgresMock.mock.calls[0]?.[0];
    expect(opts.max).toBe(1);
    expect(opts.prepare).toBe(false);
    expect(opts.fetch_types).toBe(false);
    expect(opts.connection.application_name).toBe('qafiyah-edge');
  });

  it('lets an explicit mode override host-based detection', () => {
    createDb('postgres://user:pass@127.0.0.1:5433/db', { mode: 'edge' });
    const opts = postgresMock.mock.calls[0]?.[0];
    expect(opts.max).toBe(1);
    expect(opts.prepare).toBe(false);
    expect(opts.connection.application_name).toBe('qafiyah-edge');
  });
});

describe('detectDbMode', () => {
  it('returns long-lived for 127.0.0.1', () => {
    expect(detectDbMode('postgres://u:p@127.0.0.1:5432/d')).toBe('long-lived');
  });

  it('returns long-lived for localhost', () => {
    expect(detectDbMode('postgres://u:p@localhost:5432/d')).toBe('long-lived');
  });

  it('returns long-lived for host.docker.internal', () => {
    expect(detectDbMode('postgres://u:p@host.docker.internal:5432/d')).toBe('long-lived');
  });

  it('returns edge for an arbitrary remote host', () => {
    expect(detectDbMode('postgres://u:p@db.example.com:5432/d')).toBe('edge');
  });
});
