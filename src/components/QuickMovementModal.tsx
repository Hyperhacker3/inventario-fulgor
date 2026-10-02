import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { errorMessage } from '../shared/errors';
import { NumberInput } from './NumberInput';

export const QuickMovementModal: React.FC = () => {
  const {
    quickMovementItem,
    quickMovementType,
    closeQuickMovement,
    addStockMovement,
    user
  } = useInventory();

  const [cantidad, setCantidad] = useState(quickMovementType === 'ENTRADA' ? 50 : 0);
  const [motivo, setMotivo] = useState(
    quickMovementType === 'ENTRADA'
      ? 'Recepción orden de compra solar'
      : 'Ajuste por conteo físico cíclico'
  );
  const [responsable, setResponsable] = useState(user.name);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());

  if (!quickMovementItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cantidad === 0 && quickMovementType === 'ENTRADA') return;

    setError(''); setPending(true);
    try { await addStockMovement({
      elementoId: quickMovementItem.id,
      tipo: quickMovementType,
      cantidad: quickMovementType === 'ENTRADA' ? Math.abs(cantidad) : cantidad,
      motivo: motivo.trim() || 'Movimiento rápido de inventario',
      responsable: responsable.trim() || user.name,
      requestId
    }); closeQuickMovement(); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setPending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                quickMovementType === 'ENTRADA'
                  ? 'bg-[#e6f4ea] text-[#137333]'
                  : 'bg-[#fef7e0] text-[#755b00]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {quickMovementType === 'ENTRADA' ? 'input' : 'tune'}
              </span>
            </span>
            <div>
              <h3 className="font-bold text-base text-[#131b2e]">
                {quickMovementType === 'ENTRADA' ? 'Entrada de Stock' : 'Ajuste de Inventario'}
              </h3>
              <p className="text-xs font-mono-code font-bold text-[#3e4e9e]">
                {quickMovementItem.codigo} • {quickMovementItem.nombre}
              </p>
            </div>
          </div>

          <button
            onClick={closeQuickMovement}
            className="text-[#767682] hover:text-[#131b2e] p-1"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
          <div className="bg-[#f8fafc] p-3 rounded-lg border border-[#e2e8f0] flex justify-between items-center text-xs">
            <span className="text-[#454651]">Stock Actual en Bodega:</span>
            <span className="font-mono-code font-bold text-sm text-[#131b2e]">
              {quickMovementItem.stockPendiente ? 'Pendiente' : `${quickMovementItem.cantidad} ${quickMovementItem.unidad}`}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#454651] mb-1">
              {quickMovementItem.stockPendiente
                ? `Stock verificado (${quickMovementItem.unidad})`
                : quickMovementType === 'ENTRADA'
                ? `Cantidad a Ingresar (${quickMovementItem.unidad})`
                : `Variación de Stock (+ o - ${quickMovementItem.unidad})`}
            </label>
            <NumberInput
              value={cantidad}
              onValueChange={setCantidad}
              step="0.001"
              className="w-full px-3 py-2 rounded-lg border font-mono-code font-bold text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#454651] mb-1">
              Motivo o Justificación
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#454651] mb-1">
              Responsable
            </label>
            <input
              type="text"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#e2e8f0]">
            <button
              type="button"
              onClick={closeQuickMovement}
              className="px-4 py-2 rounded-lg border text-xs font-semibold text-[#454651]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className={`px-5 py-2 rounded-lg text-white text-xs font-bold shadow-2xs ${
                quickMovementType === 'ENTRADA'
                  ? 'bg-[#10b981] hover:bg-[#059669]'
                  : 'bg-[#d1a618] hover:bg-[#b06000]'
              }`}
            >
              Confirmar {quickMovementType === 'ENTRADA' ? 'Entrada' : 'Ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
