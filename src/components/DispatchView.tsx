import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { useInventory } from '../context/InventoryContext';
import { Elemento, CategoriaElemento } from '../types';

export const DispatchView: React.FC = () => {
  const {
    elementos,
    proyectos,
    user,
    dispatchCart,
    addToDispatchCart,
    updateDispatchCartQuantity,
    removeFromDispatchCart,
    clearDispatchCart,
    processDispatch,
    getLocationString
  } = useInventory();

  // Search & category for left inventory list
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('TODOS');

  // Dispatch form state
  const [selectedProyectoId, setSelectedProyectoId] = useState<number>(proyectos[0]?.id || 1);
  const [entregadoPor, setEntregadoPor] = useState(user.name);
  const [cargoEntregado, setCargoEntregado] = useState(user.role);
  const [recibidoPor, setRecibidoPor] = useState('Ing. Marta López');
  const [cargoRecibido, setCargoRecibido] = useState('Coordinadora de Obra');
  const [observaciones, setObservaciones] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const selectedProyecto = proyectos.find((p) => p.id === Number(selectedProyectoId));

  // Available items for selection
  const filteredAvailable = useMemo(() => {
    return elementos.filter((item) => {
      if (item.cantidad <= 0) return false; // only items with stock

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchCode = item.codigo.toLowerCase().includes(q);
        const matchName = item.nombre.toLowerCase().includes(q);
        const matchLoc = getLocationString(item).toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchLoc) return false;
      }

      if (selectedCat !== 'TODOS' && item.categoria !== selectedCat) {
        return false;
      }

      return true;
    });
  }, [elementos, searchTerm, selectedCat, getLocationString]);

  // Total units in cart
  const totalUnits = dispatchCart.reduce((sum, item) => sum + item.cantidad, 0);

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (dispatchCart.length === 0) {
      setErrorMsg('Debe agregar al menos un componente al despacho.');
      return;
    }

    if (!selectedProyectoId) {
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
      if (!live || live.cantidad < item.cantidad) {
        setErrorMsg(`Stock insuficiente para ${item.elemento.nombre}. Disponible: ${live?.cantidad || 0}`);
        return;
      }
    }

    const createdRemision = processDispatch({
      proyectoId: Number(selectedProyectoId),
      entregadoPor,
      cargoEntregado,
      recibidoPor,
      cargoRecibido,
      observaciones
    });

    if (createdRemision) {
      // Trigger confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch {}
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
        {/* Left Column: Inventario Disponible (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-[#131b2e]">Inventario Disponible</h3>
              <span className="text-xs text-[#767682]">
                {filteredAvailable.length} artículos en stock
              </span>
            </div>

            {/* Search */}
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#767682] text-[18px]">
                search
              </span>
              <input
                id="dispatch-search-available"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar componente por código o nombre..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#e2e8f0] text-sm focus:ring-2 focus:ring-[#3e4e9e]"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {[
                { id: 'TODOS', label: 'Todos' },
                { id: 'PANELES', label: 'Paneles' },
                { id: 'INVERSORES', label: 'Inversores' },
                { id: 'ESTRUCTURAS', label: 'Estructuras' },
                { id: 'CABLES', label: 'Cableado' },
                { id: 'CONECTORES', label: 'Conectores' },
                { id: 'PROTECCIONES', label: 'Protecciones' },
                { id: 'BATERIAS', label: 'Baterías' },
                { id: 'OTROS', label: 'Otros' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCat === cat.id
                      ? 'bg-[#3e4e9e] text-white shadow-2xs'
                      : 'bg-[#f8fafc] border border-[#e2e8f0] text-[#454651] hover:bg-[#f2f3ff]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Available Items List */}
            <div className="flex flex-col gap-3 max-h-[560px] overflow-y-auto pr-1">
              {filteredAvailable.length === 0 ? (
                <div className="p-8 text-center text-[#767682] text-sm">
                  No hay componentes disponibles con los criterios seleccionados.
                </div>
              ) : (
                filteredAvailable.map((item) => {
                  const inCart = dispatchCart.find((c) => c.elemento.id === item.id);
                  const isLow = item.cantidad <= item.stockMinimo;

                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-[#e2e8f0] rounded-xl p-3.5 flex items-center justify-between gap-4 hover:border-[#cbd5e1] hover:shadow-2xs transition-all"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {item.fotoUrl ? (
                          <img
                            src={item.fotoUrl}
                            alt={item.nombre}
                            className="w-14 h-14 rounded-lg object-cover border border-[#e2e8f0] shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] flex flex-col items-center justify-center shrink-0 text-[#94a3b8]">
                            <span className="material-symbols-outlined text-[24px] text-[#cbd5e1]">inventory_2</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-[#131b2e] leading-snug truncate" title={item.nombre}>
                            {item.nombre}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono-code text-[11px] font-bold text-[#3e4e9e] bg-[#eaedff] px-1.5 py-0.5 rounded">
                              {item.codigo}
                            </span>
                            <span className="text-xs text-[#767682] truncate">
                              {getLocationString(item)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-[#767682] block">Disponible</span>
                          <span
                            className={`font-mono-code text-sm font-bold ${
                              isLow ? 'text-[#b06000]' : 'text-[#10b981]'
                            }`}
                          >
                            {item.cantidad} {item.unidad}
                          </span>
                        </div>

                        <button
                          id={`btn-add-cart-${item.codigo}`}
                          onClick={() => addToDispatchCart(item, 1)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                            inCart
                              ? 'bg-[#eaedff] text-[#253685] ring-1 ring-[#3e4e9e]'
                              : 'bg-[#3e4e9e] text-white hover:bg-[#323f80] active:scale-95 shadow-2xs'
                          }`}
                          title="Agregar al despacho"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {inCart ? 'done' : 'add'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

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

            {/* Project Select */}
            <div>
              <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-1.5">
                PROYECTO / DESTINO <span className="text-[#dd4c42]">*</span>
              </label>
              <select
                id="select-dispatch-project"
                value={selectedProyectoId}
                onChange={(e) => setSelectedProyectoId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:ring-2 focus:ring-[#3e4e9e] text-[#131b2e] cursor-pointer"
                required
              >
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.cliente})
                  </option>
                ))}
              </select>
              {selectedProyecto && (
                <p className="text-[11px] text-[#767682] mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                  <span className="truncate">{selectedProyecto.ubicacion}</span>
                </p>
              )}
            </div>

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

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-1">
                OBSERVACIONES DE REMISIÓN
              </label>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Placas de vehículo, conductor, recomendaciones de manejo..."
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
                  {totalUnits} unidades totales
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
                        <p className="font-semibold text-xs text-[#131b2e] truncate" title={item.elemento.nombre}>
                          {item.elemento.nombre}
                        </p>
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
                        <input
                          type="number"
                          min="1"
                          max={item.elemento.cantidad}
                          value={item.cantidad}
                          onChange={(e) =>
                            updateDispatchCartQuantity(item.elemento.id, parseInt(e.target.value) || 1)
                          }
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

            {/* Primary Action Dispatch Button (Red Coral from Mockup Image 1) */}
            <button
              type="submit"
              id="btn-process-dispatch"
              disabled={dispatchCart.length === 0}
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
