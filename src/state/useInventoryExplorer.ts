import { useState } from 'react';
import { emptyInventoryFilters, type InventoryFilters } from '../domain/explorer';
import type { ActiveView } from '../types';

export function useInventoryExplorer(setActiveView: (view: ActiveView) => void, closeDetail: () => void, clearSearch: (value: string) => void) {
  const [explorerState, setExplorerState] = useState(() => ({ filters: emptyInventoryFilters(), search: '', page: 1, filtersOpen: false }));
  const openLocationInventory = (filters: InventoryFilters) => {
    setExplorerState({ filters, search: '', page: 1, filtersOpen: true });
    clearSearch('');
    closeDetail();
    setActiveView('explorer');
  };
  return { explorerState, setExplorerState, openLocationInventory };
}
