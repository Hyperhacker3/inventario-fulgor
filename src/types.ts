import type { CategoriaElemento } from './domain/catalogs';
export type { CategoriaElemento } from './domain/catalogs';

export interface Proyecto {
  id: string;
  nombre: string;
  cliente: string;
  ubicacion: string;
  estado: 'ACTIVO' | 'FINALIZADO';
  createdAt: string;
}

export interface Categoria { id: string; nombre: string; activo: boolean }
export interface PrefijoCodigo { id: string; prefijo: string; nombre: string; activo: boolean; ultimo: number }

export interface Almacen {
  id: string;
  codigo: string; // e.g. 'BOG-01', 'MED-02'
  nombre: string;
  descripcion?: string;
  ciudad: string;
  capacidadPorcentaje: number;
  estado: 'Operativo' | 'Mantenimiento' | 'Inactivo';
}

export interface Estanteria {
  id: string;
  almacenId: string | null;
  codigo: string; // e.g. 'EST-A01'
  nombre: string; // e.g. 'Zona Paneles'
  descripcion?: string;
}

export interface Caja {
  id: string;
  estanteriaId: string | null;
  codigoCaja: string; // e.g. 'CAJ-1045'
  estado: 'Completa' | 'Parcial' | 'Vacia';
  descripcion?: string;
}

export interface Elemento {
  id: string;
  codigo: string; // Prefix plus a consecutive number, e.g. PAN001 or PAN1000.
  nombre: string;
  descripcion: string;
  categoria: CategoriaElemento;
  cantidad: number;
  unidad: 'und' | 'rll' | 'mts' | 'kg' | 'par' | 'jgo' | string;
  pesoUnitario?: PesoUnitario | null;
  fotoUrl: string;
  fotosAdicionales?: string[];
  almacenId: string | null;
  estanteriaId: string | null;
  cajaId: string | null;
  stockMinimo: number;
  valorUnitario?: number;
  estado?: 'BUENO' | 'MEDIO' | 'MAL ESTADO' | 'EN REPARACIÓN' | 'RETAZOS / BUENO' | string;
  cantidadDanados?: number;
  stockPendiente?: boolean;
  archived?: boolean;
  especificaciones?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PesoUnitario { valor: number; unidad: 'g' | 'kg' }

export interface DetalleRemision {
  elementoId: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  pesoTotalKg?: number;
  pesoUnitario?: PesoUnitario | null;
}

export interface DatosTransporte {
  telefonoRemite: string;
  telefonoRecibe: string;
  transportador: string;
  cedulaTransportador: string;
  telefonoTransportador: string;
  placaVehiculo: string;
  fechaDespacho: string;
  fechaDevolucion: string;
}

export interface Remision {
  id: string;
  numeroRemision: string; // e.g. 'REM-2026-0042'
  proyectoId: string;
  proyectoNombre: string;
  cliente: string;
  ubicacion: string;
  entregadoPor: string;
  cargoEntregado: string;
  recibidoPor: string;
  cargoRecibido: string;
  observaciones: string;
  fecha: string;
  items: DetalleRemision[];
  datosTransporte?: DatosTransporte;
}

export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'REUBICACION';

export interface HistorialMovimiento {
  id: string;
  tipo: TipoMovimiento;
  elementoId: string;
  itemCode: string;
  itemName: string;
  proyectoId?: string;
  proyectoNombre?: string;
  remisionId?: string;
  remisionNumero?: string;
  cantidad: number;
  unidad: string;
  stockAnterior: number | null;
  stockNuevo: number | null;
  motivo: string;
  responsable: string;
  fecha: string; // e.g. '15 Oct 2026'
  hora: string;  // e.g. '08:30 AM'
  docType?: 'pdf' | 'receipt' | 'view';
}

export interface DispatchCartItem {
  elemento: Elemento;
  cantidad: number;
}

export interface Page<T> { rows: T[]; total: number }

export type ActiveView = 
  | 'dashboard' 
  | 'explorer' 
  | 'new-item' 
  | 'dispatch' 
  | 'history' 
  | 'warehouses' 
  | 'remissions'
  | 'projects'
  | 'data-admin';

export interface UserProfile {
  name: string;
  role: string;
  avatar: string;
  email: string;
}
