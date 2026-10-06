import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ProjectsView } from './ProjectsView';
import { CatalogEditor } from './administration/CatalogEditor';
import { LocationsManager } from './administration/LocationsManager';
import { ArchivedItems } from './administration/ArchivedItems';

const tabs = [
  { id: 'codes', label: 'Códigos', icon: 'tag' }, { id: 'categories', label: 'Categorías', icon: 'category' },
  { id: 'racks', label: 'Estanterías', icon: 'shelves' }, { id: 'boxes', label: 'Cajas', icon: 'inventory_2' },
  { id: 'projects', label: 'Proyectos', icon: 'folder_open' },
  { id: 'archived', label: 'Archivados', icon: 'archive' },
] as const;
type Tab = typeof tabs[number]['id'];
export function DataAdministrationView({ initialTab = 'codes' }: { initialTab?: Tab }) {
  const { catalogReady, catalogLoading, catalogError, refreshCatalog } = useInventory();
  const [tab, setTab] = useState<Tab>(initialTab);
  return <div className="p-4 md:p-8 w-full max-w-6xl mx-auto space-y-6">
    <div><h2 className="text-2xl md:text-3xl font-bold">Administración de datos</h2><p className="mt-2 text-slate-600">Códigos, categorías, ubicaciones, proyectos y elementos archivados.</p>
      <button className="text-sm text-[#253685] underline mt-2" onClick={() => { void refreshCatalog(); }}>Actualizar códigos y categorías</button></div>
    <div role="tablist" aria-label="Datos del inventario" className="flex flex-wrap gap-2">{tabs.map(item => <button key={item.id} role="tab" id={`data-tab-${item.id}`} aria-controls="data-tab-panel" aria-selected={tab === item.id} onClick={() => setTab(item.id)}
      className={`flex gap-2 items-center rounded-xl px-4 py-3 text-sm ${tab === item.id ? 'bg-[#253685] text-white' : 'bg-white border text-slate-600'}`}><span className="material-symbols-outlined text-lg" aria-hidden="true">{item.icon}</span>{item.label}</button>)}</div>
    <div key={tab} className="ui-panel-enter" id="data-tab-panel" role="tabpanel" aria-labelledby={`data-tab-${tab}`}>
      {(tab === 'codes' || tab === 'categories') && (!catalogReady ? <div className="border bg-white rounded-2xl p-5 space-y-3">
        <p role={catalogError ? 'alert' : 'status'}>{catalogLoading ? 'Cargando datos…' : 'No se pudieron cargar los códigos y categorías. Compruebe la conexión y que haya ejecutado la migración de administración de datos en Supabase.'}</p>
        <button onClick={() => { void refreshCatalog(); }} className="text-[#253685] underline">Comprobar de nuevo</button>
      </div> : <CatalogEditor key={tab} kind={tab === 'codes' ? 'prefijo' : 'categoria'} />)}
      {tab === 'racks' && <LocationsManager key={tab} kind="estanteria" />}
      {tab === 'boxes' && <LocationsManager key={tab} kind="caja" />}
      {tab === 'projects' && <ProjectsView embedded />}
      {tab === 'archived' && <ArchivedItems />}
    </div>
  </div>;
}
