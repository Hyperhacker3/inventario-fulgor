import { uniquePhotos } from './photos';

export class OutgoingPhotoSubmission<T> {
  private prepared = new Map<string, { signature: string; photos: string[] }>();
  has(requestId: string) { return this.prepared.has(requestId); }
  async submit(requestId: string, payload: unknown, sources: string[],
    operations: { save: (source: string, requestId: string) => Promise<string>; remove: (source: string) => Promise<void>; definitelyRejected?: (cause: unknown) => boolean },
    commit: (photos: string[]) => Promise<T>): Promise<T> {
    const originals = uniquePhotos(sources);
    const signature = JSON.stringify([payload, originals]);
    const previous = this.prepared.get(requestId);
    if (previous && previous.signature !== signature) throw new Error('La salida pendiente cambió. Reintente con los mismos materiales, datos y fotos.');
    const photos = previous?.photos || [];
    if (!previous) {
      try {
        for (const source of originals) photos.push(await operations.save(source, requestId));
      } catch (cause) {
        await Promise.allSettled(photos.map(operations.remove));
        throw cause;
      }
      this.prepared.set(requestId, { signature, photos });
    }
    // An uncertain response can still mean the transaction committed. Reuse the
    // exact references on retry; only a confirmed first rollback allows cleanup.
    try {
      const result = await commit(photos);
      this.prepared.delete(requestId);
      return result;
    } catch (cause) {
      if (!previous && operations.definitelyRejected?.(cause)) {
        this.prepared.delete(requestId);
        await Promise.allSettled(photos.map(operations.remove));
      }
      throw cause;
    }
  }
}
