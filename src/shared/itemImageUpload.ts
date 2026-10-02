import type { SupabaseClient } from '@supabase/supabase-js';

export async function uploadItemImage(db: Pick<SupabaseClient, 'auth' | 'storage'>, image: Blob): Promise<string> {
  const { data, error: sessionError } = await db.auth.getUser();
  if (sessionError || !data.user) throw new Error('Debe iniciar sesión para subir fotografías.');
  const path = `${data.user.id}/${crypto.randomUUID()}.jpg`;
  const { error } = await db.storage.from('item-images').upload(path, image, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(`No se pudo guardar la foto en Supabase: ${error.message}`);
  return `storage://${path}`;
}
