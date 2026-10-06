import type { Almacen, Elemento } from '../types';
import { available } from './inventory';
import { normalizeUnit } from './catalogs';
import { roundQuantity } from './quantity';

export type StockStatus = 'Disponible' | 'Stock bajo' | 'Sin disponibilidad' | 'Pendiente de conteo';
export function stockStatus(item: Elemento): StockStatus {
  if (item.stockPendiente) return 'Pendiente de conteo';
  if (available(item) === 0) return 'Sin disponibilidad';
  if (item.stockMinimo > 0 && available(item) <= item.stockMinimo) return 'Stock bajo';
  return 'Disponible';
}
export function summarizeInventory(items: Elemento[], warehouses: Almacen[]) {
  const active = items.filter(item => !item.archived);
  const statuses: Record<StockStatus, number> = { Disponible: 0, 'Stock bajo': 0, 'Sin disponibilidad': 0, 'Pendiente de conteo': 0 };
  const categories = new Map<string, number>();
  const locations = new Map<string, number>();
  const units = new Map<string, { recorded: number; available: number; damaged: number }>();
  let damagedProducts = 0, withoutMinimum = 0, withoutRack = 0, withoutBox = 0;
  for (const item of active) {
    statuses[stockStatus(item)]++;
    categories.set(item.categoria, (categories.get(item.categoria) || 0) + 1);
    const warehouse = item.almacenId || '';
    locations.set(warehouse, (locations.get(warehouse) || 0) + 1);
    if ((item.cantidadDanados || 0) > 0) damagedProducts++;
    if (item.stockMinimo === 0) withoutMinimum++;
    if (!item.estanteriaId) withoutRack++;
    if (!item.cajaId) withoutBox++;
    if (item.stockPendiente) continue;
    const unit = normalizeUnit(item.unidad.trim());
    const balance = units.get(unit) || { recorded: 0, available: 0, damaged: 0 };
    balance.recorded += item.cantidad;
    balance.available += available(item);
    balance.damaged += item.cantidadDanados || 0;
    units.set(unit, balance);
  }
  const sorted = (map: Map<string, number>) => [...map].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const names = new Map(warehouses.map(warehouse => [warehouse.id, warehouse.nombre]));
  const rank: Record<StockStatus, number> = { 'Pendiente de conteo': 0, 'Sin disponibilidad': 1, 'Stock bajo': 2, Disponible: 3 };
  return {
    total: active.length, statuses, damagedProducts, withoutMinimum, withoutRack, withoutBox,
    categories: sorted(categories).map(([label, value]) => ({ id: label, label: label.replaceAll('_', ' '), value })),
    warehouses: sorted(locations).map(([id, value]) => ({ label: id ? names.get(id) || 'Almacén no identificado' : 'Sin almacén', value })),
    units: [...units].sort(([a], [b]) => a.localeCompare(b)).map(([unit, balance]) => ({ unit,
      recorded: roundQuantity(balance.recorded), available: roundQuantity(balance.available), damaged: roundQuantity(balance.damaged) })),
    alerts: active.filter(item => stockStatus(item) !== 'Disponible')
      .sort((a, b) => rank[stockStatus(a)] - rank[stockStatus(b)] || a.codigo.localeCompare(b.codigo)),
  };
}
