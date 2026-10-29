import type { CompanyProfile } from '../types';
import { validQuantity, roundQuantity } from './quantity';

export interface StaffMember { id: string; nombre: string; cargo: string; activo: boolean; version: number }
export interface InternalLine {
  elementoId: string; codigo: string; nombre: string; marca: string; unidad: string; ubicacion: string;
  cantidad: number; devuelta: number; pendiente: number;
}
export interface InternalReturn { id: string; created_at: string; registrado_por: string; cargo: string; items: InternalLine[] }
export interface InternalDispatch {
  id: string; codigo: string; created_at: string; entregado_por: string; cargo_entregado: string;
  personal_id: string; recibido_por: string; cargo_recibido: string; empresa: CompanyProfile;
  estado: 'PENDIENTE' | 'PARCIAL' | 'DEVUELTA'; items: InternalLine[]; devoluciones: InternalReturn[];
}
export interface InternalAmounts { elementoId: string; cantidad: number }
export interface InternalIssueInput { personalId: string; items: InternalAmounts[] }
export interface InternalReturnInput { salidaId: string; items: InternalAmounts[] }
export interface StaffInput { id: string | null; nombre: string; cargo: string; activo: boolean; version: number }
export const internalStatus = (status: InternalDispatch['estado']) => ({ PENDIENTE: 'Pendiente de devolución', PARCIAL: 'Devolución parcial', DEVUELTA: 'Devuelta' })[status];
export const internalDate = (value: string) => new Date(value).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' });
export const internalNumber = (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 3 });

export function validateInternalAmounts(items: InternalAmounts[]) {
  if (!items.length) throw new Error('Seleccione al menos un material.');
  const ids = new Set<string>();
  for (const row of items) {
    if (!row.elementoId || ids.has(row.elementoId) || !validQuantity(row.cantidad) || row.cantidad <= 0)
      throw new Error('Revise los materiales y sus cantidades; no se permiten repetidos.');
    ids.add(row.elementoId);
  }
}
export function returnAmounts(loan: InternalDispatch, amounts: Record<string, number>): InternalAmounts[] {
  const result = loan.items.flatMap(row => {
    const cantidad = amounts[row.elementoId] || 0;
    if (cantidad < 0 || cantidad > roundQuantity(row.pendiente)) throw new Error(`Revise la devolución de ${row.codigo}.`);
    return cantidad ? [{ elementoId: row.elementoId, cantidad }] : [];
  });
  validateInternalAmounts(result);
  return result;
}
