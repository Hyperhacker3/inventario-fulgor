import { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useInternalPage } from '../../state/useInternalQueries';
import { readInternalDetail } from '../../data/internalDispatch';
import { internalDate, internalNumber, internalStatus, type InternalDispatch } from '../../domain/internalDispatch';
import { errorMessage } from '../../shared/errors';
import { SearchInput } from '../ui/SearchInput';
import { Presence } from '../ui/Motion';
import { InternalReturnDialog } from './InternalReturnDialog';
import { InternalPdfModal } from './InternalPdfModal';

export function InternalHistory({ pending=false, enabled=true }: {pending?:boolean;enabled?:boolean}) {
  const inventory=useInventory();
  const [search,setSearch]=useState(''),[position,setPosition]=useState({key:'',page:1}),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  const filterKey=`${pending}|${search}`,page=position.key===filterKey?position.page:1;
  const query=useInternalPage(page,pending,search,enabled);
  const [returning,setReturning]=useState<InternalDispatch|null>(null),[document,setDocument]=useState<InternalDispatch|null>(null);
  const operate=['admin','operador'].includes(inventory.user.role);
  const open=async(id:string,action:'pdf'|'return')=>{
    if(loading)return;setLoading(true);setError('');
    try{const loan=await readInternalDetail(id);if(action==='pdf')setDocument(structuredClone(loan));else setReturning(loan);}
    catch(cause){setError(errorMessage(cause));}finally{setLoading(false);}
  };
  const uncertain=Object.keys(inventory.internalJobs).filter(key=>key.startsWith('return:'));
  return <section className="space-y-5">
    <h3 className="font-bold text-lg">{pending?'Materiales sin regresar':'Historial de salidas internas'}</h3>
    <p className="text-sm text-slate-600">{pending?'Revise quién tiene los materiales y registre lo que regresa a la bodega.':'Consulte entregas y devoluciones. El PDF se genera solo cuando lo solicite.'}</p>
    <SearchInput aria-label="Buscar salidas internas" maxLength={180} value={search} onChange={e=>setSearch(e.target.value)} onClear={()=>setSearch('')} placeholder="Buscar trabajador, producto o código" className="w-full rounded-xl p-3" />
    {(error||query.isError) && <div role="alert" className="space-y-2 text-red-700"><p>{error||errorMessage(query.error)}</p><button type="button" onClick={()=>{void query.refetch();}} className="rounded-xl px-4 py-2">Comprobar de nuevo</button></div>}
    {query.isPending && query.isFetching && <p role="status">Cargando salidas internas…</p>}
    {operate && uncertain.map(key=><p key={key} className="text-sm">Hay una devolución por confirmar. <button type="button" disabled={loading} onClick={()=>{void open(key.slice(7),'return');}} className="rounded-xl px-3 py-2">Reintentar devolución</button></p>)}
    {query.data?.rows.map(loan=><article key={loan.id} className="rounded-2xl bg-white p-4 sm:p-5 space-y-4 min-w-0">
      <div className="flex flex-wrap gap-3 justify-between"><div className="min-w-0"><h4 className="font-bold break-words">{loan.codigo} · {loan.recibido_por}</h4><p className="text-sm break-words">{loan.cargo_recibido}</p><p className="text-xs text-slate-500">{internalDate(loan.created_at)} · {internalStatus(loan.estado)}</p></div>
        <div className="flex flex-wrap gap-3 items-start"><button type="button" disabled={loading} onClick={()=>{void open(loan.id,'pdf');}} className="rounded-xl px-4 py-2">Ver / Guardar PDF</button>
          {operate && loan.estado!=='DEVUELTA' && <button type="button" data-action="entry" disabled={loading||inventory.internalPending} onClick={()=>{void open(loan.id,'return');}} className="rounded-xl px-4 py-2">Registrar devolución</button>}
        </div>
      </div>
      <p className="text-sm break-words">Entrega: {loan.entregado_por} · {loan.cargo_entregado}</p>
      <ul className="space-y-3">{loan.items.filter(row=>!pending||row.pendiente>0).map(row=><li key={row.elementoId} className="text-sm min-w-0"><strong className="block break-words">{row.codigo} · {row.nombre}</strong><span>Entregado: {internalNumber(row.cantidad)} {row.unidad} · Devuelto: {internalNumber(row.devuelta)} {row.unidad} · Pendiente: <strong>{internalNumber(row.pendiente)} {row.unidad}</strong></span></li>)}</ul>
    </article>)}
    {query.data?.rows.length===0 && <p>{query.data.total>0?'Esta página quedó vacía. Use Anterior para ver las demás salidas.':pending?'No hay materiales pendientes de devolución.':'No hay salidas internas para esta búsqueda.'}</p>}
    {query.data && <nav aria-label="Páginas de salidas internas" className="flex flex-wrap justify-center items-center gap-4"><button disabled={page===1} onClick={()=>setPosition({key:filterKey,page:page-1})} className="rounded-xl px-3 py-2">Anterior</button><span className="text-sm">Página {page} · {query.data.total} salidas</span><button disabled={page*20>=query.data.total} onClick={()=>setPosition({key:filterKey,page:page+1})} className="rounded-xl px-3 py-2">Siguiente</button></nav>}
    <Presence open={!!returning}>{returning && <InternalReturnDialog loan={returning} onClose={()=>setReturning(null)} />}</Presence>
    <Presence open={!!document}>{document && <InternalPdfModal loan={document} onClose={()=>setDocument(null)} />}</Presence>
  </section>;
}
