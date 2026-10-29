import { rpc } from './repository';

export const AUTO_CODES_ACTIVATION = 'Falta activar los códigos automáticos en Supabase. Ejecute 20261029000100_automatic_location_category_codes.sql y vuelva a guardar.';

export async function automaticCodeRpc<T>(name: string, values: Record<string, unknown>): Promise<T> {
  try { return await rpc<T>(name, values); }
  catch (cause) {
    if (['42883', 'PGRST202'].includes((cause as { code?: string }).code || '')) throw new Error(AUTO_CODES_ACTIVATION, { cause });
    throw cause;
  }
}

/** A lost response keeps its request ID; an acknowledged creation starts a new intent. */
export class AutomaticCodeRequests {
  private requests = new Map<string, { id: string; task?: Promise<unknown> }>();
  constructor(private newId: () => string = () => crypto.randomUUID()) {}
  async run<T>(kind: string, payload: Record<string, unknown>, save: (id: string) => Promise<T>): Promise<T> {
    const key = JSON.stringify([kind, payload]);
    const request = this.requests.get(key) || { id: this.newId(), task: undefined };
    if (request.task) return request.task as Promise<T>;
    this.requests.set(key, request);
    request.task = (async () => {
      const result = await save(request.id);
      this.requests.delete(key);
      return result;
    })();
    try { return await request.task as T; }
    finally { request.task = undefined; }
  }
}
