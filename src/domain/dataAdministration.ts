import type { Categoria, PrefijoCodigo } from '../types';

export function formatItemCode(prefix: string, number: number) {
  return `${prefix}${String(number).padStart(3, '0')}`;
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
