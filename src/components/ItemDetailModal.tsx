import React, { useState, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Elemento } from '../types';
import { CameraCaptureModal } from './CameraCaptureModal';

interface ItemDetailModalProps {
  item: Elemento | null;
  onClose: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onClose }) => {
  const {
    getLocationString,
    historial,
    openQuickMovement,
    addToDispatchCart,
    setActiveView,
    updateElemento,
    deleteElemento
  } = useInventory();

  const [isEditing, setIsEditing] = useState(false);
  const [editNombre, setEditNombre] = useState(item?.nombre || '');
  const [editDesc, setEditDesc] = useState(item?.descripcion || '');
  const [editStockMin, setEditStockMin] = useState(item?.stockMinimo || 10);
  const [editFotoUrl, setEditFotoUrl] = useState(item?.fotoUrl || '');
  const [editEstado, setEditEstado] = useState<string>(item?.estado || 'BUENO');
  const [editDanados, setEditDanados] = useState<number>(item?.cantidadDanados || 0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  if (!item) return null;

  const itemHistory = historial.filter((h) => h.elementoId === item.id);
  const locationStr = getLocationString(item);

  const handleStartEdit = () => {
    setEditNombre(item.nombre);
    setEditDesc(item.descripcion);
    setEditStockMin(item.stockMinimo);
    setEditFotoUrl(item.fotoUrl || '');
    setEditEstado(item.estado || 'BUENO');
    setEditDanados(item.cantidadDanados || 0);
    setShowUrlInput(false);
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateElemento(item.id, {
      nombre: editNombre.trim(),
      descripcion: editDesc.trim(),
      stockMinimo: Number(editStockMin),
      fotoUrl: editFotoUrl.trim(),
      estado: editEstado,
      cantidadDanados: Math.max(0, Number(editDanados) || 0)
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`¿Está seguro de eliminar el componente ${item.codigo} - ${item.nombre}?`)) {
      deleteElemento(item.id);
      onClose();
    }
  };

  // Process uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setEditFotoUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Camera capture callback
  const handlePhotoCaptured = (photoDataUrl: string) => {
    setEditFotoUrl(photoDataUrl);
    setIsCameraOpen(false);
  };

  const getEstadoBadge = (estado: string = 'BUENO') => {
    const est = estado.toUpperCase();
    if (est.includes('MAL') || est.includes('DAÑ')) {
      return {
        label: 'Mal Estado / Dañado',
        bg: 'bg-[#fce8e6]',
        text: 'text-[#c5221f]',
        border: 'border-[#ffdad6]',
        icon: 'cancel'
      };
    }
    if (est.includes('MED') || est.includes('PARC')) {
      return {
        label: 'Estado Medio',
        bg: 'bg-[#fef7e0]',
        text: 'text-[#755b00]',
        border: 'border-[#ffdf90]',
        icon: 'warning'
      };
    }
    if (est.includes('REP')) {
      return {
        label: 'En Reparación',
        bg: 'bg-[#eaedff]',
        text: 'text-[#253685]',
        border: 'border-[#c7d2fe]',
        icon: 'build'
      };
    }
    if (est.includes('RET')) {
      return {
        label: 'Retazos / Bueno',
        bg: 'bg-[#e0f2fe]',
        text: 'text-[#0369a1]',
        border: 'border-[#bae6fd]',
        icon: 'content_cut'
      };
    }
    return {
      label: 'Óptimo / Bueno',
      bg: 'bg-[#e6f4ea]',
      text: 'text-[#137333]',
      border: 'border-[#ceead6]',
      icon: 'check_circle'
    };
  };

  const estadoBadge = getEstadoBadge(item.estado);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-2xl w-full my-auto shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
            <div className="flex items-center gap-3">
              <span className="font-mono-code font-bold text-sm bg-[#eaedff] text-[#253685] border border-[#cbd5e1] px-2.5 py-1 rounded-md">
                {item.codigo}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#767682]">
                {item.categoria}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#767682] hover:text-[#131b2e] hover:bg-[#e2e8f0] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {/* Top Overview Grid */}
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Image & Photo Controls */}
              <div className="flex flex-col gap-2 w-full sm:w-48 shrink-0">
                <div className="w-full aspect-4/3 sm:aspect-square rounded-xl bg-[#f2f3ff] border border-[#e2e8f0] overflow-hidden shadow-2xs flex items-center justify-center relative group">
                  {(isEditing ? editFotoUrl : item.fotoUrl) ? (
                    <img
                      src={isEditing ? editFotoUrl : item.fotoUrl}
                      alt={item.nombre}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#94a3b8] bg-[#f8fafc]">
                      <span className="material-symbols-outlined text-[42px] text-[#cbd5e1]">solar_power</span>
                      <span className="text-[10px] font-mono-code mt-1 font-semibold text-[#64748b]">
                        {item.categoria}
                      </span>
                    </div>
                  )}

                  {/* Overlay Camera button when editing */}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsCameraOpen(true)}
                      className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[28px]">photo_camera</span>
                      <span className="text-[11px] font-bold">Cambiar Foto</span>
                    </button>
                  )}
                </div>

                {/* Photo Management Buttons when in Edit Mode */}
                {isEditing && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCameraOpen(true)}
                      className="w-full py-1.5 px-2 bg-[#3e4e9e] hover:bg-[#323f80] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                      <span>Tomar Foto con Cámara</span>
                    </button>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="py-1 px-2 bg-white hover:bg-[#f1f5f9] text-[#454651] border border-[#cbd5e1] rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
                        title="Subir desde galería o archivos"
                      >
                        <span className="material-symbols-outlined text-[15px]">upload_file</span>
                        <span>Subir</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="py-1 px-2 bg-white hover:bg-[#f1f5f9] text-[#454651] border border-[#cbd5e1] rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
                        title="Pegar enlace de imagen"
                      >
                        <span className="material-symbols-outlined text-[15px]">link</span>
                        <span>URL</span>
                      </button>
                    </div>

                    {editFotoUrl && (
                      <button
                        type="button"
                        onClick={() => setEditFotoUrl('')}
                        className="text-[11px] text-[#c5221f] hover:underline font-semibold text-center mt-0.5"
                      >
                        Quitar foto
                      </button>
                    )}

                    {showUrlInput && (
                      <div className="mt-1 flex flex-col gap-1">
                        <input
                          type="url"
                          placeholder="https://ejemplo.com/foto.jpg"
                          value={editFotoUrl}
                          onChange={(e) => setEditFotoUrl(e.target.value)}
                          className="w-full px-2 py-1 text-[11px] border border-[#cbd5e1] rounded"
                        />
                      </div>
                    )}

                    {/* Hidden Native File Inputs */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <input
                      ref={nativeCameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                )}
              </div>

              {/* Detail Info or Edit Form */}
              <div className="flex-1 flex flex-col gap-2.5 w-full">
                {!isEditing ? (
                  <>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-bold text-xl text-[#131b2e] leading-snug">{item.nombre}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {/* Estado Badge */}
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${estadoBadge.bg} ${estadoBadge.text} ${estadoBadge.border}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {estadoBadge.icon}
                            </span>
                            <span>{estadoBadge.label}</span>
                          </span>

                          {/* Damaged Units indicator if > 0 */}
                          {(item.cantidadDanados || 0) > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#fce8e6] text-[#c5221f] border border-[#ffdad6]">
                              <span className="material-symbols-outlined text-[14px]">broken_image</span>
                              <span>{item.cantidadDanados} dañados</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={handleStartEdit}
                        className="px-3 py-1.5 rounded-lg bg-[#eaedff] text-[#253685] hover:bg-[#3e4e9e] hover:text-white transition-colors text-xs font-bold flex items-center gap-1 shrink-0 shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        <span>Editar</span>
                      </button>
                    </div>

                    <p className="text-xs text-[#454651] leading-relaxed mt-1">{item.descripcion}</p>
                  </>
                ) : (
                  <form onSubmit={handleSaveEdit} className="flex flex-col gap-3 bg-[#f8fafc] p-4 rounded-xl border border-[#e2e8f0]">
                    <div className="flex justify-between items-center pb-2 border-b border-[#e2e8f0]">
                      <span className="text-xs font-bold uppercase text-[#3e4e9e] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">edit_note</span>
                        <span>Editando Componente Solar</span>
                      </span>
                      <span className="text-[11px] font-mono-code text-[#767682]">{item.codigo}</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#454651] mb-1">
                        Nombre del Elemento
                      </label>
                      <input
                        type="text"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded-lg text-sm font-semibold bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#454651] mb-1">
                        Descripción y Especificaciones
                      </label>
                      <textarea
                        rows={2}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded-lg text-xs bg-white"
                      />
                    </div>

                    {/* Estado del Material y Cantidad Dañados */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#454651] mb-1">
                          Estado del Material
                        </label>
                        <select
                          value={editEstado}
                          onChange={(e) => setEditEstado(e.target.value)}
                          className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded-lg text-xs font-semibold bg-white"
                        >
                          <option value="BUENO">Bueno / Óptimo (Operativo)</option>
                          <option value="MEDIO">Medio / Aceptable (Desgaste)</option>
                          <option value="MAL ESTADO">Mal Estado / Dañado (Averiado)</option>
                          <option value="EN REPARACIÓN">En Reparación / Taller</option>
                          <option value="RETAZOS / BUENO">Retazos / Sobrantes Buenos</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#454651] mb-1">
                          Cantidad de Dañados
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editDanados}
                          onChange={(e) => setEditDanados(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded-lg text-xs font-mono-code font-bold bg-white"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold uppercase text-[#454651] mb-1">
                          Stock Mínimo ({item.unidad})
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editStockMin}
                          onChange={(e) => setEditStockMin(Number(e.target.value))}
                          className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded-lg text-xs font-mono-code bg-white"
                        />
                      </div>

                      <div className="flex items-end gap-2 pt-5">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-3 py-2 bg-white hover:bg-[#f1f5f9] text-[#454651] border border-[#cbd5e1] rounded-lg text-xs font-semibold transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#3e4e9e] hover:bg-[#323f80] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">save</span>
                          <span>Guardar Cambios</span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Location Badge */}
                <div className="flex items-center gap-2 text-xs text-[#454651] bg-[#f8fafc] p-2.5 rounded-lg border border-[#e2e8f0]">
                  <span className="material-symbols-outlined text-[18px] text-[#3e4e9e]">location_on</span>
                  <span className="font-medium truncate">{locationStr}</span>
                </div>

                {/* Alert if there are damaged units */}
                {!isEditing && (item.cantidadDanados || 0) > 0 && (
                  <div className="p-3 bg-[#fce8e6]/60 border border-[#ffdad6] rounded-xl flex items-center gap-2.5 text-xs text-[#c5221f]">
                    <span className="material-symbols-outlined text-[20px] shrink-0">report_problem</span>
                    <div>
                      <p className="font-bold">
                        {item.cantidadDanados} {item.unidad} registradas con avería o daño físico
                      </p>
                      <p className="text-[11px] opacity-90">
                        Disponibles aptos: {Math.max(0, item.cantidad - (item.cantidadDanados || 0))} {item.unidad} | Total inventario: {item.cantidad} {item.unidad}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stock Metrics Box */}
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#767682] block">Stock Total</span>
                <span
                  className={`font-mono-code font-bold text-lg sm:text-xl ${
                    item.cantidad === 0
                      ? 'text-[#dd4c42]'
                      : item.cantidad <= item.stockMinimo
                      ? 'text-[#b06000]'
                      : 'text-[#10b981]'
                  }`}
                >
                  {item.cantidad} <span className="text-xs font-normal">{item.unidad}</span>
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-[#767682] block">Stock Mínimo</span>
                <span className="font-mono-code font-bold text-lg sm:text-xl text-[#454651]">
                  {item.stockMinimo} <span className="text-xs font-normal">{item.unidad}</span>
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-[#767682] block">Dañados</span>
                <span
                  className={`font-mono-code font-bold text-lg sm:text-xl ${
                    (item.cantidadDanados || 0) > 0 ? 'text-[#c5221f]' : 'text-[#767682]'
                  }`}
                >
                  {item.cantidadDanados || 0} <span className="text-xs font-normal">{item.unidad}</span>
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-[#767682] block">Nivel Stock</span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full inline-block mt-1 ${
                    item.cantidad === 0
                      ? 'bg-[#fce8e6] text-[#c5221f]'
                      : item.cantidad <= item.stockMinimo
                      ? 'bg-[#fef7e0] text-[#755b00]'
                      : 'bg-[#e6f4ea] text-[#137333]'
                  }`}
                >
                  {item.cantidad === 0 ? 'Agotado' : item.cantidad <= item.stockMinimo ? 'Bajo' : 'Óptimo'}
                </span>
              </div>
            </div>

            {/* Quick Actions Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => {
                  openQuickMovement(item, 'ENTRADA');
                }}
                className="py-2 px-3 bg-[#e6f4ea] hover:bg-[#ceead6] text-[#137333] border border-[#ceead6] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">input</span>
                <span>+ Entrada Stock</span>
              </button>

              <button
                onClick={() => {
                  openQuickMovement(item, 'AJUSTE');
                }}
                className="py-2 px-3 bg-[#fef7e0] hover:bg-[#ffdf90] text-[#755b00] border border-[#ffdf90] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span>Ajustar Stock</span>
              </button>

              <button
                onClick={() => {
                  addToDispatchCart(item, 1);
                  onClose();
                  setActiveView('dispatch');
                }}
                disabled={item.cantidad === 0}
                className="py-2 px-3 bg-[#dd4c42] hover:bg-[#b12c26] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                <span>Despachar</span>
              </button>

              <button
                onClick={handleDelete}
                className="py-2 px-3 bg-white hover:bg-[#fce8e6] text-[#c5221f] border border-[#ffdad6] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                <span>Eliminar</span>
              </button>
            </div>

            {/* Movement Log for this item */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#454651] mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">history</span>
                <span>Trazabilidad y Movimientos Recientes</span>
              </h4>

              {itemHistory.length === 0 ? (
                <p className="text-xs text-[#767682] italic py-2">Sin movimientos recientes registrados.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {itemHistory.map((h) => (
                    <div
                      key={h.id}
                      className="p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            h.tipo === 'SALIDA'
                              ? 'bg-[#fce8e6] text-[#c5221f]'
                              : h.tipo === 'ENTRADA'
                              ? 'bg-[#e6f4ea] text-[#137333]'
                              : 'bg-[#fef7e0] text-[#755b00]'
                          }`}
                        >
                          {h.tipo}
                        </span>
                        <span className="font-medium text-[#131b2e]">{h.motivo}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono-code font-bold">
                          {h.tipo === 'SALIDA' ? '-' : '+'}
                          {Math.abs(h.cantidad)} {h.unidad}
                        </span>
                        <span className="text-[10px] text-[#767682] block">{h.fecha}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#e2e8f0] bg-[#f8fafc] flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-white border border-[#e2e8f0] text-xs font-bold text-[#454651] hover:bg-[#f2f3ff] rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoCaptured={handlePhotoCaptured}
        title={`Tomar Foto: ${item.codigo} - ${item.nombre}`}
      />
    </>
  );
};
