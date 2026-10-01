export const categories = [
  'PANELES', 'INVERSORES', 'ESTRUCTURAS', 'CABLES', 'CONECTORES', 'PROTECCIONES',
  'BATERIAS', 'CONTROLADORES', 'ACCESORIOS', 'HERRAMIENTAS', 'SEGURIDAD_EPP', 'OTROS',
] as const;
export type CategoriaElemento = typeof categories[number];
export const units = ['und', 'rll', 'mts', 'kg', 'par', 'jgo', 'kl', 'caja', 'costales'] as const;
export const conditions = ['BUENO', 'MEDIO', 'MAL ESTADO', 'EN REPARACIÓN', 'RETAZOS / BUENO'] as const;
export const normalizeUnit = (value: string) => ({ rol: 'rll', juego: 'jgo', pares: 'par' } as Record<string, string>)[value.toLowerCase()] ?? value.toLowerCase();
