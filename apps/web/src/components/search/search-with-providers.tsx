import { NuqsAdapter } from 'nuqs/adapters/react';
import { Providers } from '@/providers/react-query';
import { SearchContainer } from './components/search-container';

export function SearchWithProviders() {
  return (
    <Providers>
      <NuqsAdapter>
        <SearchContainer />
      </NuqsAdapter>
    </Providers>
  );
}
