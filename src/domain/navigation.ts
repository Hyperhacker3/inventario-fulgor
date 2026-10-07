import type { ActiveView } from '../types';

export interface NavigationItem { id: ActiveView; label: string; icon: string; badge?: number }
export function navigationItems(role: string, cartCount = 0, demo = false): NavigationItem[] {
  const operate = demo || ['admin', 'operador'].includes(role);
  return [
    { id: 'dashboard', label: 'Inicio', icon: 'dashboard' },
    { id: 'explorer', label: 'Inventario', icon: 'inventory_2' },
    ...(operate ? [
      { id: 'entries' as const, label: 'Entradas', icon: 'input' },
      { id: 'dispatch' as const, label: 'Salidas', icon: 'shopping_cart_checkout', badge: cartCount },
    ] : []),
    { id: 'history', label: 'Historial', icon: 'history' },
    { id: 'data-admin', label: 'Administración de datos', icon: 'settings' },
    { id: 'warehouses', label: 'Almacenes', icon: 'warehouse' },
    { id: 'remissions', label: 'Remisiones', icon: 'picture_as_pdf' },
  ];
}
export function quickNavigationItems(role: string, cartCount = 0, demo = false) {
  return navigationItems(role, cartCount, demo).filter(item => ['dashboard', 'explorer', 'entries', 'dispatch'].includes(item.id));
}
export function navigationIsActive(item: NavigationItem, view: ActiveView) {
  return item.id === view || item.id === 'data-admin' && view === 'projects';
}
