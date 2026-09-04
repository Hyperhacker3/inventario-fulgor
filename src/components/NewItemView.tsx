import React, { useState, useMemo, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { CategoriaElemento } from '../types';
import { CameraCaptureModal } from './CameraCaptureModal';

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
  const [almacenId, setAlmacenId] = useState<number>(almacenes[0]?.id || 1);
  const [estanteriaId, setEstanteriaId] = useState<number>(1);
  const [cajaId, setCajaId] = useState<number>(1);
  const [cantidad, setCantidad] = useState<number>(100);
  const [unidad, setUnidad] = useState<'und' | 'rll' | 'mts' | 'kg' | 'par' | 'jgo'>('und');
  const [stockMinimo, setStockMinimo] = useState<number>(20);
  const [estado, setEstado] = useState<string>('BUENO');
  const [cantidadDanados, setCantidadDanados] = useState<number>(0);
  const [fotoUrl, setFotoUrl] = useState<string>(
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDyg0C5mSCaSnpfqADkOQUpqlsZnFLdbYeD_eM9AWUtdXH4KFuslC3MZZo-QfPqemt6fffRhKHT7bR_lRU70wgkxynsJgDRAzWeEmcyEc-k5frMTpGggZ69t-GQbCy5RKfvY1dqnJVEhgk2GgoG3TZZfIk1h8HOU1WaBL8dgyXpGBsVt3OaWmp3Cxv2R_AoBgnwS_iScvivRH_zbK2Fik6iddOWHoAqGNV_l2Sy3b6jyxLCLzoFQQCj'
  );
  const [fotoMode, setFotoMode] = useState<'camera' | 'presets' | 'url'>('presets');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cascading Estanterias
  const availableEstanterias = useMemo(() => {
    return estanterias.filter((e) => e.almacenId === Number(almacenId));
  }, [estanterias, almacenId]);

  // Keep valid estanteriaId
  React.useEffect(() => {
    if (availableEstanterias.length > 0) {
      const exists = availableEstanterias.some((e) => e.id === estanteriaId);
      if (!exists) {
        setEstanteriaId(availableEstanterias[0].id);
      }
    }
  }, [availableEstanterias, estanteriaId]);

  // Cascading Cajas
  const availableCajas = useMemo(() => {
    return cajas.filter((c) => c.estanteriaId === Number(estanteriaId));
  }, [cajas, estanteriaId]);

  // Keep valid cajaId
  React.useEffect(() => {
    if (availableCajas.length > 0) {
      const exists = availableCajas.some((c) => c.id === cajaId);
      if (!exists) {
        setCajaId(availableCajas[0].id);
      }
    }
  }, [availableCajas, cajaId]);

  // Code validation: Alphanumeric standard e.g. PAN550, MC4100, CAB600
  const isCodeValid = useMemo(() => {
    const regex = /^[A-Z0-9-]{3,10}$/;
    return regex.test(codigo.trim().toUpperCase());
  }, [codigo]);

  // Preset photos
  const presetPhotos = [
    {
      label: 'Panel Solar Monocristalino',
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyg0C5mSCaSnpfqADkOQUpqlsZnFLdbYeD_eM9AWUtdXH4KFuslC3MZZo-QfPqemt6fffRhKHT7bR_lRU70wgkxynsJgDRAzWeEmcyEc-k5frMTpGggZ69t-GQbCy5RKfvY1dqnJVEhgk2GgoG3TZZfIk1h8HOU1WaBL8dgyXpGBsVt3OaWmp3Cxv2R_AoBgnwS_iScvivRH_zbK2Fik6iddOWHoAqGNV_l2Sy3b6jyxLCLzoFQQCj'
    },
    {
      label: 'Inversor String Trifásico',
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCHXz4P4hQG_40YI6U3q3wI-6i_V503D1-gE_V0-g-E6i_V503D1-gE_V0-g-E6i_V503D1-gE_V0-g-E6i_V503D1-gE_V0-g'
    },
    {
      label: 'Cable Solar Fotovoltaico Rojo 6mm²',
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB_gVw_i_V503D1-gE_V0-g-E6i_V503D1-gE_V0-g-E6i_V503D1-gE_V0-g-E6i_V503D1-gE_V0-g-E6i_V503D1-g'
    },
    {
      label: 'Conector MC4 Macho / Hembra',
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0j_k9l8m7n6o5p4q3r2s1t0u9v8w7x6y5z4a3b2c1d0e9f8g7h6i5j4k3l2m1n0o9p8q7r6s5t4u3v2w1x0y9z8'
    },
    {
      label: 'Fusible DC 1000V 15A',
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD8e7f6g5h4i3j2k1l0m9n8o7p6q5r4s3t2u1v0w9x8y7z6a5b4c3d2e1f0g9h8i7j6k5l4m3n2o1p0q9r8s7t6'
    },
    {
      label: 'Batería Litio LiFePO4 48V',
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1'
    }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setFotoUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
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
      const created = addElemento({
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || 'Componente solar fotovoltaico para proyectos FULGOR S.A.S.',
        categoria,
        cantidad: Number(cantidad) || 0,
        unidad,
        fotoUrl: fotoUrl.trim(),
        almacenId: Number(almacenId),
        estanteriaId: Number(estanteriaId),
        cajaId: Number(cajaId),
        stockMinimo: Number(stockMinimo) || 10,
        estado,
        cantidadDanados: Math.max(0, Number(cantidadDanados) || 0)
      });

      setFeedback({
        type: 'success',
        message: `¡Componente ${created.codigo} registrado exitosamente!`
      });

      setTimeout(() => {
        openItemDetail(created);
        setActiveView('dashboard');
      }, 1200);
    } catch {
      setFeedback({ type: 'error', message: 'Error al registrar el componente en el sistema.' });
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
              onChange={(e) => setCantidadDanados(Math.max(0, parseInt(e.target.value, 10) || 0))}
              placeholder="0 unidades dañadas"
              className="w-full px-3.5 py-2 rounded-lg border border-[#e2e8f0] bg-white text-xs font-mono-code font-bold text-[#131b2e]"
            />
          </div>
        </div>

        {/* Row 3: Cascading Location (Almacén -> Estantería -> Caja) */}
        <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl">
          <h3 className="text-xs font-bold tracking-wider text-[#253685] uppercase mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">warehouse</span>
            <span>Ubicación en Almacén (Cascada)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#454651] mb-1.5">Almacén / Centro</label>
              <select
                id="select-almacen-form"
                value={almacenId}
                onChange={(e) => setAlmacenId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-xs text-[#131b2e] cursor-pointer"
              >
                {almacenes.map((alm) => (
                  <option key={alm.id} value={alm.id}>
                    {alm.nombre} ({alm.codigo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#454651] mb-1.5">Estantería / Zona</label>
              <select
                id="select-estanteria-form"
                value={estanteriaId}
                onChange={(e) => setEstanteriaId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-xs text-[#131b2e] cursor-pointer"
              >
                {availableEstanterias.length > 0 ? (
                  availableEstanterias.map((est) => (
                    <option key={est.id} value={est.id}>
                      {est.codigo} - {est.nombre}
                    </option>
                  ))
                ) : (
                  <option value="">Sin estanterías</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#454651] mb-1.5">Nivel / Caja</label>
              <select
                id="select-caja-form"
                value={cajaId}
                onChange={(e) => setCajaId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-xs text-[#131b2e] cursor-pointer"
              >
                {availableCajas.length > 0 ? (
                  availableCajas.map((caj) => (
                    <option key={caj.id} value={caj.id}>
                      {caj.codigoCaja} ({caj.estado})
                    </option>
                  ))
                ) : (
                  <option value="">Sin cajas</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Row 4: Photo Selection with Camera option */}
        <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
            <label className="text-xs font-bold tracking-wider text-[#454651] uppercase">
              FOTOGRAFÍA DEL COMPONENTE
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="text-xs px-2.5 py-1 bg-[#3e4e9e] text-white font-bold rounded-md flex items-center gap-1 shadow-2xs hover:bg-[#323f80] transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">photo_camera</span>
                <span>Tomar con Cámara</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs px-2.5 py-1 bg-white border border-[#cbd5e1] text-[#454651] font-semibold rounded-md flex items-center gap-1 hover:bg-[#eaedff] transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">upload_file</span>
                <span>Subir Archivo</span>
              </button>
              <button
                type="button"
                onClick={() => setFotoMode('presets')}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  fotoMode === 'presets' ? 'bg-[#eaedff] text-[#253685] font-bold border border-[#c7d2fe]' : 'text-[#454651] hover:bg-[#f2f3ff]'
                }`}
              >
                Galería Solar
              </button>
              <button
                type="button"
                onClick={() => setFotoMode('url')}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  fotoMode === 'url' ? 'bg-[#eaedff] text-[#253685] font-bold border border-[#c7d2fe]' : 'text-[#454651] hover:bg-[#f2f3ff]'
                }`}
              >
                URL
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Preview Box */}
            <div className="w-32 h-28 rounded-xl border border-[#e2e8f0] overflow-hidden bg-[#f2f3ff] shrink-0 relative shadow-2xs flex items-center justify-center">
              {fotoUrl ? (
                <img src={fotoUrl} alt="Vista previa" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#94a3b8] bg-[#f8fafc]">
                  <span className="material-symbols-outlined text-[28px] text-[#cbd5e1]">image</span>
                  <span className="text-[10px] text-[#64748b] mt-0.5">Sin imagen</span>
                </div>
              )}
            </div>

            {/* Selector */}
            {fotoMode === 'presets' ? (
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
                {presetPhotos.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setFotoUrl(preset.url)}
                    className={`p-2 rounded-lg border text-left text-xs transition-all flex items-center gap-2 ${
                      fotoUrl === preset.url
                        ? 'border-[#3e4e9e] bg-[#eaedff] font-bold text-[#253685]'
                        : 'border-[#e2e8f0] bg-white text-[#454651] hover:bg-[#f8fafc]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#3e4e9e] shrink-0"></span>
                    <span className="truncate">{preset.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex-1 w-full">
                <input
                  type="url"
                  value={fotoUrl}
                  onChange={(e) => setFotoUrl(e.target.value)}
                  placeholder="https://ejemplo.com/foto-panel.jpg"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#e2e8f0] text-sm focus:ring-2 focus:ring-[#3e4e9e]"
                />
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Row 5: Stock Counter and Minimum */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-[#e2e8f0]">
          <div>
            <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-2">
              STOCK INICIAL <span className="text-[#dd4c42]">*</span>
            </label>
            <div className="flex items-center border border-[#e2e8f0] rounded-lg overflow-hidden bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setCantidad((prev) => Math.max(0, prev - 10))}
                className="px-3 py-2 bg-[#f8fafc] text-[#454651] hover:bg-[#eaedff] font-bold transition-colors"
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => setCantidad((prev) => Math.max(0, prev - 1))}
                className="px-3 py-2 bg-[#f8fafc] text-[#454651] hover:bg-[#eaedff] font-bold transition-colors border-l border-r border-[#e2e8f0]"
              >
                -1
              </button>
              <input
                id="input-stock-inicial"
                type="number"
                min="0"
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-center font-mono-code font-bold text-base py-2 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setCantidad((prev) => prev + 1)}
                className="px-3 py-2 bg-[#f8fafc] text-[#454651] hover:bg-[#eaedff] font-bold transition-colors border-l border-r border-[#e2e8f0]"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => setCantidad((prev) => prev + 10)}
                className="px-3 py-2 bg-[#f8fafc] text-[#454651] hover:bg-[#eaedff] font-bold transition-colors"
              >
                +10
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-2">
              UNIDAD DE MEDIDA <span className="text-[#dd4c42]">*</span>
            </label>
            <select
              id="select-unidad"
              value={unidad}
              onChange={(e) => setUnidad(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-[#3e4e9e] text-[#131b2e] cursor-pointer"
            >
              <option value="und">Unidades (und)</option>
              <option value="mts">Metros lineales (mts)</option>
              <option value="rll">Rollos (rll)</option>
              <option value="par">Pares (par)</option>
              <option value="jgo">Juegos (jgo)</option>
              <option value="kg">Kilogramos (kg)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider text-[#454651] uppercase mb-2">
              STOCK MÍNIMO (ALERTA)
            </label>
            <input
              type="number"
              min="0"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#e2e8f0] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#3e4e9e] text-[#131b2e]"
            />
          </div>
        </div>

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
            className="px-6 py-2.5 rounded-lg bg-[#3e4e9e] text-white text-sm font-bold hover:bg-[#323f80] active:scale-[0.98] transition-all shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>Guardar Componente</span>
          </button>
        </div>
      </form>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoCaptured={(captured) => {
          setFotoUrl(captured);
          setIsCameraOpen(false);
        }}
        title="Tomar Foto del Componente Solar"
      />
    </div>
  );
};
