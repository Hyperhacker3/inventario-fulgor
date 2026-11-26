import { requireSupabase } from '../lib/supabase';
import { rpc, unwrap } from './repository';
import { isDatabaseRejection } from './databaseErrors';
import { OutgoingPhotoSubmission } from '../domain/outgoingPhotos';
import { mapMaintenance, maintenancePayload, TOOL_LIFE_ACTIVATION, type LifeData, type LifeRecord, type MaintenanceInput, type MaintenanceRecord } from '../domain/toolLifeRecord';
import { removeMaintenanceImage, saveMaintenanceImage } from '../shared/maintenanceImages';

export const MAINTENANCE_PAGE_SIZE = 10;
const MISSING = ['42P01', '42883', 'PGRST202', 'PGRST205'];
function activation(cause: unknown): never {
  const code = (cause as { code?: string })?.code || '';
  // Keep the SQLSTATE so staged photos of a rejected request can still be cleaned up.
  if (MISSING.includes(code)) throw Object.assign(new Error(TOOL_LIFE_ACTIVATION, { cause }), { code });
  throw cause;
}
const mapRecord = (row: Record<string, unknown>): LifeRecord => ({
  datos: Object.fromEntries(Object.entries((row.datos as Record<string, unknown>) || {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string')),
  version: Number(row.version || 0), updatedAt: String(row.updated_at || ''), updatedBy: String(row.updated_by_nombre || ''),
});

export async function readLifeRecord(elementoId: string): Promise<LifeRecord | null> {
  try {
    const result = await requireSupabase().from('inventario_hojas_vida').select('datos,version,updated_at,updated_by_nombre').eq('elemento_id', elementoId).maybeSingle();
    if (result.error) throw Object.assign(new Error(result.error.message), { code: result.error.code });
    return result.data ? mapRecord(result.data) : null;
  } catch (cause) { return activation(cause); }
}
export async function saveLifeRecord(elementoId: string, version: number, datos: LifeData): Promise<LifeRecord> {
  try { return mapRecord(await rpc<Record<string, unknown>>('save_tool_life_record', { p_elemento_id: elementoId, p_version: version, p_datos: datos })); }
  catch (cause) { return activation(cause); }
}
export async function readMaintenancePage(elementoId: string, page: number): Promise<{ rows: MaintenanceRecord[]; total: number }> {
  try {
    const result = await requireSupabase().from('inventario_mantenimientos').select('*', { count: 'exact' }).eq('elemento_id', elementoId)
      .order('fecha', { ascending: false }).order('created_at', { ascending: false })
      .range((page - 1) * MAINTENANCE_PAGE_SIZE, page * MAINTENANCE_PAGE_SIZE - 1);
    return { rows: (unwrap(result) as Record<string, unknown>[]).map(mapMaintenance), total: result.count ?? 0 };
  } catch (cause) { return activation(cause); }
}

/** Uploads the photos once per request; an uncertain response is retried with the same files and UUID. */
const submissions = new OutgoingPhotoSubmission<MaintenanceRecord>('El mantenimiento pendiente cambió. Reintente con los mismos datos y fotos.');
export function registerMaintenance(requestId: string, elementoId: string, input: MaintenanceInput, photos: string[]) {
  const payload = maintenancePayload(input);
  return submissions.submit(requestId, { elementoId, payload }, photos,
    { save: saveMaintenanceImage, remove: removeMaintenanceImage, definitelyRejected: isDatabaseRejection },
    async refs => {
      try { return mapMaintenance(await rpc<Record<string, unknown>>('register_tool_maintenance', { p_request_id: requestId, p_elemento_id: elementoId, p_input: payload, p_fotos: refs })); }
      catch (cause) { return activation(cause); }
    });
}
