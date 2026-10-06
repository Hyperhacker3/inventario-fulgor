import { createContext, useContext, useEffect, useState, type ReactNode, type SyntheticEvent } from 'react';

export const MOTION_DURATION = 180;
const MotionActive = createContext(true);
export const useMotionActive = () => useContext(MotionActive);
const duration = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : MOTION_DURATION;

/** Keep the last content during closing, but immediately disable its interactions. */
export function Presence({ open, children }: { open: boolean; children: ReactNode }) {
  const parentActive = useMotionActive();
  const [state, setState] = useState({ open, present: open, content: children });
  if (state.open !== open || (open && state.content !== children)) {
    setState({ open, present: open || state.present, content: open ? children : state.content });
  }
  useEffect(() => {
    if (open || !state.present) return;
    const timer = window.setTimeout(() => setState(current => current.open ? current : { ...current, present: false }), duration());
    return () => window.clearTimeout(timer);
  }, [open, state.present]);
  if (!state.present) return null;
  const visible = parentActive && open;
  const guard = (event: SyntheticEvent) => { if (!visible) { event.preventDefault(); event.stopPropagation(); } };
  return <MotionActive value={visible}><div className="ui-presence" data-open={visible} inert={!visible} aria-hidden={!visible || undefined}
    onClickCapture={guard} onKeyDownCapture={guard} onSubmitCapture={guard}>{state.content}</div></MotionActive>;
}

/** Crossfade keyed screens without keeping a hidden, interactive copy of the old screen. */
export function ScreenTransition({ screen, children, className = '' }: { screen: string; children: ReactNode; className?: string }) {
  const parentActive = useMotionActive();
  const [state, setState] = useState({ screen, content: children, previous: null as { screen: string; content: ReactNode } | null });
  if (screen !== state.screen) setState({ screen, content: children, previous: { screen: state.screen, content: state.content } });
  else if (children !== state.content) setState({ ...state, content: children });
  const previousScreen = state.previous?.screen;
  useEffect(() => {
    if (!previousScreen) return;
    const timer = window.setTimeout(() => setState(current => ({ ...current, previous: null })), duration());
    return () => window.clearTimeout(timer);
  }, [previousScreen, screen]);
  const entries = [...(state.previous ? [state.previous] : []), { screen: state.screen, content: state.content }];
  return <div className={`ui-screen-transition ${className}`}>{entries.map(entry => {
    const active = entry.screen === screen;
    return <MotionActive key={entry.screen} value={parentActive && active}><div className={active ? 'ui-screen-current ui-view-enter' : 'ui-screen-previous ui-panel-exit'} inert={!active} aria-hidden={!active || undefined}>{entry.content}</div></MotionActive>;
  })}</div>;
}
