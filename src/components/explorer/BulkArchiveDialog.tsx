import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Elemento } from '../../types';
import { BulkArchiveRequests, validateBulkArchive } from '../../domain/bulkEdit';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useMotionActive } from '../ui/Motion';
import { StateIcon } from '../ui/StateIcon';
import { errorMessage } from '../../shared/errors';

const VISIBLE_PRODUCTS = 200;

interface Props {
  items: Elemento[];
  archive: (ids: string[], requestId: string) => Promise<string[]>;
  onClose: () => void;
  onArchived: (archivedIds: string[]) => void;
}

export function BulkArchiveDialog({ items, archive, onClose, onArchived }: Props) {
  const active = useMotionActive();
  const requests = useRef(new BulkArchiveRequests());
  const saving = useRef(false);
  const dialog = useRef<HTMLElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const cancel = () => { if (!pending) onClose(); };
  useDialogFocus(dialog, cancel, true, '[data-dialog-close]');

  const borrowed = items.filter(item => (item.cantidadPrestada || 0) > 0);
  const ids = items.map(item => item.id);

  const confirm = async () => {
    if (saving.current || pending || borrowed.length > 0) return;
    try { validateBulkArchive(ids); } catch (cause) { setError(errorMessage(cause)); return; }
    saving.current = true; setPending(true); setError('');
    try {
      const archivedIds = await archive(ids, requests.current.requestFor(ids));
      requests.current.confirm();
      onArchived(archivedIds);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      saving.current = false; setPending(false);
    }
  };

  return createPortal(
    <div className="ui-modal-layer fixed inset-0 z-[80] bg-black/60 grid place-items-center p-4"
      onClick={event => { if (event.target === event.currentTarget) cancel(); }}>
      <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="bulk-archive-title" aria-busy={pending}
        className={`ui-dialog-panel ${active ? 'ui-panel-enter' : ''} w-full max-w-lg bg-white rounded-2xl border p-5 sm:p-6 space-y-4 max-h-[calc(var(--app-viewport-height,100dvh)-24px)] flex flex-col overflow-hidden`}>
        <h2 id="bulk-archive-title" data-action="archive" className="text-xl font-bold flex items-center gap-3 shrink-0">
          <StateIcon icon="archive" />Archivar {items.length.toLocaleString('es-CO')} producto{items.length === 1 ? '' : 's'}
        </h2>
        <div className="min-h-0 flex-1 overflow-y-auto space-y-3">
          <p className="text-sm text-[#454651] break-words">
            Los productos seleccionados se moverán a <strong>Administración → Archivados</strong>. Se conservarán sus existencias, historial, remisiones, informes y hojas de vida, y podrá recuperarlos cuando lo necesite.
          </p>
          <details className="rounded-xl bg-[#f8fafc] p-3 text-sm">
            <summary className="min-h-11 flex items-center cursor-pointer font-semibold">
              Ver productos a archivar ({items.length.toLocaleString('es-CO')})
            </summary>
            <ul className="mt-2 max-h-48 overflow-y-auto space-y-1 text-xs">
              {items.slice(0, VISIBLE_PRODUCTS).map(item => (
                <li key={item.id} className="break-words"><span className="font-mono-code">{item.codigo}</span> · {item.nombre}</li>
              ))}
              {items.length > VISIBLE_PRODUCTS && (
                <li className="text-slate-500">y {(items.length - VISIBLE_PRODUCTS).toLocaleString('es-CO')} más</li>
              )}
            </ul>
          </details>
          {borrowed.length > 0 && (
            <div role="alert" className="rounded-xl bg-[#fce8e6] p-3 text-xs text-[#ba1a1a] space-y-1">
              <p className="font-semibold">No se puede archivar mientras haya préstamos internos sin devolver:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {borrowed.slice(0, 10).map(item => (
                  <li key={item.id}><span className="font-mono-code font-bold">{item.codigo}</span> · {item.nombre} ({item.cantidadPrestada} {item.unidad} en uso interno)</li>
                ))}
                {borrowed.length > 10 && <li>y {borrowed.length - 10} más</li>}
              </ul>
            </div>
          )}
          {error && <p role="alert" className="text-sm text-red-700 break-words">{error}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3 shrink-0 pt-1">
          <button data-dialog-close data-action="cancel" type="button" disabled={pending} onClick={cancel} className="min-h-11 px-3 py-2 rounded-xl disabled:opacity-40">Cancelar</button>
          <button type="button" data-action="archive" disabled={pending || borrowed.length > 0 || !items.length} onClick={() => { void confirm(); }} className="min-h-11 px-3 py-2 rounded-xl font-semibold disabled:opacity-40">
            {pending ? 'Archivando…' : `Archivar (${items.length.toLocaleString('es-CO')})`}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
