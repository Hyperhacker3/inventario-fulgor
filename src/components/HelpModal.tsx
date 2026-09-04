import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';

export const HelpModal: React.FC = () => {
  const { isHelpModalOpen, setIsHelpModalOpen, resetToDefaultData, isCloudConnected } = useInventory();
  const [activeTab, setActiveTab] = useState<'operacion' | 'nube'>('nube');
  const [copied, setCopied] = useState(false);

  if (!isHelpModalOpen) return null;

  const copySqlToClipboard = () => {
    fetch('/supabase_schema.sql')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load schema file');
        return res.text();
      })
      .then(text => {
        if (text.includes('<!doctype html>') || text.includes('<html')) {
          throw new Error('Received HTML instead of SQL');
        }
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(err => {
        console.warn('Could not copy SQL:', err);
      });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-auto shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#eaedff] text-[#253685] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">hub</span>
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#131b2e]">Guía y Conexión en la Nube</h3>
              <p className="text-xs text-[#767682]">FULGOR S.A.S. • Supabase, Vercel y Power BI</p>
            </div>
          </div>
          <button
            onClick={() => setIsHelpModalOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#767682] hover:text-[#131b2e] hover:bg-[#e2e8f0]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#e2e8f0] px-6 bg-white gap-4">
          <button
            onClick={() => setActiveTab('nube')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'nube'
                ? 'border-[#3e4e9e] text-[#253685]'
                : 'border-transparent text-[#767682] hover:text-[#131b2e]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">cloud_sync</span>
            <span>Supabase + Vercel + Power BI</span>
            {isCloudConnected && (
              <span className="bg-[#e6f4ea] text-[#137333] text-[10px] px-2 py-0.5 rounded-full font-bold">
                Activo
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('operacion')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'operacion'
                ? 'border-[#3e4e9e] text-[#253685]'
                : 'border-transparent text-[#767682] hover:text-[#131b2e]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">help_outline</span>
            <span>Estándares de Bodega</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-5 text-xs sm:text-sm text-[#454651] leading-relaxed">
          {activeTab === 'nube' ? (
            <div className="flex flex-col gap-4">
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                isCloudConnected
                  ? 'bg-[#e6f4ea]/70 border-[#ceead6]'
                  : 'bg-[#fff8e1] border-[#ffe082]'
              }`}>
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-[22px] ${isCloudConnected ? 'text-[#137333]' : 'text-[#f57f17]'}`}>
                    {isCloudConnected ? 'cloud_done' : 'cloud_off'}
                  </span>
                  <div>
                    <h5 className="font-bold text-xs sm:text-sm text-[#131b2e]">
                      {isCloudConnected ? 'Base de datos Supabase conectada' : 'Modo Local (Offline)'}
                    </h5>
                    <p className="text-[11px] text-[#5f6368]">
                      {isCloudConnected
                        ? 'Las remisiones y despachos se sincronizan en tiempo real con PostgreSQL.'
                        : 'Para habilitar base de datos multiusuario y Power BI, sigue los 3 pasos a continuación.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 1 */}
              <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-xs sm:text-sm text-[#253685] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#eaedff] text-[#253685] inline-flex items-center justify-center text-[11px] font-bold">1</span>
                    Crear tablas en Supabase (1 Clic)
                  </h4>
                  <button
                    onClick={copySqlToClipboard}
                    className="text-xs font-bold text-[#3e4e9e] hover:bg-[#eaedff] px-2.5 py-1 rounded-md border border-[#cbd5e1] transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    <span>{copied ? '¡Copiado!' : 'Copiar Script SQL'}</span>
                  </button>
                </div>
                <p className="text-xs text-[#767682] mb-2">
                  1. Ve a <strong>supabase.com</strong>, crea una cuenta gratuita y un proyecto.<br/>
                  2. Entra a la pestaña <strong>SQL Editor</strong> en el menú lateral izquierdo.<br/>
                  3. Pega el archivo <code className="bg-[#f1f5f9] px-1 py-0.5 rounded font-mono text-[11px]">supabase_schema.sql</code> (incluido en este proyecto) y dale a <strong>Run</strong>.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-2xs">
                <h4 className="font-bold text-xs sm:text-sm text-[#253685] flex items-center gap-1.5 mb-2">
                  <span className="w-5 h-5 rounded-full bg-[#eaedff] text-[#253685] inline-flex items-center justify-center text-[11px] font-bold">2</span>
                  Desplegar la Web en Vercel (Gratis)
                </h4>
                <p className="text-xs text-[#767682] mb-2">
                  1. En el menú superior de esta plataforma haz clic en <strong>Export / Download ZIP</strong> (o sincroniza con GitHub).<br/>
                  2. Ve a <strong>vercel.com</strong>, inicia sesión y selecciona <strong>Add New &gt; Project</strong>.<br/>
                  3. En la sección <strong>Environment Variables</strong> agrega:
                </p>
                <div className="bg-[#1e293b] text-white p-2.5 rounded-lg font-mono text-[11px] space-y-1">
                  <div><span className="text-[#38bdf8]">VITE_SUPABASE_URL</span>=https://xyzcompany.supabase.co</div>
                  <div><span className="text-[#38bdf8]">VITE_SUPABASE_ANON_KEY</span>=eyJhbGciOi...</div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-2xs">
                <h4 className="font-bold text-xs sm:text-sm text-[#253685] flex items-center gap-1.5 mb-2">
                  <span className="w-5 h-5 rounded-full bg-[#eaedff] text-[#253685] inline-flex items-center justify-center text-[11px] font-bold">3</span>
                  Conectar Power BI a Supabase
                </h4>
                <p className="text-xs text-[#767682] mb-2">
                  1. En Supabase ve a <strong>Project Settings &gt; Database</strong> y busca <strong>Connection parameters</strong>.<br/>
                  2. Abre <strong>Power BI Desktop</strong> &gt; <strong>Obtener datos</strong> &gt; <strong>Base de datos PostgreSQL</strong>.<br/>
                  3. Ingresa los parámetros de conexión:
                </p>
                <ul className="list-disc pl-5 text-xs text-[#454651] space-y-0.5">
                  <li><strong>Servidor:</strong> <code className="bg-[#f1f5f9] px-1 rounded font-mono">db.xyzcompany.supabase.co:5432</code></li>
                  <li><strong>Base de datos:</strong> <code className="bg-[#f1f5f9] px-1 rounded font-mono">postgres</code></li>
                  <li><strong>Autenticación:</strong> Usuario <code className="bg-[#f1f5f9] px-1 rounded font-mono">postgres</code> y la contraseña que elegiste.</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Tab Operacion */
            <div className="flex flex-col gap-4">
              <div className="bg-[#eaedff]/50 border border-[#cbd5e1] p-4 rounded-xl">
                <h4 className="font-bold text-sm text-[#253685] mb-1">
                  1. Estándar de Codificación (SKU AAA000)
                </h4>
                <p className="text-xs">
                  Todo componente fotovoltaico debe registrarse con un código único de 6 caracteres alfanuméricos:
                  3 letras identificando la categoría y 3 dígitos correlativos (ej. <strong>PAN550</strong> para paneles,
                  <strong> INV100</strong> para inversores, <strong>CAB600</strong> para cables).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-[#131b2e] mb-1">
                  2. Jerarquía de Almacenes en Cascada
                </h4>
                <p className="text-xs">
                  La ubicación física está organizada en 3 niveles estrictos: <strong>Almacén</strong> (ej. Almacén Principal BOG-01)
                  &rarr; <strong>Estantería / Rack</strong> (ej. EST-A01 Zona Paneles) &rarr; <strong>Caja / Nivel</strong> (ej. CAJ-1045).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-[#131b2e] mb-1">
                  3. Salida de Material & Remisiones Oficiales
                </h4>
                <p className="text-xs">
                  La vista de <strong>Despacho</strong> permite seleccionar múltiples componentes, verificar el stock disponible en tiempo real,
                  asignar el proyecto solar de destino y generar la <strong>Remisión en formato A4</strong> con numeración consecutiva
                  (REM-YYYY-XXXX), firmas de entrega y recepción.
                </p>
              </div>

              <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-xs text-[#131b2e]">Restablecer Datos de Demostración</h5>
                  <p className="text-[11px] text-[#767682]">Restaura el inventario inicial con paneles, inversores y cables solares.</p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('¿Desea restaurar todos los datos a los valores iniciales de demostración?')) {
                      resetToDefaultData();
                      setIsHelpModalOpen(false);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-white border border-[#e2e8f0] text-xs font-bold text-[#dd4c42] hover:bg-[#fce8e6] rounded-lg transition-colors shadow-2xs"
                >
                  Restablecer Demo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#e2e8f0] bg-[#f8fafc] flex justify-end">
          <button
            onClick={() => setIsHelpModalOpen(false)}
            className="px-5 py-2 bg-[#3e4e9e] text-white text-xs font-bold rounded-lg hover:bg-[#323f80]"
          >
            Cerrar Guía
          </button>
        </div>
      </div>
    </div>
  );
};

