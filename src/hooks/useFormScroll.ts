import { useCallback, useEffect, useRef, type FormEvent } from 'react';
import { useMotionActive } from '../components/ui/Motion';

const behavior = (): ScrollBehavior => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

/** Follow native validation and async/inline alerts within this form's page. */
export function useFormScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const active = useMotionActive();
  const target = useRef<HTMLElement | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const reveal = useCallback((element: HTMLElement) => {
    if (timer.current !== undefined) return; // Native validation can report several fields at once.
    target.current = element;
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      const node = target.current === ref.current ? ref.current?.querySelector<HTMLElement>('[role="alert"]') : target.current;
      if (!node || !ref.current?.contains(node) || node.closest('[inert], [hidden], [aria-hidden="true"]')) return;
      node.scrollIntoView?.({ behavior: behavior(), block: 'center', inline: 'nearest' });
      if (node.matches('[role="alert"]')) {
        node.tabIndex = -1;
      }
      node.focus({ preventScroll: true });
    }, 0);
  }, []);
  useEffect(() => {
    if (!active || !ref.current) return;
    const observer = new window.MutationObserver(records => {
      const changed = new Set<Element>();
      for (const record of records) {
        const parent = record.target instanceof window.Element ? record.target : record.target.parentElement;
        const enclosingAlert = parent?.closest('[role="alert"]');
        if (enclosingAlert) changed.add(enclosingAlert);
        for (const node of record.addedNodes) {
          if (!(node instanceof window.Element)) continue;
          if (node.matches('[role="alert"]')) changed.add(node);
          node.querySelectorAll('[role="alert"]').forEach(alert => changed.add(alert));
        }
      }
      const alert = [...(ref.current?.querySelectorAll<HTMLElement>('[role="alert"]') || [])]
        .find(node => changed.has(node) && node.textContent?.trim() && !node.closest('[inert], [hidden], [aria-hidden="true"]'));
      if (alert) reveal(alert);
    });
    observer.observe(ref.current, { childList: true, subtree: true, characterData: true });
    return () => { observer.disconnect(); window.clearTimeout(timer.current); timer.current = undefined; };
  }, [active, reveal]);
  const onInvalidCapture = (event: FormEvent<HTMLElement>) => {
    if (!active) return;
    const field = event.target as HTMLElement;
    // Styled selects retain a visually hidden native select for validation.
    const visible = field.matches('.select-form-value') ? field.previousElementSibling as HTMLElement | null : field;
    if (visible) reveal(visible);
  };
  const scrollToStart = () => {
    window.clearTimeout(timer.current); timer.current = undefined;
    if (!ref.current || ref.current.closest('[inert], [hidden], [aria-hidden="true"]')) return;
    const scroller = ref.current?.closest<HTMLElement>('.app-main');
    if (scroller) scroller.scrollTo?.({ top: 0, behavior: behavior() });
    else ref.current?.scrollIntoView?.({ block: 'start', behavior: behavior() });
  };
  const revealError = () => { if (active && ref.current) reveal(ref.current); };
  return { ref, onInvalidCapture, scrollToStart, revealError };
}
