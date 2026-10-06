import { useQuery } from '@tanstack/react-query';
import { useInventory } from '../../context/InventoryContext';
import { readItemHistory } from '../../data/repository';
import { isDemo } from '../../lib/supabase';
import { useRef, useState } from 'react';
import { readRemisionById } from '../../data/repository';
import { MovementDocuments } from '../history/MovementDocuments';
import { errorMessage } from '../../shared/errors';

export function ItemHistory({ itemId }: { itemId: string }) {
  const { historial, user, remisiones, openPdfRemision, openOutgoingPhotos } = useInventory();
  const [documentError,setDocumentError] = useState('');
  const fetching = useRef(false);
  const openPdf = async (id: string) => {
    if (fetching.current) return;
    fetching.current=true; setDocumentError('');
    try { openPdfRemision(remisiones.find(row=>row.id===id) || await readRemisionById(id)); }
    catch (cause) { setDocumentError(errorMessage(cause)); }
    finally { fetching.current=false; }
  };
  const query = useQuery({ queryKey: ['fulgor', user.email, 'item-history', itemId],
    queryFn: () => readItemHistory(itemId), enabled: !isDemo, staleTime: 30_000 });
  const rows = isDemo ? historial.filter(row => row.elementoId === itemId).slice(0, 50) : query.data ?? [];
  return <section>
    <h3 className="font-bold text-sm text-[#131b2e] mb-3">Movimientos recientes</h3>
    {query.isPending && !isDemo && <p className="text-xs text-[#64748b]">Cargando historial…</p>}
    {query.isError && <p role="alert" className="text-xs text-red-700">No se pudo cargar el historial.</p>}
    {documentError && <p role="alert" className="text-xs text-red-700">{documentError}</p>}
    {rows.length === 0 && !query.isPending && <p className="text-xs text-[#64748b]">Sin movimientos registrados.</p>}
    <div className="max-h-48 overflow-y-auto space-y-2">
      {rows.map(row => <div key={row.id} className="flex justify-between gap-3 p-2.5 rounded-lg border bg-[#f8fafc] text-xs">
        <div><strong>{row.tipo}</strong><span className="ml-2">{row.motivo}</span><span className="block text-[#64748b]">{row.fecha}</span></div>
        <div className="space-y-2 text-right"><span className="font-mono-code whitespace-nowrap">{row.cantidad > 0 && row.tipo !== 'SALIDA' ? '+' : ''}{row.cantidad} {row.unidad}</span>{row.remisionId && <MovementDocuments remissionId={row.remisionId} onPdf={id=>{void openPdf(id);}} onPhotos={openOutgoingPhotos} />}</div>
      </div>)}
    </div>
  </section>;
}
