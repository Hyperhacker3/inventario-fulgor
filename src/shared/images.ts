import { isDemo, requireSupabase } from '../lib/supabase';

const MAX_BYTES = 8 * 1024 * 1024;
const cache = new Map<string, { url: string; expires: number }>();
export function clearImageCache() { cache.clear(); }
export function isStoredImage(value: string) { return value.startsWith('storage://'); }
export async function removeImage(value: string): Promise<void> {
  if (!isStoredImage(value)) return;
  const { error } = await requireSupabase().storage.from('item-images').remove([value.slice('storage://'.length)]);
  if (error) throw error;
}

export async function resolveImage(value: string): Promise<string> {
  if (!isStoredImage(value)) return value;
  const path = value.slice('storage://'.length);
  const cached = cache.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;
  const { data, error } = await requireSupabase().storage.from('item-images').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw error || new Error('No se pudo abrir la foto.');
  cache.set(path, { url: data.signedUrl, expires: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

export async function saveImage(value: string): Promise<string> {
  if (!value || !value.startsWith('data:')) return value;
  const source = await (await fetch(value)).blob();
  if (!source.type.startsWith('image/') || source.size > MAX_BYTES) throw new Error('La imagen debe pesar menos de 8 MB.');
  const bitmap = await createImageBitmap(source);
  try {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen.')), 'image/jpeg', 0.78));
    if (isDemo) return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(jpeg);
    });
    const db = requireSupabase();
    const { data: session, error: sessionError } = await db.auth.getUser();
    if (sessionError || !session.user) throw new Error('Debe iniciar sesión para subir fotografías.');
    const path = `${session.user.id}/${crypto.randomUUID()}.jpg`;
    const { error } = await db.storage.from('item-images').upload(path, jpeg, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    return `storage://${path}`;
  } finally { bitmap.close(); }
}
