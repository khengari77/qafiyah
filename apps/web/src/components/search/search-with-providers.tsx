'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { useEffect, useState } from 'react';
import {
  REACT_QUERY_GC_TIME_MS,
  REACT_QUERY_RETRY_COUNT,
  REACT_QUERY_STALE_TIME_MS,
} from '@/constants';
import { SearchContainer } from './search-container';

export function SearchWithProviders() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: REACT_QUERY_STALE_TIME_MS,
            gcTime: REACT_QUERY_GC_TIME_MS,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false,
            retry: REACT_QUERY_RETRY_COUNT,
          },
        },
      })
  );

  useEffect(() => {
    document.getElementById('search-shell')?.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <SearchContainer />
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
