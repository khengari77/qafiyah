import { describe, expect, it } from 'vitest';
import { err, ok, TerminalError } from './result';

describe('ok', () => {
  it('wraps a value as a successful Result', () => {
    expect(ok('hello')).toEqual({ ok: true, value: 'hello' });
  });
});

describe('err', () => {
  it('wraps an Error as a failed Result', () => {
    const e = new Error('boom');
    expect(err(e)).toEqual({ ok: false, error: e });
  });
});

describe('TerminalError', () => {
  it('is an Error with the TerminalError name', () => {
    const e = new TerminalError('stop');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('TerminalError');
    expect(e.message).toBe('stop');
  });
});
