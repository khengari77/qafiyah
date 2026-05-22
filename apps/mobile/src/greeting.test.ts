import { describe, expect, it } from 'vitest';
import { buildGreeting } from './greeting';

describe('buildGreeting', () => {
  it('wraps the subject in a greeting', () => {
    expect(buildGreeting('World')).toBe('Hello, World!');
  });
});
