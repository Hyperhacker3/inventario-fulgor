import type { Categoria, Elemento } from '../types';

export type ToolType = 'ELECTRICA' | 'COMBUSTION';
export const TOOL_TYPE_LABEL: Record<ToolType, string> = { ELECTRICA: 'Herramienta eléctrica', COMBUSTION: 'Herramienta a combustión' };
export const TOOL_LIFE_ACTIVATION = 'Falta activar la hoja de vida en Supabase. Ejecute 20261126000200_tool_life_records.sql y vuelva a intentar.';

/** The category decides whether a product has a life record (same rule as Supabase). */
export function toolTypeFor(item: Pick<Elemento, 'categoria'> | null | undefined, categories: readonly Categoria[]): ToolType | null {
  if (!item) return null;
  const type = categories.find(category => category.id === item.categoria)?.hoja_vida_tipo;
  return type === 'ELECTRICA' || type === 'COMBUSTION' ? type : null;
}

type FieldKind = 'text' | 'long' | 'date' | 'year';
export interface LifeField { key: string; label: string; kind: FieldKind; placeholder?: string }
export interface LifeSection { title: string; fields: LifeField[] }
const text = (key: string, label: string, placeholder?: string): LifeField => ({ key, label, kind: 'text', placeholder });
const date = (key: string, label: string): LifeField => ({ key, label, kind: 'date' });

/** Contents of a tool life record: identification, purchase and technical data. */
export function lifeRecordSections(type: ToolType): LifeSection[] {
  const technical = type === 'ELECTRICA'
    ? [text('potencia', 'Potencia', '1.200 W'), text('voltaje', 'Voltaje', '120 V'), text('amperaje', 'Corriente', '10 A'),
      text('frecuencia_electrica', 'Frecuencia', '60 Hz'), text('rpm', 'Velocidad (RPM)', '0–3.000 RPM'),
      text('alimentacion', 'Alimentación', 'Cable o batería'), text('bateria', 'Batería', '18 V · 4 Ah')]
    : [text('tipo_motor', 'Tipo de motor', '2 tiempos, 4 tiempos o diésel'), text('cilindrada', 'Cilindrada', '196 cc'),
      text('potencia', 'Potencia', '6,5 HP'), text('combustible', 'Combustible', 'Gasolina corriente'),
      text('capacidad_tanque', 'Capacidad del tanque', '3,6 L'), text('mezcla_aceite', 'Mezcla aceite-combustible', '50:1'),
      text('aceite_motor', 'Aceite de motor', 'SAE 10W-30 · 0,6 L'), text('arranque', 'Arranque', 'Manual o eléctrico')];
  return [
    { title: 'Identificación', fields: [text('modelo', 'Modelo'), text('numero_serie', 'Número de serie')] },
    { title: 'Adquisición', fields: [date('fecha_adquisicion', 'Fecha de adquisición'), text('proveedor', 'Proveedor'),
      text('factura', 'Factura o documento de compra'), date('garantia_hasta', 'Garantía hasta')] },
    { title: 'Datos técnicos', fields: technical },
  ];
}

export type LifeData = Record<string, string>;
export interface LifeRecord { datos: LifeData; version: number; updatedAt: string; updatedBy: string }

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

/** Trims values and drops empty ones; keys from the other tool type are preserved untouched. */
export function normalizeLifeData(data: LifeData): LifeData {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value));
}
export function validateLifeData(data: LifeData, type: ToolType) {
  const fields = new Map(lifeRecordSections(type).flatMap(section => section.fields).map(field => [field.key, field]));
  for (const [key, value] of Object.entries(normalizeLifeData(data))) {
    const field = fields.get(key);
    if (!field) continue;
    if (field.kind === 'text' && value.length > 200) throw new Error(`${field.label}: escriba hasta 200 caracteres.`);
    if (field.kind === 'long' && value.length > 2000) throw new Error(`${field.label}: escriba hasta 2000 caracteres.`);
    if (field.kind === 'date' && !isDate(value)) throw new Error(`${field.label}: seleccione una fecha válida.`);
    if (field.kind === 'year' && (!/^\d{4}$/.test(value) || Number(value) < 1900 || Number(value) > 2100)) throw new Error('Escriba un año de fabricación entre 1900 y 2100.');
  }
}

