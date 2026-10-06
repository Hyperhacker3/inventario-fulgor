import { useEffect, useRef, type RefObject } from 'react';
import { useMotionActive } from '../components/ui/Motion';
import { isMobileCameraDevice } from '../shared/cameraDevices';

// Keep the focus lifecycle separate from changing callbacks and live inventory updates.
export function useDialogFocus(container: RefObject<HTMLElement | null>, onClose: () => void, open = true, desktopInitialFocus = '[data-dialog-close]') {
  const active = useMotionActive();
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open || !active) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const selector = isMobileCameraDevice(window.navigator) ? '[data-dialog-close]' : desktopInitialFocus;
    container.current?.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
    const keyboard = (event: KeyboardEvent) => {
      const activeDialog = document.activeElement?.closest('[role="dialog"]');
      if (activeDialog && activeDialog !== container.current) return;
      if (event.key === 'Escape' && document.activeElement?.matches('[role="combobox"][aria-expanded="true"]')) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close.current(); }
      if (event.key !== 'Tab') return;
      const controls = [...(container.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]') || [])]
        .filter(control => !control.closest('[hidden], [inert], .hidden, [aria-hidden="true"]') && control.closest('[role="dialog"]') === container.current);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !container.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !container.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keyboard, true);
      // Restoring an input on a phone would reopen the keyboard as the dialog closes.
      if (previous?.isConnected && !(isMobileCameraDevice(window.navigator) && previous.matches('input, textarea, [contenteditable="true"]'))) previous.focus({ preventScroll: true });
    };
  }, [container, open, active, desktopInitialFocus]);
}
