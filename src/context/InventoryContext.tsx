import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Elemento,
  Almacen,
  Estanteria,
  Caja,
  Proyecto,
  Remision,
  HistorialMovimiento,
  UserProfile,
  ActiveView,
  DispatchCartItem,
  TipoMovimiento
} from '../types';
import {
  INITIAL_ELEMENTOS,
  INITIAL_ALMACENES,
  INITIAL_ESTANTERIAS,
  INITIAL_CAJAS,
  INITIAL_PROYECTOS,
  INITIAL_REMISIONES,
  INITIAL_HISTORIAL,
  INITIAL_USER
} from '../data/initialData';

interface ProcessDispatchPayload {
  proyectoId: number;
  entregadoPor: string;
  cargoEntregado?: string;
  recibidoPor: string;
  cargoRecibido?: string;
  observaciones?: string;
}

interface InventoryContextType {
  elementos: Elemento[];
  almacenes: Almacen[];
  estanterias: Estanteria[];
  cajas: Caja[];
  proyectos: Proyecto[];
  remisiones: Remision[];
  historial: HistorialMovimiento[];
  user: UserProfile;
  activeView: ActiveView;
  dispatchCart: DispatchCartItem[];
  selectedItemForDetail: Elemento | null;
  selectedRemisionForPdf: Remision | null;
  quickMovementItem: Elemento | null;
  quickMovementType: 'ENTRADA' | 'AJUSTE';
  isHelpModalOpen: boolean;
  globalSearch: string;
  isCloudConnected: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline';
  
  // Navigation & Modals
  setActiveView: (view: ActiveView) => void;
  setGlobalSearch: (q: string) => void;
  openItemDetail: (item: Elemento) => void;
  closeItemDetail: () => void;
  openPdfRemision: (remision: Remision) => void;
  closePdfRemision: () => void;
  openQuickMovement: (item: Elemento, type: 'ENTRADA' | 'AJUSTE') => void;
  closeQuickMovement: () => void;
  setIsHelpModalOpen: (open: boolean) => void;
  
  // Item Operations
  addElemento: (item: Omit<Elemento, 'id' | 'createdAt' | 'updatedAt'>) => Elemento;
  updateElemento: (id: number, updates: Partial<Elemento>) => void;
  deleteElemento: (id: number) => void;
  
  // Dispatch Operations
  addToDispatchCart: (elemento: Elemento, cantidad?: number) => void;
  updateDispatchCartQuantity: (elementoId: number, cantidad: number) => void;
  removeFromDispatchCart: (elementoId: number) => void;
  clearDispatchCart: () => void;
  processDispatch: (payload: ProcessDispatchPayload) => Remision | null;
  
  // Stock Movements & Adjustments
  addStockMovement: (data: {
    elementoId: number;
    tipo: TipoMovimiento;
    cantidad: number; // positive for entry, negative/positive handled according to type
    motivo: string;
    responsable: string;
    proyectoId?: number;
  }) => void;
  
  // Warehouse & Hierarchy
  addAlmacen: (almacen: Omit<Almacen, 'id'>) => Almacen;
  updateAlmacen: (id: number, updates: Partial<Almacen>) => void;
  addEstanteria: (estanteria: Omit<Estanteria, 'id'>) => Estanteria;
  updateEstanteria: (id: number, updates: Partial<Estanteria>) => void;
  addCaja: (caja: Omit<Caja, 'id'>) => Caja;
  updateCaja: (id: number, updates: Partial<Caja>) => void;
  addProyecto: (proyecto: Omit<Proyecto, 'id' | 'createdAt'>) => Proyecto;
  
