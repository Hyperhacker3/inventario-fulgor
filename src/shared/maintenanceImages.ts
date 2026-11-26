import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupabase } from '../lib/supabase';
import { evidenceCanvas } from './evidenceCanvas';
import { encodePhoto, photoExtension, webpNotAllowed } from './photoEncoding';

// Private bucket: files live in <account>/<maintenance request>/ and are readable once linked to a record.
const bucket = 'maintenance-images';
const prefix = 'maintenance://';
const signed = new Map<string, { url: string; expires: number }>();

export async function uploadMaintenanceImage(db: Pick<SupabaseClient, 'auth' | 'storage'>, image: Blob, requestId: string, jpegFallback?: () => Promise<Blob>): Promise<string> {
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new Error('Inicie sesión para subir fotos del mantenimiento.');
  const path = `${data.user.id}/${requestId}/${crypto.randomUUID()}.${photoExtension(image)}`;
  const result = await db.storage.from(bucket).upload(path, image, { contentType: image.type, upsert: false });
  if (result.error && image.type === 'image/webp' && jpegFallback && webpNotAllowed(result.error)) return uploadMaintenanceImage(db, await jpegFallback(), requestId);
  if (result.error) throw new Error(`No se pudo subir la foto del mantenimiento: ${result.error.message}`);
  return `${prefix}${path}`;
}

/** Same processing as dispatch evidence: whole photo, up to 1200 px on its longest side, WebP with JPG fallback. */
export async function saveMaintenanceImage(source: string, requestId: string): Promise<string> {
  if (!/^(data:image\/|blob:)/.test(source)) throw new Error('Seleccione o tome una foto del mantenimiento.');
  const response = await fetch(source);
  if (!response.ok) throw new Error('No se pudo leer la foto.');
  const blob = await response.blob();
  if (!blob.type.startsWith('image/') || blob.size > 8 * 1024 * 1024) throw new Error('Cada imagen debe pesar hasta 8 MB.');
  const image = await createImageBitmap(blob);
  try {
    const canvas = evidenceCanvas(image, image.width, image.height);
    return await uploadMaintenanceImage(requireSupabase(), await encodePhoto(canvas), requestId, () => encodePhoto(canvas, 'image/jpeg'));
  } finally { image.close(); }
}
export async function removeMaintenanceImage(source: string): Promise<void> {
  if (!source.startsWith(prefix)) return;
  const result = await requireSupabase().storage.from(bucket).remove([source.slice(prefix.length)]);
  if (result.error) throw new Error(result.error.message);
  signed.delete(source);
}
export async function resolveMaintenanceImage(source: string): Promise<string> {
  if (!source.startsWith(prefix)) throw new Error('Referencia fotográfica inválida.');
  const previous = signed.get(source);
  if (previous && previous.expires > Date.now()) return previous.url;
  const result = await requireSupabase().storage.from(bucket).createSignedUrl(source.slice(prefix.length), 3600);
  if (result.error || !result.data?.signedUrl) throw new Error('No se pudo abrir la foto del mantenimiento.');
  signed.set(source, { url: result.data.signedUrl, expires: Date.now() + 50 * 60 * 1000 });
  return result.data.signedUrl;
}
