import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { rpc } from '../data/repository';
import { supabase } from '../lib/supabase';
import type { Categoria, PrefijoCodigo } from '../types';
import { categoryNameKey, ensurePrefixChoice } from '../domain/dataAdministration';
import { initialQueryStatus } from '../domain/initialLoad';
import { useRef } from 'react';
import { AutomaticCodeRequests, automaticCodeRpc } from '../data/automaticCodes';

interface Catalog { categorias: Categoria[]; prefijos: PrefijoCodigo[] }
export function useDataAdministration() {
  const { user } = useAuth();
  const client = useQueryClient();
  const requests = useRef(new AutomaticCodeRequests());
  const key = ['fulgor', user?.email || '', 'data-catalog'];
  const query = useQuery({ queryKey: key, queryFn: () => rpc<Catalog>('inventory_data_catalog', {}),
    enabled: Boolean(user && supabase), staleTime: 30_000, retry: false });
  const save = async (kind: 'categoria' | 'prefijo', input: Record<string, unknown>) => {
    if (user?.role !== 'admin') throw new Error('Solo administración puede gestionar estos datos.');
    // RPC returns the refreshed catalogs with the successful write, even if a later read fails.
    const updated = kind === 'categoria' && !input.id
      ? await requests.current.run('categoria', { nombre: String(input.nombre || '').trim().replace(/\s+/g, ' '), activo: input.activo ?? true },
        request => automaticCodeRpc<Catalog>('create_inventory_category_auto', { p_request_id: request, p_name: String(input.nombre || '').trim().replace(/\s+/g, ' '), p_active: input.activo ?? true }))
      : await rpc<Catalog>('save_inventory_catalog_entry', { p_kind: kind, p_entry: input });
    client.setQueryData(key, updated);
    return updated;
  };
  const createCategoria = async (name: string): Promise<Categoria> => {
    if (user?.role !== 'admin') throw new Error('Solo administración puede crear categorías.');
    const nombre = name.trim().replace(/\s+/g, ' ');
    if (!nombre || nombre.length > 100) throw new Error('Escriba un nombre de categoría de hasta 100 caracteres.');
    const catalog = client.getQueryData<Catalog>(key)?.categorias || [];
    const existing = catalog.find(category => categoryNameKey(category.nombre) === categoryNameKey(nombre));
    if (existing) {
      if (!existing.activo) throw new Error('Esta categoría está inactiva. Reactívela en Administración de datos.');
      return existing;
    }
    try {
      const updated = await save('categoria', { nombre, activo: true });
      const created = updated.categorias.find(category => category.activo && categoryNameKey(category.nombre) === categoryNameKey(nombre));
      if (!created) throw new Error('No se pudo confirmar la categoría creada.');
      return created;
    } catch (error) {
      // A lost response or another admin may have already created the same category.
      const refreshed = await query.refetch();
      const confirmed = refreshed.data?.categorias.find(category => category.activo && categoryNameKey(category.nombre) === categoryNameKey(nombre));
      if (confirmed) return confirmed;
      throw error;
    }
  };
  const createPrefijo = async (code: string): Promise<PrefijoCodigo> => {
    if (user?.role !== 'admin') throw new Error('Solo administración puede crear códigos.');
    return ensurePrefixChoice(code, client.getQueryData<Catalog>(key)?.prefijos || [],
      async prefijo => (await save('prefijo', { prefijo, nombre: prefijo, activo: true })).prefijos,
      async () => (await query.refetch()).data?.prefijos || []);
  };
  return { categorias: query.data?.categorias || [], prefijos: query.data?.prefijos || [],
    catalogReady: Boolean(query.data), catalogLoading: query.isPending && query.isFetching,
    catalogError: query.error, catalogLoadStatus: initialQueryStatus([query]), refreshCatalog: () => query.refetch(), saveCatalogEntry: save, createCategoria, createPrefijo };
}
