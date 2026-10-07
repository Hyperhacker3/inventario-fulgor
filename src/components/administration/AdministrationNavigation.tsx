import { StateIcon } from '../ui/StateIcon';
import { Select } from '../ui/Select';

const tabs = [
  { id: 'codes', label: 'Códigos', icon: 'tag', color: 'var(--ui-action)' }, { id: 'categories', label: 'Categorías', icon: 'category', color: 'var(--ui-nav-inventory)' },
  { id: 'warehouses', label: 'Almacenes', icon: 'warehouse', color: 'var(--ui-admin-warehouses)' },
  { id: 'racks', label: 'Estanterías', icon: 'shelves', color: 'var(--ui-admin-racks)' }, { id: 'levels', label: 'Niveles', icon: 'layers', color: 'var(--ui-admin-levels)' }, { id: 'boxes', label: 'Cajas', icon: 'inventory_2', color: 'var(--ui-nav-history)' },
  { id: 'projects', label: 'Proyectos', icon: 'folder_open', color: 'var(--ui-success)' }, { id: 'archived', label: 'Archivados', icon: 'archive', color: 'var(--ui-danger)' },
  { id: 'company', label: 'Empresa', icon: 'settings', color: 'var(--ui-nav-data)' },
] as const;
export type AdministrationTab = typeof tabs[number]['id'];
const icons = Object.fromEntries(tabs.map(tab => [tab.id, tab.icon]));
const colors = Object.fromEntries(tabs.map(tab => [tab.id, tab.color]));

export function AdministrationNavigation({ value, onChange }: { value: AdministrationTab; onChange: (tab: AdministrationTab) => void }) {
  return <>
    <div className="lg:hidden">
      <label htmlFor="data-section-select" className="block text-xs font-semibold text-slate-600 mb-2">Sección de administración</label>
      <Select id="data-section-select" aria-label="Sección de administración" aria-controls="data-tab-panel" value={value} optionIcons={icons} optionColors={colors} stateIcons
        onChange={event => onChange(event.target.value as AdministrationTab)} className="w-full bg-white border rounded-xl px-4 py-3 text-[#253685] font-semibold">
        {tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
      </Select>
    </div>
    <div role="tablist" aria-label="Datos del inventario" className="hidden lg:grid grid-cols-3 xl:grid-cols-9 gap-2">
      {tabs.map(tab => <button key={tab.id} type="button" role="tab" id={`data-tab-${tab.id}`} aria-controls="data-tab-panel" aria-selected={value === tab.id}
        onClick={() => onChange(tab.id)} className="ui-flat-choice flex min-w-0 gap-2 items-center justify-center rounded-xl px-2 py-3 text-sm">
        <span className="inline-flex items-center justify-center gap-2 min-w-0" style={{ color: tab.color }}>
          <StateIcon icon={tab.icon} filled={value === tab.id} className="text-lg shrink-0" /><span>{tab.label}</span>
        </span>
      </button>)}
    </div>
  </>;
}
