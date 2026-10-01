import { useMemo } from 'react';
import type { HistorialMovimiento } from '../../types';
import { useInventory } from '../../context/InventoryContext';
import { MovementBadge } from './MovementBadge';

interface Props {
  rows: HistorialMovimiento[]; total: number; page: number; pages: number; loading: boolean;
  onPage: (page: number) => void; onDocument: (id: string) => void;
}
export function HistoryTable({ rows, total, page, pages, loading, onPage, onDocument }: Props) {
  const { elementos, proyectos, openItemDetail } = useInventory();
  const items = useMemo(() => new Map(elementos.map(item => [item.id, item])), [elementos]);
  const projectNames = useMemo(() => new Map(proyectos.map(project => [project.id, project.nombre])), [proyectos]);
  return <div className="bg-white border rounded-2xl overflow-hidden shadow-xs">
    <div className="overflow-x-auto"><table className="w-full text-left border-collapse text-sm">
      <thead><tr className="bg-[#f8fafc] border-b text-xs font-bold uppercase text-[#454651]">
        {['Tipo', 'Fecha y hora', 'Código SKU', 'Componente', 'Proyecto / destino', 'Cantidad', 'Stock final', 'Responsable', 'Documento']
          .map(label => <th key={label} className="p-3.5 whitespace-nowrap">{label}</th>)}
      </tr></thead>
      <tbody className="divide-y">
        {rows.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-sm text-[#767682]">
          {loading ? 'Cargando movimientos…' : 'No se encontraron movimientos.'}</td></tr>}
        {rows.map(row => {
          const item = items.get(row.elementoId);
          return <tr key={row.id} className="hover:bg-[#f8fafc] text-xs">
            <td className="p-3.5"><MovementBadge type={row.tipo} /></td>
            <td className="p-3.5 whitespace-nowrap"><strong className="block">{row.fecha}</strong><span>{row.hora}</span></td>
            <td className="p-3.5 font-mono-code font-bold text-[#3e4e9e]">
              {item ? <button type="button" onClick={() => openItemDetail(item)} className="hover:underline">{row.itemCode}</button> : row.itemCode}
            </td>
            <td className="p-3.5 max-w-xs"><strong className="block truncate" title={row.itemName}>{row.itemName}</strong>
              <span className="block truncate text-[#767682]" title={row.motivo}>{row.motivo}</span></td>
            <td className="p-3.5">{row.proyectoNombre || projectNames.get(row.proyectoId || '') || 'Bodega Central'}</td>
            <td className="p-3.5 text-right font-mono-code whitespace-nowrap">{row.tipo === 'SALIDA' ? '-' : '+'}{Math.abs(row.cantidad)} {row.unidad}</td>
            <td className="p-3.5 text-right font-mono-code whitespace-nowrap">{row.stockNuevo ?? '—'} {row.unidad}</td>
            <td className="p-3.5">{row.responsable}</td>
            <td className="p-3.5 text-center">{row.remisionId ? <button type="button" onClick={() => onDocument(row.remisionId!)}
              className="px-2.5 py-1 bg-[#eaedff] text-[#253685] rounded-md font-semibold">PDF</button> : '—'}</td>
          </tr>;
        })}
      </tbody>
    </table></div>
    <nav aria-label="Páginas del historial" className="p-4 border-t bg-[#f8fafc] flex flex-wrap justify-between items-center gap-3 text-xs">
      <span>Mostrando {rows.length} de {total} movimientos</span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page === 1} onClick={() => onPage(page - 1)} className="px-3 py-1.5 border rounded-lg disabled:opacity-40">Anterior</button>
        <span>{page} / {pages}</span>
        <button type="button" disabled={page === pages} onClick={() => onPage(page + 1)} className="px-3 py-1.5 border rounded-lg disabled:opacity-40">Siguiente</button>
      </div>
    </nav>
  </div>;
}
