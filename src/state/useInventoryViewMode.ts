import { useState } from 'react';

type ViewMode = 'grid' | 'list';
const preferenceKey = 'fulgor_pref_explorer_view';
export function useInventoryViewMode() {
  const [mode, setMode] = useState<ViewMode>(() => {
    try { return localStorage.getItem(preferenceKey) === 'list' ? 'list' : 'grid'; }
    catch { return 'grid'; }
  });
  const selectMode = (value: ViewMode) => {
    setMode(value);
    try { localStorage.setItem(preferenceKey, value); } catch { /* keep in memory if storage is unavailable */ }
  };
  return [mode, selectMode] as const;
}
