import { requireSupabase } from '../lib/supabase';
import type { Almacen, NivelEstanteria, Caja, Elemento, Estanteria, Proyecto, Remision, HistorialMovimiento, Page, ProjectSpending } from '../types';
import { mapAlmacen, mapNivel, mapCaja, mapElemento, mapEstanteria, mapProyecto, mapRemision, mapHistory, type DbRow } from './mappers';

type Table = 'almacenes' | 'estanterias' | 'niveles_estanteria' | 'cajas' | 'proyectos' | 'elementos' | 'remisiones' | 'historial';
export function unwrap<T>(result: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (result.error) throw Object.assign(new Error(result.error.message), { code: result.error.code });
  if (result.data === null) throw new Error('La base de datos no devolvió un resultado.');
  return result.data;
}

async function all(table: Table, order = 'created_at', activeOnly = false) {
  const db = requireSupabase();
  const rows: DbRow[] = [];
  for (let from = 0; ; from += 500) {
    let query = db.from(table).select('*');
    if (activeOnly) query = query.eq('archived', false);
    query = query.order(order, { ascending: false });
    if (table === 'elementos') query = query.order('id', { ascending: true });
    const batch = unwrap(await query.range(from, from + 499));
    rows.push(...batch);
    if (batch.length < 500) break;
  }
  return rows;
}
export const readAlmacenes = async (): Promise<Almacen[]> => (await all('almacenes')).map(mapAlmacen);
export const readEstanterias = async (): Promise<Estanteria[]> => (await all('estanterias')).map(mapEstanteria);
export async function readNiveles(): Promise<NivelEstanteria[]> {
  try { return (await all('niveles_estanteria')).map(mapNivel); }
  catch (cause) {
    // Keep existing inventory accessible while the additive migration is being applied.
    const code = (cause as { code?: string }).code;
    if (code === '42P01' || code === 'PGRST205') return [];
    throw cause;
  }
}
export const readCajas = async (): Promise<Caja[]> => (await all('cajas')).map(mapCaja);
export const readProyectos = async (): Promise<Proyecto[]> => (await all('proyectos')).map(mapProyecto);
export const readElementos = async (): Promise<Elemento[]> => (await all('elementos', 'updated_at', true)).map(mapElemento);
export const readElementosByIds = async (ids: string[]): Promise<Elemento[]> => {
  if (!ids.length) return [];
  const result = await requireSupabase().from('elementos').select('*').in('id', ids).eq('archived', false);
  return unwrap(result).map(row => mapElemento(row));
};
export const readRecentRemisiones = async (): Promise<Remision[]> =>
  unwrap(await requireSupabase().from('remisiones').select('*').order('created_at', { ascending: false }).limit(100)).map(row => mapRemision(row));
export const readRemisionById = async (id: string): Promise<Remision> =>
  mapRemision(unwrap(await requireSupabase().from('remisiones').select('*').eq('id', id).single()));
export async function readRemisionesPage(page: number, pageSize: number, search = ''): Promise<Page<Remision>> {
  let query = requireSupabase().from('remisiones').select('*', { count: 'exact' })
    .order('created_at', { ascending: false }).order('id', { ascending: false });
  const safe = search.trim().replace(/[%(),]/g, '');
  if (safe) query = query.or(`numero_remision.ilike.%${safe}%,proyecto_nombre.ilike.%${safe}%,cliente.ilike.%${safe}%,recibido_por.ilike.%${safe}%`);
  const result = await query.range((page - 1) * pageSize, page * pageSize - 1);
  return { rows: unwrap(result).map(row => mapRemision(row)), total: result.count ?? 0 };
}
export async function readHistory(page: number, pageSize: number, filters: { type?: string; search?: string } = {}): Promise<Page<HistorialMovimiento>> {
  let query = requireSupabase().from('historial').select('*', { count: 'exact' })
    .order('created_at', { ascending: false }).order('id', { ascending: false });
  if (filters.type && filters.type !== 'TODOS') query = query.eq('tipo', filters.type);
  if (filters.search) {
    const safe = filters.search.trim().replace(/[%(),]/g, '');
    if (safe) query = query.or(`elemento_codigo.ilike.%${safe}%,elemento_nombre.ilike.%${safe}%,proyecto_nombre.ilike.%${safe}%,responsable.ilike.%${safe}%,motivo.ilike.%${safe}%`);
  }
  const result = await query.range((page - 1) * pageSize, page * pageSize - 1);
  return { rows: unwrap(result).map(row => mapHistory(row)), total: result.count ?? 0 };
}
export const readRecentHistory = async (): Promise<HistorialMovimiento[]> =>
  unwrap(await requireSupabase().from('historial').select('*').order('created_at', { ascending: false }).limit(100)).map(row => mapHistory(row));
export const readItemHistory = async (itemId: string): Promise<HistorialMovimiento[]> =>
  unwrap(await requireSupabase().from('historial').select('*').eq('elemento_id', itemId)
    .order('created_at', { ascending: false }).limit(50)).map(row => mapHistory(row));

export async function insertRow<T>(table: Table, row: Record<string, unknown>, mapper: (row: DbRow) => T): Promise<T> {
  const result = await requireSupabase().from(table).insert(row).select('*').single();
  return mapper(unwrap(result));
}
export async function updateRow<T>(table: Table, id: string, values: Record<string, unknown>, mapper: (row: DbRow) => T): Promise<T> {
  const result = await requireSupabase().from(table).update(values).eq('id', id).select('*').single();
  return mapper(unwrap(result));
}
export async function rpc<T>(name: string, values: Record<string, unknown>): Promise<T> {
  const result = await requireSupabase().rpc(name, values);
  return unwrap(result) as T;
}
export async function readProjectSpending(): Promise<ProjectSpending[]> {
  const rows = await rpc<{ proyecto_id: string; total_cop: number | string; salidas: number | string }[]>('inventory_project_spending', {});
  return rows.map(row => ({ proyectoId: row.proyecto_id, totalCOP: Number(row.total_cop), salidas: Number(row.salidas) }));
}
