import { NuqsAdapter } from 'nuqs/adapters/react';
import { useEffect } from 'react';
import { Providers } from '@/providers/react-query';
import { SearchContainer } from './search-container';

export function SearchWithProviders() {
  useEffect(() => {
    document.getElementById('search-shell')?.remove();
  }, []);

  return (
    <Providers>
      <NuqsAdapter>
        <SearchContainer />
      </NuqsAdapter>
    </Providers>
  );
}
