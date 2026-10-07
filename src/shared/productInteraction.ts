import type { MouseEvent } from 'react';

export function openProductSurface(event: MouseEvent<HTMLElement>, open: () => void) {
  // Preserve independent actions, disabled controls and text selection for copying.
  if ((event.target as Element).closest('button, a, input, select, textarea, [role="button"]')) return;
  if (window.getSelection()?.isCollapsed === false) return;
  open();
}
