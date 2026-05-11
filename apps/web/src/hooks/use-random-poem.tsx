'use client';

import { useState } from 'react';
import { getRandomPoemSlug } from '@/lib/api/client';

export function useRandomPoem() {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setIsError(false);
    try {
      const slug = await getRandomPoemSlug();
      window.location.href = `/poems/${slug}`;
    } catch {
      setIsError(true);
      setIsLoading(false);
    }
  };

  return { handleClick, isLoading, isError };
}
