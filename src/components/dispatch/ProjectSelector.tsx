import { Select } from '../ui/Select';
import { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';

export function ProjectSelector({ value, onChange, disabled }: { value: string; onChange: (id: string) => void; disabled: boolean }) {
  const { proyectos, user, addProyecto, setActiveView } = useInventory();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = proyectos.filter(project => project.estado === 'ACTIVO');
  const selected = active.find(project => project.id === value);
  const match = active.find(project => project.nombre.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase());
  const create = async () => {
    setBusy(true); setError('');
    try {
      const project = match || await addProyecto({ nombre: name, cliente: '', ubicacion: '', estado: 'ACTIVO' });
      onChange(project.id); setName(project.nombre);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el proyecto.'); }
    finally { setBusy(false); }
  };
  return <fieldset disabled={disabled || busy} className="space-y-2">
    <label htmlFor="dispatch-project-name" className="block text-xs font-bold">PROYECTO / DESTINO *</label>
    <input autoComplete="off" autoCorrect="off" spellCheck={false} id="dispatch-project-name" value={name || selected?.nombre || ''} placeholder="Escriba el nombre de un proyecto" className="w-full border border-slate-300 rounded-lg p-3 text-sm"
      onChange={event => {
        const text = event.target.value; setName(text); setError('');
        onChange(active.find(project => project.nombre.trim().toLocaleLowerCase() === text.trim().toLocaleLowerCase())?.id || '');
      }} />
    <label htmlFor="select-dispatch-project" className="block text-xs text-slate-600">O elija un proyecto guardado</label>
    <Select id="select-dispatch-project" value={selected?.id || ''} onChange={event => {
      onChange(event.target.value); setName(active.find(project => project.id === event.target.value)?.nombre || ''); setError('');
    }} className="w-full border border-slate-300 rounded-lg p-3 text-sm">
      <option value="">{active.length ? 'Seleccione un proyecto' : 'No hay proyectos activos'}</option>
      {active.map(project => <option key={project.id} value={project.id}>{project.nombre}{project.cliente ? ` (${project.cliente})` : ''}</option>)}
    </Select>
    {selected?.ubicacion && <p className="text-xs text-slate-600">{selected.ubicacion}</p>}
    {name.trim() && !selected && (user.role === 'admin'
      ? <button type="button" onClick={() => { void create(); }} className="text-sm font-semibold text-[#253685]">{busy ? 'Guardando…' : `Crear y seleccionar «${name.trim()}»`}</button>
      : <p className="text-xs text-slate-600">Seleccione un proyecto existente o solicite a administración que lo cree.</p>)}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button type="button" onClick={() => setActiveView('projects')} className="block text-sm text-[#253685] underline">Administrar proyectos y datos</button>
  </fieldset>;
}
