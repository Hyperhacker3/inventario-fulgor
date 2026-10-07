import { Children, Fragment, isValidElement, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type SelectHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { Presence, useMotionActive } from './Motion';

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'multiple' | 'size' | 'defaultValue'> & {
  optionIcons?: Readonly<Record<string, string>>;
  optionColors?: Readonly<Record<string, string>>;
};
interface Choice { value: string; label: string; disabled: boolean }
function text(node: ReactNode): string {
  return Children.toArray(node).map(child => isValidElement<{ children?: ReactNode }>(child) ? text(child.props.children) : String(child)).join('');
}
function choices(node: ReactNode): Choice[] {
  return Children.toArray(node).flatMap(child => {
    if (!isValidElement<{ children?: ReactNode; value?: string | number; disabled?: boolean }>(child)) return [];
    if (child.type === Fragment) return choices(child.props.children);
    const label = text(child.props.children);
    return [{ value: String(child.props.value ?? label), label, disabled: !!child.props.disabled }];
  });
}

/** Styled select-only combobox. The hidden select preserves form validation and change events. */
export function Select({ children, className = '', id, style, onChange, onInvalid, optionIcons, optionColors, ...props }: Props) {
  const generated = useId();
  const controlId = id || `select-${generated}`;
  const listId = `${controlId}-options`;
  const options = choices(children);
  const value = String(props.value ?? '');
  const selected = options.findIndex(option => option.value === value);
  const selectedOption = options[selected] || options[0];
  const trigger = useRef<HTMLButtonElement>(null);
  const native = useRef<HTMLSelectElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ text: '', time: 0 });
  const active = useMotionActive();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 320 });
  if (open && (!active || props.disabled)) setOpen(false);
  const expanded = open && active && !props.disabled;
  const place = useCallback(() => {
    const rect = trigger.current!.getBoundingClientRect();
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop || 0;
    const bottom = top + (viewport?.height || window.innerHeight);
    const width = Math.min(Math.max(rect.width, 200), window.innerWidth - 24);
    const below = bottom - rect.bottom - 16;
    const above = rect.top - top - 16;
    const height = Math.max(44, Math.min(320, options.length * 44 + 12, Math.max(below, above)));
    const upward = below < Math.min(240, options.length * 44 + 12) && above > below;
    setPosition({ left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: upward ? Math.max(top + 12, rect.top - height - 6) : Math.max(top + 12, rect.bottom + 6), width, maxHeight: height });
  }, [options.length]);
  const show = (index = selected < 0 ? 0 : selected) => {
    if (trigger.current?.matches(':disabled') || !options.some(option => !option.disabled)) return;
    place(); trigger.current?.focus({ preventScroll: true });
    setHighlight(options[index]?.disabled ? options.findIndex(option => !option.disabled) : index); setOpen(true);
  };
  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled || trigger.current?.matches(':disabled') || !active) return;
    const element = native.current!;
    element.value = option.value;
    element.dispatchEvent(new window.Event('change', { bubbles: true }));
    setInvalid(false); setOpen(false); trigger.current?.focus({ preventScroll: true });
  };
  const move = (direction: number) => {
    let index = highlight;
    for (let count = 0; count < options.length; count++) {
      index = (index + direction + options.length) % options.length;
      if (!options[index].disabled) { setHighlight(index); break; }
    }
  };
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Home' || event.key === 'End') {
        const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
        const index = event.key === 'Home' ? enabled[0] : enabled.at(-1);
        if (index !== undefined) { if (!expanded) show(index); else setHighlight(index); }
      } else if (!expanded) show();
      else if (event.key === 'Enter' || event.key === ' ') choose(highlight);
      else move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Escape' && expanded) {
      event.preventDefault(); event.stopPropagation(); setOpen(false);
    } else if (event.key === 'Tab') setOpen(false);
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      const query = typeahead.current.time + 700 > now ? typeahead.current.text + event.key : event.key;
      typeahead.current = { text: query, time: now };
      const normalize = (label: string) => label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
      const index = options.findIndex(option => !option.disabled && normalize(option.label).startsWith(normalize(query)));
      if (index >= 0) { event.preventDefault(); if (!expanded) show(index); else setHighlight(index); }
    }
  };
  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setOpen(false);
    };
    // Closing on scroll keeps the list attached to its field and leaves touch scrolling inside it free.
    const scroll = (event: Event) => { if (!popup.current?.contains(event.target as Node)) setOpen(false); };
    const resize = () => place();
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('scroll', resize);
    return () => {
      document.removeEventListener('pointerdown', outside, true); document.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', resize); window.visualViewport?.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('scroll', resize);
    };
  }, [expanded, place]);
  useEffect(() => {
    const observer = new window.MutationObserver(() => { if (trigger.current?.matches(':disabled')) setOpen(false); });
    let fieldset = trigger.current?.closest('fieldset');
    while (fieldset) {
      observer.observe(fieldset, { attributes: true, attributeFilter: ['disabled'] });
      fieldset = fieldset.parentElement?.closest('fieldset');
    }
    return () => observer.disconnect();
  }, []);
  useEffect(() => { if (expanded) popup.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)?.scrollIntoView?.({ block: 'nearest' }); }, [expanded, highlight]);
  return <>
    <button type="button" ref={trigger} id={controlId} role="combobox" aria-haspopup="listbox" aria-controls={listId} aria-expanded={expanded}
      aria-activedescendant={expanded ? `${listId}-${highlight}` : undefined} aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']}
      aria-describedby={props['aria-describedby']} aria-required={props.required || undefined} aria-invalid={invalid || props['aria-invalid']}
      disabled={props.disabled} title={props.title || selectedOption?.label} style={style} className={`app-select-trigger ${className}`} onKeyDown={keyboard}
      onBlur={() => setOpen(false)} onClick={() => { if (expanded) setOpen(false); else show(); }}>
      <span className="app-select-value inline-flex items-center gap-2 min-w-0" style={{ color: selectedOption && optionColors?.[selectedOption.value] }}>
        {selectedOption && optionIcons?.[selectedOption.value] && <span className="material-symbols-outlined text-xl shrink-0" aria-hidden="true">{optionIcons[selectedOption.value]}</span>}
        <span>{selectedOption?.label || 'Seleccione una opción'}</span>
      </span><span className="app-select-chevron" aria-hidden="true" />
    </button>
    <select {...props} id={`${controlId}-value`} ref={native} tabIndex={-1} aria-hidden="true" className="select-form-value" onChange={onChange}
      onInvalid={event => { event.preventDefault(); setInvalid(true); trigger.current?.focus({ preventScroll: true }); onInvalid?.(event); }}>{children}</select>
    {createPortal(<Presence open={expanded}><div ref={popup} id={listId} role="listbox" aria-label={props['aria-label'] || 'Opciones'}
      className="app-select-list ui-panel-enter" style={position} onMouseDown={event => event.preventDefault()}>
      {options.map((option, index) => <button type="button" role="option" tabIndex={-1} key={`${index}:${option.value}`} id={`${listId}-${index}`} data-index={index}
        data-value={option.value} data-highlighted={highlight === index} aria-selected={value === option.value} disabled={option.disabled}
        className="app-select-option" onPointerMove={() => { if (!option.disabled) setHighlight(index); }} onClick={() => choose(index)}>
        <span className="inline-flex items-center gap-2 min-w-0" style={{ color: optionColors?.[option.value] }}>
          {optionIcons?.[option.value] && <span className="material-symbols-outlined text-xl shrink-0" aria-hidden="true">{optionIcons[option.value]}</span>}
          <span>{option.label}</span>
        </span>{value === option.value && <span aria-hidden="true">✓</span>}
      </button>)}
    </div></Presence>, document.body)}
  </>;
}
