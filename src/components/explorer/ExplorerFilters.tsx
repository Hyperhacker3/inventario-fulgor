import { Select } from '../ui/Select';
import { CategoryFilter } from './CategoryFilter';
import { ALL_LOCATIONS, NO_LOCATION, locationChoices, type InventoryFilters, type StockFilter } from '../../domain/explorer';
import type { Almacen, Estanteria, NivelEstanteria, Caja } from '../../types';

interface Props {
  visible: boolean;
  filters: InventoryFilters;
  warehouses: Almacen[]; racks: Estanteria[]; levels: NivelEstanteria[]; boxes: Caja[];
  categories: string[]; categoryLabel: (id: string) => string;
  onCategories: (categories: string[]) => void;
  onStock: (value: StockFilter) => void;
  onWarehouse: (id: string) => void;
  onRack: (id: string) => void;
  onLevel: (id: string) => void;
  onBox: (id: string) => void;
  onClear: () => void;
}
export function ExplorerFilters({ visible, filters, warehouses, racks, levels, boxes, categories, categoryLabel,
  onCategories, onStock, onWarehouse, onRack, onLevel, onBox, onClear }: Props) {
  const locations = locationChoices(racks, boxes, filters.warehouseId, filters.rackId, levels, filters.levelId);
  const warehouseNames = new Map(warehouses.map(warehouse => [warehouse.id, warehouse.nombre]));
  const rackNames = new Map(racks.map(rack => [rack.id, `${warehouseNames.get(rack.almacenId || '') || 'Sin almacén'} > ${rack.nombre || rack.codigo}`]));
  const levelNames = new Map(levels.map(level => [level.id, `Nivel ${level.nombre || level.codigo}`]));
  return <aside id="inventory-filters" data-expanded={visible} className="filter-panel bg-white border rounded-xl shadow-xs w-full lg:w-64 shrink-0">
    <div className="filter-panel-inner"><div className="p-4 sm:p-5 space-y-5">
      <div className="flex justify-between items-center border-b pb-2"><h3 className="font-bold">Filtros</h3>
        <button id="btn-clear-filters" type="button" onClick={onClear} className="text-[#3e4e9e] text-xs font-semibold">Limpiar</button></div>
      <CategoryFilter options={categories} selected={filters.categories} label={categoryLabel} onChange={onCategories} />
      <fieldset><legend className="text-xs font-bold text-[#454651] uppercase mb-2">Estado de stock</legend>
        <div className="flex flex-wrap gap-1.5">
          {(['todos', 'disponible', 'bajo', 'agotado'] as StockFilter[]).map(value =>
            <button key={value} type="button" onClick={() => onStock(value)}
              className={`min-h-10 px-2.5 py-1 rounded-full text-xs capitalize ${filters.stock === value ? 'bg-[#3e4e9e] text-white' : 'bg-[#f8fafc] border'}`}>{value}</button>)}
        </div>
      </fieldset>
      <label className="block text-xs font-bold text-[#454651] uppercase">Almacén
        <Select id="inventory-warehouse-filter" value={filters.warehouseId} onChange={event => onWarehouse(event.target.value)} className="block w-full mt-2 p-2 border rounded-lg bg-white">
          <option value={ALL_LOCATIONS}>Todos los almacenes</option>
          {warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.nombre}</option>)}
        </Select>
      </label>
      <label className="block text-xs font-bold text-[#454651] uppercase">Estantería
        <Select id="inventory-rack-filter" value={filters.rackId} onChange={event => onRack(event.target.value)} className="block w-full mt-2 p-2 border rounded-lg bg-white">
          <option value={ALL_LOCATIONS}>Todas las estanterías</option>
          <option value={NO_LOCATION}>Sin estantería</option>
          {locations.racks.map(rack => <option key={rack.id} value={rack.id}>{filters.warehouseId === ALL_LOCATIONS ? rackNames.get(rack.id) : rack.nombre || rack.codigo}</option>)}
        </Select>
      </label>
      <label className="block text-xs font-bold text-[#454651] uppercase">Nivel de estantería
        <Select id="inventory-level-filter" value={filters.levelId} onChange={event => onLevel(event.target.value)} className="block w-full mt-2 p-2 border rounded-lg bg-white">
          <option value={ALL_LOCATIONS}>Todos los niveles</option>
          <option value={NO_LOCATION}>Sin nivel asignado</option>
          {locations.levels.map(level => <option key={level.id} value={level.id}>{filters.rackId === ALL_LOCATIONS ? `${rackNames.get(level.estanteriaId)} > ` : ''}{level.codigo} · {level.nombre}</option>)}
        </Select>
      </label>
      <label className="block text-xs font-bold text-[#454651] uppercase">Caja
        <Select id="inventory-box-filter" value={filters.boxId} onChange={event => onBox(event.target.value)} className="block w-full mt-2 p-2 border rounded-lg bg-white">
          <option value={ALL_LOCATIONS}>Todas las cajas</option>
          <option value={NO_LOCATION}>Sin caja</option>
          {locations.boxes.map(box => <option key={box.id} value={box.id}>{filters.rackId === ALL_LOCATIONS ? `${rackNames.get(box.estanteriaId || '') || 'Sin estantería'} > ${levelNames.get(box.nivelId || '') || 'Sin nivel'} > ${box.codigoCaja}` : filters.levelId === ALL_LOCATIONS ? `${levelNames.get(box.nivelId || '') || 'Sin nivel'} > ${box.codigoCaja}` : box.codigoCaja}</option>)}
        </Select>
      </label>
    </div></div>
  </aside>;
}
