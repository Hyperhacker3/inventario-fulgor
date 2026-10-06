import type { Caja, Elemento, Estanteria } from '../types';

export type StockFilter = 'todos' | 'disponible' | 'bajo' | 'agotado';
export const ALL_LOCATIONS = 'ALL';
export const NO_LOCATION = '__NONE__';
export interface InventoryFilters {
  categories: string[];
  stock: StockFilter;
  warehouseId: string;
  rackId: string;
  boxId: string;
}
export const emptyInventoryFilters = (): InventoryFilters => ({
  categories: [], stock: 'todos', warehouseId: ALL_LOCATIONS, rackId: ALL_LOCATIONS, boxId: ALL_LOCATIONS,
});

export function changeWarehouse(filters: InventoryFilters, warehouseId: string): InventoryFilters {
  return { ...filters, warehouseId, rackId: ALL_LOCATIONS, boxId: ALL_LOCATIONS };
}
export function changeRack(filters: InventoryFilters, rackId: string): InventoryFilters {
  return { ...filters, rackId, boxId: ALL_LOCATIONS };
}
export function locationChoices(racks: Estanteria[], boxes: Caja[], warehouseId: string, rackId: string) {
  const visibleRacks = racks.filter(rack => warehouseId === ALL_LOCATIONS || rack.almacenId === warehouseId);
  const rackIds = new Set(visibleRacks.map(rack => rack.id));
  const visibleBoxes = boxes.filter(box => {
    if (rackId === NO_LOCATION) return false;
    if (rackId !== ALL_LOCATIONS) return box.estanteriaId === rackId && rackIds.has(rackId);
    return warehouseId === ALL_LOCATIONS || (!!box.estanteriaId && rackIds.has(box.estanteriaId));
  });
  return { racks: visibleRacks, boxes: visibleBoxes };
}
const matchesLocation = (id: string | null, filter: string) =>
  filter === ALL_LOCATIONS || (filter === NO_LOCATION ? !id : id === filter);

export function filterInventory(items: Elemento[], filters: InventoryFilters, search: string, location: (item: Elemento) => string) {
  const query = search.toLocaleLowerCase().trim();
  const categories = new Set(filters.categories);
  return items.filter(item => {
    if (categories.size && !categories.has(item.categoria)) return false;
    if (!matchesLocation(item.almacenId, filters.warehouseId) || !matchesLocation(item.estanteriaId, filters.rackId)
      || !matchesLocation(item.cajaId, filters.boxId)) return false;
    if (filters.stock === 'disponible' && item.cantidad <= 0) return false;
    if (filters.stock === 'bajo' && (item.cantidad > item.stockMinimo || item.cantidad <= 0)) return false;
    if (filters.stock === 'agotado' && item.cantidad > 0) return false;
    return !query || [item.codigo, item.nombre, item.descripcion, location(item)].some(value => value.toLocaleLowerCase().includes(query));
  });
}
