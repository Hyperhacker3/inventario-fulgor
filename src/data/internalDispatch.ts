import { requireSupabase } from '../lib/supabase';
import { rpc, unwrap } from './repository';
import type { InternalDispatch, StaffMember } from '../domain/internalDispatch';

export const INTERNAL_ACTIVATION = 'Falta activar una actualización de Salidas internas. Ejecute 20261029000600_internal_dispatches.sql y después 20261106000100_internal_dispatch_types_projects.sql en Supabase.';
export async function internalRpc<T>(name: string, values: Record<string, unknown>): Promise<T> {
  try { return await rpc<T>(name, values); }
  catch (cause) {
    if (['42883','42P01','42703','PGRST202','PGRST205'].includes((cause as { code?: string }).code || '')) throw new Error(INTERNAL_ACTIVATION, { cause });
    throw cause;
  }
}
export async function readStaff(): Promise<StaffMember[]> {
  try {
    const rows: StaffMember[] = [];
    for (let from = 0; ; from += 500) {
      const batch = unwrap(await requireSupabase().from('inventario_personal').select('*').order('nombre').order('id').range(from, from + 499)) as StaffMember[];
      rows.push(...batch); if (batch.length < 500) return rows;
    }
  } catch (cause) {
    if (['42P01','PGRST205'].includes((cause as { code?: string }).code || '')) throw new Error(INTERNAL_ACTIVATION, { cause });
    throw cause;
  }
}
export interface InternalPage { rows: InternalDispatch[]; total: number; pending: number }
export const readInternalPage = (page: number, pending: boolean, search: string) => internalRpc<InternalPage>('list_internal_dispatches', { p_page: page, p_pending: pending, p_search: search });
export const readInternalDetail = (id: string) => internalRpc<InternalDispatch>('read_internal_dispatch', { p_id: id });
