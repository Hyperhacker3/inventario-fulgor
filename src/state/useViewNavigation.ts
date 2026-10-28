import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveView } from '../types';
import { navigateWithDialogs } from '../shared/dialogHistory';

const views: ActiveView[] = ['dashboard', 'explorer', 'dispatch', 'entries', 'history', 'warehouses', 'remissions', 'reports', 'data-admin', 'projects'];
export function viewFromHash(hash: string): ActiveView {
  const view = hash.replace(/^#\/?/, '');
  if (view === 'new-item') return 'entries';
  return views.includes(view as ActiveView) ? view as ActiveView : 'dashboard';
}

export function useViewNavigation(onRestore?: () => void) {
  const [activeView, setView] = useState(() => viewFromHash(window.location.hash));
  const [navigationView, setNavigationView] = useState(activeView);
  const routeHash = useRef(window.location.hash || '#/dashboard');
  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', '#/dashboard');
    const restore = () => {
      // Dialog/menu history cleanup can emit a late event for the current route.
      // Only a real route change should dismiss a newly opened overlay.
      if (routeHash.current === window.location.hash) return;
      routeHash.current = window.location.hash;
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
    routeHash.current = window.location.hash;
    setNavigationView(view);
    startTransition(() => setView(view));
  }, []);
  return { activeView, navigationView, setActiveView };
}
