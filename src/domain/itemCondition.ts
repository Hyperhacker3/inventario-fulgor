import { conditions } from './catalogs';
import type { Elemento } from '../types';

const aliases: Record<string, string> = {
  BUENO: 'BUENO', MEDIO: 'REGULAR', REGULAR: 'REGULAR',
  MALO: 'MALO', 'MAL ESTADO': 'MALO', OBSOLETO: 'MALO',
  DANADO: 'MALO', DANADA: 'MALO', DANADOS: 'MALO', DANADAS: 'MALO',
  REPARACION: 'EN REPARACIÓN', 'EN REPARACION': 'EN REPARACIÓN',
  'PARA REPARAR': 'PARA REPARAR',
  RETAL: 'RETAZOS', RETAZOS: 'RETAZOS', 'RETAZOS / BUENO': 'RETAZOS',
};

export function normalizeItemCondition(value?: string | null): string {
  const original = value?.trim() || 'BUENO';
  const key = original.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ');
  // Preserve unknown conditions without changing stock or damaged quantities.
  return aliases[key] ?? original;
}

export const itemConditionOptions = conditions.map(value => ({ value, label: value }));

export function conditionMarksAllDamaged(condition?: string | null) {
  return ['MALO', 'EN REPARACIÓN', 'PARA REPARAR'].includes(normalizeItemCondition(condition));
}

/** Condition-based damage count for dashboard/valuation summaries; never subtracted from available stock. */
export function damagedQuantity(item: Pick<Elemento, 'cantidad' | 'estado'>) {
  const quantity = Math.max(0, item.cantidad);
  return conditionMarksAllDamaged(item.estado) ? quantity : 0;
}
