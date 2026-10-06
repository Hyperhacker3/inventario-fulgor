import { ScreenTransition } from './ui/Motion';
import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ProjectsView } from './ProjectsView';
import { CatalogEditor } from './administration/CatalogEditor';
import { LocationsManager } from './administration/LocationsManager';
import { ArchivedItems } from './administration/ArchivedItems';
import { AdministrationNavigation, type AdministrationTab } from './administration/AdministrationNavigation';

export function DataAdministrationView({ initialTab = 'codes' }: { initialTab?: AdministrationTab }) {
  const { catalogReady, catalogLoading, catalogError, refreshCatalog } = useInventory();
  const [tab, setTab] = useState<AdministrationTab>(initialTab);
  return <div className="p-4 md:p-8 w-full max-w-6xl mx-auto space-y-6">
    <div><h2 className="text-2xl md:text-3xl font-bold">Administración de datos</h2><p className="mt-2 text-slate-600">Códigos, categorías, ubicaciones, proyectos y elementos archivados.</p>
      <button className="text-sm text-[#253685] underline mt-2" onClick={() => { void refreshCatalog(); }}>Actualizar códigos y categorías</button></div>
    <AdministrationNavigation value={tab} onChange={setTab} />
    <ScreenTransition screen={tab}><div id="data-tab-panel" role="tabpanel" aria-label="Datos de la sección seleccionada">
      {(tab === 'codes' || tab === 'categories') && (!catalogReady ? <div className="border bg-white rounded-2xl p-5 space-y-3">
        <p role={catalogError ? 'alert' : 'status'}>{catalogLoading ? 'Cargando datos…' : 'No se pudieron cargar los códigos y categorías. Compruebe la conexión y que haya ejecutado la migración de administración de datos en Supabase.'}</p>
        <button onClick={() => { void refreshCatalog(); }} className="text-[#253685] underline">Comprobar de nuevo</button>
      </div> : <CatalogEditor key={tab} kind={tab === 'codes' ? 'prefijo' : 'categoria'} />)}
      {tab === 'racks' && <LocationsManager key={tab} kind="estanteria" />}
      {tab === 'boxes' && <LocationsManager key={tab} kind="caja" />}
      {tab === 'projects' && <ProjectsView embedded />}
      {tab === 'archived' && <ArchivedItems />}
    </div></ScreenTransition>
  </div>;
}
