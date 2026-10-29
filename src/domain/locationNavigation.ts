import { emptyInventoryFilters, NO_LOCATION, type InventoryFilters } from './explorer';
import type { Almacen, Caja, Elemento, Estanteria, LocationKind, NivelEstanteria } from '../types';

import { boxLabel } from './itemLocation';
export { boxLabel } from './itemLocation';

export interface LocationBreadcrumb { kind: LocationKind; label: string; filters: InventoryFilters }

/** Use IDs and the complete ancestry, never a displayed name or code as a filter. */
export function locationBreadcrumbs(item: Elemento, warehouses: Almacen[], racks: Estanteria[], levels: NivelEstanteria[], boxes: Caja[]): LocationBreadcrumb[] {
  const box = boxes.find(row => row.id === item.cajaId);
  const level = levels.find(row => row.id === (box?.nivelId || item.nivelId));
  const rack = racks.find(row => row.id === (level?.estanteriaId || box?.estanteriaId || item.estanteriaId));
  const warehouse = warehouses.find(row => row.id === (rack?.almacenId || item.almacenId));
  const filters = { ...emptyInventoryFilters(), warehouseId: warehouse?.id || item.almacenId || NO_LOCATION };
  const result: LocationBreadcrumb[] = [];
  if (warehouse) result.push({ kind: 'almacen', label: warehouse.nombre || warehouse.codigo, filters: { ...filters } });
  filters.rackId = rack?.id || item.estanteriaId || NO_LOCATION;
  if (rack) result.push({ kind: 'estanteria', label: rack.nombre || rack.codigo, filters: { ...filters } });
  filters.levelId = level?.id || item.nivelId || NO_LOCATION;
  if (level) result.push({ kind: 'nivel', label: `Nivel ${level.nombre || level.codigo}`, filters: { ...filters } });
  filters.boxId = box?.id || item.cajaId || NO_LOCATION;
  if (box) result.push({ kind: 'caja', label: boxLabel(box), filters: { ...filters } });
  return result;
}
