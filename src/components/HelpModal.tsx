import { useInventory } from '../context/InventoryContext';
import { useRef } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { helpGuide } from './help/helpGuide';

export function HelpModal() {
  const { isHelpModalOpen, setIsHelpModalOpen } = useInventory();
  const dialog = useRef<HTMLElement>(null);
  useDialogFocus(dialog, () => setIsHelpModalOpen(false), isHelpModalOpen);
  return <div className="ui-modal-layer fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
    <section ref={dialog} role="dialog" aria-modal="true" aria-label="Ayuda y guía" className="ui-dialog-panel ui-panel-enter bg-white rounded-2xl shadow-xl border max-w-2xl w-full max-h-[90dvh] flex flex-col overflow-hidden">
      <header className="shrink-0 flex gap-3 justify-between items-center p-5 border-b"><h2 className="text-xl font-bold text-[#253685]">Ayuda y guía</h2>
        <button type="button" data-dialog-close onClick={() => setIsHelpModalOpen(false)} aria-label="Cerrar ayuda" className="shrink-0 min-w-11 min-h-11 text-xl">×</button></header>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-6 text-sm leading-relaxed text-[#454651]">
        {helpGuide.map(section => <section key={section.title} className="space-y-2">
          <h3 className="font-bold text-base text-[#253685]">{section.title}</h3>
          <ul className="list-disc pl-5 space-y-2">{section.items.map(item => <li key={item}>{item}</li>)}</ul>
        </section>)}
      </div>
    </section>
  </div>;
}
