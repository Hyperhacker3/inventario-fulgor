import type { PesoUnitario } from '../types';
import { validQuantity } from './quantity';
export interface WeightDraft { amount: string; unit: 'g' | 'kg' }
export const weightDraft = (weight?: PesoUnitario | null): WeightDraft => ({ amount: weight ? String(weight.valor) : '', unit: weight?.unidad || 'g' });
export function validateWeight(weight: PesoUnitario) {
  if (!['g', 'kg'].includes(weight.unidad) || !validQuantity(weight.valor) || weight.valor <= 0
    || weight.valor >= (weight.unidad === 'g' ? 1_000_000_000 : 1_000_000)) throw new Error('Declare un peso mayor que cero, con hasta tres decimales, en gramos o kilogramos.');
}
export function parseWeightDraft(draft: WeightDraft): PesoUnitario | null {
  if (!draft.amount.trim()) return null;
  const weight: PesoUnitario = { valor: Number(draft.amount), unidad: draft.unit };
  validateWeight(weight); return weight;
}
export function mapWeight(raw: unknown): PesoUnitario | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.valor !== 'number' || value.unidad !== 'g' && value.unidad !== 'kg') return null;
  const weight: PesoUnitario = { valor: value.valor, unidad: value.unidad };
  try { validateWeight(weight); return weight; } catch { return null; }
}
export function lineWeightKg(weight: PesoUnitario | null | undefined, quantity: number): number | null {
  if (!weight) return null;
  validateWeight(weight);
  if (!validQuantity(quantity) || quantity < 0) throw new Error('Cantidad inválida para calcular el peso.');
  // Fixed-point multiplication preserves small gram values and fractional stock units.
  const milligrams = BigInt(Math.round(weight.valor * 1000)) * (weight.unidad === 'kg' ? 1000n : 1n);
  return Number(milligrams * BigInt(Math.round(quantity * 1000))) / 1_000_000_000;
}
export const formatKg = (value: number) => `${value.toLocaleString('es-CO', { maximumFractionDigits: 9 })} kg`;
export const formatUnitWeight = (weight?: PesoUnitario | null) => weight
  ? `${weight.valor.toLocaleString('es-CO', { maximumFractionDigits: 3 })} ${weight.unidad}` : 'Peso pendiente de declarar';
export function totalWeight(lines: { pesoTotalKg?: number | null }[]) {
  const known = lines.filter(line => line.pesoTotalKg != null);
  const total = Number(known.reduce((sum, line) => sum + BigInt(Math.round(line.pesoTotalKg! * 1_000_000_000)), 0n)) / 1_000_000_000;
  return { total, pending: lines.length - known.length, known: known.length };
}
