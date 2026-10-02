import { requireSupabase } from '../lib/supabase';
import { squareCanvas } from './squareImage';
import { uploadItemImage } from './itemImageUpload';
import { imagePaths } from './imagePaths';

const MAX_BYTES = 8 * 1024 * 1024;
const cache = new Map<string, { url: string; expires: number }>();
export function clearImageCache() { cache.clear(); }
export function isStoredImage(value: string) { return value.startsWith('storage://'); }
export function isOptimizedImage(value: string) { return isStoredImage(value) && value.endsWith('/full.jpg'); }
export async function removeImage(value: string): Promise<void> {
  if (!isStoredImage(value)) return;
  const paths = imagePaths(value.slice('storage://'.length));
  const { error } = await requireSupabase().storage.from('item-images').remove(paths);
  if (error) throw error;
  paths.forEach(path => cache.delete(path));
}

export async function resolveImage(value: string): Promise<string> {
  if (!isStoredImage(value)) return value;
  const path = value.slice('storage://'.length);
  const cached = cache.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;
  const { data, error } = await requireSupabase().storage.from('item-images').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    throw error || new Error('No se pudo abrir la foto.');
  }
  cache.set(path, { url: data.signedUrl, expires: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

export async function saveImage(value: string): Promise<string> {
  if (!value || isOptimizedImage(value)) return value;
  if (isStoredImage(value)) value = await resolveImage(value);
  if (!/^(data:image\/|blob:|https?:\/\/)/i.test(value)) throw new Error('Suba un archivo de imagen o use una URL válida.');
  const db = requireSupabase();
  let response: Response;
  try { response = await fetch(value); }
  catch { throw new Error('No se pudo leer la foto. Si es una URL externa, descargue la imagen y use Subir archivo.'); }
  if (!response.ok) throw new Error('No se pudo descargar la foto. Use Subir archivo.');
  const source = await response.blob();
  if (!source.type.startsWith('image/') || source.size > MAX_BYTES) throw new Error('La imagen debe pesar menos de 8 MB.');
  const bitmap = await createImageBitmap(source);
  try {
    const canvas = squareCanvas(bitmap, bitmap.width, bitmap.height);
    const encode = (image: HTMLCanvasElement, quality: number) => new Promise<Blob>((resolve, reject) => image.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen.')), 'image/jpeg', quality));
    const jpeg = await encode(canvas, 0.78);
    return await uploadItemImage(db, jpeg);
  } finally { bitmap.close(); }
}
