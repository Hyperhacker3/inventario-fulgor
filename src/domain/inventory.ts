import type { Elemento, Almacen, Estanteria, Caja } from '../types';
import { validQuantity } from './quantity';
import { validateWeight } from './weight';
import { validateUnitValue } from './money';
export const available = (item: Elemento) => item.stockPendiente ? 0 : Math.max(0, item.cantidad - (item.cantidadDanados ?? 0));
export const byId = <T extends { id: string }>(items: T[]) => new Map(items.map(item => [item.id, item]));
export function locationLabel(item: Elemento, almacenes: ReadonlyMap<string, Almacen>, estanterias: ReadonlyMap<string, Estanteria>, cajas: ReadonlyMap<string, Caja>) {
  const alm = item.almacenId ? almacenes.get(item.almacenId) : undefined;
  const est = item.estanteriaId ? estanterias.get(item.estanteriaId) : undefined;
  const caj = item.cajaId ? cajas.get(item.cajaId) : undefined;
  return [alm?.nombre, est?.nombre || est?.codigo, caj?.codigoCaja].filter(Boolean).join(' > ') || 'Sin ubicación asignada';
}
export function validateItem(item: Omit<Elemento, 'id' | 'createdAt' | 'updatedAt'>,
  almacenes: Almacen[], estanterias: Estanteria[], cajas: Caja[]) {
  if (!/^[A-Z0-9-]{3,30}$/.test(item.codigo.toUpperCase())) throw new Error('Código inválido.');
  if (!item.nombre.trim()) throw new Error('Ingrese un nombre.');
  if (!item.categoria.trim()) throw new Error('Categoría inválida.');
  if (!item.unidad.trim()) throw new Error('Unidad inválida.');
  if (item.pesoUnitario) validateWeight(item.pesoUnitario);
  validateUnitValue(item.valorUnitario ?? 0);
  for (const [value, name] of [[item.cantidad, 'Stock'], [item.stockMinimo, 'Stock mínimo'], [item.cantidadDanados ?? 0, 'Material dañado']] as const) {
    if (!validQuantity(value) || value < 0) throw new Error(`${name}: ingrese un número no negativo con hasta tres decimales.`);
  }
  if ((item.cantidadDanados ?? 0) > item.cantidad) throw new Error('El material dañado supera el stock.');
  if (item.almacenId && !almacenes.some(a => a.id === item.almacenId)) throw new Error('Almacén no encontrado.');
  if (item.estanteriaId && !estanterias.some(e => e.id === item.estanteriaId && e.almacenId === item.almacenId)) throw new Error('La estantería no pertenece al almacén.');
  if (item.cajaId && !cajas.some(c => c.id === item.cajaId && c.estanteriaId === item.estanteriaId)) throw new Error('La caja no pertenece a la estantería.');
}
