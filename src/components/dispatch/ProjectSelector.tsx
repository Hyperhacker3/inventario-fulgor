import { Select } from '../ui/Select';
import { useRef, useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import type { Proyecto } from '../../types';
import type { ProjectInput } from '../../state/useProjectActions';

type Props = { value: string; onChange: (id: string) => void; disabled: boolean };
export function ProjectSelector(props: Props) {
  const { proyectos, user, addProyecto } = useInventory();
  return <ProjectSelectorFields {...props} projects={proyectos} canCreate={user.role === 'admin'} onCreate={addProyecto} />;
}

export function ProjectSelectorFields({ value, onChange, disabled, projects, canCreate, onCreate }: Props & {
  projects: Proyecto[]; canCreate: boolean; onCreate: (input: ProjectInput) => Promise<Proyecto>;
}) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const creating = useRef(false);
  const locationInput = useRef<HTMLInputElement>(null);
  const active = projects.filter(project => project.estado === 'ACTIVO');
  const selected = active.find(project => project.id === value);
  const match = active.find(project => project.nombre.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase());
  const create = async () => {
    if (creating.current || disabled || !canCreate) return;
    if (!name.trim()) { setError('Escriba el nombre del proyecto.'); return; }
    if (!match && !location.trim()) {
      setError('Escriba la ubicación del proyecto antes de crearlo.');
      locationInput.current?.focus();
      return;
    }
    creating.current = true;
    setBusy(true); setError('');
    try {
      const project = match || await onCreate({ nombre: name.trim(), cliente: '', ubicacion: location.trim(), estado: 'ACTIVO' });
      onChange(project.id); setName(project.nombre); setLocation('');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el proyecto.'); }
    finally { creating.current = false; setBusy(false); }
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
      onChange(event.target.value); setName(active.find(project => project.id === event.target.value)?.nombre || ''); setLocation(''); setError('');
    }} className="w-full border border-slate-300 rounded-lg p-3 text-sm">
      <option value="">{active.length ? 'Seleccione un proyecto' : 'No hay proyectos activos'}</option>
      {active.map(project => <option key={project.id} value={project.id}>{project.nombre}{project.cliente ? ` (${project.cliente})` : ''}</option>)}
    </Select>
    {selected && <p className="text-xs text-slate-600">Ubicación del proyecto: {selected.ubicacion || 'Sin ubicación registrada. Administración puede completarla en Proyectos.'}</p>}
    {name.trim() && !selected && (canCreate
      ? <div className="space-y-3">
        <label htmlFor="dispatch-project-location" className="block text-xs font-bold">UBICACIÓN DEL PROYECTO *
          <input ref={locationInput} id="dispatch-project-location" autoComplete="off" value={location} required maxLength={240}
            onChange={event => { setLocation(event.target.value); setError(''); }} placeholder="Ciudad y dirección de la obra"
            className="block w-full mt-1 rounded-lg p-3 text-sm" />
        </label>
        <button type="button" onClick={() => { void create(); }} className="text-sm font-semibold text-[#253685]">{busy ? 'Guardando…' : `Crear y seleccionar «${name.trim()}»`}</button>
      </div>
      : <p className="text-xs text-slate-600">Seleccione un proyecto existente o solicite a administración que lo cree.</p>)}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </fieldset>;
}
