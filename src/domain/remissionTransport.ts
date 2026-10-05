import type { DatosTransporte } from '../types';
import { validQuantity } from './quantity';
export const transportFields: { key: keyof DatosTransporte; label: string; type: string; maxLength: number }[] = [
  { key: 'telefonoRemite', label: 'Teléfono de quien remite', type: 'tel', maxLength: 40 },
  { key: 'telefonoRecibe', label: 'Teléfono de quien recibe', type: 'tel', maxLength: 40 },
  { key: 'transportador', label: 'Entregado a / transportador', type: 'text', maxLength: 180 },
  { key: 'cedulaTransportador', label: 'Cédula del transportador', type: 'text', maxLength: 40 },
  { key: 'telefonoTransportador', label: 'Teléfono del transportador', type: 'tel', maxLength: 40 },
  { key: 'placaVehiculo', label: 'Placa del vehículo', type: 'text', maxLength: 20 },
  { key: 'fechaDespacho', label: 'Fecha de despacho', type: 'date', maxLength: 10 },
  { key: 'fechaDevolucion', label: 'Fecha de devolución (si aplica)', type: 'date', maxLength: 10 },
];
export const emptyTransport = (): DatosTransporte => Object.fromEntries(transportFields.map(field => [field.key, ''])) as unknown as DatosTransporte;
export function mapTransport(raw: unknown): DatosTransporte {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return Object.fromEntries(transportFields.map(field => [field.key, typeof source[field.key] === 'string' ? source[field.key] : ''])) as unknown as DatosTransporte;
}
export function validateTransport(input: DatosTransporte, weights: Record<string, number>) {
  for (const field of transportFields) {
    const value = input[field.key];
    if (value.length > field.maxLength) throw new Error(`${field.label}: texto demasiado largo.`);
    if (field.type === 'date' && value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(value).getTime()) || new Date(value).toISOString().slice(0, 10) !== value)) throw new Error(`${field.label}: fecha inválida.`);
  }
  if (input.fechaDevolucion && input.fechaDespacho && input.fechaDevolucion < input.fechaDespacho) throw new Error('La devolución no puede ser anterior al despacho.');
  if (Object.values(weights).some(weight => !validQuantity(weight) || weight < 0)) throw new Error('El peso debe ser positivo o cero, con hasta tres decimales.');
}