  // Helpers
  getAlmacenById: (id: number) => Almacen | undefined;
  getEstanteriaById: (id: number) => Estanteria | undefined;
  getCajaById: (id: number) => Caja | undefined;
  getProyectoById: (id: number) => Proyecto | undefined;
  getLocationString: (item: Elemento) => string;
  resetToDefaultData: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ELEMENTOS: 'fulgor_elementos_v1',
  ALMACENES: 'fulgor_almacenes_v1',
  ESTANTERIAS: 'fulgor_estanterias_v1',
  CAJAS: 'fulgor_cajas_v1',
  PROYECTOS: 'fulgor_proyectos_v1',
  REMISIONES: 'fulgor_remisiones_v1',
  HISTORIAL: 'fulgor_historial_v1',
  CART: 'fulgor_dispatch_cart_v1'
};

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load state from localStorage or fallback to Initial Seed Data
  const [elementos, setElementos] = useState<Elemento[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ELEMENTOS);
      return saved ? JSON.parse(saved) : INITIAL_ELEMENTOS;
    } catch {
      return INITIAL_ELEMENTOS;
    }
  });

  const [almacenes, setAlmacenes] = useState<Almacen[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ALMACENES);
      return saved ? JSON.parse(saved) : INITIAL_ALMACENES;
    } catch {
      return INITIAL_ALMACENES;
    }
  });

  const [estanterias, setEstanterias] = useState<Estanteria[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ESTANTERIAS);
      return saved ? JSON.parse(saved) : INITIAL_ESTANTERIAS;
    } catch {
      return INITIAL_ESTANTERIAS;
    }
  });

  const [cajas, setCajas] = useState<Caja[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CAJAS);
      return saved ? JSON.parse(saved) : INITIAL_CAJAS;
    } catch {
      return INITIAL_CAJAS;
    }
  });

  const [proyectos, setProyectos] = useState<Proyecto[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROYECTOS);
      return saved ? JSON.parse(saved) : INITIAL_PROYECTOS;
    } catch {
      return INITIAL_PROYECTOS;
    }
  });

  const [remisiones, setRemisiones] = useState<Remision[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REMISIONES);
      return saved ? JSON.parse(saved) : INITIAL_REMISIONES;
    } catch {
      return INITIAL_REMISIONES;
    }
  });

  const [historial, setHistorial] = useState<HistorialMovimiento[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORIAL);
      return saved ? JSON.parse(saved) : INITIAL_HISTORIAL;
    } catch {
      return INITIAL_HISTORIAL;
    }
  });

  const [dispatchCart, setDispatchCart] = useState<DispatchCartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CART);
      return saved ? JSON.parse(saved) : [
        { elemento: INITIAL_ELEMENTOS[0], cantidad: 20 },
        { elemento: INITIAL_ELEMENTOS[2], cantidad: 1 }
      ];
    } catch {
      return [
        { elemento: INITIAL_ELEMENTOS[0], cantidad: 20 },
        { elemento: INITIAL_ELEMENTOS[2], cantidad: 1 }
      ];
    }
  });

  const [user] = useState<UserProfile>(INITIAL_USER);
  const [activeView, setActiveView] = useState<ActiveView>('dispatch');
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<Elemento | null>(null);
  const [selectedRemisionForPdf, setSelectedRemisionForPdf] = useState<Remision | null>(null);
  const [quickMovementItem, setQuickMovementItem] = useState<Elemento | null>(null);
  const [quickMovementType, setQuickMovementType] = useState<'ENTRADA' | 'AJUSTE'>('ENTRADA');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(isSupabaseConfigured);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>(
    isSupabaseConfigured ? 'syncing' : 'offline'
  );

  // Initial Supabase Sync & Realtime Subscription
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsCloudConnected(false);
      setSyncStatus('offline');
      return;
    }

    let isSubscribed = true;

    const fetchSupabaseData = async () => {
      try {
        setSyncStatus('syncing');
        const [elmRes, remRes, histRes, almRes, estRes, cajRes] = await Promise.all([
          supabase.from('elementos').select('*').range(0, 1999),
          supabase.from('remisiones').select('*').range(0, 999),
          supabase.from('historial').select('*').order('created_at', { ascending: false }).range(0, 999),
          supabase.from('almacenes').select('*'),
          supabase.from('estanterias').select('*'),
          supabase.from('cajas').select('*')
        ]);

        if (!isSubscribed) return;

        let mappedAlm: Almacen[] = [];
        if (almRes.data && almRes.data.length > 0) {
          mappedAlm = almRes.data.map((row: any, idx: number) => ({
            id: typeof row.id === 'number' ? row.id : parseInt(row.id.replace(/[^0-9]/g, ''), 10) || (idx + 1),
            codigo: row.codigo || `ALM-0${idx + 1}`,
            nombre: row.nombre,
            ciudad: row.direccion?.split(',')[1]?.trim() || row.ciudad || 'Colombia',
            descripcion: row.descripcion || row.direccion || '',
            capacidadPorcentaje: row.capacidad_total ? Math.round(((row.ocupacion_actual || 0) / row.capacidad_total) * 100) : 45,
            estado: 'Operativo'
          }));
          setAlmacenes(mappedAlm);
        }

        let mappedEst: Estanteria[] = [];
        if (estRes.data && estRes.data.length > 0) {
          mappedEst = estRes.data.map((row: any, idx: number) => {
            let matchedAlmId = 1;
            if (typeof row.almacen_id === 'number') {
              matchedAlmId = row.almacen_id;
            } else if (typeof row.almacen_id === 'string') {
              const matched = mappedAlm.find(a => a.codigo === row.almacen_id || `ALM-${a.codigo}` === row.almacen_id || row.almacen_id.includes(a.codigo));
              matchedAlmId = matched ? matched.id : parseInt(row.almacen_id.replace(/[^0-9]/g, ''), 10) || 1;
            }
            return {
              id: typeof row.id === 'number' ? row.id : parseInt(row.id.replace(/[^0-9]/g, ''), 10) || (idx + 1),
              almacenId: matchedAlmId,
              codigo: row.codigo || `EST-0${idx + 1}`,
              nombre: row.nombre || `Estantería ${row.codigo}`,
              descripcion: row.descripcion || ''
            };
          });
          setEstanterias(mappedEst);
        }

        let mappedCaj: Caja[] = [];
        if (cajRes.data && cajRes.data.length > 0) {
          mappedCaj = cajRes.data.map((row: any, idx: number) => {
            const rawEstado = (row.estado || 'PARCIAL').toUpperCase();
            const normEstado: 'Completa' | 'Parcial' | 'Vacia' = 
              rawEstado.includes('COMP') ? 'Completa' : rawEstado.includes('VAC') ? 'Vacia' : 'Parcial';

            let matchedEstId = 1;
            if (typeof row.estanteria_id === 'number') {
              matchedEstId = row.estanteria_id;
            } else if (typeof row.estanteria_id === 'string') {
              const matched = mappedEst.find(e => e.codigo === row.estanteria_id || `EST-${e.codigo}` === row.estanteria_id || row.estanteria_id.includes(e.codigo));
              matchedEstId = matched ? matched.id : parseInt(row.estanteria_id.replace(/[^0-9]/g, ''), 10) || 1;
            }

            return {
              id: typeof row.id === 'number' ? row.id : parseInt(row.id.replace(/[^0-9]/g, ''), 10) || (idx + 1),
              estanteriaId: matchedEstId,
              codigoCaja: row.codigo || row.codigo_caja || `CAJ-0${idx + 1}`,
              estado: normEstado,
              descripcion: row.descripcion || row.nombre || ''
            };
          });
          setCajas(mappedCaj);
        }

        if (elmRes.data && elmRes.data.length > 0) {
          const mappedElm: Elemento[] = elmRes.data.map((row: any, idx: number) => {
            // Resolve Almacen ID
            let resolvedAlmacenId = 1;
            if (typeof row.almacen_id === 'number') {
              resolvedAlmacenId = row.almacen_id;
            } else if (typeof row.almacen_id === 'string') {
              const match = mappedAlm.find(a => a.codigo === row.almacen_id || `ALM-${a.codigo}` === row.almacen_id || row.almacen_id.includes(a.codigo));
              resolvedAlmacenId = match ? match.id : parseInt(row.almacen_id.replace(/[^0-9]/g, ''), 10) || 1;
            }

            // Resolve Estanteria ID
            let resolvedEstanteriaId = 1;
            if (typeof row.estanteria_id === 'number') {
              resolvedEstanteriaId = row.estanteria_id;
            } else if (typeof row.estanteria_id === 'string') {
              const match = mappedEst.find(e => e.codigo === row.estanteria_id || `EST-${e.codigo}` === row.estanteria_id || row.estanteria_id.includes(e.codigo));
              resolvedEstanteriaId = match ? match.id : parseInt(row.estanteria_id.replace(/[^0-9]/g, ''), 10) || 1;
            }

            // Resolve Caja ID
            let resolvedCajaId = 1;
            if (typeof row.caja_id === 'number') {
              resolvedCajaId = row.caja_id;
            } else if (typeof row.caja_id === 'string') {
              const match = mappedCaj.find(c => c.codigoCaja === row.caja_id || `CAJ-${c.codigoCaja}` === row.caja_id || row.caja_id.includes(c.codigoCaja));
              resolvedCajaId = match ? match.id : parseInt(row.caja_id.replace(/[^0-9]/g, ''), 10) || 1;
            }

            return {
              id: typeof row.id === 'number' ? row.id : parseInt((row.id || '').replace(/[^0-9]/g, ''), 10) || (idx + 1),
              codigo: row.codigo,
              nombre: row.nombre,
              categoria: row.categoria,
              cantidad: Number(row.cantidad) || 0,
              stockMinimo: Number(row.stock_minimo) || 10,
              unidad: (row.unidad || 'und').toLowerCase() as any,
              almacenId: resolvedAlmacenId,
              estanteriaId: resolvedEstanteriaId,
              cajaId: resolvedCajaId,
              fotoUrl: row.foto_url || '',
              descripcion: row.descripcion || '',
              estado: row.especificaciones?.estado_material || 'BUENO',
              cantidadDanados: Number(row.especificaciones?.cantidad_danados) || 0,
              especificaciones: row.especificaciones || {},
              createdAt: row.created_at || new Date().toISOString(),
              updatedAt: row.updated_at || new Date().toISOString()
            };
          });
          setElementos(mappedElm);
        }

        if (remRes.data && remRes.data.length > 0) {
          const mappedRem: Remision[] = remRes.data.map((row: any) => ({
            id: typeof row.id === 'number' ? row.id : parseInt(row.id.replace(/[^0-9]/g, ''), 10) || Math.floor(Math.random() * 10000),
            numeroRemision: row.numero_remision,
            fecha: row.fecha,
            proyectoId: typeof row.proyecto_id === 'number' ? row.proyecto_id : 1,
            proyectoNombre: row.proyecto_nombre,
            cliente: row.cliente,
            ubicacion: row.ubicacion || '',
            entregadoPor: row.entregado_por,
            cargoEntregado: row.cargo_entregado || '',
            recibidoPor: row.recibido_por,
            cargoRecibido: row.cargo_recibido || '',
            items: Array.isArray(row.items) ? row.items : [],
            observaciones: row.observaciones || ''
          }));
          setRemisiones(mappedRem);
        }

        if (histRes.data && histRes.data.length > 0) {
          const mappedHist: HistorialMovimiento[] = histRes.data.map((row: any) => ({
            id: typeof row.id === 'number' ? row.id : parseInt(row.id.replace(/[^0-9]/g, ''), 10) || Math.floor(Math.random() * 10000),
            tipo: row.tipo,
            elementoId: typeof row.elemento_id === 'number' ? row.elemento_id : 1,
            itemCode: row.elemento_codigo,
            itemName: row.elemento_nombre,
            cantidad: Number(row.cantidad) || 0,
            unidad: row.unidad || 'UND',
            stockAnterior: 0,
            stockNuevo: Number(row.cantidad) || 0,
            motivo: row.motivo || '',
            responsable: row.responsable,
            fecha: row.fecha,
            hora: '12:00 PM',
            docType: 'view'
          }));
          setHistorial(mappedHist);
        }

        setIsCloudConnected(true);
        setSyncStatus('synced');
      } catch (err) {
        console.warn('Supabase fetch error, fallback to local storage:', err);
        setSyncStatus('offline');
      }
    };

    fetchSupabaseData();

    // Setup Supabase Realtime channel
    const channel = supabase
      .channel('fulgor_realtime_inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'elementos' }, () => {
        fetchSupabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'remisiones' }, () => {
        fetchSupabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historial' }, () => {
        fetchSupabaseData();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsCloudConnected(true);
          setSyncStatus('synced');
        }
      });

    return () => {
      isSubscribed = false;
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ELEMENTOS, JSON.stringify(elementos));
    } catch (e) {
      console.warn('Failed to save elementos to localStorage', e);
    }
  }, [elementos]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ALMACENES, JSON.stringify(almacenes));
    } catch (e) {
      console.warn('Failed to save almacenes to localStorage', e);
    }
  }, [almacenes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ESTANTERIAS, JSON.stringify(estanterias));
    } catch (e) {
      console.warn('Failed to save estanterias to localStorage', e);
    }
  }, [estanterias]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CAJAS, JSON.stringify(cajas));
    } catch (e) {
      console.warn('Failed to save cajas to localStorage', e);
    }
  }, [cajas]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROYECTOS, JSON.stringify(proyectos));
    } catch (e) {
      console.warn('Failed to save proyectos to localStorage', e);
    }
  }, [proyectos]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.REMISIONES, JSON.stringify(remisiones));
    } catch (e) {
      console.warn('Failed to save remisiones to localStorage', e);
    }
  }, [remisiones]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORIAL, JSON.stringify(historial));
    } catch (e) {
      console.warn('Failed to save historial to localStorage', e);
    }
  }, [historial]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(dispatchCart));
    } catch (e) {
      console.warn('Failed to save cart to localStorage', e);
    }
  }, [dispatchCart]);

  // Lookup Helpers
  const getAlmacenById = (id: number) => almacenes.find(a => a.id === id);
  const getEstanteriaById = (id: number) => estanterias.find(e => e.id === id);
  const getCajaById = (id: number) => cajas.find(c => c.id === id);
  const getProyectoById = (id: number) => proyectos.find(p => p.id === id);

  const getLocationString = (item: Elemento) => {
    const alm = getAlmacenById(item.almacenId);
    const est = getEstanteriaById(item.estanteriaId);
    const caj = getCajaById(item.cajaId);

    const parts = [];
    if (alm) parts.push(alm.nombre);
    if (est) parts.push(est.nombre || est.codigo);
    if (caj) parts.push(caj.codigoCaja);

    return parts.join(' > ') || 'Sin ubicación asignada';
  };

  // Add Item
  const addElemento = (itemData: Omit<Elemento, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString().split('T')[0];
    const newId = Math.max(0, ...elementos.map(e => e.id)) + 1;
    const cleanCode = itemData.codigo.trim().toUpperCase();

    const newItem: Elemento = {
      ...itemData,
      id: newId,
      codigo: cleanCode,
      createdAt: now,
      updatedAt: now
    };

    setElementos(prev => [newItem, ...prev]);

    // Record entry movement
    if (newItem.cantidad > 0) {
      const newHistoryItem: HistorialMovimiento = {
        id: Math.max(0, ...historial.map(h => h.id)) + 1,
        tipo: 'ENTRADA',
        elementoId: newItem.id,
        itemCode: newItem.codigo,
        itemName: newItem.nombre,
        cantidad: newItem.cantidad,
        unidad: newItem.unidad,
        stockAnterior: 0,
        stockNuevo: newItem.cantidad,
        motivo: 'Alta de nuevo componente fotovoltaico',
        responsable: user.name,
        fecha: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
        hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }),
        docType: 'receipt'
      };
      setHistorial(prev => [newHistoryItem, ...prev]);

      // Sync entry to Supabase
      if (supabase) {
        supabase.from('historial').insert([{
          id: `MOV-${Date.now()}-${newHistoryItem.id}`,
          fecha: `${newHistoryItem.fecha} ${newHistoryItem.hora}`,
          tipo: 'ENTRADA',
          elemento_id: `ELM-${newItem.id}`,
          elemento_codigo: newItem.codigo,
          elemento_nombre: newItem.nombre,
          cantidad: newItem.cantidad,
          unidad: newItem.unidad.toUpperCase(),
          responsable: user.name,
          motivo: 'Alta de nuevo componente fotovoltaico'
        }]).then(({ error }) => {
          if (error) console.warn('Supabase historial insert error:', error);
        });
      }
    }

    // Sync new item to Supabase
    if (supabase) {
      const almObj = getAlmacenById(newItem.almacenId);
      const estObj = getEstanteriaById(newItem.estanteriaId);
      const cajObj = newItem.cajaId ? getCajaById(newItem.cajaId) : null;

      const dbAlmacenId = almObj 
        ? (almObj.codigo.startsWith('ALM-') ? almObj.codigo : `ALM-${almObj.codigo}`) 
        : null;
      const dbEstanteriaId = estObj 
        ? (estObj.codigo.startsWith('EST-') ? estObj.codigo : `EST-${estObj.codigo}`) 
        : null;
      const dbCajaId = cajObj 
        ? (cajObj.codigoCaja.startsWith('CAJ-') ? cajObj.codigoCaja : `CAJ-${cajObj.codigoCaja}`) 
        : null;

      supabase.from('elementos').upsert([{
        id: `ELM-${newItem.id}`,
        codigo: newItem.codigo,
        nombre: newItem.nombre,
        categoria: newItem.categoria,
        cantidad: newItem.cantidad,
        stock_minimo: newItem.stockMinimo,
        unidad: newItem.unidad.toUpperCase(),
        almacen_id: dbAlmacenId,
        estanteria_id: dbEstanteriaId,
        caja_id: dbCajaId,
        foto_url: newItem.fotoUrl || '',
        descripcion: newItem.descripcion || '',
        especificaciones: newItem.especificaciones || {}
      }]).then(({ error }) => {
        if (error) console.warn('Supabase elementos upsert error:', error);
      });
    }

    return newItem;
  };

  // Update Item
  const updateElemento = (id: number, updates: Partial<Elemento>) => {
    const now = new Date().toISOString().split('T')[0];
    const targetItem = elementos.find(e => e.id === id);

    setElementos(prev =>
      prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            ...updates,
            updatedAt: now
          };
        }
        return item;
      })
    );

    // If active in modal, update it too
    if (selectedItemForDetail?.id === id) {
      setSelectedItemForDetail(prev => (prev ? { ...prev, ...updates, updatedAt: now } : null));
    }

    // Sync update to Supabase
    if (supabase && targetItem) {
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.nombre !== undefined) dbUpdates.nombre = updates.nombre;
      if (updates.cantidad !== undefined) dbUpdates.cantidad = updates.cantidad;
      if (updates.stockMinimo !== undefined) dbUpdates.stock_minimo = updates.stockMinimo;
      if (updates.descripcion !== undefined) dbUpdates.descripcion = updates.descripcion;
      if (updates.fotoUrl !== undefined) dbUpdates.foto_url = updates.fotoUrl;

      const mergedSpecs = {
        ...(targetItem.especificaciones || {}),
        ...(updates.especificaciones || {}),
        ...(updates.estado !== undefined ? { estado_material: updates.estado } : {}),
        ...(updates.cantidadDanados !== undefined ? { cantidad_danados: updates.cantidadDanados } : {})
      };
      dbUpdates.especificaciones = mergedSpecs;

      supabase.from('elementos').update(dbUpdates).eq('codigo', targetItem.codigo).then(({ error }) => {
        if (error) console.warn('Supabase elementos update error:', error);
      });
    }
  };

  // Delete Item
  const deleteElemento = (id: number) => {
    const itemToDelete = elementos.find(e => e.id === id);
    setElementos(prev => prev.filter(e => e.id !== id));
    setDispatchCart(prev => prev.filter(c => c.elemento.id !== id));
    if (selectedItemForDetail?.id === id) {
      setSelectedItemForDetail(null);
    }

    // Sync delete to Supabase
    if (supabase && itemToDelete) {
      supabase.from('elementos').delete().eq('codigo', itemToDelete.codigo).then(({ error }) => {
        if (error) console.warn('Supabase elementos delete error:', error);
      });
    }
  };

  // Dispatch Cart Operations
  const addToDispatchCart = (elemento: Elemento, cantidad = 1) => {
    setDispatchCart(prev => {
      const existing = prev.find(item => item.elemento.id === elemento.id);
      if (existing) {
        const newQty = Math.min(elemento.cantidad, existing.cantidad + cantidad);
        return prev.map(item =>
          item.elemento.id === elemento.id ? { ...item, cantidad: newQty } : item
        );
      }
      const initialQty = Math.min(elemento.cantidad, cantidad);
      return [...prev, { elemento, cantidad: initialQty > 0 ? initialQty : 1 }];
    });
  };

  const updateDispatchCartQuantity = (elementoId: number, cantidad: number) => {
    setDispatchCart(prev =>
      prev.map(item => {
        if (item.elemento.id === elementoId) {
          const freshElemento = elementos.find(e => e.id === elementoId) || item.elemento;
          const clampedQty = Math.max(1, Math.min(freshElemento.cantidad, cantidad));
          return { ...item, cantidad: clampedQty };
        }
        return item;
      })
    );
  };

  const removeFromDispatchCart = (elementoId: number) => {
    setDispatchCart(prev => prev.filter(item => item.elemento.id !== elementoId));
  };

  const clearDispatchCart = () => {
    setDispatchCart([]);
  };

  // Process Full Dispatch
  const processDispatch = (payload: ProcessDispatchPayload): Remision | null => {
    if (dispatchCart.length === 0) return null;

    const targetProject = proyectos.find(p => p.id === payload.proyectoId);
    if (!targetProject) return null;

    const remissionNumber = `REM-2026-${String(remisiones.length + 43).padStart(4, '0')}`;
    const dateFormatted = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeFormatted = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

    const remissionItems = dispatchCart.map(cartItem => ({
      elementoId: cartItem.elemento.id,
      codigo: cartItem.elemento.codigo,
      nombre: cartItem.elemento.nombre,
      cantidad: cartItem.cantidad,
      unidad: cartItem.elemento.unidad
    }));

    const newRemision: Remision = {
      id: Math.max(0, ...remisiones.map(r => r.id)) + 1,
      numeroRemision: remissionNumber,
      proyectoId: targetProject.id,
      proyectoNombre: targetProject.nombre,
      cliente: targetProject.cliente,
      ubicacion: targetProject.ubicacion,
      entregadoPor: payload.entregadoPor || user.name,
      cargoEntregado: payload.cargoEntregado || user.role,
      recibidoPor: payload.recibidoPor,
      cargoRecibido: payload.cargoRecibido || 'Coordinador de Obra',
      observaciones: payload.observaciones || 'Despacho generado en sistema logístico FULGOR S.A.S.',
      fecha: dateFormatted,
      items: remissionItems
    };

    // Update Elements stock and generate movement history
    const newHistorialEntries: HistorialMovimiento[] = [];

    setElementos(prev =>
      prev.map(el => {
        const cartEntry = dispatchCart.find(c => c.elemento.id === el.id);
        if (cartEntry) {
          const oldStock = el.cantidad;
          const newStock = Math.max(0, oldStock - cartEntry.cantidad);

          newHistorialEntries.push({
            id: Math.max(0, ...historial.map(h => h.id), ...newHistorialEntries.map(e => e.id)) + 1,
            tipo: 'SALIDA',
            elementoId: el.id,
            itemCode: el.codigo,
            itemName: el.nombre,
            proyectoId: targetProject.id,
            proyectoNombre: targetProject.nombre,
            remisionId: newRemision.id,
            remisionNumero: newRemision.numeroRemision,
            cantidad: cartEntry.cantidad,
            unidad: el.unidad,
            stockAnterior: oldStock,
            stockNuevo: newStock,
            motivo: `Remisión ${remissionNumber} para ${targetProject.nombre}`,
            responsable: payload.recibidoPor || user.name,
            fecha: dateFormatted,
            hora: timeFormatted,
            docType: 'pdf'
          });

          return { ...el, cantidad: newStock, updatedAt: new Date().toISOString().split('T')[0] };
        }
        return el;
      })
    );

    setRemisiones(prev => [newRemision, ...prev]);
    setHistorial(prev => [...newHistorialEntries, ...prev]);
    setDispatchCart([]);

    // Sync remission and movements to Supabase
    if (supabase) {
      // Insert remision
      supabase.from('remisiones').insert([{
        id: newRemision.numeroRemision,
        numero_remision: newRemision.numeroRemision,
        fecha: newRemision.fecha,
        proyecto_id: `PROY-${String(newRemision.proyectoId).padStart(3, '0')}`,
        proyecto_nombre: newRemision.proyectoNombre,
        cliente: newRemision.cliente,
        ubicacion: newRemision.ubicacion || '',
        entregado_por: newRemision.entregadoPor,
        cargo_entregado: newRemision.cargoEntregado,
        recibido_por: newRemision.recibidoPor,
        cargo_recibido: newRemision.cargoRecibido,
        items: newRemision.items,
        observaciones: newRemision.observaciones
      }]).then(({ error }) => {
        if (error) console.warn('Supabase remisiones insert error:', error);
      });

      // Insert movement history entries
      const histRows = newHistorialEntries.map(h => ({
        id: `MOV-${Date.now()}-${h.id}`,
        fecha: `${h.fecha} ${h.hora}`,
        tipo: h.tipo,
        elemento_id: `ELM-${h.elementoId}`,
        elemento_codigo: h.itemCode,
        elemento_nombre: h.itemName,
        cantidad: h.cantidad,
        unidad: h.unidad,
        responsable: h.responsable,
        motivo: h.motivo,
        remision_id: newRemision.numeroRemision
      }));
      supabase.from('historial').insert(histRows).then(({ error }) => {
        if (error) console.warn('Supabase historial batch insert error:', error);
      });

      // Update remaining stock in Supabase for each dispatched element
      dispatchCart.forEach(cartItem => {
        const el = elementos.find(e => e.id === cartItem.elemento.id);
        if (el) {
          const newStock = Math.max(0, el.cantidad - cartItem.cantidad);
          supabase.from('elementos').update({
            cantidad: newStock,
            updated_at: new Date().toISOString()
          }).eq('codigo', el.codigo).then(({ error }) => {
            if (error) console.warn('Supabase stock update error:', error);
          });
        }
      });
    }

    // Open PDF Remission modal immediately for print preview
    setSelectedRemisionForPdf(newRemision);

    return newRemision;
  };

  // Stock Movement / Adjustment
  const addStockMovement = (data: {
    elementoId: number;
    tipo: TipoMovimiento;
    cantidad: number;
    motivo: string;
    responsable: string;
    proyectoId?: number;
  }) => {
    const el = elementos.find(e => e.id === data.elementoId);
    if (!el) return;

    const oldStock = el.cantidad;
    let newStock = oldStock;

    if (data.tipo === 'ENTRADA') {
      newStock = oldStock + Math.abs(data.cantidad);
    } else if (data.tipo === 'SALIDA') {
      newStock = Math.max(0, oldStock - Math.abs(data.cantidad));
    } else if (data.tipo === 'AJUSTE') {
      newStock = Math.max(0, oldStock + data.cantidad);
    }

    const targetProject = data.proyectoId ? proyectos.find(p => p.id === data.proyectoId) : undefined;
    const dateFormatted = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeFormatted = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newHistoryItem: HistorialMovimiento = {
      id: Math.max(0, ...historial.map(h => h.id)) + 1,
      tipo: data.tipo,
      elementoId: el.id,
      itemCode: el.codigo,
      itemName: el.nombre,
      proyectoId: targetProject?.id,
      proyectoNombre: targetProject?.nombre || (data.tipo === 'AJUSTE' ? 'Ajuste de Inventario' : 'Recepción en Bodega'),
      cantidad: data.cantidad,
      unidad: el.unidad,
      stockAnterior: oldStock,
      stockNuevo: newStock,
      motivo: data.motivo || 'Movimiento de inventario',
      responsable: data.responsable || user.name,
      fecha: dateFormatted,
      hora: timeFormatted,
      docType: data.tipo === 'SALIDA' ? 'pdf' : data.tipo === 'ENTRADA' ? 'receipt' : 'view'
    };

    setHistorial(prev => [newHistoryItem, ...prev]);
    updateElemento(el.id, { cantidad: newStock });

    // Sync movement to Supabase
    if (supabase) {
      supabase.from('historial').insert([{
        id: `MOV-${Date.now()}-${newHistoryItem.id}`,
        fecha: `${newHistoryItem.fecha} ${newHistoryItem.hora}`,
        tipo: newHistoryItem.tipo,
        elemento_id: `ELM-${newHistoryItem.elementoId}`,
        elemento_codigo: newHistoryItem.itemCode,
        elemento_nombre: newHistoryItem.itemName,
        cantidad: newHistoryItem.cantidad,
        unidad: newHistoryItem.unidad,
        responsable: newHistoryItem.responsable,
        motivo: newHistoryItem.motivo
      }]).then(({ error }) => {
        if (error) console.warn('Supabase addStockMovement insert error:', error);
      });
    }
  };

  // Add Warehouse & Hierarchy
  const addAlmacen = (almacenData: Omit<Almacen, 'id'>) => {
    const newAlmacen: Almacen = {
      ...almacenData,
      id: Math.max(0, ...almacenes.map(a => a.id)) + 1
    };
    setAlmacenes(prev => [...prev, newAlmacen]);
    return newAlmacen;
  };

  const updateAlmacen = (id: number, updates: Partial<Almacen>) => {
    const target = almacenes.find(a => a.id === id);
    setAlmacenes(prev => prev.map(a => (a.id === id ? { ...a, ...updates } : a)));

    if (supabase && target) {
      const dbUpdates: any = {};
      if (updates.nombre !== undefined) dbUpdates.nombre = updates.nombre;
      if (updates.codigo !== undefined) dbUpdates.codigo = updates.codigo;
      if (updates.ciudad !== undefined) dbUpdates.direccion = updates.ciudad;
      supabase
        .from('almacenes')
        .update(dbUpdates)
        .or(`id.eq.ALM-${target.codigo},codigo.eq.${target.codigo},nombre.eq.${target.nombre}`)
        .then(({ error }) => {
          if (error) console.warn('Supabase updateAlmacen error:', error);
        });
    }
  };

  const addEstanteria = (estanteriaData: Omit<Estanteria, 'id'>) => {
    const newEst: Estanteria = {
      ...estanteriaData,
      id: Math.max(0, ...estanterias.map(e => e.id)) + 1
    };
    setEstanterias(prev => [...prev, newEst]);
    return newEst;
  };

  const updateEstanteria = (id: number, updates: Partial<Estanteria>) => {
    const target = estanterias.find(e => e.id === id);
    setEstanterias(prev => prev.map(e => (e.id === id ? { ...e, ...updates } : e)));

    if (supabase && target) {
      const dbUpdates: any = {};
      if (updates.nombre !== undefined) dbUpdates.nombre = updates.nombre;
      if (updates.codigo !== undefined) dbUpdates.codigo = updates.codigo;
      if (updates.descripcion !== undefined) dbUpdates.descripcion = updates.descripcion;
      supabase
        .from('estanterias')
        .update(dbUpdates)
        .or(`id.eq.EST-${target.codigo},codigo.eq.${target.codigo},nombre.eq.${target.nombre}`)
        .then(({ error }) => {
          if (error) console.warn('Supabase updateEstanteria error:', error);
        });
    }
  };

  const addCaja = (cajaData: Omit<Caja, 'id'>) => {
    const newCaja: Caja = {
      ...cajaData,
      id: Math.max(0, ...cajas.map(c => c.id)) + 1
    };
    setCajas(prev => [...prev, newCaja]);
    return newCaja;
  };

  const updateCaja = (id: number, updates: Partial<Caja>) => {
    const target = cajas.find(c => c.id === id);
    setCajas(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));

    if (supabase && target) {
      const dbUpdates: any = {};
      if (updates.codigoCaja !== undefined) {
        dbUpdates.codigo = updates.codigoCaja;
        dbUpdates.nombre = updates.codigoCaja;
      }
      if (updates.estado !== undefined) dbUpdates.estado = updates.estado.toUpperCase();
      if (updates.descripcion !== undefined) dbUpdates.descripcion = updates.descripcion;
      supabase
        .from('cajas')
        .update(dbUpdates)
        .or(`id.eq.CAJ-${target.codigoCaja},codigo.eq.${target.codigoCaja}`)
        .then(({ error }) => {
          if (error) console.warn('Supabase updateCaja error:', error);
        });
    }
  };

  const addProyecto = (proyectoData: Omit<Proyecto, 'id' | 'createdAt'>) => {
    const newProj: Proyecto = {
      ...proyectoData,
      id: Math.max(0, ...proyectos.map(p => p.id)) + 1,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setProyectos(prev => [...prev, newProj]);
    return newProj;
  };

  // Modal Handlers
  const openItemDetail = (item: Elemento) => setSelectedItemForDetail(item);
  const closeItemDetail = () => setSelectedItemForDetail(null);
  const openPdfRemision = (remision: Remision) => setSelectedRemisionForPdf(remision);
  const closePdfRemision = () => setSelectedRemisionForPdf(null);
  const openQuickMovement = (item: Elemento, type: 'ENTRADA' | 'AJUSTE') => {
    setQuickMovementItem(item);
    setQuickMovementType(type);
  };
  const closeQuickMovement = () => setQuickMovementItem(null);

  // Reset to Defaults
  const resetToDefaultData = () => {
    setElementos(INITIAL_ELEMENTOS);
    setAlmacenes(INITIAL_ALMACENES);
    setEstanterias(INITIAL_ESTANTERIAS);
    setCajas(INITIAL_CAJAS);
    setProyectos(INITIAL_PROYECTOS);
    setRemisiones(INITIAL_REMISIONES);
    setHistorial(INITIAL_HISTORIAL);
    setDispatchCart([
      { elemento: INITIAL_ELEMENTOS[0], cantidad: 20 },
      { elemento: INITIAL_ELEMENTOS[2], cantidad: 1 }
    ]);
  };

  return (
    <InventoryContext.Provider
      value={{
        elementos,
        almacenes,
        estanterias,
        cajas,
        proyectos,
        remisiones,
        historial,
        user,
        activeView,
        dispatchCart,
        selectedItemForDetail,
        selectedRemisionForPdf,
        quickMovementItem,
        quickMovementType,
        isHelpModalOpen,
        globalSearch,
        isCloudConnected,
        syncStatus,
        setActiveView,
        setGlobalSearch,
        openItemDetail,
        closeItemDetail,
        openPdfRemision,
        closePdfRemision,
        openQuickMovement,
        closeQuickMovement,
        setIsHelpModalOpen,
        addElemento,
        updateElemento,
        deleteElemento,
        addToDispatchCart,
        updateDispatchCartQuantity,
        removeFromDispatchCart,
        clearDispatchCart,
        processDispatch,
        addStockMovement,
        addAlmacen,
        updateAlmacen,
        addEstanteria,
        updateEstanteria,
        addCaja,
        updateCaja,
        addProyecto,
        getAlmacenById,
        getEstanteriaById,
        getCajaById,
        getProyectoById,
        getLocationString,
        resetToDefaultData
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
