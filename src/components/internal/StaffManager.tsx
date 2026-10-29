import { useRef, useState, type FormEvent } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useStaff } from '../../state/useInternalQueries';
import type { StaffInput, StaffMember } from '../../domain/internalDispatch';
import { errorMessage } from '../../shared/errors';
import { FormDialog } from '../ui/FormDialog';
import { Presence } from '../ui/Motion';
import { SearchInput } from '../ui/SearchInput';

export function StaffManager() {
  const inventory = useInventory(), query = useStaff();
  const [target, setTarget] = useState<StaffInput | null>(null), [search, setSearch] = useState('');
  const pendingJob = Object.entries(inventory.internalJobs).find(([key]) => key.startsWith('staff:'))?.[1];
  const open = (person?: StaffMember) => setTarget(pendingJob ? pendingJob.payload as unknown as StaffInput : person || { id:null,nombre:'',cargo:'',activo:true,version:0 });
  return <section className="space-y-5">
    <p className="text-sm text-slate-600">Seleccione este personal al registrar salidas internas. Desactivar a un trabajador lo retira de las nuevas salidas y conserva su historial.</p>
    {query.isError && <div role="alert" className="space-y-2"><p>{errorMessage(query.error)}</p><button type="button" onClick={()=>{void query.refetch();}} className="rounded-xl px-4 py-2">Comprobar de nuevo</button></div>}
    {query.isPending && <p role="status">Cargando personal…</p>}
    <div className="flex flex-wrap gap-4 items-center">
      {inventory.user.role==='admin' && <button type="button" disabled={!query.data} onClick={()=>open()} className="rounded-xl px-4 py-3 font-semibold">{pendingJob?'Reintentar registro pendiente':'Agregar trabajador'}</button>}
      <SearchInput aria-label="Buscar personal" value={search} onChange={e=>setSearch(e.target.value)} onClear={()=>setSearch('')} placeholder="Buscar nombre o cargo" className="rounded-xl px-3 py-2" />
    </div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{query.data?.filter(row=>`${row.nombre} ${row.cargo}`.toLowerCase().includes(search.toLowerCase().trim())).map(row=><article key={row.id} className="min-w-0 rounded-2xl bg-white p-5 space-y-2 break-words">
      <h3 className="font-bold">{row.nombre}</h3><p>{row.cargo}</p><p className="text-xs text-slate-500">{row.activo?'Activo':'Inactivo'}</p>
      {inventory.user.role==='admin' && <button type="button" data-action="edit" onClick={()=>open(row)} className="rounded-xl px-3 py-2">Editar</button>}
    </article>)}</div>
    {query.data?.length===0 && <p>No hay trabajadores. Administración puede agregarlos aquí.</p>}
    <Presence open={!!target}>{target && <StaffForm key={target.id || 'new'} initial={target} frozen={!!pendingJob}
      save={inventory.saveStaff} onClose={()=>setTarget(null)} />}</Presence>
  </section>;
}

export function StaffForm({ initial, frozen, save, onClose }: { initial:StaffInput; frozen:boolean; save:(input:StaffInput)=>Promise<StaffMember>; onClose:()=>void }) {
  const [draft,setDraft]=useState(initial),[error,setError]=useState(''),[busy,setBusy]=useState(false),saving=useRef(false);
  const submit=async(event:FormEvent)=>{
    event.preventDefault();if(saving.current)return;saving.current=true;setBusy(true);setError('');
    try{await save(draft);onClose();}catch(cause){setError(errorMessage(cause));}finally{saving.current=false;setBusy(false);}
  };
  return <FormDialog title={initial.id?'Editar trabajador':'Agregar trabajador'} busy={busy} onClose={onClose}>
    <form onSubmit={submit} autoComplete="off" className="space-y-4">
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {frozen && <p className="text-sm">Reintente para confirmar la solicitud original.</p>}
      <fieldset disabled={busy||frozen} className="space-y-4">
        <label className="block text-sm">Nombre<input required maxLength={180} value={draft.nombre} onChange={e=>setDraft({...draft,nombre:e.target.value})} className="block w-full rounded-xl p-3 mt-1" /></label>
        <label className="block text-sm">Cargo<input required maxLength={180} value={draft.cargo} onChange={e=>setDraft({...draft,cargo:e.target.value})} className="block w-full rounded-xl p-3 mt-1" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.activo} onChange={e=>setDraft({...draft,activo:e.target.checked})} />Disponible para nuevas salidas</label>
      </fieldset>
      <div className="grid grid-cols-2 gap-4"><button type="button" disabled={busy} onClick={onClose} data-action="cancel" className="rounded-xl px-4 py-2">Cancelar</button><button disabled={busy} className="rounded-xl px-4 py-2">{busy?'Guardando…':frozen?'Reintentar':'Guardar'}</button></div>
    </form>
  </FormDialog>;
}
