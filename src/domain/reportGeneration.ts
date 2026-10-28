import type { InventoryReport, ReportSaveJob } from './inventoryReport';

/** Keep the original request and snapshot until a save is acknowledged. */
export async function generateSavedReport(holder: { current: ReportSaveJob | null }, ids: string[],
  prepare: () => Promise<InventoryReport>, save: (id: string, report: InventoryReport) => Promise<InventoryReport>,
  ready: () => Promise<void>, requestId: () => string = () => crypto.randomUUID()): Promise<InventoryReport> {
  const existing = holder.current, selected = new Set(ids);
  const same = existing && existing.ids.length === selected.size && existing.ids.every(id => selected.has(id));
  if (existing?.task) {
    if (same) return existing.task;
    throw new Error('Espere a que termine el informe que se está guardando.');
  }
  const job: ReportSaveJob = same ? existing : { ids: [...selected], requestId: requestId() };
  holder.current = job;
  job.task = (async () => {
    await ready();
    if (!job.report) job.report = await prepare();
    const saved = await save(job.requestId, job.report);
    holder.current = null;
    return saved;
  })();
  try { return await job.task; }
  finally { job.task = undefined; }
}
