'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getRandomSlug } from '@/lib/api/queries';

type Status = 'idle' | 'loading' | 'error';

export function useRandomPoem() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (status === 'loading') return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setStatus('loading');
    setError(null);

    try {
      const slug = await getRandomSlug();

      if (!isMountedRef.current) return;

      let trimmedSlug = '';
      if (slug) {
        trimmedSlug = slug.trim();
      }

      if (trimmedSlug.length > 0) {
        router.push(`/poems/${trimmedSlug}`);
      } else {
        setStatus('idle');
      }
    } catch (err) {
      if (!isMountedRef.current) return;
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
