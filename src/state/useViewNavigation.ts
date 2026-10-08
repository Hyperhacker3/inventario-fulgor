import { startTransition, useCallback, useEffect, useState } from 'react';
import type { ActiveView } from '../types';
import { navigateWithDialogs } from '../shared/dialogHistory';

const views: ActiveView[] = ['dashboard', 'explorer', 'dispatch', 'entries', 'history', 'warehouses', 'remissions', 'data-admin', 'projects'];
export function viewFromHash(hash: string): ActiveView {
  const view = hash.replace(/^#\/?/, '');
  if (view === 'new-item') return 'entries';
  return views.includes(view as ActiveView) ? view as ActiveView : 'dashboard';
}

export function useViewNavigation(onRestore?: () => void) {
  const [activeView, setView] = useState(() => viewFromHash(window.location.hash));
  const [navigationView, setNavigationView] = useState(activeView);
  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', '#/dashboard');
    const restore = () => {
      const view = viewFromHash(window.location.hash);
      setNavigationView(view);
      startTransition(() => setView(view));
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
    if (viewFromHash(window.location.hash) !== view) navigateWithDialogs(window, `#/${view}`);
    setNavigationView(view);
    startTransition(() => setView(view));
  }, []);
  return { activeView, navigationView, setActiveView };
}
