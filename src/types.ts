export type CategoriaElemento = 
  | 'PANELES' 
  | 'INVERSORES' 
  | 'ESTRUCTURAS' 
  | 'CABLES' 
  | 'CONECTORES' 
  | 'PROTECCIONES'
  | 'BATERIAS'
  | 'OTROS';

export interface Proyecto {
  id: number;
  nombre: string;
  cliente: string;
  ubicacion: string;
  estado: 'ACTIVO' | 'FINALIZADO';
  createdAt: string;
}

export interface Almacen {
  id: number;
  codigo: string; // e.g. 'BOG-01', 'MED-02'
  nombre: string;
  descripcion?: string;
  ciudad: string;
  capacidadPorcentaje: number;
  estado: 'Operativo' | 'Mantenimiento';
}

export interface Estanteria {
  id: number;
  almacenId: number;
  codigo: string; // e.g. 'EST-A01'
  nombre: string; // e.g. 'Zona Paneles'
  descripcion?: string;
}

export interface Caja {
  id: number;
  estanteriaId: number;
  codigoCaja: string; // e.g. 'CAJ-1045'
  estado: 'Completa' | 'Parcial' | 'Vacia';
  descripcion?: string;
}

export interface Elemento {
  id: number;
  codigo: string; // Strict AAA000 e.g. PAN001
  nombre: string;
  descripcion: string;
  categoria: CategoriaElemento;
  cantidad: number;
  unidad: 'und' | 'rll' | 'mts' | 'kg' | 'par' | 'jgo' | string;
  fotoUrl: string;
  almacenId: number;
  estanteriaId: number;
  cajaId: number;
  stockMinimo: number;
  valorUnitario?: number;
  estado?: 'BUENO' | 'MEDIO' | 'MAL ESTADO' | 'EN REPARACIÓN' | 'RETAZOS / BUENO' | string;
  cantidadDanados?: number;
  especificaciones?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DetalleRemision {
  elementoId: number;
  codigo: string;
  nombre: string;
  cantidad: number;
  unidad: string;
}

export interface Remision {
  id: number;
  numeroRemision: string; // e.g. 'REM-2026-0042'
  proyectoId: number;
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
}

export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'REUBICACION';

export interface HistorialMovimiento {
  id: number;
  tipo: TipoMovimiento;
  elementoId: number;
  itemCode: string;
  itemName: string;
  proyectoId?: number;
  proyectoNombre?: string;
  remisionId?: number;
  remisionNumero?: string;
  cantidad: number;
  unidad: string;
  stockAnterior: number;
  stockNuevo: number;
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

export type ActiveView = 
  | 'dashboard' 
  | 'explorer' 
  | 'new-item' 
  | 'dispatch' 
  | 'history' 
  | 'warehouses' 
  | 'remissions';

export interface UserProfile {
  name: string;
  role: string;
  avatar: string;
  email: string;
}
