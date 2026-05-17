'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import {
  REACT_QUERY_GC_TIME_MS,
  REACT_QUERY_RETRY_COUNT,
  REACT_QUERY_STALE_TIME_MS,
} from '@/constants/cache';

export function Providers({ children }: { children: ReactNode }) {
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

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
