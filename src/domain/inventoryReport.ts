import type { Almacen, Caja, CompanyProfile, Elemento, Estanteria, NivelEstanteria, PesoUnitario } from '../types';
import { byId, locationLabel } from './inventory';
import { roundCOP } from './money';
import { lineWeightKg, totalWeight } from './weight';
import { validQuantity } from './quantity';
import { mapCompany } from './company';

export interface ReportLocations { warehouses: Almacen[]; racks: Estanteria[]; levels: NivelEstanteria[]; boxes: Caja[] }
export interface ReportFilters { search: string; category: string; warehouse: string; rack: string; level: string; box: string; onlySelected: boolean; page: number }
export interface InventoryReportRow {
  id: string; code: string; name: string; brand: string; category: string; condition: string; location: string;
  quantity: number | null; unit: string; damaged: number; unitWeight: PesoUnitario | null;
  weightKg: number | null; unitValueCOP: number; valueCOP: number | null;
}
export interface InventoryReport {
  createdAt: string; generatedBy: string; company: CompanyProfile; rows: InventoryReportRow[];
  quantities: { unit: string; quantity: number }[]; pendingQuantity: number;
  weightKg: number; pendingWeight: number; valueCOP: number; pendingValue: number; zeroPrice: number;
}

export function selectReportItems(previous: readonly string[], ids: readonly string[], selected: boolean): string[] {
  const next = new Set(previous);
  ids.forEach(id => { if (selected) next.add(id); else next.delete(id); });
  return [...next];
}

/** A report is a copy of the declared full stock, independent of outgoing operations. */
export function buildInventoryReport(items: Elemento[], ids: readonly string[], locations: ReportLocations,
  company: CompanyProfile, generatedBy: string, now = new Date(), categoryLabel = (category: string) => category.replaceAll('_', ' ')): InventoryReport {
  const selected = [...new Set(ids)];
  if (!selected.length) throw new Error('Seleccione al menos un producto para generar el informe.');
  const index = byId(items.filter(item => !item.archived));
  if (selected.some(id => !index.has(id))) throw new Error('Hay productos eliminados, archivados o no disponibles. Actualice y revise la selección.');
  const warehouses = byId(locations.warehouses), racks = byId(locations.racks), levels = byId(locations.levels), boxes = byId(locations.boxes);
  const rows = selected.map(id => {
    const item = index.get(id)!;
    const quantity = item.stockPendiente ? null : item.cantidad;
    if (quantity !== null && (!validQuantity(quantity) || quantity < 0)) throw new Error(`Revise la cantidad de ${item.codigo}.`);
    return {
      id, code: item.codigo, name: item.nombre, brand: item.marca || '', category: categoryLabel(item.categoria), condition: item.estado || '',
      location: locationLabel(item, warehouses, racks, boxes, levels), quantity, unit: item.unidad.toUpperCase(),
      damaged: item.cantidadDanados || 0, unitWeight: item.pesoUnitario ? { ...item.pesoUnitario } : null,
      weightKg: quantity === null ? null : lineWeightKg(item.pesoUnitario, quantity),
      unitValueCOP: item.valorUnitario || 0, valueCOP: quantity === null ? null : roundCOP(quantity * (item.valorUnitario || 0)),
    };
  }).sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }) || a.id.localeCompare(b.id));
  const amounts = new Map<string, bigint>();
  rows.forEach(row => { if (row.quantity !== null) amounts.set(row.unit, (amounts.get(row.unit) || 0n) + BigInt(Math.round(row.quantity * 1000))); });
  const weight = totalWeight(rows.map(row => ({ pesoTotalKg: row.weightKg })));
  return {
    createdAt: now.toISOString(), generatedBy, company: { ...mapCompany(company) }, rows,
    quantities: [...amounts].sort(([a], [b]) => a.localeCompare(b)).map(([unit, quantity]) => ({ unit, quantity: Number(quantity) / 1000 })),
    pendingQuantity: rows.filter(row => row.quantity === null).length, weightKg: weight.total, pendingWeight: weight.pending,
    valueCOP: Number(rows.reduce((sum, row) => sum + BigInt(Math.round((row.valueCOP || 0) * 100)), 0n)) / 100,
    pendingValue: rows.filter(row => row.valueCOP === null).length, zeroPrice: rows.filter(row => row.unitValueCOP === 0).length,
  };
}

export const reportQuantity = (quantity: number) => quantity.toLocaleString('es-CO', { maximumFractionDigits: 3 });
export const reportQuantities = (report: Pick<InventoryReport, 'quantities'>) => report.quantities.map(row => `${reportQuantity(row.quantity)} ${row.unit}`).join(' · ') || 'Sin cantidades verificadas';
export const reportDate = (createdAt: string) => new Date(createdAt).toLocaleString('es-CO', {
  timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});

export interface ReportSaveJob {
  ids: string[]; requestId: string; report?: InventoryReport; task?: Promise<InventoryReport>;
}
export interface SavedReportSummary {
  id: string; created_at: string; generated_by: string; product_count: number;
  quantities: InventoryReport['quantities']; value_cop: number; pending_value: number;
}
export const matchesReportLocation = (id: string | null | undefined, filter: string) => !filter || (filter === 'unassigned' ? !id : id === filter);
