import { useRef, useState, type FormEvent } from 'react';
import { useInventory } from '../context/InventoryContext';
import type { Proyecto } from '../types';
import type { ProjectInput } from '../state/useProjectActions';
import { FormDialog } from './ui/FormDialog';
import { Presence } from './ui/Motion';

const empty: ProjectInput = { nombre: '', cliente: '', ubicacion: '', estado: 'ACTIVO' };
type ProjectProps = Pick<ReturnType<typeof useInventory>, 'proyectos' | 'user' | 'addProyecto' | 'updateProyecto' | 'addExampleProjects' | 'syncStatus'> & {
  embedded?: boolean;
};
export function ProjectsView({ embedded = false }: { embedded?: boolean }) {
  const { proyectos, user, addProyecto, updateProyecto, addExampleProjects, syncStatus } = useInventory();
  return <ProjectsManager {...{ embedded, proyectos, user, addProyecto, updateProyecto, addExampleProjects, syncStatus }} />;
}

export function ProjectsManager({ embedded = false, proyectos, user, addProyecto, updateProyecto, addExampleProjects, syncStatus }: ProjectProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectInput>(empty);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const saving = useRef(false);
  const admin = user.role === 'admin';
  const close = () => { if (!saving.current) { setFormOpen(false); setEditing(null); setForm(empty); setError(''); } };
  const run = async (action: () => Promise<unknown>, success: string) => {
    if (saving.current || !admin) return;
    saving.current = true;
    setBusy(true); setError(''); setMessage('');
    try { await action(); setMessage(success); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); }
    finally { saving.current = false; setBusy(false); }
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!formOpen) return;
    void run(async () => {
      if (editing) await updateProyecto(editing, form); else await addProyecto(form);
      setFormOpen(false); setEditing(null); setForm(empty);
    }, 'Proyecto guardado en Supabase.');
  };
  const edit = (project: Proyecto) => { setEditing(project.id); setForm(project); setError(''); setMessage(''); setFormOpen(true); };
  return <div className={embedded ? 'space-y-6' : 'p-4 md:p-8 w-full max-w-6xl mx-auto space-y-6'}>
    <div><h2 className="text-3xl font-bold">Proyectos</h2><p className="text-slate-600 mt-2">Destinos para las salidas. Al quitar un proyecto, se conserva el historial y puede reactivarse.</p></div>
    {error && !formOpen && <p role="alert" className="text-red-700">{error}</p>}
    {message && !formOpen && <p role="status" className="text-green-700">{message}</p>}
    {admin && <button type="button" disabled={busy} onClick={() => { setEditing(null); setForm(empty); setError(''); setMessage(''); setFormOpen(true); }}
      className="min-h-11 rounded-lg bg-[#253685] text-white px-4 py-3 text-sm font-semibold disabled:opacity-50">Crear proyecto</button>}
    <Presence open={admin && formOpen}>{formOpen && <FormDialog title={editing ? 'Editar proyecto' : 'Crear proyecto'} busy={busy} onClose={close}>
      <form key={editing || 'new'} onSubmit={save} className="space-y-4">
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {message && <p role="status" className="text-green-700">{message}</p>}
        <fieldset disabled={busy} className="grid sm:grid-cols-3 gap-4">
          {(['nombre', 'cliente', 'ubicacion'] as const).map(field => <label key={field} className="text-sm space-y-1">
            <span className="block">{{ nombre: 'Nombre *', cliente: 'Cliente', ubicacion: 'Ubicación' }[field]}</span>
            <input required={field === 'nombre'} value={form[field]} onChange={event => setForm({ ...form, [field]: event.target.value })} className="border border-slate-300 rounded-lg p-3 w-full" />
          </label>)}
        </fieldset>
        <div className="flex flex-wrap gap-4 items-center">
          <button disabled={busy} className="bg-[#253685] text-white px-4 py-2 rounded-lg">{busy ? 'Guardando…' : 'Guardar proyecto'}</button>
          <button type="button" disabled={busy} onClick={close} className="border rounded-lg px-4 py-2">Cancelar</button>
          <button type="button" disabled={busy} className="text-[#253685] underline" onClick={() => { void run(addExampleProjects, 'Los dos proyectos de ejemplo están guardados en Supabase.'); }}>Añadir dos proyectos de ejemplo</button>
        </div>
      </form></FormDialog>}</Presence>
    {!proyectos.length && <p>{syncStatus === 'syncing' ? 'Cargando proyectos…' : 'No hay proyectos registrados. Añada uno para comenzar a registrar una salida.'}</p>}
    <div className="grid md:grid-cols-2 gap-4">{[...proyectos].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(project => <article key={project.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
      <div className="flex justify-between gap-3"><h3 className="font-bold break-words">{project.nombre}</h3><span className={`text-xs shrink-0 ${project.estado === 'ACTIVO' ? 'text-green-700' : 'text-slate-500'}`}>{project.estado === 'ACTIVO' ? 'Activo' : 'Finalizado'}</span></div>
      <p className="text-sm text-slate-600">Cliente: {project.cliente || 'Sin especificar'}<br />Ubicación: {project.ubicacion || 'Sin especificar'}</p>
      {admin && <div className="flex gap-4 text-sm"><button disabled={busy} onClick={() => edit(project)} className="text-[#253685]">Editar</button>
        <button disabled={busy} onClick={() => { void run(() => updateProyecto(project.id, { ...project, estado: project.estado === 'ACTIVO' ? 'FINALIZADO' : 'ACTIVO' }), project.estado === 'ACTIVO' ? 'Proyecto quitado de las salidas.' : 'Proyecto reactivado.'); }} className="text-[#253685]">{project.estado === 'ACTIVO' ? 'Quitar de salidas' : 'Reactivar'}</button></div>}
    </article>)}</div>
  </div>;
}
