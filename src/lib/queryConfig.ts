/**
 * Centralized React Query configuration
 *
 * staleTime: How long data is considered fresh (won't refetch during this period)
 * gcTime: How long unused data stays in cache (formerly cacheTime)
 */

export const defaultQueryConfig = {
  staleTime: 1000 * 60 * 5,  // 5 minutes - data stays fresh
  gcTime: 1000 * 60 * 30,    // 30 minutes - unused data cached
} as const;

export const collectionQueryConfig = {
  staleTime: 1000 * 60 * 5,  // 5 minutes - collections don't change often
  gcTime: 1000 * 60 * 30,    // 30 minutes
} as const;

export const productQueryConfig = {
  staleTime: 1000 * 60 * 3,  // 3 minutes - products may update more frequently
  gcTime: 1000 * 60 * 15,    // 15 minutes
} as const;
