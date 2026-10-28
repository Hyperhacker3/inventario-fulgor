import { readAlmacenes, readCajas, readElementosByIds, readEstanterias, readNiveles, rpc, unwrap } from './repository';
import { requireSupabase } from '../lib/supabase';
import type { InventoryReport, SavedReportSummary } from '../domain/inventoryReport';
import type { CompanySettings, Elemento } from '../types';
import { mapCompany } from '../domain/company';

/** Bound each request to avoid URL and server row limits on large selections. */
export async function readReportItems(ids: readonly string[], read = readElementosByIds): Promise<Elemento[]> {
  const unique = [...new Set(ids)], items: Elemento[] = [];
  for (let offset = 0; offset < unique.length; offset += 100) items.push(...await read(unique.slice(offset, offset + 100)));
  return items;
}

export const REPORT_HISTORY_ACTIVATION = 'Falta activar el historial de informes en Supabase. Ejecute la migración 20261028000100_inventory_report_history.sql y vuelva a intentar.';
function historyError(cause: unknown): never {
  const code = (cause as { code?: string }).code;
  if (['42P01', '42883', 'PGRST202', 'PGRST205'].includes(code || '')) throw new Error(REPORT_HISTORY_ACTIVATION);
  throw cause;
}
export async function requireReportHistory() {
  try {
    if (!await rpc<boolean>('inventory_report_history_ready', {})) throw new Error(REPORT_HISTORY_ACTIVATION);
  } catch (cause) { historyError(cause); }
}
export async function saveInventoryReport(requestId: string, report: InventoryReport): Promise<InventoryReport> {
  try {
    return await rpc<InventoryReport>('save_inventory_report', { p_request_id: requestId, p_snapshot: report });
  } catch (cause) { return historyError(cause); }
}
export async function readInventoryReportsPage(page: number) {
  try {
    const result = await requireSupabase().from('inventario_informes')
      .select('id,created_at,generated_by,product_count,quantities,value_cop,pending_value', { count: 'exact' })
      .order('created_at', { ascending: false }).order('id', { ascending: false }).range((page - 1) * 20, page * 20 - 1);
    return { rows: unwrap(result) as SavedReportSummary[], total: result.count ?? 0 };
  } catch (cause) { return historyError(cause); }
}
export async function readSavedInventoryReport(id: string): Promise<InventoryReport> {
  try {
    const row = unwrap<{ version: number; snapshot: InventoryReport }>(await requireSupabase().from('inventario_informes').select('version,snapshot').eq('id', id).single());
    if (row.version !== 1) throw new Error('Esta versión del informe no se puede abrir. Actualice la aplicación.');
    return row.snapshot as InventoryReport;
  } catch (cause) { return historyError(cause); }
}

export async function readInventoryReportSource(ids: readonly string[]) {
  const [items, warehouses, racks, levels, boxes, company] = await Promise.all([
    readReportItems(ids), readAlmacenes(), readEstanterias(), readNiveles(), readCajas(), rpc<CompanySettings>('inventory_company_profile', {}),
  ]);
  return { items, locations: { warehouses, racks, levels, boxes }, company: mapCompany(company.perfil) };
}
