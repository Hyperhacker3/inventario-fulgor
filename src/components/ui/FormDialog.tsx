import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { Presence, useMotionActive } from './Motion';
import { StateIcon } from './StateIcon';

export function FormDialog({ title, busy, onClose, children }: {
  title: string; busy: boolean; onClose: () => void; children: ReactNode;
}) {
  const heading = useId();
  const dialog = useRef<HTMLElement>(null);
  const active = useMotionActive();
  const close = () => { if (!busy) onClose(); };
  useDialogFocus(dialog, close, true, 'input:not(:disabled)');
  return createPortal(<Presence open={active}><div className="ui-modal-layer fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4"
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby={heading} aria-busy={busy}
      className="ui-dialog-panel ui-panel-enter bg-white rounded-2xl border shadow-xl w-full max-w-xl max-h-[calc(var(--app-viewport-height,100dvh)-24px)] overflow-y-auto p-5 sm:p-6">
      <header className="flex items-start justify-between gap-3 mb-4"><h2 id={heading} data-action="edit" className="font-bold text-lg flex items-center gap-3"><StateIcon icon={title.startsWith('Editar') ? 'edit' : 'add'} />{title}</h2>
        <button type="button" data-dialog-close aria-label="Cerrar formulario" disabled={busy} onClick={close} className="shrink-0 min-w-11 min-h-11 text-2xl disabled:opacity-40">×</button>
      </header>
      {children}
    </section>
  </div></Presence>, document.body);
}
