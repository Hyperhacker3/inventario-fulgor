import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { CategoriaElemento } from '../types';
import { ItemPhotoPicker } from './ItemPhotoPicker';
import { ItemLocationFields } from './item/ItemLocationFields';
import { ItemStockFields } from './item/ItemStockFields';
import { errorMessage } from '../shared/errors';

export const NewItemView: React.FC = () => {
  const {
    almacenes,
    estanterias,
    cajas,
    addElemento,
    setActiveView,
    openItemDetail
  } = useInventory();

  // Form State
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState<CategoriaElemento>('PANELES');
  const [descripcion, setDescripcion] = useState('');
  const [almacenId, setAlmacenId] = useState<string>(almacenes[0]?.id || '');
  const [estanteriaId, setEstanteriaId] = useState<string>('');
  const [cajaId, setCajaId] = useState<string>('');
  const [cantidad, setCantidad] = useState<number>(0);
  const [unidad, setUnidad] = useState<string>('UND');
  const [stockMinimo, setStockMinimo] = useState<number>(0);
  const [estado, setEstado] = useState<string>('BUENO');
  const [cantidadDanados, setCantidadDanados] = useState<number>(0);
  const [fotoUrl, setFotoUrl] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  const selectedAlmacenId = almacenId || almacenes[0]?.id || '';

  // Cascading Estanterias
  const availableEstanterias = useMemo(() => {
    return estanterias.filter((e) => e.almacenId === selectedAlmacenId);
  }, [estanterias, selectedAlmacenId]);
  const selectedEstanteriaId = availableEstanterias.some(e => e.id === estanteriaId) ? estanteriaId : '';

  // Cascading Cajas
  const availableCajas = useMemo(() => {
    return cajas.filter((c) => c.estanteriaId === selectedEstanteriaId);
  }, [cajas, selectedEstanteriaId]);
  const selectedCajaId = availableCajas.some(c => c.id === cajaId) ? cajaId : '';

  // Code validation: Alphanumeric standard e.g. PAN550, MC4100, CAB600
  const isCodeValid = useMemo(() => {
    const regex = /^[A-Z0-9-]{3,30}$/;
    return regex.test(codigo.trim().toUpperCase());
  }, [codigo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!isCodeValid) {
      setFeedback({
        type: 'error',
        message: 'El código debe tener un formato alfanumérico válido (ej. PAN550, MC4100, CAB600).'
      });
      return;
    }

    if (!nombre.trim()) {
      setFeedback({ type: 'error', message: 'Por favor ingrese el nombre del componente fotovoltaico.' });
      return;
    }

    try {
      setPending(true);
      const created = await addElemento({
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        categoria,
        cantidad: Number(cantidad),
        unidad,
        fotoUrl: fotoUrl.trim(),
        almacenId: selectedAlmacenId || null,
        estanteriaId: selectedEstanteriaId || null,
        cajaId: selectedCajaId || null,
        stockMinimo: Number(stockMinimo),
        estado,
        cantidadDanados: Number(cantidadDanados)
      });

      setFeedback({
        type: 'success',
        message: `¡Componente ${created.codigo} registrado exitosamente!`
      });

      setTimeout(() => {
        openItemDetail(created);
        setActiveView('dashboard');
      }, 1200);
    } catch (error) {
      setFeedback({ type: 'error', message: errorMessage(error) });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-8 max-w-[1000px] mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">Registrar Componente</h2>
        <p className="text-sm md:text-base text-[#454651]">
          Alta de nuevo elemento en el inventario fotovoltaico de FULGOR S.A.S.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl mb-6 text-sm font-medium flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]'
              : 'bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {feedback.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-[#e2e8f0] rounded-2xl p-6 md:p-8 shadow-xs flex flex-col gap-6">
        {/* Row 1: Code and Name */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div>
            <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-2">
              CÓDIGO (FORMATO AAA000) <span className="text-[#dd4c42]">*</span>
            </label>
            <div className="relative">
              <input
                id="input-codigo"
                type="text"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="ej. PAN001, INV003"
                className={`w-full px-3.5 py-2.5 rounded-lg border font-mono-code font-bold uppercase tracking-wider text-sm transition-colors focus:outline-hidden ${
                  codigo.length === 0
                    ? 'border-[#e2e8f0] focus:border-[#3e4e9e]'
                    : isCodeValid
                    ? 'border-[#10b981] bg-[#e6f4ea]/20 text-[#137333]'
                    : 'border-[#dd4c42] bg-[#fce8e6]/20 text-[#c5221f]'
                }`}
                required
              />
              {codigo.length > 0 && (
                <span className="absolute right-3 top-2.5">
                  {isCodeValid ? (
                    <span className="material-symbols-outlined text-[#10b981] text-[18px]">check_circle</span>
                  ) : (
                    <span className="material-symbols-outlined text-[#dd4c42] text-[18px]">error</span>
                  )}
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#767682] mt-1 block">
              Formato alfanumérico estándar (ej. PAN550, MC4100, CAB600).
            </span>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-2">
              NOMBRE DEL COMPONENTE <span className="text-[#dd4c42]">*</span>
            </label>
            <input
              id="input-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej. Módulo Solar Canadian 550W HiKu6 Mono Perc"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#e2e8f0] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#3e4e9e] text-[#131b2e]"
              required
            />
          </div>
        </div>

        {/* Row 2: Category and Description */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div>
            <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-2">
              CATEGORÍA FOTOVOLTAICA <span className="text-[#dd4c42]">*</span>
            </label>
            <select
              id="select-categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaElemento)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-[#3e4e9e] text-[#131b2e] cursor-pointer"
            >
              <option value="PANELES">Paneles Solares (FV)</option>
              <option value="INVERSORES">Inversores y Microinversores</option>
              <option value="ESTRUCTURAS">Estructuras y Rieles de Montaje</option>
              <option value="CABLES">Cables Solares DC / AC</option>
              <option value="CONECTORES">Conectores MC4</option>
              <option value="PROTECCIONES">Protecciones y Fusibles</option>
              <option value="BATERIAS">Baterías y Almacenamiento</option>
              <option value="OTROS">Otros Accesorios</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-2">
              DESCRIPCIÓN Y ESPECIFICACIONES TÉCNICAS
            </label>
            <textarea
              id="input-descripcion"
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Potencia, voltaje Voc, corriente Isc, material, garantía o ficha técnica..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#e2e8f0] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#3e4e9e] text-[#131b2e]"
            />
          </div>
        </div>

        {/* Material Status and Damage Units */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl">
          <div>
            <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-1.5">
              ESTADO DEL MATERIAL / CONDICIÓN FÍSICA
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-[#e2e8f0] bg-white text-xs font-semibold text-[#131b2e]"
            >
              <option value="BUENO">Bueno / Óptimo (Nuevo o 100% operativo)</option>
              <option value="MEDIO">Medio / Aceptable (Desgaste superficial)</option>
              <option value="MAL ESTADO">Mal Estado / Dañado (Averiado)</option>
              <option value="EN REPARACIÓN">En Reparación / En Taller</option>
              <option value="RETAZOS / BUENO">Retazos / Sobrantes Buenos</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-1.5">
              CANTIDAD DE UNIDADES DAÑADAS / MERMA
            </label>
            <input
              type="number"
              min="0"
              value={cantidadDanados}
              onChange={(e) => setCantidadDanados(Number(e.target.value))}
              placeholder="0 unidades dañadas"
              className="w-full px-3.5 py-2 rounded-lg border border-[#e2e8f0] bg-white text-xs font-mono-code font-bold text-[#131b2e]"
            />
          </div>
        </div>

        <ItemLocationFields warehouseId={selectedAlmacenId} rackId={selectedEstanteriaId} boxId={selectedCajaId}
          onWarehouse={setAlmacenId} onRack={setEstanteriaId} onBox={setCajaId} />

        <ItemPhotoPicker value={fotoUrl} onChange={setFotoUrl} />

        <ItemStockFields quantity={cantidad} unit={unidad} minimum={stockMinimo}
          onQuantity={setCantidad} onUnit={setUnidad} onMinimum={setStockMinimo} />

        {/* Action Buttons */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#e2e8f0]">
          <button
            type="button"
            onClick={() => setActiveView('dashboard')}
            className="px-5 py-2.5 rounded-lg border border-[#e2e8f0] text-sm font-semibold text-[#454651] hover:bg-[#f8fafc] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            id="btn-submit-component"
            disabled={pending}
            className="px-6 py-2.5 rounded-lg bg-[#3e4e9e] text-white text-sm font-bold hover:bg-[#323f80] active:scale-[0.98] transition-all shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>{pending ? 'Guardando…' : 'Guardar Componente'}</span>
          </button>
        </div>
      </form>

    </div>
  );
};
