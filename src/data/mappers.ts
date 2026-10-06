import { mapTransport } from '../domain/remissionTransport';
import { mapWeight } from '../domain/weight';
import type { Almacen, Caja, Elemento, Estanteria, HistorialMovimiento, Proyecto, Remision, DetalleRemision, TipoMovimiento } from '../types';
import { normalizeUnit } from '../domain/catalogs';
import { displayDate, displayTime } from '../shared/dates';
import { uniquePhotos } from '../domain/photos';

export type DbRow = Record<string, unknown>;
const str = (value: unknown, fallback = ''): string => value == null ? fallback : String(value);
const id = (value: unknown): string | null => value == null ? null : String(value);
const numeric = (value: unknown, fallback = 0): number => value == null || value === '' ? fallback : Number(value);
const object = (value: unknown): DbRow => value && typeof value === 'object' && !Array.isArray(value) ? value as DbRow : {};

export const mapAlmacen = (row: DbRow): Almacen => ({
  id: str(row.id), codigo: str(row.codigo), nombre: str(row.nombre),
  ciudad: str(row.ciudad) || str(row.direccion).split(',').at(-1)?.trim() || '',
  descripcion: str(row.descripcion) || str(row.direccion),
  capacidadPorcentaje: numeric(row.capacidad_total) > 0 ? Math.round(numeric(row.ocupacion_actual) / numeric(row.capacidad_total) * 100) : 0,
  estado: row.estado === 'Mantenimiento' || row.estado === 'Inactivo' ? row.estado : 'Operativo',
});
export const mapEstanteria = (row: DbRow): Estanteria => ({
  id: str(row.id), almacenId: id(row.almacen_id), codigo: str(row.codigo), nombre: str(row.nombre), descripcion: str(row.descripcion),
});
export const mapCaja = (row: DbRow): Caja => ({
  id: str(row.id), estanteriaId: id(row.estanteria_id), codigoCaja: str(row.codigo),
  estado: /COMP/i.test(str(row.estado)) ? 'Completa' : /VAC/i.test(str(row.estado)) ? 'Vacia' : 'Parcial',
  descripcion: str(row.descripcion),
});
export const mapProyecto = (row: DbRow): Proyecto => ({
  id: str(row.id), nombre: str(row.nombre), cliente: str(row.cliente), ubicacion: str(row.ubicacion),
  estado: row.estado === 'FINALIZADO' ? 'FINALIZADO' : 'ACTIVO', createdAt: str(row.created_at),
});
export const mapElemento = (row: DbRow): Elemento => {
  const specs = object(row.especificaciones);
  return {
    id: str(row.id), codigo: str(row.codigo), nombre: str(row.nombre), descripcion: str(row.descripcion),
    categoria: String(row.categoria || 'OTROS'),
    cantidad: numeric(row.cantidad), unidad: normalizeUnit(str(row.unidad, 'und')),
    pesoUnitario: mapWeight(specs.peso_unitario),
    fotoUrl: str(row.foto_url), almacenId: id(row.almacen_id), estanteriaId: id(row.estanteria_id), cajaId: id(row.caja_id),
    fotosAdicionales: uniquePhotos(specs.fotos_adicionales).filter(photo => photo !== str(row.foto_url)),
    stockMinimo: numeric(row.stock_minimo, 10), estado: str(row.estado || specs.estado_material, 'BUENO'),
    cantidadDanados: numeric(row.cantidad_danados ?? specs.cantidad_danados),
    stockPendiente: Boolean(row.stock_pendiente), especificaciones: specs,
    archived: row.archived === true, createdAt: str(row.created_at), updatedAt: str(row.updated_at),
  };
};
export const mapRemision = (row: DbRow, itemsByCode?: Map<string, Elemento>): Remision => ({
  id: str(row.id), numeroRemision: str(row.numero_remision), proyectoId: id(row.proyecto_id) || '',
  proyectoNombre: str(row.proyecto_nombre), cliente: str(row.cliente), ubicacion: str(row.ubicacion),
  entregadoPor: str(row.entregado_por), cargoEntregado: str(row.cargo_entregado),
  recibidoPor: str(row.recibido_por), cargoRecibido: str(row.cargo_recibido),
  observaciones: str(row.observaciones), fecha: str(row.fecha) || displayDate(str(row.created_at)),
  datosTransporte: mapTransport(row.datos_transporte),
  fotosSalida: uniquePhotos(row.fotos_salida),
  items: (Array.isArray(row.items) ? row.items : []).map((raw: unknown): DetalleRemision => {
    const item = object(raw);
    return { elementoId: str(item.elementoId ?? item.elemento_id ?? itemsByCode?.get(str(item.codigo))?.id),
      codigo: str(item.codigo), nombre: str(item.nombre), cantidad: numeric(item.cantidad),
      unidad: normalizeUnit(str(item.unidad, 'und')),
      ...(item.pesoTotalKg != null && { pesoTotalKg: numeric(item.pesoTotalKg) }),
      pesoUnitario: mapWeight(item.pesoUnitario) };
  }),
});
export const mapHistory = (row: DbRow, itemsByCode?: Map<string, Elemento>): HistorialMovimiento => {
  const type = (['ENTRADA', 'SALIDA', 'AJUSTE', 'REUBICACION'] as TipoMovimiento[]).find(value => value === row.tipo) || 'AJUSTE';
  const created = str(row.created_at);
  return {
    id: str(row.id), tipo: type, elementoId: id(row.elemento_id) || itemsByCode?.get(str(row.elemento_codigo))?.id || '',
    itemCode: str(row.elemento_codigo), itemName: str(row.elemento_nombre),
    proyectoId: id(row.proyecto_id) || undefined, proyectoNombre: str(row.proyecto_nombre) || undefined,
    remisionId: id(row.remision_id) || undefined, remisionNumero: id(row.remision_id) || undefined,
    cantidad: numeric(row.cantidad), unidad: normalizeUnit(str(row.unidad, 'und')),
    stockAnterior: row.stock_anterior == null ? null : numeric(row.stock_anterior),
    stockNuevo: row.stock_nuevo == null ? null : numeric(row.stock_nuevo),
    motivo: str(row.motivo), responsable: str(row.responsable),
    fecha: created ? displayDate(created) : str(row.fecha), hora: created ? displayTime(created) : '',
    docType: row.remision_id ? 'pdf' : 'view',
  };
};
