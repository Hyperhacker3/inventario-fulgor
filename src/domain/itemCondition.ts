import { conditions } from './catalogs';

const aliases: Record<string, string> = {
  BUENO: 'BUENO', MEDIO: 'MEDIO', REGULAR: 'MEDIO',
  MALO: 'MALO', 'MAL ESTADO': 'MALO', OBSOLETO: 'MALO',
  REPARACION: 'EN REPARACIÓN', 'EN REPARACION': 'EN REPARACIÓN',
  'RETAZOS / BUENO': 'RETAZOS / BUENO',
};

export function normalizeItemCondition(value?: string | null): string {
  const original = value?.trim() || 'BUENO';
  const key = original.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ');
  // Unknown labels (including RETAL) retain their meaning until explicitly classified.
  return aliases[key] ?? original;
}

export const itemConditionOptions = conditions.map(value => ({ value, label: value }));
