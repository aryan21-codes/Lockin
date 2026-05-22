import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// ─── Query Key Factories ──────────────────────────────────────
export const queryKeys = {
  dashboard: (userId) => ['dashboard', userId],
  history: (feature) => ['history', feature],
  todos: (userId) => ['todos', userId],
  flashcards: (userId) => ['flashcards', userId],
  stickyNotes: (userId) => ['stickyNotes', userId],
};

// ─── Dashboard ────────────────────────────────────────────────
export function useDashboardData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.dashboard(user?.id),
    queryFn: async () => {
      const res = await api.get('/api/dashboard/combined');
      if (res.data.success) return res.data.data;
      throw new Error(res.data.message || 'Failed to fetch dashboard');
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 min for dashboard — slightly fresher
  });
}

// ─── History (Paginated) ──────────────────────────────────────
const HISTORY_PAGE_SIZE = 10;

export function useHistoryData(feature) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.history(feature)],
    queryFn: async ({ pageParam = 0, signal }) => {
      const res = await api.get(`/api/history/${feature}`, {
        params: { limit: HISTORY_PAGE_SIZE, offset: pageParam },
        signal, // enables automatic cancellation on tab switch
      });
      if (res.data.success) return res.data.data || [];
      throw new Error(res.data.message || 'Failed to fetch history');
    },
    getNextPageParam: (lastPage, allPages) => {
      // If we got fewer items than the page size, there are no more pages
      if (lastPage.length < HISTORY_PAGE_SIZE) return undefined;
      return allPages.flat().length; // offset = total items loaded so far
    },
    initialPageParam: 0,
    staleTime: 3 * 60 * 1000, // 3 min
  });
}

// ─── Todos ────────────────────────────────────────────────────
export function useTodos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.todos(user?.id),
    queryFn: async () => {
      const res = await api.get('/api/todos/');
      if (res.data.success) return res.data.data || [];
      throw new Error(res.data.message || 'Failed to fetch todos');
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 min — todos change more frequently
  });
}

// ─── Invalidation Helpers ─────────────────────────────────────
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

export function useInvalidateHistory(feature) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.history(feature) });
}

export function useInvalidateTodos() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['todos'] });
}
