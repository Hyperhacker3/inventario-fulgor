import type { Elemento } from '../types';

export interface ItemLocationDraft { warehouseId: string; rackId: string; boxId: string }
export const itemLocationDraft = (item?: Elemento | null): ItemLocationDraft => ({
  warehouseId: item?.almacenId || '', rackId: item?.estanteriaId || '', boxId: item?.cajaId || '',
});
export function changedItemLocation(draft: ItemLocationDraft, item: Elemento): Partial<Elemento> {
  const next = { almacenId: draft.warehouseId || null, estanteriaId: draft.rackId || null, cajaId: draft.boxId || null };
  return next.almacenId === item.almacenId && next.estanteriaId === item.estanteriaId && next.cajaId === item.cajaId ? {} : next;
}
export function itemLocationColumns(updates: Partial<Elemento>): Record<string, string | null> {
  return {
    ...(updates.almacenId !== undefined && { almacen_id: updates.almacenId }),
    ...(updates.estanteriaId !== undefined && { estanteria_id: updates.estanteriaId }),
    ...(updates.cajaId !== undefined && { caja_id: updates.cajaId }),
  };
}
