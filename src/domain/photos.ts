import type { Elemento } from '../types';

export function uniquePhotos(values: unknown): string[] {
  return Array.isArray(values) ? [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map(value => value.trim()))] : [];
}
export function itemPhotos(item: Pick<Elemento, 'fotoUrl' | 'fotosAdicionales'>): string[] {
  return uniquePhotos([item.fotoUrl, ...(item.fotosAdicionales || [])]);
}

// Uploads are sequential to avoid processing every image at once on a phone.
export async function saveGallery<T>(input: Pick<Elemento, 'fotoUrl' | 'fotosAdicionales'>,
  existing: Pick<Elemento, 'fotoUrl' | 'fotosAdicionales'>,
  operations: { save: (value: string) => Promise<string>; remove: (value: string) => Promise<void> },
  commit: (gallery: { main: string; additional: string[] }) => Promise<T>): Promise<T> {
  const oldPhotos = new Set(itemPhotos(existing));
  const uploaded: string[] = [];
  const saved: string[] = [];
  let committing = false;
  try {
    for (const value of itemPhotos(input)) {
      const photo = await operations.save(value);
      saved.push(photo);
      if (photo !== value && !oldPhotos.has(photo)) uploaded.push(photo);
    }
    committing = true;
    const result = await commit({ main: saved[0] || '', additional: saved.slice(1) });
    const retained = new Set(saved);
    await Promise.allSettled([...oldPhotos].filter(photo => !retained.has(photo)).map(operations.remove));
    return result;
  } catch (error) {
    // A lost database response may still have committed. Keep uploaded files in
    // that case so a saved product never points at photos we just deleted.
    if (!committing) await Promise.allSettled(uploaded.map(operations.remove));
    throw error;
  }
}
