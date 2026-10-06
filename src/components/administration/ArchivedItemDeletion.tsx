import { useRef, useState, type FormEvent } from 'react';
import type { Elemento } from '../../types';
import { errorMessage } from '../../shared/errors';

interface Props { item: Elemento; onDelete: (item: Elemento) => Promise<void> }
export function ArchivedItemDeletion({ item, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const remove = async (event: FormEvent) => {
    event.preventDefault();
    if (!item.archived || code !== item.codigo || saving.current) return;
    saving.current = true; setPending(true); setError('');
    try { await onDelete(item); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { saving.current = false; setPending(false); }
  };
  if (!item.archived) return null;
  if (!confirming) return <button type="button" onClick={() => setConfirming(true)} className="px-3 py-2 rounded-lg bg-red-700 text-white text-sm font-semibold">Eliminar definitivamente</button>;
  return <form onSubmit={remove} className="ui-panel-enter space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
    <p className="text-sm text-red-900">Esta acción elimina el producto y retira sus fotos. No se puede deshacer. Se conservarán las remisiones y el historial.</p>
    {error && <p role="alert" className="text-red-800 text-sm">{error}</p>}
    <label className="block text-sm font-semibold">Escriba {item.codigo} para confirmar<input required disabled={pending} value={code} onChange={event => setCode(event.target.value)} className="block mt-1 w-full p-2 border rounded-lg bg-white" /></label>
    <div className="flex gap-3"><button type="button" disabled={pending} onClick={() => { setConfirming(false); setCode(''); setError(''); }} className="px-3 py-2 border rounded-lg">Cancelar</button><button type="submit" disabled={pending || code !== item.codigo} className="px-3 py-2 rounded-lg bg-red-700 text-white disabled:opacity-40">{pending ? 'Eliminando…' : 'Confirmar eliminación'}</button></div>
  </form>;
}
