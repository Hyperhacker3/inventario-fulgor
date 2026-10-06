import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { rpc } from '../data/repository';
import { supabase } from '../lib/supabase';
import type { Categoria, PrefijoCodigo } from '../types';

interface Catalog { categorias: Categoria[]; prefijos: PrefijoCodigo[] }
export function useDataAdministration() {
  const { user } = useAuth();
  const client = useQueryClient();
  const key = ['fulgor', user?.email || '', 'data-catalog'];
  const query = useQuery({ queryKey: key, queryFn: () => rpc<Catalog>('inventory_data_catalog', {}),
    enabled: Boolean(user && supabase), staleTime: 30_000, retry: false });
  const save = async (kind: 'categoria' | 'prefijo', input: Record<string, unknown>) => {
    if (user?.role !== 'admin') throw new Error('Solo administración puede gestionar estos datos.');
    // RPC returns the refreshed catalogs with the successful write, even if a later read fails.
    const updated = await rpc<Catalog>('save_inventory_catalog_entry', { p_kind: kind, p_entry: input });
    client.setQueryData(key, updated);
  };
  return { categorias: query.data?.categorias || [], prefijos: query.data?.prefijos || [],
    catalogReady: Boolean(query.data), catalogLoading: query.isPending && query.isFetching,
    catalogError: query.error, refreshCatalog: () => query.refetch(), saveCatalogEntry: save };
}
