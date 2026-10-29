import { validateInternalAmounts, type InternalAmounts } from './internalDispatch';
import { isDatabaseRejection } from '../data/databaseErrors';

export interface InternalJob { id: string; payload: Record<string, unknown> }
export type InternalJobs = Record<string, InternalJob>;
const rejected = (cause: unknown): boolean => isDatabaseRejection(cause)
  || cause instanceof Error && ('code' in cause && ['PGRST202','PGRST205'].includes(String(cause.code)) || 'cause' in cause && rejected(cause.cause));

/** Freeze uncertain requests, including across reloads. Never start a second intent on a lost response. */
export class InternalRequests {
  private tasks = new Map<string, Promise<unknown>>();
  constructor(public jobs: InternalJobs = {}, private changed: (jobs: InternalJobs) => void = () => {}, private newId = () => crypto.randomUUID()) {}
  async run<T>(key: string, payload: Record<string, unknown>, save: (id: string) => Promise<T>): Promise<T> {
    const previous = this.jobs[key];
    if (previous && JSON.stringify(previous.payload) !== JSON.stringify(payload)) throw new Error('Hay una solicitud por confirmar. Reintente los datos originales antes de cambiarlos.');
    const task = this.tasks.get(key); if (task) return task as Promise<T>;
    const job = previous || { id: this.newId(), payload: structuredClone(payload) };
    this.jobs = { ...this.jobs, [key]: job }; this.changed(this.jobs);
    const clear = () => { const next = { ...this.jobs }; delete next[key]; this.jobs = next; this.changed(next); };
    const pending = Promise.resolve().then(async () => {
      try { const result = await save(job.id); clear(); return result; }
      catch (cause) { if (rejected(cause)) clear(); throw cause; }
      finally { this.tasks.delete(key); }
    });
    this.tasks.set(key, pending);
    return pending;
  }
}

export function loadInternalJobs(key: string): InternalJobs {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([name, job]) => {
      if (!/^(issue|return:.+|staff:.+)$/.test(name) || !job || typeof job.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(job.id)
        || !job.payload || typeof job.payload !== 'object' || Array.isArray(job.payload)) return false;
      const payload=job.payload;
      if(name.startsWith('staff:')) return typeof payload.nombre==='string' && typeof payload.cargo==='string' && typeof payload.activo==='boolean' && Number.isInteger(payload.version);
      if(name==='issue' && (typeof payload.personalId!=='string'||!payload.personalId)) return false;
      if(name.startsWith('return:') && payload.salidaId!==name.slice(7)) return false;
      try{if(!Array.isArray(payload.items))return false;validateInternalAmounts(payload.items as InternalAmounts[]);return true;}catch{return false;}
    }));
  } catch { return {}; }
}
