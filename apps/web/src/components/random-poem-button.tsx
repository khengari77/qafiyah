'use client';

import { Loader2 } from 'lucide-react';
import { match } from 'ts-pattern';
import { useRandomPoem } from '@/hooks/use-random-poem';

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
            <Loader2 className="animate-spin h-4 w-4" aria-hidden="true" />
          </p>
        ))
        .with({ kind: 'idle' }, () => <p>قصيدة عشوائية</p>)
        .exhaustive()}
    </button>
  );
}
