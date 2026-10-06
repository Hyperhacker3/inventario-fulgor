import type { Categoria, PrefijoCodigo } from '../types';

export function formatItemCode(prefix: string, number: number) {
  return `${prefix}${String(number).padStart(3, '0')}`;
}
export async function ensurePrefixChoice(code: string, catalog: PrefijoCodigo[],
  save: (prefix: string) => Promise<PrefijoCodigo[]>, refresh: () => Promise<PrefijoCodigo[]>): Promise<PrefijoCodigo> {
  const prefix = code.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(prefix)) throw new Error('El código debe tener exactamente tres letras de A a Z, sin números.');
  const existing = catalog.find(row => row.prefijo === prefix);
  if (existing) {
    if (!existing.activo) throw new Error('Este código está inactivo. Reactívelo en Administración de datos.');
    return existing;
  }
  try {
    const updated = await save(prefix);
    const created = updated.find(row => row.prefijo === prefix && row.activo);
    if (!created) throw new Error('No se pudo confirmar el código creado.');
    return created;
  } catch (error) {
    // Recover a lost response or a concurrent creation without overwriting its name or counter.
    const updated = await refresh();
    const confirmed = updated.find(row => row.prefijo === prefix && row.activo);
    if (confirmed) return confirmed;
    throw error;
  }
}
export function categoryChoices(catalog: Categoria[], used: string[]) {
  return [...new Set([...catalog.map(category => category.id), ...used])].sort();
}
export function prefixPreview(prefix: PrefijoCodigo, codes: string[]) {
  const expression = new RegExp(`^${prefix.prefijo}([0-9]+)$`);
  const highest = codes.reduce((last, code) => {
    const match = expression.exec(code);
    return match ? Math.max(last, Number(match[1])) : last;
  }, prefix.ultimo);
  return formatItemCode(prefix.prefijo, highest + 1);
}

export function categoryNameKey(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
}
export function newCategoryKey(name: string, catalog: Categoria[]) {
  let base = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!/^[A-Z]/.test(base) || base.length < 2) base = `CAT_${base}`;
  base = base.slice(0, 50);
  const occupied = new Set(catalog.map(category => category.id));
  let key = base;
  for (let number = 2; occupied.has(key); number++) {
    const suffix = `_${number}`;
    key = base.slice(0, 50 - suffix.length) + suffix;
  }
  return key;
}
