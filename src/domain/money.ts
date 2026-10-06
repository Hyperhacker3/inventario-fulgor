import type { Elemento } from '../types';

export const MAX_UNIT_VALUE_COP = 9_999_999_999.99;
const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', currencyDisplay: 'code', minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const formatCOP = (value: number) => currency.format(value);
export const roundCOP = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export function validateUnitValue(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > MAX_UNIT_VALUE_COP || Math.abs(value * 100 - Math.round(value * 100)) > 0.0001)
    throw new Error('El valor unitario en COP debe ser un número no negativo con hasta dos decimales.');
}
export function mapUnitValue(value: unknown): number {
  const amount = typeof value === 'number' || typeof value === 'string' ? Number(value) : 0;
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}
export interface LocationValues { total: number; damaged: number }
export const EMPTY_LOCATION_VALUES: Readonly<LocationValues> = { total: 0, damaged: 0 };
function itemValues(item: Elemento): LocationValues | null {
  if (item.archived || item.stockPendiente) return null;
  const price = item.valorUnitario || 0;
  return { total: roundCOP(item.cantidad * price),
    damaged: roundCOP(Math.min(item.cantidad, Math.max(0, item.cantidadDanados || 0)) * price) };
}
/** Each product contributes once to every assigned level, including stock without a rack or box. */
export function inventoryLocationValues(items: Elemento[]) {
  const warehouses = new Map<string, LocationValues>(), racks = new Map<string, LocationValues>(), boxes = new Map<string, LocationValues>();
  for (const item of items) {
    const value = itemValues(item);
    if (!value) continue;
    for (const [id, index] of [[item.almacenId, warehouses], [item.estanteriaId, racks], [item.cajaId, boxes]] as const) {
      if (!id) continue;
      const previous = index.get(id) || EMPTY_LOCATION_VALUES;
      index.set(id, { total: roundCOP(previous.total + value.total), damaged: roundCOP(previous.damaged + value.damaged) });
    }
  }
  return { warehouses, racks, boxes };
}
export function inventoryValues(items: Elemento[]) {
  let total = 0, damaged = 0;
  const warehouses = new Map<string, number>();
  for (const item of items) {
    const value = itemValues(item);
    if (!value) continue;
    total += value.total;
    damaged += value.damaged;
    const warehouse = item.almacenId || '';
    warehouses.set(warehouse, roundCOP((warehouses.get(warehouse) || 0) + value.total));
  }
  total = roundCOP(total); damaged = roundCOP(damaged);
  return { total, damaged, usable: roundCOP(total - damaged), damagedPercent: total ? damaged / total * 100 : 0, warehouses };
}
