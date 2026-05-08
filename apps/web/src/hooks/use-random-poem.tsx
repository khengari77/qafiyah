'use client';

import { useState } from 'react';
import { queries } from '@/lib/api/queries';

export function useRandomPoem() {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setIsError(false);
    try {
      const slug = await queries.getRandomSlug();
      if (slug?.trim()) {
        window.location.href = `/poems/${slug.trim()}/`;
        return;
      }
    } catch {
      setIsError(true);
    }
    setIsLoading(false);
  };

  return { handleClick, isLoading, isError };
}
