import { APPEARANCE_TRANSITION_MS } from './theme';

/** Animate root appearance without copying DOM, remounting views or losing drafts. */
export function transitionAppearance(update: () => void, sweep: boolean): () => void {
  const root = document.documentElement;
  let cancelled = false;
  let transition: ViewTransition | undefined;
  let timer: number | undefined;
  const clear = () => {
    delete root.dataset.themeChanging;
    delete root.dataset.themeSweeping;
  };
  const apply = () => { if (!cancelled) update(); };
  const fallback = () => {
    root.dataset.themeChanging = 'true';
    apply();
    timer = window.setTimeout(clear, APPEARANCE_TRANSITION_MS + 50);
  };
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced) apply();
  else if (sweep && typeof document.startViewTransition === 'function') {
    root.dataset.themeSweeping = 'true';
    try {
      transition = document.startViewTransition(apply);
      // Captures can be skipped (for example in a background tab); still apply the choice.
      void transition.ready.catch(() => {});
      void transition.updateCallbackDone.catch(() => { if (!cancelled) apply(); });
      void transition.finished.then(() => { if (!cancelled) clear(); }, () => { if (!cancelled) clear(); });
    } catch {
      delete root.dataset.themeSweeping;
      fallback();
    }
  } else fallback();
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
    transition?.skipTransition();
    clear();
  };
}
