'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getRandomSlug } from '@/lib/api/queries';

type Status = 'idle' | 'loading' | 'error';

export function useRandomPoem() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<Error | null>(null);

  // AbortController ref for cancellation (react-query pattern)
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Setup mount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cleanup: abort any in-flight request on unmount
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleClick = useCallback(async () => {
    // Guard: already loading
    if (status === 'loading') return;

    // Cancel any in-flight request (prevents stale responses)
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setStatus('loading');
    setError(null);

    try {
      const slug = await getRandomSlug();

      // Check if still mounted and not aborted
      if (!isMountedRef.current) return;

      if (slug?.trim()) {
        router.push(`/poems/${slug.trim()}`);
      } else {
        setStatus('idle');
      }
    } catch (err) {
      // Don't update state if unmounted
      if (!isMountedRef.current) return;
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') return;

      setStatus('error');
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  }, [status, router]);

  return {
    handleClick,
    isLoading: status === 'loading',
    isError: status === 'error',
    error,
  };
}
