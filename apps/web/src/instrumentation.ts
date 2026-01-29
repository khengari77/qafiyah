/**
 * Runs once when the Next.js server starts.
 * Fixes nuqs SSR error when Node provides a broken localStorage (e.g. --localstorage-file without a valid path).
 */
export async function register() {
  if (typeof window !== 'undefined') return;

  const g = globalThis as typeof globalThis & { localStorage?: Storage };
  const current = g.localStorage;
  if (current != null && typeof (current as { setItem?: unknown }).setItem !== 'function') {
    const noop = () => {};
    g.localStorage = {
      getItem: () => null,
      setItem: noop,
      removeItem: noop,
      clear: noop,
      key: () => null,
      get length() {
        return 0;
      },
    } as Storage;
  }
}
