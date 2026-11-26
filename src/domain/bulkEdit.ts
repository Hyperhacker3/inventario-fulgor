import type { Almacen, Caja, Elemento, Estanteria, NivelEstanteria } from '../types';
import { normalizeItemCondition } from './itemCondition';
import { itemLocationDraft, type ItemLocationDraft } from './itemLocation';
import { validQuantity } from './quantity';
import { conditions } from './catalogs';
import { uppercaseName } from '../shared/uppercase';

/** Shared data that can be applied to several products at once. Omitted fields stay unchanged. */
export interface BulkItemChanges {
  categoria?: string;
  estado?: string;
  marca?: string;
  stockMinimo?: number;
  ubicacion?: ItemLocationDraft;
}
export type BulkField = keyof BulkItemChanges;
export const BULK_EDIT_LIMIT = 5000;
export const BULK_EDIT_ACTIVATION = 'Falta activar la edición en grupo en Supabase. Ejecute 20261126000100_bulk_item_edit.sql y vuelva a guardar.';

export function validateBulkChanges(ids: readonly string[], changes: BulkItemChanges) {
  if (!ids.length) throw new Error('Seleccione al menos un producto.');
  if (ids.length > BULK_EDIT_LIMIT) throw new Error(`Seleccione como máximo ${BULK_EDIT_LIMIT.toLocaleString('es-CO')} productos por edición.`);
  if (!Object.values(changes).some(value => value !== undefined)) throw new Error('Marque al menos un dato para cambiar.');
  if (changes.categoria !== undefined && !changes.categoria.trim()) throw new Error('Seleccione la categoría.');
  if (changes.estado !== undefined && !(conditions as readonly string[]).includes(normalizeItemCondition(changes.estado)))
    throw new Error('Seleccione un estado válido.');
  if (changes.marca !== undefined && changes.marca.trim().length > 100) throw new Error('La marca admite hasta 100 caracteres.');
  if (changes.stockMinimo !== undefined && (!validQuantity(changes.stockMinimo) || changes.stockMinimo < 0))
    throw new Error('Escriba un stock mínimo no negativo, con hasta tres decimales.');
  const location = changes.ubicacion;
  if (location && !location.warehouseId && (location.rackId || location.levelId || location.boxId)) throw new Error('Seleccione el almacén de la ubicación.');
  if (location && !location.rackId && (location.levelId || location.boxId)) throw new Error('Seleccione la estantería de la ubicación.');
}

/** Same hierarchy rules as the location trigger in Supabase, checked before sending. */
export function validateBulkLocation(location: ItemLocationDraft, warehouses: readonly Almacen[], racks: readonly Estanteria[],
  levels: readonly NivelEstanteria[], boxes: readonly Caja[]) {
  if (location.warehouseId && !warehouses.some(row => row.id === location.warehouseId)) throw new Error('Almacén no encontrado.');
  if (location.rackId && !racks.some(row => row.id === location.rackId && row.almacenId === location.warehouseId)) throw new Error('La estantería no pertenece al almacén.');
  if (location.levelId && !levels.some(row => row.id === location.levelId && row.estanteriaId === location.rackId)) throw new Error('El nivel no pertenece a la estantería.');
  if (location.boxId && !boxes.some(row => row.id === location.boxId && row.estanteriaId === location.rackId && (row.nivelId || '') === location.levelId))
    throw new Error('La caja no pertenece al nivel de la estantería.');
}

/** Supabase payload: only the chosen keys travel, so unchosen data cannot be overwritten. */
export function bulkChangesPayload(changes: BulkItemChanges): Record<string, unknown> {
  const location = changes.ubicacion;
  return {
    ...(changes.categoria !== undefined && { categoria: changes.categoria }),
    ...(changes.estado !== undefined && { estado: normalizeItemCondition(changes.estado) }),
    ...(changes.marca !== undefined && { marca: changes.marca.trim() }),
    ...(changes.stockMinimo !== undefined && { stock_minimo: changes.stockMinimo }),
    ...(location && { ubicacion: { almacen_id: location.warehouseId || null, estanteria_id: location.rackId || null,
      nivel_id: location.levelId || null, caja_id: location.boxId || null } }),
  };
}

/** Local application for the demo mode; the real inventory is changed only by Supabase. */
export function applyBulkChanges(item: Elemento, changes: BulkItemChanges, now: string): Elemento {
  const location = changes.ubicacion;
  return {
    ...item,
    ...(changes.categoria !== undefined && { categoria: changes.categoria }),
    ...(changes.estado !== undefined && { estado: normalizeItemCondition(changes.estado) }),
    ...(changes.marca !== undefined && { marca: uppercaseName(changes.marca.trim()) }),
    ...(changes.stockMinimo !== undefined && { stockMinimo: changes.stockMinimo }),
    ...(location && { almacenId: location.warehouseId || null, estanteriaId: location.rackId || null,
      nivelId: location.levelId || null, cajaId: location.boxId || null }),
    updatedAt: now,
  };
}

export function changeSelection(previous: readonly string[], ids: readonly string[], selected: boolean): string[] {
  const next = new Set(previous);
  ids.forEach(id => { if (selected) next.add(id); else next.delete(id); });
  return [...next];
}

/** The value shared by every selected product, or undefined when they differ. */
export function sharedValue<T>(items: readonly Elemento[], read: (item: Elemento) => T): T | undefined {
  if (!items.length) return undefined;
  const first = JSON.stringify(read(items[0]));
  return items.every(item => JSON.stringify(read(item)) === first) ? read(items[0]) : undefined;
}
export const sharedLocation = (items: readonly Elemento[]) => sharedValue(items, item => itemLocationDraft(item));

/** Reuses the request ID while the same edit is retried after an uncertain error. */
export class BulkEditRequests {
  private pending: { signature: string; id: string } | null = null;
  requestFor(ids: readonly string[], changes: BulkItemChanges, newId: () => string = () => crypto.randomUUID()) {
    const signature = JSON.stringify({ ids: [...new Set(ids)].sort(), changes: bulkChangesPayload(changes) });
    if (this.pending?.signature !== signature) this.pending = { signature, id: newId() };
    return this.pending.id;
  }
  confirm() { this.pending = null; }
}
