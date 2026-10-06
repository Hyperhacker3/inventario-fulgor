import { useEffect, useRef, useState } from 'react';
import type { PrefijoCodigo } from '../../types';
import { errorMessage } from '../../shared/errors';
import { Presence } from '../ui/Motion';
import { Select } from '../ui/Select';

interface Props {
  value: string; prefixes: PrefijoCodigo[]; onChange: (id: string) => void;
  onCreate: (code: string) => Promise<PrefijoCodigo>;
  onBusyChange: (busy: boolean) => void; onDraftChange: (draft: boolean) => void; disabled?: boolean;
}
export function ItemPrefixSelector({ value, prefixes, onChange, onCreate, onBusyChange, onDraftChange, disabled = false }: Props) {
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const saving = useRef(false);
  useEffect(() => () => onDraftChange(false), [onDraftChange]);
  const create = async () => {
    if (saving.current || disabled) return;
    if (!/^[A-Z]{3}$/.test(code)) { setError('Escriba exactamente tres letras de A a Z.'); return; }
    saving.current = true; setBusy(true); onBusyChange(true); setError(''); setMessage('');
    try {
      const prefix = await onCreate(code);
      onChange(prefix.id); setCreating(false); onDraftChange(false); setCode('');
      setMessage(`Código ${prefix.prefijo} guardado en Supabase y seleccionado.`);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { saving.current = false; setBusy(false); onBusyChange(false); }
  };
  return <div className="space-y-2">
    <label htmlFor="select-prefijo" className="block text-xs font-bold tracking-wider text-[#454651] uppercase">Prefijo del código <span className="text-[#dd4c42]">*</span></label>
    <Select id="select-prefijo" required value={creating ? '__NEW_PREFIX__' : value} disabled={disabled || busy}
      onChange={event => { const draft = event.target.value === '__NEW_PREFIX__'; setCreating(draft); onDraftChange(draft); setError(''); setMessage(''); if (!draft) onChange(event.target.value); }}
      className="w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm">
      <option value="">Seleccione un prefijo</option>
      <option value="__NEW_PREFIX__">+ Crear nuevo código</option>
      {prefixes.filter(row => row.activo).map(row => <option key={row.id} value={row.id}>{row.prefijo} · {row.nombre}</option>)}
    </Select>
    <Presence open={creating}><div className="ui-panel-enter space-y-2">
      <label htmlFor="input-nuevo-prefijo" className="block text-xs">Las tres letras del nuevo código</label>
      <input autoComplete="off" autoCorrect="off" spellCheck={false} id="input-nuevo-prefijo" value={code} maxLength={3} minLength={3} pattern="[A-Z]{3}" disabled={disabled || busy}
        onChange={event => { setCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)); setError(''); }}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void create(); } }}
        placeholder="Ej. CAB" className="block w-full border rounded-lg px-3 py-2 text-sm uppercase" />
      <button type="button" disabled={disabled || busy || code.length !== 3} onClick={() => { void create(); }} className="bg-[#253685] text-white text-xs font-semibold rounded-lg px-3 py-2 disabled:opacity-50">{busy ? 'Creando…' : 'Crear y elegir código'}</button>
      <p className="text-xs text-slate-500">Escriba solo las letras. Supabase asignará los números al guardar cada ítem.</p>
    </div></Presence>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {message && <p role="status" className="text-xs text-green-700">{message}</p>}
  </div>;
}
