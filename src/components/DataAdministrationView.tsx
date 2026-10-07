import { ScreenTransition } from './ui/Motion';
import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ProjectsView } from './ProjectsView';
import { CatalogEditor } from './administration/CatalogEditor';
import { LocationsManager } from './administration/LocationsManager';
import { ArchivedItems } from './administration/ArchivedItems';
import { AdministrationNavigation, type AdministrationTab } from './administration/AdministrationNavigation';
import { CompanyProfileEditor } from './administration/CompanyProfileEditor';

export function DataAdministrationView({ initialTab = 'codes' }: { initialTab?: AdministrationTab }) {
  const { catalogReady, catalogLoading, catalogError, refreshCatalog } = useInventory();
  const [tab, setTab] = useState<AdministrationTab>(initialTab);
  return <div className="p-4 md:p-8 w-full max-w-6xl mx-auto space-y-6">
    <div><h2 className="text-2xl md:text-3xl font-bold">Administración de datos</h2><p className="mt-2 text-slate-600">Códigos, categorías, ubicaciones, proyectos, archivados y datos de empresa.</p></div>
    <AdministrationNavigation value={tab} onChange={setTab} />
    <ScreenTransition screen={tab}><div id="data-tab-panel" role="tabpanel" aria-label="Datos de la sección seleccionada">
      {(tab === 'codes' || tab === 'categories') && (!catalogReady ? <div className="border bg-white rounded-2xl p-5 space-y-3">
        <p role={catalogError ? 'alert' : 'status'}>{catalogLoading ? 'Cargando datos…' : 'No se pudieron cargar los códigos y categorías. Compruebe la conexión y que haya ejecutado la migración de administración de datos en Supabase.'}</p>
        <button onClick={() => { void refreshCatalog(); }} className="text-[#253685] underline">Comprobar de nuevo</button>
      </div> : <CatalogEditor key={tab} kind={tab === 'codes' ? 'prefijo' : 'categoria'} />)}
      {tab === 'racks' && <LocationsManager key={tab} kind="estanteria" />}
      {tab === 'warehouses' && <LocationsManager key={tab} kind="almacen" />}
      {tab === 'levels' && <LocationsManager key={tab} kind="nivel" />}
      {tab === 'boxes' && <LocationsManager key={tab} kind="caja" />}
      {tab === 'projects' && <ProjectsView embedded />}
      {tab === 'archived' && <ArchivedItems />}
      {tab === 'company' && <CompanyProfileEditor />}
    </div></ScreenTransition>
  </div>;
}
