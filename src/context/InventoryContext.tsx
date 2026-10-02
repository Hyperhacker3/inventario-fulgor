import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useInventoryData } from '../state/useInventoryData';
import { useInventoryActions } from '../state/useInventoryActions';
import { useViewNavigation } from '../state/useViewNavigation';
import { locationLabel, available, byId } from '../domain/inventory';
import { MIN_QUANTITY, roundQuantity } from '../domain/quantity';
import { isDemo } from '../lib/supabase';
import type { DispatchCartItem, Elemento, Remision } from '../types';
import { INITIAL_ALMACENES, INITIAL_CAJAS, INITIAL_ELEMENTOS, INITIAL_ESTANTERIAS, INITIAL_HISTORIAL, INITIAL_PROYECTOS, INITIAL_REMISIONES } from '../data/initialData';

type CartLine = { elementoId: string; cantidad: number };
function loadCart(key: string): CartLine[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(value)) return value.filter(line => typeof line.elementoId === 'string' && Number.isFinite(line.cantidad) && line.cantidad > 0);
  } catch { /* malformed draft is discarded */ }
  return [];
}

function useInventoryValue() {
  const { user } = useAuth();
  const data = useInventoryData();
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedRemisionForPdf, setSelectedRemisionForPdf] = useState<Remision | null>(null);
  const [quickMovementId, setQuickMovementId] = useState<string | null>(null);
  const [quickMovementType, setQuickMovementType] = useState<'ENTRADA' | 'AJUSTE'>('ENTRADA');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const closeNavigationOverlays = useCallback(() => {
    setSelectedItemId(null);
    setSelectedRemisionForPdf(null);
    setQuickMovementId(null);
    setIsHelpModalOpen(false);
  }, []);
  const { activeView, setActiveView } = useViewNavigation(closeNavigationOverlays);
  const cartKey = `fulgor_cart_v4_${user?.email || 'anonymous'}`;
  const [cartLines, setCartLines] = useState<CartLine[]>(() => loadCart(cartKey));
  useEffect(() => { localStorage.setItem(cartKey, JSON.stringify(cartLines)); }, [cartKey, cartLines]);

  const itemIndex = useMemo(() => byId(data.elementos), [data.elementos]);
  const warehouseIndex = useMemo(() => byId(data.almacenes), [data.almacenes]);
  const rackIndex = useMemo(() => byId(data.estanterias), [data.estanterias]);
  const boxIndex = useMemo(() => byId(data.cajas), [data.cajas]);
  const projectIndex = useMemo(() => byId(data.proyectos), [data.proyectos]);
  const dispatchCart = useMemo<DispatchCartItem[]>(() => cartLines.flatMap(line => {
    const item = itemIndex.get(line.elementoId);
    return item ? [{ elemento: item, cantidad: line.cantidad }] : [];
  }), [cartLines, itemIndex]);
  const selectedItemForDetail = selectedItemId ? itemIndex.get(selectedItemId) || null : null;
  const quickMovementItem = quickMovementId ? itemIndex.get(quickMovementId) || null : null;

  const addToDispatchCart = (item: Elemento, quantity = 1) => {
    if (!isDemo && !['admin', 'operador'].includes(user?.role || '')) return;
    if (available(item) <= 0) return;
    setCartLines(prev => {
      const existing = prev.find(line => line.elementoId === item.id);
      const amount = roundQuantity(Math.min(available(item), (existing?.cantidad ?? 0) + Math.max(MIN_QUANTITY, quantity)));
      return existing ? prev.map(line => line.elementoId === item.id ? { ...line, cantidad: amount } : line)
        : [...prev, { elementoId: item.id, cantidad: amount }];
    });
  };
  const updateDispatchCartQuantity = (itemId: string, quantity: number) => {
    const item = itemIndex.get(itemId);
    if (!item || available(item) === 0) { setCartLines(prev => prev.filter(line => line.elementoId !== itemId)); return; }
    setCartLines(prev => prev.map(line => line.elementoId === itemId
      ? { ...line, cantidad: roundQuantity(Math.max(MIN_QUANTITY, Math.min(available(item), quantity || MIN_QUANTITY))) } : line));
  };
  const removeFromDispatchCart = (itemId: string) => setCartLines(prev => prev.filter(line => line.elementoId !== itemId));
  const clearDispatchCart = useCallback(() => setCartLines([]), []);
  const openItemDetail = (item: Elemento) => setSelectedItemId(item.id);
  const closeItemDetail = () => setSelectedItemId(null);
  const openPdfRemision = useCallback((remission: Remision) => setSelectedRemisionForPdf(remission), []);
  const closePdfRemision = () => setSelectedRemisionForPdf(null);
  const openQuickMovement = (item: Elemento, type: 'ENTRADA' | 'AJUSTE') => { setQuickMovementId(item.id); setQuickMovementType(type); };
  const closeQuickMovement = () => setQuickMovementId(null);

  const actions = useInventoryActions(data, data.setDemoData, data.refresh, data.refreshItemIds, data.applyItemChange,
    data.rememberRemission, dispatchCart, clearDispatchCart, openPdfRemision);
  const getAlmacenById = useCallback((id: string | null) => id ? warehouseIndex.get(id) : undefined, [warehouseIndex]);
  const getEstanteriaById = useCallback((id: string | null) => id ? rackIndex.get(id) : undefined, [rackIndex]);
  const getCajaById = useCallback((id: string | null) => id ? boxIndex.get(id) : undefined, [boxIndex]);
  const getProyectoById = useCallback((id: string) => projectIndex.get(id), [projectIndex]);
  const getLocationString = useCallback((item: Elemento) =>
    locationLabel(item, warehouseIndex, rackIndex, boxIndex), [warehouseIndex, rackIndex, boxIndex]);
  const resetToDefaultData = () => {
    if (!isDemo) throw new Error('El restablecimiento solo existe en el modo de demostración.');
    data.setDemoData({ elementos: INITIAL_ELEMENTOS, almacenes: INITIAL_ALMACENES, estanterias: INITIAL_ESTANTERIAS,
      cajas: INITIAL_CAJAS, proyectos: INITIAL_PROYECTOS, remisiones: INITIAL_REMISIONES, historial: INITIAL_HISTORIAL });
    clearDispatchCart();
  };
  return {
    elementos: data.elementos, almacenes: data.almacenes, estanterias: data.estanterias, cajas: data.cajas,
    proyectos: data.proyectos, remisiones: data.remisiones, historial: data.historial,
    user: user!, activeView, dispatchCart, selectedItemForDetail, selectedRemisionForPdf, quickMovementItem,
    quickMovementType, isHelpModalOpen, globalSearch, isCloudConnected: data.isCloudConnected,
    syncStatus: data.syncStatus, setActiveView, setGlobalSearch, openItemDetail, closeItemDetail,
    openPdfRemision, closePdfRemision, openQuickMovement, closeQuickMovement, setIsHelpModalOpen,
    addToDispatchCart, updateDispatchCartQuantity, removeFromDispatchCart, clearDispatchCart,
    getAlmacenById, getEstanteriaById, getCajaById, getProyectoById, getLocationString,
    resetToDefaultData, ...actions,
  };
}

const InventoryContext = createContext<ReturnType<typeof useInventoryValue> | null>(null);
export function InventoryProvider({ children }: { children: ReactNode }) {
  const value = useInventoryValue();
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}
export function useInventory() {
  const value = useContext(InventoryContext);
  if (!value) throw new Error('InventoryProvider no encontrado');
  return value;
}
