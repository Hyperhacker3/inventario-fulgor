import { ProjectSelector } from './dispatch/ProjectSelector';
import { TransportFields } from './dispatch/TransportFields';
import { emptyTransport } from '../domain/remissionTransport';
import { useRemissionTransport, useUnitWeightDispatch, useOutgoingPhotos, useRemissionRoute } from '../state/useRemissionTransport';
import { RemissionRouteFields } from './dispatch/RemissionRouteFields';
import { validateRemissionRoute } from '../domain/remissionRoute';
import { formatKg, formatUnitWeight, lineWeightKg, totalWeight } from '../domain/weight';
import React, { useRef, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { errorMessage } from '../shared/errors';
import { available } from '../domain/inventory';
import { AvailableInventory } from './dispatch/AvailableInventory';
import { DispatchCartLine } from './dispatch/DispatchCartLine';
import { OutgoingPhotoPicker } from './dispatch/OutgoingPhotoPicker';
import { displayCargo } from '../domain/userProfile';
import { useFormScroll } from '../hooks/useFormScroll';
import { uppercaseName } from '../shared/uppercase';

export const DispatchView: React.FC = () => {
  const { ref: pageRef, onInvalidCapture, revealError, scrollToStart } = useFormScroll();
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
  const [route, setRoute] = useState({ lugarRemision: '', lugarDestino: '' });
  const [entregadoPor, setEntregadoPor] = useState(uppercaseName(user.name));
  const [cargoEntregado, setCargoEntregado] = useState(uppercaseName(displayCargo(user)));
  const [recibidoPor, setRecibidoPor] = useState('');
  const [cargoRecibido, setCargoRecibido] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const reportError = (message: string) => { setErrorMsg(message); if (message) revealError(); };
  const [pending, setPending] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [transport, setTransport] = useState(emptyTransport);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const sending = useRef(false);
  const photoQuery = useOutgoingPhotos();
  const photosReady = photoQuery.data === true && !photoQuery.isError;
  const transportQuery = useRemissionTransport();
  const routeQuery = useRemissionRoute();
  const routeReady = routeQuery.data === true && !routeQuery.isError;
  const automaticQuery = useUnitWeightDispatch();
  const automaticReady = automaticQuery.data === true && !automaticQuery.isError;
  const transportReady = transportQuery.data === true && !transportQuery.isError;

  const effectiveProjectId = proyectos.some(p => p.id === selectedProyectoId && p.estado === 'ACTIVO') ? selectedProyectoId : '';

  // Total units in cart
  const weightSummary = totalWeight(dispatchCart.map(line => ({ pesoTotalKg: lineWeightKg(line.elemento.pesoUnitario, line.cantidad) })));

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending.current || photoBusy) return;
    reportError('');
    if (!routeReady) { reportError('Active la actualización de lugares y códigos de remisión antes de registrar la salida.'); return; }
    try { validateRemissionRoute(route); } catch (cause) { reportError(errorMessage(cause)); return; }
    if (!photosReady) { reportError('Active la actualización de registro fotográfico antes de registrar la salida.'); return; }
    if (!automaticReady) { reportError('Active la actualización del cálculo automático de peso antes de generar la remisión.'); return; }

    if (dispatchCart.length === 0) {
      reportError('Debe agregar al menos un componente a la salida.');
      return;
    }

    if (!attempted && !effectiveProjectId) {
      reportError('Debe seleccionar el proyecto de destino.');
      return;
    }

    if (!recibidoPor.trim()) {
      reportError('Debe ingresar el nombre del responsable que recibe en obra.');
      return;
    }

    // Check if any cart item exceeds stock
    for (const item of attempted ? [] : dispatchCart) {
      const live = elementos.find((el) => el.id === item.elemento.id);
      if (!live || available(live) < item.cantidad) {
        reportError(`Stock insuficiente para ${item.elemento.nombre}. Disponible: ${live ? available(live) : 0}`);
        return;
      }
    }

    sending.current = true; setPending(true); setAttempted(true);
    try {
      await processDispatch({ proyectoId: selectedProyectoId, entregadoPor, cargoEntregado,
        ...route,
        recibidoPor, cargoRecibido, observaciones, requestId, fotosSalida: photos,
        ...(transportReady && { datosTransporte: transport }) });
      setRequestId(crypto.randomUUID());
      setPhotos([]); setAttempted(false);
      scrollToStart();
      void import('canvas-confetti').then(({ default: confetti }) => {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }).catch(() => {});
    } catch (error) {
      reportError(errorMessage(error));
    } finally {
      setPending(false);
      sending.current = false;
    }
  };

  return (
    <div ref={pageRef} onInvalidCapture={onInvalidCapture} className="p-4 md:p-8 max-w-[1000px] mx-auto w-full">
      {/* Page Title from Mockup Image 1 */}
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">Salidas</h2>
        <p className="text-sm md:text-base text-[#454651]">
          Gestione la salida de inventario y genere la remisión de entrega para proyectos solares.
        </p>
      </div>

      {/* Compact search above the dispatch form. */}
      <div className="flex flex-col gap-5">
        <fieldset disabled={pending || photoBusy} className="min-w-0"><AvailableInventory /></fieldset>

        {/* Formulario de salida y materiales elegidos. */}
        <section className="w-full flex flex-col gap-4">
          <form autoComplete="off"
            onSubmit={handleDispatch}
            aria-busy={pending || photoBusy}
            className="bg-white border border-[#e2e8f0] rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col gap-5"
          >
            <fieldset disabled={pending || photoBusy} className="min-w-0 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2 text-[#253685]">
                <span className="material-symbols-outlined text-[22px]">local_shipping</span>
                <h3 className="font-bold text-lg text-[#131b2e]">Datos de la salida</h3>
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
              <div role="alert" className="p-3 bg-[#fce8e6] border border-[#ffdad6] rounded-lg text-xs font-semibold text-[#c5221f] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <ProjectSelector value={effectiveProjectId} onChange={setSelectedProyectoId} disabled={pending} />
            <RemissionRouteFields value={route} onChange={setRoute} />

            {/* Delivery & Receiver */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-1">
                  ENTREGA EN BODEGA
                </label>
                <input autoComplete="off" autoCorrect="off" spellCheck={false}
                  type="text"
                  value={entregadoPor}
                  onChange={(e) => setEntregadoPor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs text-[#131b2e] uppercase"
                  placeholder="Nombre responsable"
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-1">
                  RECIBE EN OBRA <span className="text-[#dd4c42]">*</span>
                </label>
                <input autoComplete="off" autoCorrect="off" spellCheck={false}
                  type="text"
                  value={recibidoPor}
                  onChange={(e) => setRecibidoPor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs text-[#131b2e] uppercase"
                  placeholder="Ingeniero / Residente"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-xs font-bold text-[#454651]">CARGO DE QUIEN ENTREGA
                <input autoComplete="off" autoCorrect="off" spellCheck={false} value={cargoEntregado} onChange={event => setCargoEntregado(event.target.value)} className="block w-full mt-1 px-3 py-2 border rounded-lg text-xs uppercase" />
              </label>
              <label className="text-xs font-bold text-[#454651]">CARGO DE QUIEN RECIBE
                <input autoComplete="off" autoCorrect="off" spellCheck={false} value={cargoRecibido} onChange={event => setCargoRecibido(event.target.value)} className="block w-full mt-1 px-3 py-2 border rounded-lg text-xs uppercase" />
              </label>
            </div>

            <TransportFields value={transport} onChange={setTransport} disabled={pending || !transportReady} />
            {!transportReady && <p className="text-xs text-slate-600">Los campos de transporte requieren activar la actualización de remisiones. La salida habitual sigue disponible. <button type="button" className="underline" onClick={() => { void transportQuery.refetch(); }}>Comprobar de nuevo</button></p>}
            {/* Observaciones */}
            <div>
              <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-1">
                OBSERVACIONES DE REMISIÓN
              </label>
              <textarea autoComplete="off" autoCorrect="off" spellCheck={false}
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Novedades de entrega, condiciones, recomendaciones de manejo..."
                className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-xs text-[#131b2e]"
              />
            </div>

            {/* Materiales en la salida (Cart Table) */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold tracking-wider text-[#454651] uppercase">
                  MATERIALES PARA LA SALIDA ({dispatchCart.length})
                </label>
                <span className="text-xs font-mono-code text-[#3e4e9e] font-bold">
                  {dispatchCart.length} referencias
                </span>
              </div>

              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 max-h-60 overflow-y-auto flex flex-col gap-4">
                {dispatchCart.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#767682]">
                    Busque un material arriba y pulse Añadir para elegir la cantidad de la salida.
                  </div>
                ) : (
                  dispatchCart.map(item => <DispatchCartLine key={item.elemento.id} item={item}
                    onOpen={() => openItemDetail(item.elemento)}
                    onQuantity={quantity => updateDispatchCartQuantity(item.elemento.id, quantity)}
                    onRemove={() => removeFromDispatchCart(item.elemento.id)} />)
                )}
              </div>
            </div>

            {dispatchCart.length > 0 && <section className="space-y-2 rounded-xl bg-slate-50 border p-3">
              <h4 className="text-sm font-bold text-[#253685]">{weightSummary.pending ? 'Peso parcial conocido' : 'Peso total'}: {formatKg(weightSummary.total)}</h4>
              {!!weightSummary.pending && <p className="text-xs text-amber-700">{weightSummary.pending} material(es) con peso pendiente. Declare el peso desde la edición del producto para completar el total.</p>}
              {dispatchCart.map(line => { const weight = lineWeightKg(line.elemento.pesoUnitario, line.cantidad); return <div key={line.elemento.id} className="text-xs flex justify-between gap-3"><span>{line.elemento.codigo} · {line.cantidad} {line.elemento.unidad} × {formatUnitWeight(line.elemento.pesoUnitario)}</span><strong className="shrink-0">{weight === null ? 'Pendiente' : formatKg(weight)}</strong></div>; })}
            </section>}
            <OutgoingPhotoPicker photos={photos} onChange={setPhotos} disabled={!photosReady} onBusyChange={setPhotoBusy} />
            </fieldset>
            {!automaticReady && <p role="status" className="text-xs text-amber-700">El cálculo automático de peso requiere activar la actualización de Supabase. <button type="button" className="underline" onClick={() => { void automaticQuery.refetch(); }}>Comprobar de nuevo</button></p>}
            {!photosReady && <p role="status" className="text-xs text-amber-700">El registro fotográfico requiere activar la actualización de Supabase. <button type="button" className="underline" onClick={() => { void photoQuery.refetch(); }}>Comprobar de nuevo</button></p>}
            {!routeReady && <p role="status" className="text-xs text-amber-700">Los lugares y el nuevo código requieren activar la actualización de remisiones. <button type="button" className="underline" onClick={() => { void routeQuery.refetch(); }}>Comprobar de nuevo</button></p>}

            {/* Primary Action Dispatch Button (Red Coral from Mockup Image 1) */}
            <button
              type="submit"
              id="btn-process-dispatch"
              disabled={dispatchCart.length === 0 || pending || photoBusy || !automaticReady || !photosReady || !routeReady}
              className={`w-full px-3 py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-sm ${
                dispatchCart.length > 0
                  ? 'bg-[#dd4c42] hover:bg-[#b12c26] active:scale-[0.98]'
                  : 'bg-[#cbd5e1] cursor-not-allowed opacity-70'
              }`}
            >
              <span className="material-symbols-outlined shrink-0 text-[20px]">assignment_turned_in</span>
              <span>{pending ? (photos.length ? 'Guardando salida y fotografías…' : 'Registrando salida…') : 'Registrar salida y generar remisión'}</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
