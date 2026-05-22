import { QueryClient } from '@tanstack/react-query';

/**
 * Production-optimized React Query client.
 * 
 * Key settings:
 * - staleTime: 5 min — data is considered fresh, no refetch
 * - gcTime: 10 min — keep unused cache in memory for quick revisits
 * - refetchOnWindowFocus: false — don't spam the backend on tab switches
 * - retry: 1 — single retry for transient network errors
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes
      gcTime: 10 * 60 * 1000,          // 10 minutes (was cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: 0,
    },
  },
});
