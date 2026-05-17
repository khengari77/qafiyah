'use client';

import { useState } from 'react';
import { API_URL } from '@/constants/globals/urls';
import { getRandomPoemSlug } from '@/lib/api/client';

type RandomPoemStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'error' };

export function useRandomPoem() {
  const [status, setStatus] = useState<RandomPoemStatus>({ kind: 'idle' });

  const handleClick = async () => {
    if (status.kind === 'loading') return;
    setStatus({ kind: 'loading' });
    try {
      const slug = await getRandomPoemSlug(API_URL);
      window.location.href = `/poems/${slug}`;
    } catch {
      setStatus({ kind: 'error' });
    }
  };

  return { handleClick, status };
}
