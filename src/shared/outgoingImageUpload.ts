import type { SupabaseClient } from '@supabase/supabase-js';
import { photoExtension, webpNotAllowed } from './photoEncoding';

export async function uploadOutgoingImage(db: Pick<SupabaseClient, 'auth' | 'storage'>, image: Blob, requestId: string, jpegFallback?: () => Promise<Blob>): Promise<string> {
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new Error('Inicie sesión para subir fotos de la salida.');
  const path = `${data.user.id}/${requestId}/${crypto.randomUUID()}.${photoExtension(image)}`;
  const result = await db.storage.from('outgoing-images').upload(path, image, { contentType: image.type, upsert: false });
  if (result.error && image.type === 'image/webp' && jpegFallback && webpNotAllowed(result.error)) {
    return uploadOutgoingImage(db, await jpegFallback(), requestId);
  }
  if (result.error) throw new Error(`No se pudo subir la foto de la salida: ${result.error.message}`);
  return `outgoing://${path}`;
}
