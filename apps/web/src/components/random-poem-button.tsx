'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { match } from 'ts-pattern';
import { API_URL } from '@/constants';
import { getRandomPoemSlug } from '@/lib/api/client';

type RandomPoemStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'error' };

function useRandomPoem() {
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

export function RandomPoemButton() {
  const { handleClick, status } = useRandomPoem();
  const isLoading = status.kind === 'loading';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-busy={isLoading}
      aria-label="قصيدة عشوائية"
    >
      {match(status)
        .with({ kind: 'error' }, () => <p className="text-red-400">حدث خطأ أثناء تحميل القصيدة</p>)
        .with({ kind: 'loading' }, () => (
          <p>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          </p>
        ))
        .with({ kind: 'idle' }, () => <p>قصيدة عشوائية</p>)
        .exhaustive()}
    </button>
  );
}
