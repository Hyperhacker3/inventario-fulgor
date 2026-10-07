import { Presence } from '../ui/Motion';
import { Select } from '../ui/Select';
import { useEffect, useRef, useState } from 'react';
import type { NivelEstanteria } from '../../types';
import { errorMessage } from '../../shared/errors';

interface Props {
  idPrefix?: string; label?: string;
  rackId: string; levelId: string; levels: NivelEstanteria[];
  onLevel: (id: string) => void;
  onCreate: (input: Omit<NivelEstanteria, 'id'>) => Promise<NivelEstanteria>;
  onBusyChange?: (busy: boolean) => void; onDraftChange?: (unfinished: boolean) => void;
}
export function ItemLevelSelector({ rackId, levelId, levels, onLevel, onCreate, onBusyChange, onDraftChange, idPrefix = '', label = 'Nivel' }: Props) {
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const saving = useRef(false);
  useEffect(() => () => onDraftChange?.(false), [onDraftChange]);
  const create = async () => {
    if (saving.current || !rackId) return;
    const codigo = code.trim().toUpperCase(), nombre = name.trim();
    if (!codigo || !nombre) { setError('Escriba el código y el nombre del nivel.'); return; }
    saving.current = true; setBusy(true); onBusyChange?.(true); setError(''); setMessage('');
    try {
      const existing = levels.find(level => level.estanteriaId === rackId && level.codigo.trim().toUpperCase() === codigo);
      if (existing && existing.nombre.trim().toLocaleLowerCase('es') !== nombre.toLocaleLowerCase('es'))
        throw new Error(`Ya existe el nivel ${existing.codigo}: ${existing.nombre}. Selecciónelo de la lista o utilice otro código.`);
      const level = existing || await onCreate({ estanteriaId: rackId, codigo, nombre, descripcion: '' });
      onLevel(level.id); setCreating(false); onDraftChange?.(false); setCode(''); setName('');
      setMessage(existing ? `Nivel ${level.codigo} seleccionado.` : `Nivel ${level.codigo} creado en Supabase y seleccionado.`);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { saving.current = false; setBusy(false); onBusyChange?.(false); }
  };
  return <div className="text-xs font-semibold text-[#454651] space-y-2">
    <label htmlFor={idPrefix + 'select-nivel-form'} className="block">{label}</label>
    <Select id={idPrefix + 'select-nivel-form'} value={creating ? '__NEW_LEVEL__' : levelId} disabled={!rackId || busy}
      onChange={event => { const draft = event.target.value === '__NEW_LEVEL__'; setCreating(draft); onDraftChange?.(draft); setError(''); setMessage(''); if (!draft) onLevel(event.target.value); }}
      className="block w-full px-3 py-2 rounded-lg border bg-white">
      <option value="">Seleccione un nivel</option>
      <option value="__NEW_LEVEL__">+ Crear nuevo nivel</option>
      {levels.map(level => <option key={level.id} value={level.id}>{level.codigo} - {level.nombre}</option>)}
    </Select>
    <Presence open={creating}><div className="ui-panel-enter space-y-2">
      <label htmlFor={idPrefix + 'input-nuevo-nivel-codigo'} className="block">Código del nuevo nivel</label>
      <input autoComplete="off" autoCorrect="off" spellCheck={false} id={idPrefix + 'input-nuevo-nivel-codigo'} maxLength={100} value={code} disabled={busy} onChange={event => { setCode(event.target.value); setError(''); }}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void create(); } }}
        placeholder="Ej. NIV-01" className="w-full px-3 py-2 rounded-lg border bg-white" />
      <label htmlFor={idPrefix + 'input-nuevo-nivel-nombre'} className="block">Nombre del nuevo nivel</label>
      <input autoComplete="off" autoCorrect="off" spellCheck={false} id={idPrefix + 'input-nuevo-nivel-nombre'} maxLength={100} value={name} disabled={busy} onChange={event => { setName(event.target.value); setError(''); }}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void create(); } }}
        placeholder="Ej. Nivel superior" className="w-full px-3 py-2 rounded-lg border bg-white" />
      <button type="button" disabled={busy || !code.trim() || !name.trim()} onClick={() => { void create(); }} className="text-white bg-[#253685] rounded-lg px-3 py-2 disabled:opacity-50">{busy ? 'Creando…' : 'Crear y elegir nivel'}</button>
      <p className="font-normal text-slate-500">Se guardará en la estantería elegida.</p>
    </div></Presence>
    {!rackId && <p className="font-normal text-slate-500">Seleccione una estantería para elegir o crear un nivel.</p>}
    {error && <p role="alert" className="font-normal text-red-700">{error}</p>}
    {message && <p role="status" className="font-normal text-green-700">{message}</p>}
  </div>;
}
