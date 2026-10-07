import type { RemissionRoute } from '../types';
import { calendarDate } from './calendar';

export const routeCodeSegment = (place: string) => place.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
  .replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export function validateRemissionRoute(input: RemissionRoute): RemissionRoute {
  const route = { lugarRemision: input.lugarRemision.trim().replace(/\s+/g, ' '), lugarDestino: input.lugarDestino.trim().replace(/\s+/g, ' ') };
  for (const [key, label] of [['lugarRemision', 'Lugar de remisión'], ['lugarDestino', 'Lugar de destino']] as const) {
    if (!route[key] || route[key].length > 80 || !routeCodeSegment(route[key])) throw new Error(`${label}: escriba un lugar de hasta 80 caracteres, con letras o números.`);
  }
  return route;
}
export function remissionDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value);
  const part = (type: string) => parts.find(part => part.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function remissionCode(route: RemissionRoute, date: string, sequence: number) {
  const normalized = validateRemissionRoute(route);
  if (!calendarDate(date) || !Number.isSafeInteger(sequence) || sequence < 1) throw new Error('Fecha o consecutivo de remisión inválido.');
  return `REM-${routeCodeSegment(normalized.lugarRemision)}-${routeCodeSegment(normalized.lugarDestino)}-${date.replaceAll('-', '')}-${String(sequence).padStart(3, '0')}`;
}
export function remissionSequence(code: string, year: string) {
  const legacy = code.match(/^REM-(\d{4})-(\d+)$/);
  const current = code.match(/^REM-.+-(\d{8})-(\d+)$/);
  const match = legacy || current;
  return match?.[1].slice(0, 4) === year ? Number(match[2]) : 0;
}
