import type { SupabaseClient } from '@supabase/supabase-js';
import { photoExtension, webpNotAllowed } from './photoEncoding';

export async function uploadItemImage(db: Pick<SupabaseClient, 'auth' | 'storage'>, image: Blob,
  jpegFallback?: () => Promise<Blob>): Promise<string> {
  const { data, error: sessionError } = await db.auth.getUser();
  if (sessionError || !data.user) throw new Error('Debe iniciar sesión para subir fotografías.');
  const extension = photoExtension(image);
  const path = `${data.user.id}/${crypto.randomUUID()}/full.${extension}`;
  const bucket = db.storage.from('item-images');
  const main = await bucket.upload(path, image, { contentType: image.type, upsert: false });
  if (main.error) {
    if (image.type === 'image/webp' && jpegFallback && webpNotAllowed(main.error)) {
      return uploadItemImage(db, await jpegFallback());
    }
    throw new Error(`No se pudo guardar la foto en Supabase: ${main.error.message}`);
  }
  return `storage://${path}`;
}
