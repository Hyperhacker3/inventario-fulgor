import { requireSupabase } from '../lib/supabase';
import { mapElemento } from './mappers';
import { rpc, unwrap } from './repository';
import { removeImage } from '../shared/images';
import type { Elemento, Page } from '../types';

export interface ImageCleanupJob { id: string; codigo: string; nombre: string; fotos: string[] }
export async function readArchivedItems(page: number, search: string): Promise<Page<Elemento>> {
  let query = requireSupabase().from('elementos').select('*', { count: 'exact' }).eq('archived', true)
    .order('updated_at', { ascending: false }).order('id');
  const safe = search.trim().replace(/[%(),]/g, '');
  if (safe) query = query.or(`codigo.ilike.%${safe}%,nombre.ilike.%${safe}%`);
  const result = await query.range((page - 1) * 10, page * 10 - 1);
  return { rows: unwrap(result).map(mapElemento), total: result.count ?? 0 };
}
export const readImageCleanupJobs = () => rpc<ImageCleanupJob[]>('inventory_image_cleanup_jobs', {});

export async function finishImageCleanup(job: ImageCleanupJob): Promise<boolean> {
  // A durable server job allows retrying if the network fails after the item was deleted.
  const results = await Promise.allSettled(job.fotos.map(removeImage));
  if (results.some(result => result.status === 'rejected')) return false;
  try { await rpc('complete_inventory_image_cleanup', { p_elemento_id: job.id }); return true; }
  catch { return false; }
}
export async function permanentlyDeleteArchivedItem(id: string): Promise<boolean> {
  const job = await rpc<ImageCleanupJob>('delete_archived_inventory_item', { p_elemento_id: id });
  return finishImageCleanup(job);
}
