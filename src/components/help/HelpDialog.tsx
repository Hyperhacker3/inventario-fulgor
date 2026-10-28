import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { helpGuide } from './helpGuide';

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLElement>(null), id = useId();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  useDialogFocus(dialog, onClose, open);
  return createPortal(<div className="ui-modal-layer fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4">
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} className="ui-dialog-panel ui-panel-enter bg-white rounded-2xl shadow-xl border max-w-2xl w-full max-h-[90dvh] flex flex-col overflow-hidden">
      <header className="shrink-0 flex gap-3 justify-between items-center p-5 border-b"><h2 id={`${id}-title`} className="text-xl font-bold text-[#253685]">Ayuda y guía</h2>
        <button type="button" data-dialog-close onClick={onClose} aria-label="Cerrar ayuda" className="shrink-0 min-w-11 min-h-11 text-xl">×</button></header>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4 text-sm leading-relaxed text-[#454651]">
        {helpGuide.map((section, index) => <section key={section.title}>
          <h3><button type="button" id={`${id}-topic-${index}`} aria-expanded={!!expanded[index]} aria-controls={`${id}-content-${index}`}
            onClick={() => setExpanded(current => ({ ...current, [index]: !current[index] }))}
            className="help-topic-toggle ui-flat-choice w-full min-h-11 p-3 rounded-xl flex gap-3 items-center justify-between text-left font-bold uppercase text-[#253685]">
            <span>{section.title.toLocaleUpperCase('es')}</span>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`shrink-0 transition-transform duration-180 motion-reduce:transition-none ${expanded[index] ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
          </button></h3>
          <div id={`${id}-content-${index}`} hidden={!expanded[index]} aria-labelledby={`${id}-topic-${index}`}>
            <ul className="list-disc pl-7 pr-3 pt-4 pb-2 space-y-2">{section.items.map(item => <li key={item}>{item}</li>)}</ul>
          </div>
        </section>)}
      </div>
    </section>
  </div>, document.body);
}
