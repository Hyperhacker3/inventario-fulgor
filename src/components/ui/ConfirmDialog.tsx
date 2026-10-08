import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { StateIcon } from './StateIcon';

export function ConfirmDialog({ title, message, pending, error, onCancel, onConfirm }: {
  title: string; message: string; pending: boolean; error?: string; onCancel: () => void; onConfirm: () => void;
}) {
  const dialog = useRef<HTMLElement>(null);
  const cancel = () => { if (!pending) onCancel(); };
  useDialogFocus(dialog, cancel, true, '[data-dialog-close]');
  return createPortal(<div className="ui-modal-layer fixed inset-0 z-[80] bg-black/60 grid place-items-center p-4" onClick={event => { if (event.target === event.currentTarget) cancel(); }}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="archive-confirm-title" aria-describedby="archive-confirm-message" aria-busy={pending}
      className="ui-dialog-panel ui-panel-enter w-full max-w-md bg-white rounded-2xl border p-5 sm:p-6 space-y-5">
      <h2 id="archive-confirm-title" className="text-xl font-bold flex items-center gap-3"><StateIcon icon="archive" className="text-red-700" />{title}</h2>
      <p id="archive-confirm-message" className="text-sm break-words">{message}</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <button data-dialog-close type="button" disabled={pending} onClick={cancel} className="min-h-11 px-3 py-2 rounded-xl text-[#253685] disabled:opacity-40">Cancelar</button>
        <button type="button" disabled={pending} onClick={onConfirm} className="min-h-11 px-3 py-2 rounded-xl text-red-700 font-semibold disabled:opacity-40">{pending ? 'Archivando…' : 'Archivar producto'}</button>
      </div>
    </section>
  </div>, document.body);
}
