import { useMemo } from 'react';
import type { HistorialMovimiento } from '../../types';
import { useInventory } from '../../context/InventoryContext';
import { MovementBadge } from './MovementBadge';
import { MovementDocuments } from './MovementDocuments';
import { openProductSurface } from '../../shared/productInteraction';

interface Props {
  rows: HistorialMovimiento[]; total: number; page: number; pages: number; loading: boolean;
  onPage: (page: number) => void; onDocument: (id: string) => void;
}
type HistoryInventory = Pick<ReturnType<typeof useInventory>, 'elementos' | 'proyectos' | 'openItemDetail' | 'openOutgoingPhotos'>;
export function HistoryTable(props: Props) {
  const inventory = useInventory();
  return <HistoryTableContent {...props} inventory={inventory} />;
}
export function HistoryTableContent({ rows, total, page, pages, loading, onPage, onDocument, inventory }: Props & { inventory: HistoryInventory }) {
  const { elementos, proyectos, openItemDetail, openOutgoingPhotos } = inventory;
  const items = useMemo(() => new Map(elementos.map(item => [item.id, item])), [elementos]);
  const projectNames = useMemo(() => new Map(proyectos.map(project => [project.id, project.nombre])), [proyectos]);
  return <div className="bg-white border rounded-2xl overflow-hidden shadow-xs">
    <div className="overflow-x-auto p-3"><table className="ui-product-table w-full text-left text-sm">
      <thead><tr className="bg-[#f8fafc] border-b text-xs font-bold uppercase text-[#454651]">
        {['Tipo', 'Fecha y hora', 'Código SKU', 'Componente', 'Proyecto / destino', 'Cantidad', 'Stock final', 'Responsable', 'PDF / fotografías']
          .map(label => <th key={label} className="p-3.5 whitespace-nowrap">{label}</th>)}
      </tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-sm text-[#767682]">
          {loading ? 'Cargando movimientos…' : 'No se encontraron movimientos.'}</td></tr>}
        {rows.map(row => {
          const item = items.get(row.elementoId);
          return <tr key={row.id} data-movement-id={row.id} data-product-id={item?.id}
            onClick={item ? event => openProductSurface(event, () => openItemDetail(item)) : undefined}
            className={`ui-product-row text-xs ${item ? 'ui-product' : ''}`}>
            <td className="p-3.5"><MovementBadge type={row.tipo} /></td>
            <td className="p-3.5 whitespace-nowrap"><strong className="block">{row.fecha}</strong><span>{row.hora}</span></td>
            <td className="p-3.5 font-mono-code font-bold text-[#3e4e9e]">
              {row.itemCode}
            </td>
            <td className="p-3.5 max-w-xs">{item
              ? <button type="button" onClick={() => openItemDetail(item)} aria-label={`Ver detalles de ${row.itemCode} · ${row.itemName}`} className="ui-product-open block max-w-full text-left font-bold truncate" title={row.itemName}>{row.itemName}</button>
              : <strong className="block truncate" title={row.itemName}>{row.itemName}</strong>}
              <span className="block truncate text-[#767682]" title={row.motivo}>{row.motivo}</span></td>
            <td className="p-3.5">{row.proyectoNombre || projectNames.get(row.proyectoId || '') || 'Bodega Central'}</td>
            <td className="p-3.5 text-right font-mono-code whitespace-nowrap">{row.tipo === 'SALIDA' ? '-' : '+'}{Math.abs(row.cantidad)} {row.unidad}</td>
            <td className="p-3.5 text-right font-mono-code whitespace-nowrap">{row.stockNuevo ?? '—'} {row.unidad}</td>
            <td className="p-3.5">{row.responsable}</td>
            <td className="p-3.5 text-center"><MovementDocuments remissionId={row.remisionId} onPdf={onDocument} onPhotos={openOutgoingPhotos} /></td>
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
