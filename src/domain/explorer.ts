import type { Caja, Elemento, Estanteria, NivelEstanteria } from '../types';

export type StockFilter = 'todos' | 'disponible' | 'bajo' | 'agotado';
export const ALL_LOCATIONS = 'ALL';
export const NO_LOCATION = '__NONE__';
const activityTime = (item: Elemento) => Date.parse(item.updatedAt) || Date.parse(item.createdAt) || 0;
/** Sort a copy so refreshed items and realtime edits move before older activity. */
export function orderInventoryByActivity(items: Elemento[]) {
  return [...items].sort((a, b) => activityTime(b) - activityTime(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
export interface InventoryFilters {
  categories: string[];
  stock: StockFilter;
  warehouseId: string;
  rackId: string;
  levelId: string;
  boxId: string;
}
export const emptyInventoryFilters = (): InventoryFilters => ({
  categories: [], stock: 'todos', warehouseId: ALL_LOCATIONS, rackId: ALL_LOCATIONS, levelId: ALL_LOCATIONS, boxId: ALL_LOCATIONS,
});

export function changeWarehouse(filters: InventoryFilters, warehouseId: string): InventoryFilters {
  return { ...filters, warehouseId, rackId: ALL_LOCATIONS, levelId: ALL_LOCATIONS, boxId: ALL_LOCATIONS };
}
export function changeRack(filters: InventoryFilters, rackId: string): InventoryFilters {
  return { ...filters, rackId, levelId: ALL_LOCATIONS, boxId: ALL_LOCATIONS };
}
export function changeLevel(filters: InventoryFilters, levelId: string): InventoryFilters {
  return { ...filters, levelId, boxId: ALL_LOCATIONS };
}
export function locationChoices(racks: Estanteria[], boxes: Caja[], warehouseId: string, rackId: string, levels: NivelEstanteria[] = [], levelId = ALL_LOCATIONS) {
  const visibleRacks = racks.filter(rack => warehouseId === ALL_LOCATIONS || rack.almacenId === warehouseId);
  const rackIds = new Set(visibleRacks.map(rack => rack.id));
  const visibleLevels = levels.filter(level => rackIds.has(level.estanteriaId) && (rackId === ALL_LOCATIONS || level.estanteriaId === rackId));
  const levelIds = new Set(visibleLevels.map(level => level.id));
  const visibleBoxes = boxes.filter(box => {
    if (levelId === NO_LOCATION && box.nivelId) return false;
    if (levelId !== ALL_LOCATIONS && levelId !== NO_LOCATION && (box.nivelId !== levelId || !levelIds.has(levelId))) return false;
    if (rackId === NO_LOCATION) return false;
    if (rackId !== ALL_LOCATIONS) return box.estanteriaId === rackId && rackIds.has(rackId);
    return warehouseId === ALL_LOCATIONS || (!!box.estanteriaId && rackIds.has(box.estanteriaId));
  });
  return { racks: visibleRacks, levels: visibleLevels, boxes: visibleBoxes };
}
const matchesLocation = (id: string | null | undefined, filter: string) =>
  filter === ALL_LOCATIONS || (filter === NO_LOCATION ? !id : id === filter);

export function filterInventory(items: Elemento[], filters: InventoryFilters, search: string, location: (item: Elemento) => string) {
  const query = search.toLocaleLowerCase().trim();
  const categories = new Set(filters.categories);
  return items.filter(item => {
    if (categories.size && !categories.has(item.categoria)) return false;
    if (!matchesLocation(item.almacenId, filters.warehouseId) || !matchesLocation(item.estanteriaId, filters.rackId)
      || !matchesLocation(item.nivelId, filters.levelId) || !matchesLocation(item.cajaId, filters.boxId)) return false;
    if (filters.stock === 'disponible' && item.cantidad <= 0) return false;
    if (filters.stock === 'bajo' && (item.cantidad > item.stockMinimo || item.cantidad <= 0)) return false;
    if (filters.stock === 'agotado' && item.cantidad > 0) return false;
    return !query || [item.codigo, item.nombre, item.marca || '', item.descripcion, location(item)].some(value => value.toLocaleLowerCase().includes(query));
  });
}
