import { useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import type { DispatchCartItem, Elemento } from '../../types';
import { prepareBulkDispatch } from '../../domain/bulkEdit';
import { MIN_QUANTITY, roundQuantity, validQuantity } from '../../domain/quantity';
import { NumberInput } from '../NumberInput';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useMotionActive } from '../ui/Motion';
import { StateIcon } from '../ui/StateIcon';
import { errorMessage } from '../../shared/errors';

interface Props {
  items: Elemento[];
  cart: DispatchCartItem[];
  cartLocked: boolean;
  onConfirm: (lines: { elemento: Elemento; cantidad: number }[]) => void;
  onClose: () => void;
}

export function BulkDispatchDialog({ items, cart, cartLocked, onConfirm, onClose }: Props) {
  const active = useMotionActive();
  const { availableRows, unavailableRows } = useMemo(() => prepareBulkDispatch(items, cart), [items, cart]);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(availableRows.map(row => [row.item.id, Math.min(1, row.maxAdd)])),
  );
  const [included, setIncluded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(availableRows.map(row => [row.item.id, true])),
  );
  const [error, setError] = useState('');
  const dialog = useRef<HTMLElement>(null);
  const submitting = useRef(false);
  useDialogFocus(dialog, onClose, true, '[data-dialog-close]');

  const chosenRows = availableRows.filter(row => included[row.item.id]);

  const applyAll = (mode: 'one' | 'max') => {
    setError('');
    setQuantities(Object.fromEntries(availableRows.map(row => [row.item.id, mode === 'one' ? Math.min(1, row.maxAdd) : row.maxAdd])));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current || !active || cartLocked) return;
    setError('');
    if (!chosenRows.length) { setError('Seleccione al menos un producto disponible para agregar.'); return; }
    const lines: { elemento: Elemento; cantidad: number }[] = [];
    for (const row of chosenRows) {
      const qty = quantities[row.item.id] ?? 0;
      if (!validQuantity(qty) || qty <= 0 || qty > row.maxAdd) {
        setError(`Revise la cantidad de ${row.item.codigo}: debe estar entre ${MIN_QUANTITY} y ${row.maxAdd}.`);
        return;
      }
      lines.push({ elemento: row.item, cantidad: qty });
    }
    try {
      submitting.current = true;
      onConfirm(lines);
    } catch (cause) {
      submitting.current = false;
      setError(errorMessage(cause));
    }
  };

  return createPortal(
    <div className="ui-modal-layer fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-3 sm:p-6"
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="bulk-dispatch-title"
        className={`ui-dialog-panel ${active ? 'ui-panel-enter' : ''} bg-white rounded-2xl border shadow-2xl w-full max-w-2xl max-h-[calc(var(--app-viewport-height,100dvh)-24px)] flex flex-col overflow-hidden`}>
        <header className="flex shrink-0 items-center justify-between gap-3 p-4 sm:p-6">
          <h2 id="bulk-dispatch-title" data-action="dispatch" className="font-bold text-xl flex items-center gap-3 min-w-0 break-words">
            <StateIcon icon="add_shopping_cart" />Agregar {chosenRows.length} producto{chosenRows.length === 1 ? '' : 's'} a la salida
          </h2>
          <button type="button" data-dialog-close aria-label="Cerrar agregar a la salida" onClick={onClose} className="shrink-0 min-w-11 min-h-11 text-2xl">×</button>
        </header>
        <form autoComplete="off" onSubmit={submit} className="min-h-0 flex-1 flex flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6 space-y-4">
            {cartLocked && <p role="alert" className="text-sm text-red-700">Termine o reintente la salida pendiente antes de agregar materiales.</p>}
            {error && <p role="alert" className="text-sm text-red-700 break-words">{error}</p>}

            {availableRows.length > 0 ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-600">Indique la cantidad de cada producto que quiere llevar a la salida (externa o interna).</p>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={cartLocked} onClick={() => applyAll('one')} className="px-3 min-h-11 rounded-xl text-xs font-semibold text-[#3e4e9e]">1 c/u</button>
                    <button type="button" disabled={cartLocked} onClick={() => applyAll('max')} className="px-3 min-h-11 rounded-xl text-xs font-semibold text-[#3e4e9e]">Todo disponible</button>
                  </div>
                </div>
                <ul className="space-y-3">
                  {availableRows.map(row => {
                    const checked = Boolean(included[row.item.id]);
                    const qty = quantities[row.item.id] ?? Math.min(1, row.maxAdd);
                    return (
                      <li key={row.item.id} className="rounded-xl bg-[#f8fafc] p-3.5 space-y-2.5">
                        <div className="flex items-start gap-2.5">
                          <label className="min-w-11 min-h-11 grid place-items-center -ml-2 -mt-1.5 shrink-0">
                            <input
                              type="checkbox"
                              className="w-5 h-5"
                              checked={checked}
                              disabled={cartLocked}
                              aria-label={`Incluir ${row.item.codigo} en la salida`}
                              onChange={event => { setError(''); setIncluded(prev => ({ ...prev, [row.item.id]: event.target.checked })); }}
                            />
                          </label>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[#131b2e] break-words">
                              <span className="font-mono-code text-[#253685]">{row.item.codigo}</span> · {row.item.nombre}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Disponible para agregar: <strong className="text-[#131b2e]">{row.maxAdd} {row.item.unidad}</strong>
                              {row.inCart > 0 ? ` (ya hay ${row.inCart} ${row.item.unidad} en la salida)` : ''}
                            </p>
                          </div>
                        </div>
                        {checked && (
                          <div className="flex items-center gap-2 sm:pl-9">
                            <button
                              type="button"
                              aria-label={`Reducir cantidad de ${row.item.codigo}`}
                              disabled={cartLocked || qty <= Math.min(1, row.maxAdd)}
                              onClick={() => setQuantities(prev => ({ ...prev, [row.item.id]: roundQuantity(Math.max(MIN_QUANTITY, qty - 1)) }))}
                              className="border rounded-xl w-11 h-11 text-lg disabled:opacity-40 shrink-0"
                            >−</button>
                            <NumberInput
                              aria-label={`Cantidad de ${row.item.codigo}`}
                              required
                              min="0.001"
                              step="0.001"
                              max={row.maxAdd}
                              disabled={cartLocked}
                              value={qty}
                              onValueChange={value => setQuantities(prev => ({ ...prev, [row.item.id]: value }))}
                              className="border rounded-xl p-2 text-center w-full min-w-0 text-sm"
                            />
                            <button
                              type="button"
                              aria-label={`Aumentar cantidad de ${row.item.codigo}`}
                              disabled={cartLocked || qty >= row.maxAdd}
                              onClick={() => setQuantities(prev => ({ ...prev, [row.item.id]: roundQuantity(Math.min(row.maxAdd, qty + 1)) }))}
                              className="border rounded-xl w-11 h-11 text-lg disabled:opacity-40 shrink-0"
                            >+</button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p role="status" className="rounded-xl bg-[#fef7e0] p-4 text-sm text-[#755b00]">
                Ninguno de los productos seleccionados tiene existencias disponibles para agregar a la salida.
              </p>
            )}

            {unavailableRows.length > 0 && (
              <details className="rounded-xl bg-[#fef7e0] p-3 text-xs text-[#755b00]">
                <summary className="min-h-11 flex items-center cursor-pointer font-semibold">
                  {unavailableRows.length} producto{unavailableRows.length === 1 ? '' : 's'} sin stock disponible para agregar (se omitirán)
                </summary>
                <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {unavailableRows.map(row => (
                    <li key={row.item.id} className="break-words">
                      <span className="font-mono-code font-bold">{row.item.codigo}</span> · {row.item.nombre} — {row.item.stockPendiente ? 'conteo pendiente' : row.inCart > 0 ? 'todo el disponible ya está en la salida' : 'sin existencias'}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
          <div className="shrink-0 grid grid-cols-2 gap-3 p-4 sm:px-6 sm:pb-6">
            <button type="button" data-action="cancel" onClick={onClose} className="min-h-11 px-4 rounded-xl border text-sm">Cancelar</button>
            <button type="submit" data-action="dispatch" disabled={cartLocked || !chosenRows.length} className="min-h-11 px-4 rounded-xl text-sm font-semibold disabled:opacity-40">
              Agregar a la salida ({chosenRows.length})
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
