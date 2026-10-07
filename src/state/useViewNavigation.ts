import { startTransition, useCallback, useEffect, useState } from 'react';
import type { ActiveView } from '../types';

const views: ActiveView[] = ['dashboard', 'explorer', 'dispatch', 'entries', 'history', 'warehouses', 'remissions', 'data-admin', 'projects'];
export function viewFromHash(hash: string): ActiveView {
  const view = hash.replace(/^#\/?/, '');
  if (view === 'new-item') return 'entries';
  return views.includes(view as ActiveView) ? view as ActiveView : 'dashboard';
}

export function useViewNavigation(onRestore?: () => void) {
  const [activeView, setView] = useState(() => viewFromHash(window.location.hash));
  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', '#/dashboard');
    const restore = () => {
      startTransition(() => setView(viewFromHash(window.location.hash)));
      onRestore?.();
    };
    window.addEventListener('popstate', restore);
    window.addEventListener('hashchange', restore);
    return () => {
      window.removeEventListener('popstate', restore);
      window.removeEventListener('hashchange', restore);
    };
  }, [onRestore]);
  const setActiveView = useCallback((view: ActiveView) => {
    if (viewFromHash(window.location.hash) !== view) window.history.pushState(null, '', `#/${view}`);
    startTransition(() => setView(view));
  }, []);
  return { activeView, setActiveView };
}
