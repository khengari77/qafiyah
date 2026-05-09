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
    let slug: string;
    try {
      slug = await queries.getRandomSlug();
    } catch {
      setIsError(true);
      setIsLoading(false);
      return;
    }
    const trimmed = slug.trim();
    if (trimmed.length > 0) {
      window.location.href = `/poems/${trimmed}/`;
      return;
    }
    setIsLoading(false);
  };

  return { handleClick, isLoading, isError };
}
