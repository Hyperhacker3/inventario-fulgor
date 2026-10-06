import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Elemento } from '../../types';
import { available } from '../../domain/inventory';
import { MIN_QUANTITY, roundQuantity, validQuantity } from '../../domain/quantity';
import { formatKg, lineWeightKg } from '../../domain/weight';
import { NumberInput } from '../NumberInput';

export function DispatchQuantityModal({ item, inCart, onConfirm, onClose }: { item: Elemento; inCart: number; onConfirm: (quantity: number) => void; onClose: () => void }) {
  const maximum = Math.max(0, roundQuantity(available(item) - inCart));
  const [quantity, setQuantity] = useState(Math.min(1, maximum));
  const [error, setError] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    form.current?.querySelector<HTMLInputElement>('input')?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); onClose(); }
      if (event.key === 'Tab') {
        const controls = [...(form.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') || [])];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keyboard, true);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard, true); if (previous?.isConnected) previous.focus(); };
  }, [onClose]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    if (!validQuantity(quantity) || quantity <= 0 || quantity > maximum) { setError('Indique una cantidad válida que no supere el disponible.'); return; }
    try { submitting.current = true; onConfirm(quantity); }
    catch (cause) { submitting.current = false; setError(cause instanceof Error ? cause.message : 'No se pudo agregar.'); }
  };
  const weight = validQuantity(quantity) && quantity >= 0 ? lineWeightKg(item.pesoUnitario, quantity) : null;
  return createPortal(<div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
    <form ref={form} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="dispatch-quantity-title" className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
      <div className="flex justify-between gap-4"><h2 id="dispatch-quantity-title" className="font-bold text-xl">Agregar a la salida</h2><button type="button" onClick={onClose} aria-label="Cerrar selección de cantidad">✕</button></div>
      <p className="text-sm"><strong className="text-[#253685]">{item.codigo}</strong> · {item.nombre}</p>
      <p className="text-xs text-slate-600">En la salida: {inCart} {item.unidad}. Disponible para agregar: {maximum} {item.unidad}.</p>
      <label htmlFor="dispatch-add-quantity" className="block text-sm font-semibold">¿Cuántas {item.unidad.toUpperCase()} quieres agregar?</label>
      <div className="flex items-center gap-3">
        <button type="button" aria-label="Reducir cantidad" disabled={quantity <= Math.min(1, maximum) || maximum === 0} onClick={() => setQuantity(roundQuantity(Math.max(MIN_QUANTITY, quantity - 1)))} className="border rounded-xl w-12 h-12 text-xl disabled:opacity-40">−</button>
        <NumberInput id="dispatch-add-quantity" required min="0.001" step="0.001" max={maximum} disabled={maximum === 0} value={quantity} onValueChange={setQuantity} className="border rounded-xl p-3 text-center w-full min-w-0 text-lg" />
        <button type="button" aria-label="Aumentar cantidad" disabled={quantity >= maximum} onClick={() => setQuantity(roundQuantity(Math.min(maximum, quantity + 1)))} className="border rounded-xl w-12 h-12 text-xl disabled:opacity-40">+</button>
      </div>
      <p className="text-xs text-slate-600">{weight === null ? 'Peso pendiente de declarar en el producto.' : `Peso de esta cantidad: ${formatKg(weight)}`}</p>
      {maximum === 0 && <p role="status" className="text-sm text-amber-700">No quedan existencias disponibles para agregar.</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="border rounded-lg px-4 py-2">Cancelar</button><button type="submit" disabled={maximum === 0} className="bg-[#253685] text-white rounded-lg px-4 py-2 disabled:opacity-40">Agregar a la salida</button></div>
    </form>
  </div>, document.body);
}
