import { requireSupabase } from '../lib/supabase';
import { evidenceCanvas } from './evidenceCanvas';
import { uploadOutgoingImage } from './outgoingImageUpload';

const bucket = 'outgoing-images';
const prefix = 'outgoing://';
const signed = new Map<string, { url: string; expires: number }>();
export function clearOutgoingImageCache() { signed.clear(); }
export async function saveOutgoingImage(source: string, requestId: string): Promise<string> {
  if (!/^(data:image\/|blob:)/.test(source)) throw new Error('Seleccione o tome una foto para la salida.');
  const response = await fetch(source);
  if (!response.ok) throw new Error('No se pudo leer la foto.');
  const blob = await response.blob();
  if (!blob.type.startsWith('image/') || blob.size > 8 * 1024 * 1024) throw new Error('Cada imagen debe pesar hasta 8 MB.');
  const image = await createImageBitmap(blob);
  try {
    const jpeg = blob.type === 'image/jpeg' && image.width <= 600 && image.height <= 600 ? blob
      : await new Promise<Blob>((resolve, reject) => evidenceCanvas(image, image.width, image.height).toBlob(value => value ? resolve(value) : reject(new Error('No se pudo comprimir la foto.')), 'image/jpeg', 0.78));
    return await uploadOutgoingImage(requireSupabase(), jpeg, requestId);
  } finally { image.close(); }
}
export async function removeOutgoingImage(source: string): Promise<void> {
  if (!source.startsWith(prefix)) return;
  const result = await requireSupabase().storage.from(bucket).remove([source.slice(prefix.length)]);
  if (result.error) throw new Error(result.error.message);
  signed.delete(source);
}
export async function resolveOutgoingImage(source: string): Promise<string> {
  if (!source.startsWith(prefix)) throw new Error('Referencia fotográfica inválida.');
  const previous = signed.get(source);
  if (previous && previous.expires > Date.now()) return previous.url;
  const result = await requireSupabase().storage.from(bucket).createSignedUrl(source.slice(prefix.length), 3600);
  if (result.error || !result.data?.signedUrl) throw new Error('No se pudo abrir la foto de la salida.');
  signed.set(source, { url: result.data.signedUrl, expires: Date.now() + 50 * 60 * 1000 });
  return result.data.signedUrl;
}
