import { useState } from 'react';
import { emptyInventoryFilters, type InventoryFilters } from '../domain/explorer';
import type { ActiveView } from '../types';

export function useInventoryExplorer(setActiveView: (view: ActiveView) => void, closeDetail: () => void, clearSearch: (value: string) => void) {
  const [explorerState, setExplorerState] = useState(() => ({ filters: emptyInventoryFilters(), search: '', page: 1, filtersOpen: false }));
  // Selection survives pages, filters and screen changes, like the report selection.
  const [inventorySelection, setInventorySelection] = useState<{ active: boolean; ids: string[] }>({ active: false, ids: [] });
  const openLocationInventory = (filters: InventoryFilters) => {
    setExplorerState({ filters, search: '', page: 1, filtersOpen: true });
    clearSearch('');
    closeDetail();
    setActiveView('explorer');
  };
  return { explorerState, setExplorerState, openLocationInventory, inventorySelection, setInventorySelection };
}
