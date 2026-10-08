import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { Presence, useMotionActive } from '../ui/Motion';
import { StateIcon } from '../ui/StateIcon';

export function ItemEditDialog({ code, busy, onClose, children }: {
  code: string; busy: boolean; onClose: () => void; children: ReactNode;
}) {
  const heading = useId();
  const dialog = useRef<HTMLElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const active = useMotionActive();
  const close = () => { if (!busy) onClose(); };
  useLayoutEffect(() => { if (active && scroll.current) scroll.current.scrollTop = 0; }, [active]);
  useDialogFocus(dialog, close, true, '[data-edit-heading]');
  return createPortal(<Presence open={active}><div className="ui-modal-layer fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-3 sm:p-6"
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} data-item-edit-dialog role="dialog" aria-modal="true" aria-labelledby={heading} aria-busy={busy}
      className="ui-dialog-panel ui-panel-enter bg-white rounded-2xl border shadow-2xl w-full max-w-2xl max-h-[calc(var(--app-viewport-height,100dvh)-24px)] flex flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-3 p-4 sm:p-6">
        <h2 id={heading} data-edit-heading tabIndex={-1} data-action="edit" className="font-bold text-xl flex items-center gap-3 min-w-0 break-words"><StateIcon icon="edit" />Editar {code}</h2>
        <button type="button" data-dialog-close aria-label="Cerrar edición" disabled={busy} onClick={close}
          className="shrink-0 min-w-11 min-h-11 text-2xl disabled:opacity-40">×</button>
      </header>
      <div ref={scroll} className="item-edit-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">{children}</div>
    </section>
  </div></Presence>, document.body);
}
