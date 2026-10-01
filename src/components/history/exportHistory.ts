import type { HistorialMovimiento, Proyecto } from '../../types';
import { readHistory } from '../../data/repository';
import { downloadCsv } from '../../shared/csv';
import { isDemo } from '../../lib/supabase';

export async function exportHistory(demoRows: HistorialMovimiento[], projects: Proyecto[], type: string, search: string) {
  const rows: HistorialMovimiento[] = [];
  if (isDemo) rows.push(...demoRows);
  else for (let page = 1; ; page++) {
    const result = await readHistory(page, 500, { type, search });
    rows.push(...result.rows);
    if (rows.length >= result.total || result.rows.length === 0) break;
  }
  const projectNames = new Map(projects.map(project => [project.id, project.nombre]));
  const headers = ['ID', 'Tipo', 'Fecha', 'Hora', 'SKU', 'Componente', 'Proyecto', 'Cantidad', 'Unidad', 'Stock Nuevo', 'Responsable', 'Motivo'];
  downloadCsv(`historial_fulgor_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows.map(row => [
    row.id, row.tipo, row.fecha, row.hora, row.itemCode, row.itemName,
    row.proyectoNombre || projectNames.get(row.proyectoId || '') || '', row.cantidad,
    row.unidad, row.stockNuevo, row.responsable, row.motivo,
  ])]);
}
