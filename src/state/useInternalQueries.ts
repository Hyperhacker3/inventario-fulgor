import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { readInternalPage, readStaff } from '../data/internalDispatch';

export function useStaff(enabled = true) {
  const { user } = useAuth();
  return useQuery({ queryKey: ['fulgor', user?.email, 'internal', 'staff'], queryFn: readStaff, enabled,
    staleTime: 15_000, refetchInterval: enabled ? 30_000 : false, retry: 1 });
}
export function useInternalPage(page: number, pending: boolean, search: string, enabled = true) {
  const { user } = useAuth();
  return useQuery({ queryKey: ['fulgor', user?.email, 'internal', 'history', page, pending, search],
    queryFn: () => readInternalPage(page, pending, search), enabled, staleTime: 10_000, refetchInterval: enabled ? 30_000 : false, retry: 1 });
}
