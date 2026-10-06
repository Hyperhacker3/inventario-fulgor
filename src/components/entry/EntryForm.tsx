import { useRef, useState, type FormEvent } from 'react';
import type { Elemento, HistorialMovimiento } from '../../types';
import { NumberInput } from '../NumberInput';
import { roundQuantity, validQuantity } from '../../domain/quantity';
import { errorMessage } from '../../shared/errors';

export interface EntryInput { elementoId: string; tipo: 'ENTRADA'; cantidad: number; motivo: string; responsable: string; requestId: string }
interface Props { item: Elemento; responsible: string; onSave: (input: EntryInput) => Promise<HistorialMovimiento>; onBusyChange: (busy: boolean) => void }
export function EntryForm({ item, responsible, onSave, onBusyChange }: Props) {
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<HistorialMovimiento | null>(null);
  const saving = useRef(false);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving.current) return;
    setError('');
    if (item.archived || item.stockPendiente) { setError('Seleccione un material activo con stock verificado.'); return; }
    if (!validQuantity(quantity) || quantity <= 0) { setError('Indique una cantidad positiva, con hasta tres decimales.'); return; }
    if (!reason.trim()) { setError('Indique el motivo de la entrada.'); return; }
    const signature = JSON.stringify([item.id, quantity, reason.trim()]);
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    saving.current = true; setPending(true); onBusyChange(true);
    try {
      const saved = await onSave({ elementoId: item.id, tipo: 'ENTRADA', cantidad: quantity, motivo: reason.trim(), responsable: responsible, requestId: request.current.id });
      setReceipt(saved); setQuantity(0); setReason(''); request.current = null;
    } catch (cause) { setError(errorMessage(cause)); }
    finally { saving.current = false; setPending(false); onBusyChange(false); }
  };
  return <form onSubmit={submit} className="space-y-5">
    {error && <p role="alert" className="rounded-xl bg-red-50 text-red-800 p-3 text-sm">{error}</p>}
    {receipt && <p role="status" className="rounded-xl bg-green-50 text-green-900 border border-green-200 p-3 text-sm">Entrada registrada: +{receipt.cantidad} {receipt.unidad} de {receipt.itemCode}. Stock tras este movimiento: {receipt.stockNuevo} {receipt.unidad}.</p>}
    <fieldset disabled={pending || item.stockPendiente || item.archived} className="space-y-5 disabled:opacity-60">
      <div className="grid sm:grid-cols-2 gap-4"><div className="rounded-xl p-4 bg-slate-50"><span className="block text-xs text-slate-600">Stock actual</span><strong>{item.cantidad} {item.unidad}</strong></div><div className="rounded-xl p-4 bg-green-50"><span className="block text-xs text-green-800">Stock previsto con esta entrada</span><strong>{roundQuantity(item.cantidad + Math.max(0, quantity))} {item.unidad}</strong></div></div>
      <label className="block text-sm font-semibold">Cantidad que entra ({item.unidad})
        <div className="flex gap-2 mt-2"><button type="button" aria-label="Reducir cantidad de entrada" onClick={() => setQuantity(roundQuantity(Math.max(0, quantity - 1)))} className="shrink-0 min-h-11 border rounded-xl w-11 text-xl">−</button><NumberInput required min="0.001" step="0.001" value={quantity} onValueChange={setQuantity} className="w-full min-w-0 border rounded-xl p-3 font-mono-code" /><button type="button" aria-label="Aumentar cantidad de entrada" onClick={() => setQuantity(roundQuantity(quantity + 1))} className="shrink-0 min-h-11 border rounded-xl w-11 text-xl">+</button></div>
      </label>
      <label className="block text-sm font-semibold">Motivo o referencia de recepción<textarea required rows={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Compra, devolución de obra, recepción de material…" className="block w-full mt-2 p-3 border rounded-xl" /></label>
      <p className="text-sm break-words text-slate-600">Responsable: <strong>{responsible}</strong>. Quedará registrado con su cuenta.</p>
      <button type="submit" className="w-full rounded-xl py-3 bg-[#137333] text-white font-bold">{pending ? 'Registrando entrada…' : 'Registrar entrada'}</button>
    </fieldset>
  </form>;
}
