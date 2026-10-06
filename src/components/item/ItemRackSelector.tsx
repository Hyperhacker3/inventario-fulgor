import { useEffect, useRef, useState } from 'react';
import type { Estanteria } from '../../types';
import { errorMessage } from '../../shared/errors';

interface Props {
  warehouseId: string; rackId: string; racks: Estanteria[];
  onRack: (id: string) => void;
  onCreate: (input: Omit<Estanteria, 'id'>) => Promise<Estanteria>;
  onBusyChange?: (busy: boolean) => void; onDraftChange?: (unfinished: boolean) => void;
}
export function ItemRackSelector({ warehouseId, rackId, racks, onRack, onCreate, onBusyChange, onDraftChange }: Props) {
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const saving = useRef(false);
  useEffect(() => () => onDraftChange?.(false), [onDraftChange]);
  const create = async () => {
    if (saving.current || !warehouseId) return;
    const codigo = code.trim().toUpperCase(), nombre = name.trim();
    if (!codigo || !nombre) { setError('Escriba el código y el nombre de la estantería.'); return; }
    saving.current = true; setBusy(true); onBusyChange?.(true); setError(''); setMessage('');
    try {
      const existing = racks.find(rack => rack.almacenId === warehouseId && rack.codigo.trim().toUpperCase() === codigo);
      if (existing && existing.nombre.trim().toLocaleLowerCase('es') !== nombre.toLocaleLowerCase('es'))
        throw new Error(`Ya existe la estantería ${existing.codigo}: ${existing.nombre}. Selecciónela de la lista o utilice otro código.`);
      const rack = existing || await onCreate({ almacenId: warehouseId, codigo, nombre, descripcion: '' });
      onRack(rack.id); setCreating(false); onDraftChange?.(false); setCode(''); setName('');
      setMessage(existing ? `Estantería ${rack.codigo} seleccionada.` : `Estantería ${rack.codigo} creada en Supabase y seleccionada.`);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { saving.current = false; setBusy(false); onBusyChange?.(false); }
  };
  return <div className="text-xs font-semibold text-[#454651] space-y-2">
    <label htmlFor="select-estanteria-form" className="block">Estantería</label>
    <select id="select-estanteria-form" value={creating ? '__NEW_RACK__' : rackId} disabled={!warehouseId || busy}
      onChange={event => { const draft = event.target.value === '__NEW_RACK__'; setCreating(draft); onDraftChange?.(draft); setError(''); setMessage(''); if (!draft) onRack(event.target.value); }}
      className="block w-full px-3 py-2 rounded-lg border bg-white">
      <option value="">Seleccione una estantería</option>
      <option value="__NEW_RACK__">+ Crear nueva estantería</option>
      {racks.map(rack => <option key={rack.id} value={rack.id}>{rack.codigo} - {rack.nombre}</option>)}
    </select>
    {creating && <div className="ui-panel-enter space-y-2">
      <label htmlFor="input-nueva-estanteria-codigo" className="block">Código de la nueva estantería</label>
      <input id="input-nueva-estanteria-codigo" maxLength={100} value={code} disabled={busy} onChange={event => { setCode(event.target.value); setError(''); }}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void create(); } }}
        placeholder="Ej. EST-025" className="w-full px-3 py-2 rounded-lg border bg-white" />
      <label htmlFor="input-nueva-estanteria-nombre" className="block">Nombre de la nueva estantería</label>
      <input id="input-nueva-estanteria-nombre" maxLength={100} value={name} disabled={busy} onChange={event => { setName(event.target.value); setError(''); }}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void create(); } }}
        placeholder="Ej. Zona de materiales eléctricos" className="w-full px-3 py-2 rounded-lg border bg-white" />
      <button type="button" disabled={busy || !code.trim() || !name.trim()} onClick={() => { void create(); }} className="text-white bg-[#253685] rounded-lg px-3 py-2 disabled:opacity-50">{busy ? 'Creando…' : 'Crear y elegir estantería'}</button>
      <p className="font-normal text-slate-500">Se guardará en el almacén elegido.</p>
    </div>}
    {!warehouseId && <p className="font-normal text-slate-500">Seleccione un almacén para elegir o crear una estantería.</p>}
    {error && <p role="alert" className="font-normal text-red-700">{error}</p>}
    {message && <p role="status" className="font-normal text-green-700">{message}</p>}
  </div>;
}
