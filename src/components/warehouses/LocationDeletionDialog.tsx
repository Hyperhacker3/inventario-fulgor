import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { errorMessage } from '../../shared/errors';
import type { LocationKind } from '../../types';
import { useMotionActive } from '../ui/Motion';
import { StateIcon } from '../ui/StateIcon';

export type LocationDeletionTarget = { kind: LocationKind; id: string; code: string; name: string; location: string };
export function LocationDeletionDialog({ target, onDelete, onClose }: {
  target: LocationDeletionTarget; onDelete: (kind: LocationKind, id: string) => Promise<void>; onClose: () => void;
}) {
  const heading = useId(), message = useId();
  const dialog = useRef<HTMLElement>(null), saving = useRef(false);
  const active = useMotionActive();
  const [pending, setPending] = useState(false), [error, setError] = useState('');
  const close = () => { if (!saving.current && active) onClose(); };
  useDialogFocus(dialog, close);
  const remove = async () => {
    if (saving.current || !active) return;
    saving.current = true; setPending(true); setError('');
    try { await onDelete(target.kind, target.id); onClose(); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { saving.current = false; setPending(false); }
  };
  const name = { almacen: 'almacén', estanteria: 'estantería', nivel: 'nivel', caja: 'caja' }[target.kind];
  return createPortal(<div className="ui-modal-layer fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-busy={pending} aria-labelledby={heading} aria-describedby={message}
      className="ui-dialog-panel ui-panel-enter bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[calc(var(--app-viewport-height,100dvh)-32px)] overflow-y-auto p-5 sm:p-6 space-y-4">
      <h2 id={heading} className="font-bold text-lg flex items-center gap-3"><StateIcon icon="delete" />Eliminar {name}</h2>
      <div id={message} className="text-sm break-words space-y-2">
        <p>Se eliminará <strong>{target.code}{target.name ? ` · ${target.name}` : ''}</strong>{target.location ? ` de ${target.location}` : ''}. Esta acción no se puede deshacer.</p>
        <p>Solo se pueden eliminar ubicaciones sin productos asignados, incluidos los archivados, ni ubicaciones dependientes.</p>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="responsive-actions">
        <button type="button" data-action="cancel" data-dialog-close disabled={pending} onClick={close} className="rounded-lg px-4 py-2">Cancelar</button>
        <button type="button" disabled={pending} onClick={() => { void remove(); }} className="text-red-700 rounded-lg px-4 py-2">{pending ? 'Eliminando…' : 'Confirmar eliminación'}</button>
      </div>
    </section>
  </div>, document.body);
}
