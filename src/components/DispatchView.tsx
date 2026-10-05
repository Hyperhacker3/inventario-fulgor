import { ProjectSelector } from './dispatch/ProjectSelector';
import { TransportFields } from './dispatch/TransportFields';
import { emptyTransport } from '../domain/remissionTransport';
import { useRemissionTransport, useUnitWeightDispatch } from '../state/useRemissionTransport';
import { formatKg, formatUnitWeight, lineWeightKg, totalWeight } from '../domain/weight';
import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { errorMessage } from '../shared/errors';
import { available } from '../domain/inventory';
import { AvailableInventory } from './dispatch/AvailableInventory';
import { NumberInput } from './NumberInput';

export const DispatchView: React.FC = () => {
  const {
    elementos,
    proyectos,
    user,
    dispatchCart,
    updateDispatchCartQuantity,
    removeFromDispatchCart,
    clearDispatchCart,
    openItemDetail,
    processDispatch
  } = useInventory();

  // Dispatch form state
  const [selectedProyectoId, setSelectedProyectoId] = useState<string>('');
  const [entregadoPor, setEntregadoPor] = useState(user.name);
  const [cargoEntregado, setCargoEntregado] = useState(user.role);
  const [recibidoPor, setRecibidoPor] = useState('');
  const [cargoRecibido, setCargoRecibido] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [pending, setPending] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [transport, setTransport] = useState(emptyTransport);
  const transportQuery = useRemissionTransport();
  const automaticQuery = useUnitWeightDispatch();
  const automaticReady = automaticQuery.data === true && !automaticQuery.isError;
  const transportReady = transportQuery.data === true && !transportQuery.isError;

  const effectiveProjectId = proyectos.some(p => p.id === selectedProyectoId && p.estado === 'ACTIVO') ? selectedProyectoId : '';

  // Total units in cart
  const weightSummary = totalWeight(dispatchCart.map(line => ({ pesoTotalKg: lineWeightKg(line.elemento.pesoUnitario, line.cantidad) })));

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!automaticReady) { setErrorMsg('Active la actualización del cálculo automático de peso antes de generar la remisión.'); return; }

    if (dispatchCart.length === 0) {
      setErrorMsg('Debe agregar al menos un componente al despacho.');
      return;
    }

    if (!effectiveProjectId) {
      setErrorMsg('Debe seleccionar el proyecto de destino.');
      return;
    }

    if (!recibidoPor.trim()) {
      setErrorMsg('Debe ingresar el nombre del responsable que recibe en obra.');
      return;
    }

    // Check if any cart item exceeds stock
    for (const item of dispatchCart) {
      const live = elementos.find((el) => el.id === item.elemento.id);
      if (!live || available(live) < item.cantidad) {
        setErrorMsg(`Stock insuficiente para ${item.elemento.nombre}. Disponible: ${live ? available(live) : 0}`);
        return;
      }
    }

    setPending(true);
    try {
      await processDispatch({ proyectoId: effectiveProjectId, entregadoPor, cargoEntregado,
        recibidoPor, cargoRecibido, observaciones, requestId,
        ...(transportReady && { datosTransporte: transport }) });
      setRequestId(crypto.randomUUID());
      void import('canvas-confetti').then(({ default: confetti }) => {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }).catch(() => {});
    } catch (error) {
      setErrorMsg(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-8 max-w-[1400px] mx-auto w-full">
      {/* Page Title from Mockup Image 1 */}
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">Salida de Material</h2>
        <p className="text-sm md:text-base text-[#454651]">
          Gestione la salida de inventario y genere la remisión de entrega para proyectos solares.
        </p>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <AvailableInventory />

        {/* Right Column: Formulario de Despacho & Carrito (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <form
            onSubmit={handleDispatch}
            className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xs flex flex-col gap-5 sticky top-20"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2 text-[#253685]">
                <span className="material-symbols-outlined text-[22px]">local_shipping</span>
                <h3 className="font-bold text-lg text-[#131b2e]">Datos del Despacho</h3>
              </div>
              {dispatchCart.length > 0 && (
                <button
                  type="button"
                  onClick={clearDispatchCart}
                  className="text-xs text-[#dd4c42] hover:underline font-semibold"
                >
                  Vaciar ({dispatchCart.length})
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-[#fce8e6] border border-[#ffdad6] rounded-lg text-xs font-semibold text-[#c5221f] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <ProjectSelector value={effectiveProjectId} onChange={setSelectedProyectoId} disabled={pending} />

            {/* Delivery & Receiver */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-1">
                  ENTREGA EN BODEGA
                </label>
                <input
                  type="text"
                  value={entregadoPor}
                  onChange={(e) => setEntregadoPor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs text-[#131b2e]"
                  placeholder="Nombre responsable"
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-1">
                  RECIBE EN OBRA <span className="text-[#dd4c42]">*</span>
                </label>
                <input
                  type="text"
                  value={recibidoPor}
                  onChange={(e) => setRecibidoPor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs text-[#131b2e]"
                  placeholder="Ingeniero / Residente"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-xs font-bold text-[#454651]">CARGO DE QUIEN ENTREGA
                <input value={cargoEntregado} onChange={event => setCargoEntregado(event.target.value)} className="block w-full mt-1 px-3 py-2 border rounded-lg text-xs" />
              </label>
              <label className="text-xs font-bold text-[#454651]">CARGO DE QUIEN RECIBE
                <input value={cargoRecibido} onChange={event => setCargoRecibido(event.target.value)} className="block w-full mt-1 px-3 py-2 border rounded-lg text-xs" />
              </label>
            </div>

            <TransportFields value={transport} onChange={setTransport} disabled={pending || !transportReady} />
            {!transportReady && <p className="text-xs text-slate-600">Los campos de transporte requieren activar la actualización de remisiones. El despacho habitual sigue disponible. <button type="button" className="underline" onClick={() => { void transportQuery.refetch(); }}>Comprobar de nuevo</button></p>}
            {/* Observaciones */}
            <div>
              <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-1">
                OBSERVACIONES DE REMISIÓN
              </label>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Novedades de entrega, condiciones, recomendaciones de manejo..."
                className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs text-[#131b2e]"
              />
            </div>

            {/* Materiales en el Despacho (Cart Table) */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold tracking-wider text-[#454651] uppercase">
                  MATERIALES A DESPACHAR ({dispatchCart.length})
                </label>
                <span className="text-xs font-mono-code text-[#3e4e9e] font-bold">
                  {dispatchCart.length} referencias
                </span>
              </div>

              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 max-h-60 overflow-y-auto flex flex-col gap-2">
                {dispatchCart.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#767682]">
                    Seleccione componentes de la lista izquierda para despachar.
                  </div>
                ) : (
                  dispatchCart.map((item) => (
                    <div
                      key={item.elemento.id}
                      className="bg-white border border-[#e2e8f0] rounded-lg p-2.5 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <button type="button" onClick={() => openItemDetail(item.elemento)} className="block max-w-full text-left font-semibold text-xs text-[#131b2e] truncate hover:text-[#3e4e9e] hover:underline" title={item.elemento.nombre}>
                          {item.elemento.nombre}
                        </button>
                        <span className="font-mono-code text-[10px] text-[#3e4e9e] font-bold">
                          {item.elemento.codigo}
                        </span>
                      </div>

                      {/* Quantity Controller */}
                      <div className="flex items-center gap-1 bg-[#f8fafc] border border-[#e2e8f0] rounded-md px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() => updateDispatchCartQuantity(item.elemento.id, item.cantidad - 1)}
                          className="w-6 h-6 flex items-center justify-center text-xs font-bold text-[#454651] hover:bg-[#eaedff] rounded"
                        >
                          -
                        </button>
                        <NumberInput
                          required
                          min="0.001"
                          step="0.001"
                          max={available(item.elemento)}
                          value={item.cantidad}
                          onValueChange={quantity => updateDispatchCartQuantity(item.elemento.id, quantity)}
                          className="w-10 text-center font-mono-code font-bold text-xs bg-transparent focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => updateDispatchCartQuantity(item.elemento.id, item.cantidad + 1)}
                          className="w-6 h-6 flex items-center justify-center text-xs font-bold text-[#454651] hover:bg-[#eaedff] rounded"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-[11px] text-[#767682] w-8 text-right">
                        {item.elemento.unidad}
                      </span>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeFromDispatchCart(item.elemento.id)}
                        className="text-[#767682] hover:text-[#dd4c42] p-1 transition-colors"
                        title="Quitar"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {dispatchCart.length > 0 && <section className="space-y-2 rounded-xl bg-slate-50 border p-3">
              <h4 className="text-sm font-bold text-[#253685]">{weightSummary.pending ? 'Peso parcial conocido' : 'Peso total'}: {formatKg(weightSummary.total)}</h4>
              {!!weightSummary.pending && <p className="text-xs text-amber-700">{weightSummary.pending} material(es) con peso pendiente. Declare el peso desde la edición del producto para completar el total.</p>}
              {dispatchCart.map(line => { const weight = lineWeightKg(line.elemento.pesoUnitario, line.cantidad); return <div key={line.elemento.id} className="text-xs flex justify-between gap-3"><span>{line.elemento.codigo} · {line.cantidad} {line.elemento.unidad} × {formatUnitWeight(line.elemento.pesoUnitario)}</span><strong className="shrink-0">{weight === null ? 'Pendiente' : formatKg(weight)}</strong></div>; })}
            </section>}
            {!automaticReady && <p role="status" className="text-xs text-amber-700">El cálculo automático de peso requiere activar la actualización de Supabase. <button type="button" className="underline" onClick={() => { void automaticQuery.refetch(); }}>Comprobar de nuevo</button></p>}

            {/* Primary Action Dispatch Button (Red Coral from Mockup Image 1) */}
            <button
              type="submit"
              id="btn-process-dispatch"
              disabled={dispatchCart.length === 0 || pending || !automaticReady}
              className={`w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-sm ${
                dispatchCart.length > 0
                  ? 'bg-[#dd4c42] hover:bg-[#b12c26] active:scale-[0.98]'
                  : 'bg-[#cbd5e1] cursor-not-allowed opacity-70'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
              <span>Generar Remisión y Despachar</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
