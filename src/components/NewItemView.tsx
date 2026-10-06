import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { CategoriaElemento } from '../types';
import { ItemPhotoPicker } from './ItemPhotoPicker';
import { ItemLocationFields } from './item/ItemLocationFields';
import { ItemStockFields } from './item/ItemStockFields';
import { errorMessage } from '../shared/errors';
import { NumberInput } from './NumberInput';
import { ItemWeightFields } from './item/ItemWeightFields';
import { parseWeightDraft, weightDraft } from '../domain/weight';
import { prefixPreview } from '../domain/dataAdministration';

export const NewItemView: React.FC = () => {
  const {
    almacenes,
    estanterias,
    cajas,
    addElemento,
    setActiveView,
    prefijos, categorias, elementos, catalogReady, catalogLoading, refreshCatalog, categoryLabel
  } = useInventory();

  // Form State
  const [prefixId, setPrefixId] = useState('');
  const request = useRef<{ signature: string; id: string } | null>(null);
  const selectedPrefix = prefijos.find(prefix => prefix.id === prefixId && prefix.activo);
  const codigo = selectedPrefix ? prefixPreview(selectedPrefix, elementos.map(item => item.codigo)) : '';
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState<CategoriaElemento>('');
  const [descripcion, setDescripcion] = useState('');
  const [almacenId, setAlmacenId] = useState<string>(almacenes[0]?.id || '');
  const [estanteriaId, setEstanteriaId] = useState<string>('');
  const [cajaId, setCajaId] = useState<string>('');
  const [cantidad, setCantidad] = useState<number>(0);
  const [unidad, setUnidad] = useState<string>('UND');
  const [weight, setWeight] = useState(() => weightDraft());
  const [stockMinimo, setStockMinimo] = useState<number>(0);
  const [estado, setEstado] = useState<string>('BUENO');
  const [cantidadDanados, setCantidadDanados] = useState<number>(0);
  const [fotoUrl, setFotoUrl] = useState<string>('');
  const [fotosAdicionales, setFotosAdicionales] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [boxBusy, setBoxBusy] = useState(false);
  const [boxDraftPending, setBoxDraftPending] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const nameInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (formVersion > 0) nameInput.current?.focus(); }, [formVersion]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || photoBusy || boxBusy) return;
    setFeedback(null);

    if (boxDraftPending) {
      setFeedback({ type: 'error', message: 'Pulse Crear y elegir caja, o seleccione una caja existente, antes de guardar el componente.' });
      return;
    }

    if (!catalogReady || !selectedPrefix || !categorias.some(row => row.id === categoria && row.activo)) {
      setFeedback({
        type: 'error',
        message: 'Seleccione un prefijo y una categoría activos en Administración de datos.'
      });
      return;
    }

    if (!nombre.trim()) {
      setFeedback({ type: 'error', message: 'Por favor ingrese el nombre del componente fotovoltaico.' });
      return;
    }

    try {
      setPending(true);
      const input = {
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        categoria,
        cantidad: Number(cantidad),
        unidad,
        pesoUnitario: parseWeightDraft(weight),
        fotoUrl: fotoUrl.trim(),
        fotosAdicionales,
        almacenId: selectedAlmacenId || null,
        estanteriaId: selectedEstanteriaId || null,
        cajaId: selectedCajaId || null,
        stockMinimo: Number(stockMinimo),
        estado,
        cantidadDanados: Number(cantidadDanados)
      };
      // The preview can change after a refresh; it is not part of request identity.
      const signature = JSON.stringify({ ...input, codigo: '', prefixId });
      if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
      const created = await addElemento(input, { prefixId, requestId: request.current.id });

      setFeedback({
        type: 'success',
        message: `Componente ${created.codigo} registrado. Puede añadir el siguiente.`
      });

      // Preserve only the prefix, warehouse and rack for the next registration.
      setAlmacenId(selectedAlmacenId); setEstanteriaId(selectedEstanteriaId);
      setNombre(''); setCategoria(''); setDescripcion(''); setCajaId('');
      setCantidad(0); setUnidad('UND'); setWeight(weightDraft()); setStockMinimo(0);
      setEstado('BUENO'); setCantidadDanados(0); setFotoUrl(''); setFotosAdicionales([]);
      request.current = null;
      // Remount editable numeric/photo/box fields to clear their internal drafts too.
      setFormVersion(version => version + 1);
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
          Alta de nuevo elemento en el inventario fotovoltaico de EL TURPIAL
        </p>
      </div>

      {feedback && (
        <div
          role={feedback.type === 'success' ? 'status' : 'alert'}
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
      {!catalogReady && <div className="border bg-white rounded-xl p-4 mb-5 text-sm space-y-2">
        <p>{catalogLoading ? 'Cargando códigos y categorías…' : 'Active la migración de administración de datos en Supabase para registrar productos con código automático.'}</p>
        <button type="button" className="text-[#253685] underline" onClick={() => { void refreshCatalog(); }}>Comprobar de nuevo</button>
      </div>}
      <form onSubmit={handleSubmit} className="bg-white border border-[#e2e8f0] rounded-2xl p-6 md:p-8 shadow-xs flex flex-col gap-6">
        <fieldset key={formVersion} disabled={pending || boxBusy} className="contents">
        {/* Row 1: Code and Name */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div>
            <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-2">
              PREFIJO DEL CÓDIGO <span className="text-[#dd4c42]">*</span>
            </label>
            <div className="relative">
              <select id="select-prefijo" required value={prefixId} onChange={event => setPrefixId(event.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm">
                <option value="">Seleccione un prefijo</option>{prefijos.filter(row => row.activo).map(row => <option key={row.id} value={row.id}>{row.prefijo} · {row.nombre}</option>)}
              </select>
            </div>
            <span className="text-[11px] text-[#767682] mt-1 block">
              {codigo ? `Código estimado: ${codigo}. El definitivo se asigna al guardar.` : 'El número se asigna automáticamente en Supabase.'}
            </span>
            <button type="button" className="text-xs text-[#253685] underline mt-2" onClick={() => setActiveView('data-admin')}>Administrar códigos y categorías</button>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-2">
              NOMBRE DEL COMPONENTE <span className="text-[#dd4c42]">*</span>
            </label>
            <input
              id="input-nombre"
              ref={nameInput}
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
              CATEGORÍA <span className="text-[#dd4c42]">*</span>
            </label>
            <select
              id="select-categoria"
              required
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaElemento)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-[#3e4e9e] text-[#131b2e] cursor-pointer"
            >
              <option value="">Seleccione una categoría</option>
              {categorias.filter(row => row.activo).map(row => <option key={row.id} value={row.id}>{categoryLabel(row.id)}</option>)}
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
            <NumberInput
              required
              min="0"
              step="0.001"
              value={cantidadDanados}
              onValueChange={setCantidadDanados}
              placeholder="0 unidades dañadas"
              className="w-full px-3.5 py-2 rounded-lg border border-[#e2e8f0] bg-white text-xs font-mono-code font-bold text-[#131b2e]"
            />
          </div>
        </div>

        <ItemLocationFields warehouseId={selectedAlmacenId} rackId={selectedEstanteriaId} boxId={selectedCajaId}
          onWarehouse={setAlmacenId} onRack={setEstanteriaId} onBox={setCajaId} onBoxBusyChange={setBoxBusy} onBoxDraftChange={setBoxDraftPending} />

        <ItemPhotoPicker value={fotoUrl} additional={fotosAdicionales} category={categoria} onChange={setFotoUrl} onAdditionalChange={setFotosAdicionales} onBusyChange={setPhotoBusy} disabled={pending} />

        <ItemStockFields quantity={cantidad} unit={unidad} minimum={stockMinimo}
          onQuantity={setCantidad} onUnit={setUnidad} onMinimum={setStockMinimo} />
        <ItemWeightFields value={weight} onChange={setWeight} stockUnit={unidad} disabled={pending} />

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
            disabled={pending || photoBusy || boxBusy || !catalogReady || !selectedPrefix}
            className="px-6 py-2.5 rounded-lg bg-[#3e4e9e] text-white text-sm font-bold hover:bg-[#323f80] active:scale-[0.98] transition-all shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>{pending ? 'Guardando…' : 'Guardar Componente'}</span>
          </button>
        </div>
        </fieldset>
      </form>

    </div>
  );
};
