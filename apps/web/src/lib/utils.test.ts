import { cn } from './utils';

describe('cn', () => {
  it('returns a single class unchanged', () => {
    expect(cn('p-4')).toBe('p-4');
  });

  it('merges multiple class strings', () => {
    expect(cn('flex', 'items-center')).toBe('flex items-center');
  });

  it('resolves Tailwind conflicts by keeping the last value', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('resolves conflicting text-color classes', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles undefined and null gracefully', () => {
    expect(cn(undefined, null, 'p-2')).toBe('p-2');
  });

  it('handles conditional class objects', () => {
    expect(cn({ 'font-bold': true, italic: false })).toBe('font-bold');
  });

  it('handles array inputs', () => {
    expect(cn(['flex', 'gap-2'])).toBe('flex gap-2');
  });

  it('returns empty string when no classes are provided', () => {
    expect(cn()).toBe('');
  });
});
