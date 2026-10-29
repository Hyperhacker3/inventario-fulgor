import { rpc } from './repository';

export async function ensureBoxNamesReady(check = () => rpc<boolean>('inventory_box_names_ready', {})) {
  const activation = 'Falta activar los nombres de cajas. Ejecute 20261029000400_box_names.sql en Supabase y vuelva a guardar.';
  try { if (!await check()) throw new Error(activation); }
  catch (cause) {
    if (['42883', 'PGRST202'].includes((cause as { code?: string }).code || '')) throw new Error(activation, { cause });
    throw cause;
  }
}
