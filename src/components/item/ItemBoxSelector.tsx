import { Presence } from '../ui/Motion';
import { Select } from '../ui/Select';
import { useEffect, useRef, useState } from 'react';
import type { Caja } from '../../types';
import { errorMessage } from '../../shared/errors';

interface Props {
  rackId: string; levelId: string; boxId: string; boxes: Caja[];
  onBox: (id: string) => void;
  onCreate: (input: Omit<Caja, 'id'>) => Promise<Caja>;
  onBusyChange?: (busy: boolean) => void;
  onDraftChange?: (unfinished: boolean) => void;
}
export function ItemBoxSelector({ rackId, levelId, boxId, boxes, onBox, onCreate, onBusyChange, onDraftChange }: Props) {
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const saving = useRef(false);
  useEffect(() => () => onDraftChange?.(false), [onDraftChange]);
  const create = async () => {
    if (saving.current || (!rackId || !levelId)) return;
    const normalized = code.trim().toUpperCase();
    if (!normalized) { setError('Escriba el código de la nueva caja.'); return; }
    saving.current = true; setBusy(true); onBusyChange?.(true); setError(''); setMessage('');
    try {
      const existing = boxes.find(box => box.estanteriaId === rackId && box.nivelId === levelId && box.codigoCaja.trim().toUpperCase() === normalized);
      const box = existing || await onCreate({ estanteriaId: rackId, nivelId: levelId, codigoCaja: normalized, estado: 'Parcial', descripcion: '' });
      onBox(box.id); setCreating(false); onDraftChange?.(false); setCode('');
      setMessage(existing ? `Caja ${box.codigoCaja} seleccionada.` : `Caja ${box.codigoCaja} creada en Supabase y seleccionada.`);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { saving.current = false; setBusy(false); onBusyChange?.(false); }
  };
  return <div className="text-xs font-semibold text-[#454651] space-y-2">
    <label className="block" htmlFor="select-caja-form">Caja</label>
    <Select id="select-caja-form" value={creating ? '__NEW_BOX__' : boxId} disabled={(!rackId || !levelId) || busy}
      onChange={event => { const draft = event.target.value === '__NEW_BOX__'; setCreating(draft); onDraftChange?.(draft); setError(''); setMessage(''); if (!draft) onBox(event.target.value); }}
      className="block w-full px-3 py-2 rounded-lg border bg-white">
      <option value="">Seleccione una caja</option>
      <option value="__NEW_BOX__">+ Crear nueva caja</option>
      {boxes.map(box => <option key={box.id} value={box.id}>{box.codigoCaja} ({box.estado})</option>)}
    </Select>
    <Presence open={creating}><div className="ui-panel-enter space-y-2">
      <label className="block" htmlFor="input-nueva-caja">Código de la nueva caja</label>
      <input autoComplete="off" autoCorrect="off" spellCheck={false} id="input-nueva-caja" value={code} maxLength={100} disabled={busy} onChange={event => { setCode(event.target.value); setError(''); }}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void create(); } }}
        placeholder="Ej. CAJ-025" className="block w-full border rounded-lg px-3 py-2 bg-white" />
      <button type="button" disabled={busy || !code.trim()} onClick={() => { void create(); }} className="text-white bg-[#253685] rounded-lg px-3 py-2 disabled:opacity-50">{busy ? 'Creando…' : 'Crear y elegir caja'}</button>
      <p className="font-normal text-slate-500">Se guardará en el nivel elegido. Cree o seleccione la caja antes de guardar el componente.</p>
    </div></Presence>
    {(!rackId || !levelId) && <p className="font-normal text-slate-500">Seleccione un nivel de estantería para elegir o crear una caja.</p>}
    {message && <p role="status" className="font-normal text-green-700">{message}</p>}
    {error && <p role="alert" className="font-normal text-red-700">{error}</p>}
  </div>;
}
