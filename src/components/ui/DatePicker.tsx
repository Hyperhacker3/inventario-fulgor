import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { calendarCells, calendarDate, calendarLabel, dateInRange, localToday, shiftCalendarDay, shiftCalendarMonth } from '../../domain/calendar';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { Presence, useMotionActive } from './Motion';
import { Select } from './Select';

interface Props {
  value: string; onChange: (value: string) => void; label: string;
  id?: string; name?: string; min?: string; max?: string; required?: boolean; disabled?: boolean; className?: string;
}

/** Spanish calendar with a native ISO form value and the application's dialog lifecycle. */
export function DatePicker({ value, onChange, label, id, name, min, max, required, disabled, className = '' }: Props) {
  const generated = useId();
  const controlId = id || `date-${generated}`;
  const titleId = `${controlId}-title`;
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const pendingFocus = useRef(false);
  const active = useMotionActive();
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [focused, setFocused] = useState(calendarDate(value) ? value : localToday());
  const [month, setMonth] = useState(focused.slice(0, 7));
  if (open && (!active || disabled)) setOpen(false);
  const expanded = open && active && !disabled;
  const close = () => setOpen(false);
  useDialogFocus(panel, close, expanded, '[data-calendar-focus="true"]');
  useEffect(() => {
    if (expanded && pendingFocus.current) {
      pendingFocus.current = false;
      panel.current?.querySelector<HTMLElement>('[data-calendar-focus="true"]')?.focus({ preventScroll: true });
    }
  }, [expanded, focused, month]);
  useEffect(() => {
    const observer = new window.MutationObserver(() => { if (trigger.current?.matches(':disabled')) setOpen(false); });
    let fieldset = trigger.current?.closest('fieldset');
    while (fieldset) {
      observer.observe(fieldset, { attributes: true, attributeFilter: ['disabled'] });
      fieldset = fieldset.parentElement?.closest('fieldset');
    }
    return () => observer.disconnect();
  }, []);
  const clamp = (date: string) => min && date < min ? min : max && date > max ? max : date;
  const show = () => {
    if (!active || trigger.current?.matches(':disabled')) return;
    const initial = clamp(calendarDate(value) ? value : localToday());
    trigger.current?.focus({ preventScroll: true });
    setFocused(initial); setMonth(initial.slice(0, 7)); setOpen(true);
  };
  const choose = (date: string) => {
    if (!active || trigger.current?.matches(':disabled') || (date && !dateInRange(date, min, max))) return;
    onChange(date); setInvalid(false); close();
  };
  const changeMonth = (date: string) => { const next = clamp(date); setMonth(next.slice(0, 7)); setFocused(next); };
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
    const weekday = (calendarDate(date)!.getUTCDay() + 6) % 7;
    const next = event.key === 'ArrowLeft' ? shiftCalendarDay(date, -1) : event.key === 'ArrowRight' ? shiftCalendarDay(date, 1)
      : event.key === 'ArrowUp' ? shiftCalendarDay(date, -7) : event.key === 'ArrowDown' ? shiftCalendarDay(date, 7)
      : event.key === 'Home' ? shiftCalendarDay(date, -weekday) : event.key === 'End' ? shiftCalendarDay(date, 6 - weekday)
      : event.key === 'PageUp' ? shiftCalendarMonth(date, -1) : event.key === 'PageDown' ? shiftCalendarMonth(date, 1) : null;
    if (next) { event.preventDefault(); pendingFocus.current = true; changeMonth(next); }
  };
  const cells = calendarCells(`${month}-01`);
  const year = Number(month.slice(0, 4)), monthIndex = Number(month.slice(5, 7)) - 1;
  const today = localToday();
  const firstYear = calendarDate(min || '')?.getUTCFullYear() ?? Math.min(year, Number(today.slice(0, 4))) - 100;
  const lastYear = calendarDate(max || '')?.getUTCFullYear() ?? Math.max(year, Number(today.slice(0, 4))) + 100;
  return <>
    <button ref={trigger} id={controlId} type="button" className={`app-select-trigger app-date-trigger ${className}`} aria-label={label}
      aria-haspopup="dialog" aria-expanded={expanded} aria-controls={`${controlId}-calendar`} aria-required={required || undefined}
      aria-invalid={invalid || undefined} disabled={disabled} onClick={show}>
      <span>{calendarDate(value) ? calendarLabel(value, { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Seleccione una fecha'}</span>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4m8-4v4" /></svg>
    </button>
    <input type="date" className="date-form-value" aria-hidden="true" tabIndex={-1} name={name} value={value} min={min} max={max} required={required} disabled={disabled}
      onChange={event => onChange(event.target.value)} onInvalid={event => { event.preventDefault(); setInvalid(true); trigger.current?.focus({ preventScroll: true }); }} />
    {createPortal(<Presence open={expanded}>{expanded && <div className="ui-modal-layer app-calendar-layer fixed inset-0 flex items-center justify-center p-3 bg-black/50">
      <button type="button" className="ui-backdrop absolute inset-0" tabIndex={-1} aria-label="Cerrar calendario al tocar fuera" onClick={close} />
      <section id={`${controlId}-calendar`} ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="app-calendar ui-dialog-panel ui-panel-enter relative bg-white rounded-2xl p-4 space-y-3 w-full max-w-[360px]">
        <div className="flex items-center justify-between gap-3"><h2 id={titleId} className="text-base font-bold min-w-0 break-words">{label}</h2>
          <button type="button" data-dialog-close onClick={close} aria-label="Cerrar calendario" className="w-11 h-11 shrink-0 rounded-xl">×</button></div>
        <div className="app-calendar-month">
          <button type="button" onClick={() => changeMonth(shiftCalendarMonth(`${month}-01`, -1))} disabled={!!min && month <= min.slice(0, 7)} aria-label="Mes anterior" className="w-11 h-11 rounded-xl">‹</button>
          <Select aria-label="Mes" value={String(monthIndex)} onChange={event => changeMonth(`${year}-${String(Number(event.target.value) + 1).padStart(2, '0')}-01`)}>
            {Array.from({ length: 12 }, (_, index) => <option key={index} value={index}>{calendarLabel(`2026-${String(index + 1).padStart(2, '0')}-01`, { month: 'long' })}</option>)}
          </Select>
          <Select aria-label="Año" value={String(year)} onChange={event => changeMonth(`${event.target.value}-${month.slice(5, 7)}-01`)}>
            {Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index).map(option => <option key={option} value={option}>{option}</option>)}
          </Select>
          <button type="button" onClick={() => changeMonth(shiftCalendarMonth(`${month}-01`, 1))} disabled={!!max && month >= max.slice(0, 7)} aria-label="Mes siguiente" className="w-11 h-11 rounded-xl">›</button>
        </div>
        <div role="grid" aria-label={calendarLabel(`${month}-01`, { month: 'long', year: 'numeric' })} className="app-calendar-grid">
          <div role="row" className="app-calendar-week">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => <span role="columnheader" key={day} className="text-xs text-center text-slate-500 py-1">{day}</span>)}</div>
          {Array.from({ length: 6 }, (_, row) => <div role="row" className="app-calendar-week" key={row}>
            {cells.slice(row * 7, row * 7 + 7).map(date => <div role="gridcell" aria-selected={value === date} key={date}>
              <button type="button" className="ui-flat-choice app-calendar-day w-full" data-date={date} data-calendar-focus={date === focused}
                data-adjacent={date.slice(0, 7) !== month} data-today={date === today} aria-label={calendarLabel(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                aria-pressed={value === date} tabIndex={date === focused ? 0 : -1} disabled={!dateInRange(date, min, max)}
                onFocus={() => setFocused(date)} onKeyDown={event => keyboard(event, date)} onClick={() => choose(date)}>{Number(date.slice(8, 10))}</button>
            </div>)}
          </div>)}
        </div>
        <div className="flex justify-between gap-3"><button type="button" className="px-3 rounded-xl" onClick={() => choose('')}>Limpiar</button>
          <button type="button" className="px-3 rounded-xl" disabled={!dateInRange(today, min, max)} onClick={() => choose(today)}>Hoy</button></div>
      </section>
    </div>}</Presence>, document.body)}
  </>;
}
