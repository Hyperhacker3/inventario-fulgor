import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Almacen, Estanteria, Caja } from '../types';

export const WarehouseView: React.FC = () => {
  const {
    almacenes,
    estanterias,
    cajas,
    elementos,
    addAlmacen,
    updateAlmacen,
    addEstanteria,
    updateEstanteria,
    addCaja,
    updateCaja,
    openItemDetail
  } = useInventory();

  const [selectedAlmacenId, setSelectedAlmacenId] = useState<number>(almacenes[0]?.id || 1);
  const [showNewWarehouseModal, setShowNewWarehouseModal] = useState(false);
  const [showNewRackModal, setShowNewRackModal] = useState(false);
  const [showNewBoxModal, setShowNewBoxModal] = useState(false);
  const [targetEstanteriaId, setTargetEstanteriaId] = useState<number | null>(null);

  // New warehouse form
  const [newAlmNombre, setNewAlmNombre] = useState('');
  const [newAlmCodigo, setNewAlmCodigo] = useState('');
  const [newAlmCiudad, setNewAlmCiudad] = useState('');

  // New rack form
  const [newRackCodigo, setNewRackCodigo] = useState('');
  const [newRackNombre, setNewRackNombre] = useState('');

  // New box form
  const [newBoxCodigo, setNewBoxCodigo] = useState('');
  const [newBoxEstado, setNewBoxEstado] = useState<'Completa' | 'Parcial' | 'Vacia'>('Parcial');
  const [newBoxDesc, setNewBoxDesc] = useState('');

  // Edit warehouse form
  const [editingAlmacen, setEditingAlmacen] = useState<Almacen | null>(null);
  const [editAlmNombre, setEditAlmNombre] = useState('');
  const [editAlmCodigo, setEditAlmCodigo] = useState('');
  const [editAlmCiudad, setEditAlmCiudad] = useState('');
  const [editAlmEstado, setEditAlmEstado] = useState<'Operativo' | 'Mantenimiento'>('Operativo');

  // Edit rack form
  const [editingEstanteria, setEditingEstanteria] = useState<Estanteria | null>(null);
  const [editRackNombre, setEditRackNombre] = useState('');
  const [editRackCodigo, setEditRackCodigo] = useState('');
  const [editRackDesc, setEditRackDesc] = useState('');

  // Edit box form
  const [editingCaja, setEditingCaja] = useState<Caja | null>(null);
  const [editBoxCodigo, setEditBoxCodigo] = useState('');
  const [editBoxEstado, setEditBoxEstado] = useState<'Completa' | 'Parcial' | 'Vacia'>('Parcial');
  const [editBoxDesc, setEditBoxDesc] = useState('');

  const activeWarehouse = almacenes.find((a) => a.id === selectedAlmacenId) || almacenes[0];

  // Estanterias of active warehouse
  const activeEstanterias = estanterias.filter((e) => e.almacenId === activeWarehouse?.id);

  const handleCreateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlmNombre.trim() || !newAlmCodigo.trim()) return;

    const created = addAlmacen({
      nombre: newAlmNombre.trim(),
      codigo: newAlmCodigo.trim().toUpperCase(),
      ciudad: newAlmCiudad.trim() || 'Colombia',
      capacidadPorcentaje: 10,
      estado: 'Operativo'
    });

    setNewAlmNombre('');
    setNewAlmCodigo('');
    setNewAlmCiudad('');
    setShowNewWarehouseModal(false);
    setSelectedAlmacenId(created.id);
  };

  const handleUpdateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlmacen || !editAlmNombre.trim()) return;

    updateAlmacen(editingAlmacen.id, {
      nombre: editAlmNombre.trim(),
      codigo: editAlmCodigo.trim().toUpperCase(),
      ciudad: editAlmCiudad.trim() || 'Colombia',
      estado: editAlmEstado
    });

    setEditingAlmacen(null);
  };

  const handleCreateRack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRackCodigo.trim() || !newRackNombre.trim()) return;

    addEstanteria({
      almacenId: activeWarehouse.id,
      codigo: newRackCodigo.trim().toUpperCase(),
      nombre: newRackNombre.trim(),
      descripcion: `Estantería en ${activeWarehouse.nombre}`
    });

    setNewRackCodigo('');
    setNewRackNombre('');
    setShowNewRackModal(false);
  };

  const handleUpdateRack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEstanteria || !editRackNombre.trim()) return;

    updateEstanteria(editingEstanteria.id, {
      nombre: editRackNombre.trim(),
      codigo: editRackCodigo.trim().toUpperCase(),
      descripcion: editRackDesc.trim()
    });

    setEditingEstanteria(null);
  };

  const handleCreateBox = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoxCodigo.trim() || !targetEstanteriaId) return;

    addCaja({
      estanteriaId: targetEstanteriaId,
      codigoCaja: newBoxCodigo.trim().toUpperCase(),
      estado: newBoxEstado,
      descripcion: newBoxDesc.trim() || 'Caja de almacenamiento solar'
    });

    setNewBoxCodigo('');
    setNewBoxDesc('');
    setShowNewBoxModal(false);
  };

  const handleUpdateBox = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCaja || !editBoxCodigo.trim()) return;

    updateCaja(editingCaja.id, {
      codigoCaja: editBoxCodigo.trim().toUpperCase(),
      estado: editBoxEstado,
      descripcion: editBoxDesc.trim()
    });

    setEditingCaja(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-8 max-w-[1400px] mx-auto w-full">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">Gestión de Almacenes</h2>
          <p className="text-sm md:text-base text-[#454651]">
            Administre y renombre las instalaciones físicas, estanterías y cajas de almacenamiento solar.
          </p>
        </div>

        <button
          id="btn-add-warehouse"
          onClick={() => setShowNewWarehouseModal(true)}
          className="px-4 py-2.5 rounded-lg bg-[#3e4e9e] text-white text-sm font-semibold hover:bg-[#323f80] active:scale-95 transition-all shadow-xs flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add_business</span>
          <span>Añadir Almacén</span>
        </button>
      </div>

      {/* Warehouse Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {almacenes.map((alm) => {
          const isSelected = alm.id === activeWarehouse?.id;
          const almEstanterias = estanterias.filter((e) => e.almacenId === alm.id);
          const almEstanteriaIds = almEstanterias.map((e) => e.id);
          const almCajas = cajas.filter((c) => almEstanteriaIds.includes(c.estanteriaId));
          const almElementos = elementos.filter((el) => el.almacenId === alm.id);
          const totalStock = almElementos.reduce((sum, el) => sum + el.cantidad, 0);

          return (
            <article
              key={alm.id}
              onClick={() => setSelectedAlmacenId(alm.id)}
              className={`bg-white border rounded-2xl p-5 cursor-pointer transition-all duration-200 relative group ${
                isSelected
                  ? 'border-[#3e4e9e] ring-2 ring-[#3e4e9e]/20 shadow-md'
                  : 'border-[#e2e8f0] hover:border-[#cbd5e1] hover:shadow-xs'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-code font-bold text-xs bg-[#eaedff] text-[#253685] px-2 py-0.5 rounded">
                      {alm.codigo}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        alm.estado === 'Operativo'
                          ? 'bg-[#e6f4ea] text-[#137333]'
                          : 'bg-[#fef7e0] text-[#755b00]'
                      }`}
                    >
                      {alm.estado}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-[#131b2e] mt-1.5 leading-snug">{alm.nombre}</h3>
                  <p className="text-xs text-[#767682]">{alm.ciudad}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Rename / Edit Warehouse Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingAlmacen(alm);
                      setEditAlmNombre(alm.nombre);
                      setEditAlmCodigo(alm.codigo);
                      setEditAlmCiudad(alm.ciudad);
                      setEditAlmEstado((alm.estado as any) || 'Operativo');
                    }}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-[#eaedff] text-[#767682] hover:text-[#253685] flex items-center justify-center transition-colors"
                    title="Renombrar / Editar Almacén"
                  >
                    <span className="material-symbols-outlined text-[17px]">edit</span>
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-[#f2f3ff] text-[#3e4e9e] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">warehouse</span>
                  </div>
                </div>
              </div>

              {/* Capacity Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1 font-semibold text-[#454651]">
                  <span>Ocupación</span>
                  <span className="font-mono-code">{alm.capacidadPorcentaje}%</span>
                </div>
                <div className="w-full bg-[#eaedff] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      alm.capacidadPorcentaje > 80 ? 'bg-[#3e4e9e]' : 'bg-[#10b981]'
                    }`}
                    style={{ width: `${alm.capacidadPorcentaje}%` }}
                  ></div>
                </div>
              </div>

              {/* Stats pills */}
              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-[#e2e8f0]">
                <div className="bg-[#f8fafc] p-1.5 rounded-lg">
                  <span className="text-[10px] text-[#767682] block">Estantes</span>
                  <span className="font-mono-code font-bold text-xs text-[#131b2e]">{almEstanterias.length}</span>
                </div>
                <div className="bg-[#f8fafc] p-1.5 rounded-lg">
                  <span className="text-[10px] text-[#767682] block">Cajas</span>
                  <span className="font-mono-code font-bold text-xs text-[#131b2e]">{almCajas.length}</span>
                </div>
                <div className="bg-[#f8fafc] p-1.5 rounded-lg">
                  <span className="text-[10px] text-[#767682] block">Items</span>
                  <span className="font-mono-code font-bold text-xs text-[#3e4e9e]">{totalStock}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Structure Inspector Panel */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xs flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-[#e2e8f0]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-[#131b2e]">
                Jerarquía de {activeWarehouse?.nombre} ({activeWarehouse?.codigo})
              </h3>
              <button
                onClick={() => {
                  if (activeWarehouse) {
                    setEditingAlmacen(activeWarehouse);
                    setEditAlmNombre(activeWarehouse.nombre);
                    setEditAlmCodigo(activeWarehouse.codigo);
                    setEditAlmCiudad(activeWarehouse.ciudad);
                    setEditAlmEstado((activeWarehouse.estado as any) || 'Operativo');
                  }
                }}
                className="text-[#3e4e9e] hover:underline text-xs font-semibold flex items-center gap-1"
                title="Renombrar este almacén"
              >
                <span className="material-symbols-outlined text-[15px]">edit</span>
                <span>Renombrar</span>
              </button>
            </div>
            <p className="text-xs text-[#767682]">
              Visualización y edición de estanterías, niveles y cajas registradas en esta sede.
            </p>
          </div>

          <button
            id="btn-add-rack"
            onClick={() => setShowNewRackModal(true)}
            className="px-3.5 py-2 rounded-lg bg-[#eaedff] text-[#253685] hover:bg-[#3e4e9e] hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Nueva Estantería</span>
          </button>
        </div>

        {/* Rack & Boxes Hierarchy List */}
        <div className="flex flex-col gap-5">
          {activeEstanterias.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#767682]">
              Este almacén no tiene estanterías registradas aún. Haga clic en "+ Nueva Estantería" para comenzar.
            </div>
          ) : (
            activeEstanterias.map((rack) => {
              const rackBoxes = cajas.filter((c) => c.estanteriaId === rack.id);

              return (
                <div
                  key={rack.id}
                  className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 flex flex-col gap-3"
                >
                  {/* Rack Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-[#eaedff] text-[#253685] flex items-center justify-center font-bold text-xs shrink-0">
                        <span className="material-symbols-outlined text-[18px]">table_rows</span>
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[#131b2e]">
                            {rack.codigo}: {rack.nombre}
                          </h4>
                          {/* Edit / Rename Rack Button */}
                          <button
                            onClick={() => {
                              setEditingEstanteria(rack);
                              setEditRackNombre(rack.nombre);
                              setEditRackCodigo(rack.codigo);
                              setEditRackDesc(rack.descripcion || '');
                            }}
                            className="text-[#767682] hover:text-[#3e4e9e] hover:bg-white p-1 rounded transition-colors"
                            title="Renombrar / Editar Estantería"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-[#767682]">{rack.descripcion}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setTargetEstanteriaId(rack.id);
                        setShowNewBoxModal(true);
                      }}
                      className="px-2.5 py-1 rounded bg-white border border-[#e2e8f0] text-xs font-semibold text-[#3e4e9e] hover:bg-[#eaedff] transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      <span>Nueva Caja</span>
                    </button>
                  </div>

                  {/* Boxes Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                    {rackBoxes.length === 0 ? (
                      <div className="text-xs text-[#767682] col-span-full py-2">
                        No hay cajas registradas en esta estantería.
                      </div>
                    ) : (
                      rackBoxes.map((caja) => {
                        const itemsInBox = elementos.filter((e) => e.cajaId === caja.id);

                        return (
                          <div
                            key={caja.id}
                            className="bg-white border border-[#e2e8f0] rounded-lg p-3 flex flex-col gap-2 shadow-2xs hover:border-[#cbd5e1] transition-all"
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono-code font-bold text-xs text-[#131b2e] bg-[#f2f3ff] px-2 py-0.5 rounded">
                                  {caja.codigoCaja}
                                </span>
                                {/* Edit / Rename Box Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCaja(caja);
                                    setEditBoxCodigo(caja.codigoCaja);
                                    setEditBoxEstado(caja.estado);
                                    setEditBoxDesc(caja.descripcion || '');
                                  }}
                                  className="text-[#767682] hover:text-[#3e4e9e] hover:bg-slate-100 p-0.5 rounded transition-colors"
                                  title="Renombrar / Editar Caja"
                                >
                                  <span className="material-symbols-outlined text-[15px]">edit</span>
                                </button>
                              </div>

                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  caja.estado === 'Completa'
                                    ? 'bg-[#e6f4ea] text-[#137333]'
                                    : caja.estado === 'Parcial'
                                    ? 'bg-[#fef7e0] text-[#755b00]'
                                    : 'bg-[#fce8e6] text-[#c5221f]'
                                }`}
                              >
                                {caja.estado}
                              </span>
                            </div>

                            <p className="text-xs text-[#454651] line-clamp-1">{caja.descripcion}</p>

                            <div className="pt-1 border-t border-[#e2e8f0] flex flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase text-[#767682]">
                                Contenido ({itemsInBox.length})
                              </span>
                              {itemsInBox.length === 0 ? (
                                <span className="text-[11px] text-[#767682] italic">Vacía</span>
                              ) : (
                                itemsInBox.map((el) => (
                                  <div
                                    key={el.id}
                                    onClick={() => openItemDetail(el)}
                                    className="flex items-center justify-between text-xs hover:text-[#3e4e9e] cursor-pointer"
                                  >
                                    <span className="truncate pr-2 font-medium">{el.nombre}</span>
                                    <span className="font-mono-code font-bold text-[#131b2e] shrink-0">
                                      {el.cantidad} {el.unidad}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: New Warehouse */}
      {showNewWarehouseModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#e2e8f0] animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-lg text-[#131b2e] mb-4">Añadir Nuevo Almacén / Sede</h3>
            <form onSubmit={handleCreateWarehouse} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Nombre del Almacén</label>
                <input
                  type="text"
                  value={newAlmNombre}
                  onChange={(e) => setNewAlmNombre(e.target.value)}
                  placeholder="ej. Bodega Caribe"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Código de Sede</label>
                <input
                  type="text"
                  value={newAlmCodigo}
                  onChange={(e) => setNewAlmCodigo(e.target.value.toUpperCase())}
                  placeholder="ej. BAQ-04"
                  className="w-full px-3 py-2 rounded-lg border font-mono-code uppercase text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Ciudad / Ubicación</label>
                <input
                  type="text"
                  value={newAlmCiudad}
                  onChange={(e) => setNewAlmCiudad(e.target.value)}
                  placeholder="ej. Barranquilla"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewWarehouseModal(false)}
                  className="px-4 py-2 rounded-lg border text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#3e4e9e] text-white text-xs font-bold hover:bg-[#323f80]"
                >
                  Guardar Almacén
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Warehouse / Renombrar */}
      {editingAlmacen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#e2e8f0] animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-lg text-[#131b2e] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#3e4e9e]">edit_location_alt</span>
              <span>Renombrar / Editar Almacén</span>
            </h3>
            <form onSubmit={handleUpdateWarehouse} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Nombre del Almacén</label>
                <input
                  type="text"
                  value={editAlmNombre}
                  onChange={(e) => setEditAlmNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Código de Sede</label>
                <input
                  type="text"
                  value={editAlmCodigo}
                  onChange={(e) => setEditAlmCodigo(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg border font-mono-code uppercase text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Ciudad / Ubicación</label>
                <input
                  type="text"
                  value={editAlmCiudad}
                  onChange={(e) => setEditAlmCiudad(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Estado Operativo</label>
                <select
                  value={editAlmEstado}
                  onChange={(e) => setEditAlmEstado(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border text-sm font-medium"
                >
                  <option value="Operativo">Operativo</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingAlmacen(null)}
                  className="px-4 py-2 rounded-lg border text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#3e4e9e] text-white text-xs font-bold hover:bg-[#323f80] flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Rack */}
      {showNewRackModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#e2e8f0] animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-lg text-[#131b2e] mb-4">
              Nueva Estantería en {activeWarehouse?.nombre}
            </h3>
            <form onSubmit={handleCreateRack} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Código Estantería</label>
                <input
                  type="text"
                  value={newRackCodigo}
                  onChange={(e) => setNewRackCodigo(e.target.value.toUpperCase())}
                  placeholder="ej. EST-E05"
                  className="w-full px-3 py-2 rounded-lg border font-mono-code uppercase text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Nombre / Zona</label>
                <input
                  type="text"
                  value={newRackNombre}
                  onChange={(e) => setNewRackNombre(e.target.value)}
                  placeholder="ej. Zona de Baterías de Litio"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewRackModal(false)}
                  className="px-4 py-2 rounded-lg border text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#3e4e9e] text-white text-xs font-bold hover:bg-[#323f80]"
                >
                  Crear Estantería
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Rack / Renombrar Estantería */}
      {editingEstanteria && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#e2e8f0] animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-lg text-[#131b2e] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#3e4e9e]">table_rows</span>
              <span>Renombrar / Editar Estantería</span>
            </h3>
            <form onSubmit={handleUpdateRack} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Código Estantería</label>
                <input
                  type="text"
                  value={editRackCodigo}
                  onChange={(e) => setEditRackCodigo(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg border font-mono-code uppercase text-sm font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Nombre de la Estantería</label>
                <input
                  type="text"
                  value={editRackNombre}
                  onChange={(e) => setEditRackNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Descripción / Notas</label>
                <textarea
                  rows={2}
                  value={editRackDesc}
                  onChange={(e) => setEditRackDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingEstanteria(null)}
                  className="px-4 py-2 rounded-lg border text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#3e4e9e] text-white text-xs font-bold hover:bg-[#323f80] flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Box */}
      {showNewBoxModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#e2e8f0] animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-lg text-[#131b2e] mb-4">Nueva Caja / Nivel de Almacenaje</h3>
            <form onSubmit={handleCreateBox} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Código de Caja</label>
                <input
                  type="text"
                  value={newBoxCodigo}
                  onChange={(e) => setNewBoxCodigo(e.target.value.toUpperCase())}
                  placeholder="ej. CAJ-5010"
                  className="w-full px-3 py-2 rounded-lg border font-mono-code uppercase text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Estado</label>
                <select
                  value={newBoxEstado}
                  onChange={(e) => setNewBoxEstado(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                >
                  <option value="Completa">Completa</option>
                  <option value="Parcial">Parcial</option>
                  <option value="Vacia">Vacía</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Descripción</label>
                <input
                  type="text"
                  value={newBoxDesc}
                  onChange={(e) => setNewBoxDesc(e.target.value)}
                  placeholder="ej. Paneles monocristalinos pallet 3"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewBoxModal(false)}
                  className="px-4 py-2 rounded-lg border text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#3e4e9e] text-white text-xs font-bold hover:bg-[#323f80]"
                >
                  Crear Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Box / Renombrar Caja */}
      {editingCaja && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#e2e8f0] animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-lg text-[#131b2e] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#3e4e9e]">inventory_2</span>
              <span>Renombrar / Editar Caja</span>
            </h3>
            <form onSubmit={handleUpdateBox} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Código / Nombre de Caja</label>
                <input
                  type="text"
                  value={editBoxCodigo}
                  onChange={(e) => setEditBoxCodigo(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg border font-mono-code uppercase text-sm font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Estado de la Caja</label>
                <select
                  value={editBoxEstado}
                  onChange={(e) => setEditBoxEstado(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border text-sm font-medium"
                >
                  <option value="Completa">Completa</option>
                  <option value="Parcial">Parcial</option>
                  <option value="Vacia">Vacía</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#454651] mb-1">Descripción / Notas</label>
                <input
                  type="text"
                  value={editBoxDesc}
                  onChange={(e) => setEditBoxDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  placeholder="ej. Fusibles y conectores"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingCaja(null)}
                  className="px-4 py-2 rounded-lg border text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#3e4e9e] text-white text-xs font-bold hover:bg-[#323f80] flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
