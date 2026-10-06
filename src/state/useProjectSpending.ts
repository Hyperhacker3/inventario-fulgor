import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { readProjectSpending } from '../data/repository';
import { supabase } from '../lib/supabase';

export function useProjectSpending() {
  const { user } = useAuth();
  return useQuery({ queryKey: ['fulgor', user?.email || '', 'project-spending'], queryFn: readProjectSpending,
    enabled: !!supabase && !!user, staleTime: 30_000, retry: 1 });
}
