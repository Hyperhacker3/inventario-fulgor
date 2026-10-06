import type { CategoriaElemento } from '../../types';
import { useInventory } from '../../context/InventoryContext';

type StockFilter = 'todos' | 'disponible' | 'bajo' | 'agotado';
interface Props {
  visible: boolean;
  selectedCategories: Record<CategoriaElemento, boolean>;
  onCategory: (category: CategoriaElemento) => void;
  stock: StockFilter; onStock: (value: StockFilter) => void;
  warehouseId: string; onWarehouse: (id: string) => void;
  onClear: () => void;
}
export function ExplorerFilters({ visible, selectedCategories, onCategory, stock, onStock,
  warehouseId, onWarehouse, onClear }: Props) {
  const { almacenes, categoryOptions, categoryLabel } = useInventory();
  return <aside id="inventory-filters" className={`w-full lg:w-56 shrink-0 ${visible ? 'block ui-panel-enter' : 'hidden lg:block'}`}>
    <div className="bg-white border rounded-xl p-4 sm:p-5 shadow-xs space-y-5">
      <div className="flex justify-between items-center border-b pb-2"><h3 className="font-bold">Filtros</h3>
        <button id="btn-clear-filters" type="button" onClick={onClear} className="text-[#3e4e9e] text-xs font-semibold">Limpiar</button></div>
      <fieldset><legend className="text-xs font-bold text-[#454651] uppercase mb-2">Categoría</legend>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
          {categoryOptions.map(category => <label key={category} className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={selectedCategories[category] !== false} onChange={() => onCategory(category)} />
            {categoryLabel(category)}
          </label>)}
        </div>
      </fieldset>
      <fieldset><legend className="text-xs font-bold text-[#454651] uppercase mb-2">Estado de stock</legend>
        <div className="flex flex-wrap gap-1.5">
          {(['todos', 'disponible', 'bajo', 'agotado'] as StockFilter[]).map(value =>
            <button key={value} type="button" onClick={() => onStock(value)}
              className={`min-h-10 px-2.5 py-1 rounded-full text-xs capitalize ${stock === value ? 'bg-[#3e4e9e] text-white' : 'bg-[#f8fafc] border'}`}>{value}</button>)}
        </div>
      </fieldset>
      <label className="block text-xs font-bold text-[#454651] uppercase">Almacén
        <select value={warehouseId} onChange={event => onWarehouse(event.target.value)} className="block w-full mt-2 p-2 border rounded-lg bg-white">
          <option value="ALL">Todos los almacenes</option>
          {almacenes.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.nombre}</option>)}
        </select>
      </label>
    </div>
  </aside>;
}
