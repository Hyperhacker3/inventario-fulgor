import { useInventory } from '../context/InventoryContext';
import { isDemo } from '../lib/supabase';
import { useRef } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';

export function HelpModal() {
  const { isHelpModalOpen, setIsHelpModalOpen, resetToDefaultData, syncStatus } = useInventory();
  const dialog = useRef<HTMLElement>(null);
  useDialogFocus(dialog, () => setIsHelpModalOpen(false), isHelpModalOpen);
  return <div className="ui-modal-layer fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
    <section ref={dialog} role="dialog" aria-modal="true" aria-label="Ayuda" className="ui-dialog-panel ui-panel-enter bg-white rounded-2xl shadow-xl border max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
      <header className="flex justify-between items-center"><h2 className="text-xl font-bold text-[#253685]">Ayuda y conexión</h2>
        <button type="button" data-dialog-close onClick={() => setIsHelpModalOpen(false)} aria-label="Cerrar ayuda" className="min-w-11 min-h-11 text-xl">×</button></header>
      <p className="text-sm"><strong>Estado:</strong> {isDemo ? 'Demostración local' : syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'syncing' ? 'Sincronizando…' : 'Sin conexión o con error de consulta'}</p>
      <div className="space-y-3 text-sm text-[#454651]">
        <p><strong>Inventario:</strong> busque por código, nombre o marca, consulte la ubicación y edite la ficha si tiene permisos.</p>
        <p><strong>Ubicación:</strong> almacén → estantería → nivel → caja. Cree niveles desde Administración de datos, Almacenes o Nuevo ítem. Edite las cajas anteriores para asignarles un nivel.</p>
        <p><strong>Archivados:</strong> administración puede abrir un elemento desde Administración de datos → Archivados y pulsar Desarchivar para devolverlo al inventario activo, o eliminarlo definitivamente con confirmación.</p>
        <p><strong>Movimientos:</strong> entradas y ajustes registran responsable, fecha y stock anterior y nuevo.</p>
        <p><strong>Entradas:</strong> busque un material, indique la cantidad recibida y su motivo. Al confirmar se aumenta el stock y se guarda el movimiento, sin generar una remisión.</p>
        <p><strong>Salidas:</strong> seleccione el material y proyecto. Puede tomar o subir fotos opcionales; el historial tiene accesos separados a PDF y Fotos. Las fotos quedan fuera del PDF. El stock se confirma cuando la base de datos acepta la remisión.</p>
        <p><strong>Instalación:</strong> siga el README y aplique las migraciones versionadas en un entorno de pruebas. Cree cuentas y roles desde la administración de Supabase.</p>
      </div>
      {isDemo && <div className="bg-[#f8fafc] rounded-xl p-4 flex justify-between gap-3 items-center text-sm">
        <div><strong>Restablecer demostración</strong><p>Reemplaza los datos locales de este navegador.</p></div>
        <button className="border border-red-200 text-red-700 rounded-lg px-3 py-2" onClick={() => {
          if (window.confirm('¿Restablecer los datos de demostración locales?')) { resetToDefaultData(); setIsHelpModalOpen(false); }
        }}>Restablecer</button>
      </div>}
      <footer className="flex justify-end"><button className="bg-[#3e4e9e] text-white rounded-lg px-5 py-2" onClick={() => setIsHelpModalOpen(false)}>Cerrar</button></footer>
    </section>
  </div>;
}
