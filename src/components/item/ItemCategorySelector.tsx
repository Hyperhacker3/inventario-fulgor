import { useEffect, useRef, useState } from 'react';
import type { Categoria } from '../../types';
import { errorMessage } from '../../shared/errors';

interface Props {
  value: string; categories: Categoria[]; onChange: (id: string) => void;
  onCreate: (name: string) => Promise<Categoria>;
  onBusyChange?: (busy: boolean) => void; onDraftChange?: (unfinished: boolean) => void;
  disabled?: boolean; canCreate?: boolean; required?: boolean;
  emptyLabel?: string; id?: string;
}
export function ItemCategorySelector({ value, categories, onChange, onCreate, onBusyChange, onDraftChange,
  disabled = false, canCreate = true, required = true, emptyLabel = 'Seleccione una categoría', id = 'select-categoria' }: Props) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const saving = useRef(false);
  useEffect(() => () => onDraftChange?.(false), [onDraftChange]);
  const create = async () => {
    if (saving.current || disabled || !canCreate) return;
    if (!name.trim()) { setError('Escriba el nombre de la categoría.'); return; }
    saving.current = true; setBusy(true); onBusyChange?.(true); setError(''); setMessage('');
    try {
      const category = await onCreate(name);
      onChange(category.id); setCreating(false); onDraftChange?.(false); setName('');
      setMessage(`Categoría ${category.nombre} guardada en Supabase y seleccionada.`);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { saving.current = false; setBusy(false); onBusyChange?.(false); }
  };
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-xs font-bold tracking-wider text-[#454651] uppercase">Categoría{required && ' *'}</label>
    <select id={id} required={required} value={creating ? '__NEW_CATEGORY__' : value} disabled={disabled || busy}
      onChange={event => { const draft = event.target.value === '__NEW_CATEGORY__'; setCreating(draft); onDraftChange?.(draft); setError(''); setMessage(''); if (!draft) onChange(event.target.value); }}
      className="w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm">
      <option value="">{emptyLabel}</option>
      {canCreate && <option value="__NEW_CATEGORY__">+ Crear nueva categoría</option>}
      {categories.filter(category => category.activo).map(category => <option key={category.id} value={category.id}>{category.nombre}</option>)}
    </select>
    {creating && <div className="ui-panel-enter space-y-2">
      <label htmlFor={`${id}-name`} className="block text-xs">Nombre de la nueva categoría</label>
      <input id={`${id}-name`} value={name} maxLength={100} disabled={disabled || busy} onChange={event => { setName(event.target.value); setError(''); }}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void create(); } }}
        placeholder="Ej. Materiales eléctricos" className="w-full border rounded-lg px-3 py-2 text-sm" />
      <button type="button" disabled={disabled || busy || !name.trim()} onClick={() => { void create(); }} className="bg-[#253685] text-white text-xs font-semibold rounded-lg px-3 py-2 disabled:opacity-50">{busy ? 'Creando…' : 'Crear y elegir categoría'}</button>
    </div>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {message && <p role="status" className="text-xs text-green-700">{message}</p>}
  </div>;
}
