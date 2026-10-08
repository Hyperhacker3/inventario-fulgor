import { conditions } from './catalogs';

const aliases: Record<string, string> = {
  BUENO: 'BUENO', MEDIO: 'REGULAR', REGULAR: 'REGULAR',
  MALO: 'MALO', 'MAL ESTADO': 'MALO', OBSOLETO: 'MALO',
  REPARACION: 'EN REPARACIÓN', 'EN REPARACION': 'EN REPARACIÓN',
  RETAL: 'RETAZOS', RETAZOS: 'RETAZOS', 'RETAZOS / BUENO': 'RETAZOS',
};

export function normalizeItemCondition(value?: string | null): string {
  const original = value?.trim() || 'BUENO';
  const key = original.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ');
  // Preserve unknown conditions without changing stock or damaged quantities.
  return aliases[key] ?? original;
}

export const itemConditionOptions = conditions.map(value => ({ value, label: value }));
