import { useRef, useState } from 'react';
import type { Elemento } from '../../types';
import { errorMessage } from '../../shared/errors';
import { ArchivedItemDeletion } from './ArchivedItemDeletion';

interface Props {
  item: Elemento;
  onRestore?: (item: Elemento) => Promise<void>;
  onDelete?: (item: Elemento) => Promise<void>;
}
export function ArchivedItemActions({ item, onRestore, onDelete }: Props) {
  const saving = useRef(false);
  const [pending, setPending] = useState<'restore' | 'delete' | null>(null);
  const [error, setError] = useState('');
  const run = async (kind: 'restore' | 'delete', action: () => Promise<void>) => {
    if (saving.current) throw new Error('Espere a que termine la operación actual.');
    saving.current = true; setPending(kind); setError('');
    try { await action(); }
    finally { saving.current = false; setPending(null); }
  };
  const restore = async () => {
    if (!onRestore || saving.current || !item.archived) return;
    try { await run('restore', () => onRestore(item)); }
    catch (cause) { setError(errorMessage(cause)); }
  };
  if (!item.archived) return null;
  return <fieldset disabled={pending !== null} aria-busy={pending !== null} className="space-y-3">
    {onRestore && <div className="space-y-2">
      <button type="button" data-action="archive" onClick={() => { void restore(); }} className="px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-40">{pending === 'restore' ? 'Desarchivando…' : 'Desarchivar'}</button>
      <p className="text-xs text-slate-600">Volverá al inventario activo conservando su código, stock, fotos e historial.</p>
    </div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {onDelete && <ArchivedItemDeletion item={item} onDelete={value => run('delete', () => onDelete(value))} />}
  </fieldset>;
}
