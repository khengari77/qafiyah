'use client';

import { useEffect, useRef } from 'react';
import { INFINITE_SCROLL_THRESHOLD } from '@/constants';

export function useInfiniteScroll(
  fetchNextPage: () => void,
  hasNextPage: boolean | undefined,
  isFetchingNextPage: boolean
) {
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loadMoreRef.current) {
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { threshold: INFINITE_SCROLL_THRESHOLD }
      );

      observer.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return { loadMoreRef };
}