export const maintenanceTypes = ['PREVENTIVO', 'CORRECTIVO', 'INSPECCIÓN'] as const;
export interface MaintenanceInput {
  fecha: string; tipo: string; descripcion: string; realizadoPor: string; repuestos: string;
  costoCop: number; horasUso: number | null; proximaFecha: string; observaciones: string;
}
export interface MaintenanceRecord extends MaintenanceInput {
  id: string; elementoId: string; elementoCodigo: string; elementoNombre: string; fotos: string[]; registradoPor: string; createdAt: string;
}
export const emptyMaintenance = (today: string): MaintenanceInput => ({ fecha: today, tipo: 'PREVENTIVO', descripcion: '', realizadoPor: '',
  repuestos: '', costoCop: 0, horasUso: null, proximaFecha: '', observaciones: '' });

/** Calendar date in Colombia (UTC-5, no daylight saving), as Supabase validates it. */
export function colombiaToday(now = new Date()) {
  return new Date(now.getTime() - 5 * 3600_000).toISOString().slice(0, 10);
}

export function validateMaintenance(input: MaintenanceInput, today: string) {
  if (!isDate(input.fecha)) throw new Error('Indique la fecha del mantenimiento.');
  if (input.fecha > today) throw new Error('La fecha del mantenimiento no puede ser futura.');
  if (!(maintenanceTypes as readonly string[]).includes(input.tipo)) throw new Error('Seleccione el tipo de mantenimiento.');
  if (!input.descripcion.trim() || input.descripcion.trim().length > 2000) throw new Error('Describa el trabajo realizado (hasta 2000 caracteres).');
  if (!input.realizadoPor.trim() || input.realizadoPor.trim().length > 120) throw new Error('Indique quién realizó el mantenimiento (hasta 120 caracteres).');
  if (input.repuestos.trim().length > 1000 || input.observaciones.trim().length > 1000) throw new Error('Repuestos y observaciones admiten hasta 1000 caracteres.');
  if (!Number.isFinite(input.costoCop) || input.costoCop < 0 || Math.round(input.costoCop * 100) !== input.costoCop * 100) throw new Error('El costo debe ser no negativo y tener hasta dos decimales.');
  if (input.horasUso !== null && (!Number.isFinite(input.horasUso) || input.horasUso < 0 || Math.abs(input.horasUso * 10 - Math.round(input.horasUso * 10)) > 1e-7))
    throw new Error('Las horas de uso deben ser no negativas, con un decimal.');
  if (input.proximaFecha && (!isDate(input.proximaFecha) || input.proximaFecha < input.fecha)) throw new Error('El próximo mantenimiento debe ser posterior a la fecha del trabajo.');
}

/** Exact payload sent to Supabase; a retry must send the same object. */
export function maintenancePayload(input: MaintenanceInput) {
  return { fecha: input.fecha, tipo: input.tipo, descripcion: input.descripcion.trim(), realizado_por: input.realizadoPor.trim(),
    repuestos: input.repuestos.trim(), costo_cop: input.costoCop, horas_uso: input.horasUso, proxima_fecha: input.proximaFecha || null,
    observaciones: input.observaciones.trim() };
}

const str = (value: unknown) => typeof value === 'string' ? value : '';
export function mapMaintenance(row: Record<string, unknown>): MaintenanceRecord {
  return { id: str(row.id), elementoId: str(row.elemento_id), elementoCodigo: str(row.elemento_codigo), elementoNombre: str(row.elemento_nombre),
    fecha: str(row.fecha).slice(0, 10), tipo: str(row.tipo), descripcion: str(row.descripcion), realizadoPor: str(row.realizado_por),
    repuestos: str(row.repuestos), costoCop: Number(row.costo_cop ?? 0), horasUso: row.horas_uso === null || row.horas_uso === undefined ? null : Number(row.horas_uso),
    proximaFecha: str(row.proxima_fecha).slice(0, 10), observaciones: str(row.observaciones),
    fotos: Array.isArray(row.fotos) ? row.fotos.filter((photo): photo is string => typeof photo === 'string') : [],
    registradoPor: str(row.registrado_por), createdAt: str(row.created_at) };
}

/** The most recent work decides the next scheduled maintenance. */
export function nextMaintenance(latest: MaintenanceRecord | undefined, today: string) {
  if (!latest?.proximaFecha) return null;
  const days = Math.round((Date.parse(`${latest.proximaFecha}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  return { date: latest.proximaFecha, days, overdue: days < 0 };
}

export const formatDay = (value: string) => value
  ? new Date(`${value}T12:00:00Z`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';
