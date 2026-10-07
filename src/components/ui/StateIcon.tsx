import type { ReactNode } from 'react';

// These line-based symbols need an explicit solid variant: the font's FILL axis
// alone does not give their arrows, sliders and clock a visible selected state.
const shapes: Record<string, { outline: ReactNode; solid: ReactNode }> = {
  edit: {
    outline: <path d="m16 3 5 5M4 15 16 3a2.1 2.1 0 0 1 5 5L9 20l-6 1 1-6Z" />,
    solid: <path d="m16 3 5 5M4 15 16 3a2.1 2.1 0 0 1 5 5L9 20l-6 1 1-6Z" fill="currentColor" />,
  },
  input: {
    outline: <path d="M5 8V4h15v16H5v-4M3 12h11m-4-4 4 4-4 4" />,
    solid: <path fill="currentColor" stroke="none" fillRule="evenodd" d="M3 3h18v18H3v-5h3v2h12V6H6v2H3Zm0 7h8V7l6 5-6 5v-3H3Z" />,
  },
  history: {
    outline: <><path d="M3 10a9 9 0 1 1 1 7M3 4v6h6m3-3v5l3 2" /></>,
    solid: <path fill="currentColor" stroke="none" fillRule="evenodd" d="M12 3a9 9 0 1 1-8 13l2-1a7 7 0 1 0 0-7h3v3H2V4h3v2a9 9 0 0 1 7-3Zm-1 4h2v5l3 2-1 2-4-3Z" />,
  },
  tune: {
    outline: <><path d="M3 6h5m4 0h9M3 12h11m4 0h3M3 18h2m4 0h12" /><circle cx="10" cy="6" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="7" cy="18" r="2" /></>,
    solid: <><path d="M3 6h18M3 12h18M3 18h18" /><g fill="currentColor"><circle cx="10" cy="6" r="3" /><circle cx="16" cy="12" r="3" /><circle cx="7" cy="18" r="3" /></g></>,
  },
  shopping_cart_checkout: {
    outline: <><path d="M2 3h3l3 13h11M7 7h6m7 4-1 5M16 4h6m-3-3 3 3-3 3" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
    solid: <><path d="M2 3h3l3 13h11M16 4h6m-3-3 3 3-3 3" /><path fill="currentColor" stroke="none" d="m6 7 2 9h11l2-8H6Z" /><g fill="currentColor"><circle cx="10" cy="20" r="2" /><circle cx="18" cy="20" r="2" /></g></>,
  },
  add_shopping_cart: {
    outline: <><path d="M2 3h3l3 13h11l2-7M7 7h3m5-6v8m-4-4h8" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
    solid: <><path d="M2 3h3l3 13h11l2-7m-6-8v8m-4-4h8" /><path fill="currentColor" stroke="none" d="m7 10 1 6h11l2-6H7Z" /><g fill="currentColor"><circle cx="10" cy="20" r="2" /><circle cx="18" cy="20" r="2" /></g></>,
  },
  tag: {
    outline: <path d="m9 3-2 18M17 3l-2 18M3 9h18M2 15h18" />,
    solid: <path d="m9 3-2 18M17 3l-2 18M3 9h18M2 15h18" strokeWidth="3.5" />,
  },
  shelves: {
    outline: <><path d="M4 3v18M20 3v18M4 10h16M4 18h16" /><path d="M7 5h4v5H7zm6 7h4v6h-4z" /></>,
    solid: <><path d="M4 3v18M20 3v18M4 10h16M4 18h16" strokeWidth="3" /><path fill="currentColor" d="M7 5h4v5H7zm6 7h4v6h-4z" /></>,
  },
  logout: {
    outline: <path d="M10 4H4v16h6m0-8h11m-4-4 4 4-4 4" />,
    solid: <><path fill="currentColor" stroke="none" d="M3 3h8v5H9V6H6v12h3v-2h2v5H3Z" /><path d="M10 12h11m-4-4 4 4-4 4" strokeWidth="3" /></>,
  },
};

/** Selection persists for navigation; action buttons inherit their interaction state. */
export function StateIcon({ icon, filled = false, className = 'text-2xl' }: { icon: string; filled?: boolean; className?: string }) {
  const shape = shapes[icon];
  const state = { 'data-icon': icon, 'data-filled': filled, 'aria-hidden': true as const };
  return shape
    ? <svg {...state} className={`ui-state-icon ${className}`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <g className="ui-icon-outline">{shape.outline}</g><g className="ui-icon-solid">{shape.solid}</g>
    </svg>
    : <span {...state} className={`material-symbols-outlined ui-state-icon ${className}`}>{icon}</span>;
}
