import { useRef, useState, type FormEvent } from 'react';
import { useInventory } from '../../context/InventoryContext';
import type { InternalDispatch, InternalPermanentInput } from '../../domain/internalDispatch';
import { internalNumber } from '../../domain/internalDispatch';
import { errorMessage } from '../../shared/errors';
import { FormDialog } from '../ui/FormDialog';

export function InternalPermanentDialog({loan,onClose,onSaved}:{loan:InternalDispatch;onClose:()=>void;onSaved:(loan:InternalDispatch)=>void}) {
  const inventory=useInventory();
  return <InternalPermanentForm loan={loan} uncertain={!!inventory.internalJobs[`permanent:${loan.id}`]} save={inventory.makeInternalPermanent} onClose={onClose} onSaved={onSaved}/>;
}

export function InternalPermanentForm({loan,uncertain=false,save,onClose,onSaved}:{loan:InternalDispatch;uncertain?:boolean;save:(input:InternalPermanentInput)=>Promise<InternalDispatch>;onClose:()=>void;onSaved:(loan:InternalDispatch)=>void}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),saving=useRef(false);
  const submit=async(event:FormEvent)=>{
    event.preventDefault();if(saving.current)return;
    saving.current=true;setBusy(true);setError('');
    try{const updated=await save({salidaId:loan.id});onSaved(updated);onClose();}
    catch(cause){setError(errorMessage(cause));}finally{saving.current=false;setBusy(false);}
  };
  return <FormDialog title="Convertir en salida permanente" busy={busy} onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm break-words">{loan.codigo} · {loan.recibido_por}</p>
      <p className="text-sm">Se descontarán del stock únicamente las cantidades que sigan pendientes al confirmar. Las devoluciones anteriores se conservan. Los materiales convertidos dejarán de aparecer en Materiales sin regresar.</p>
      <ul className="space-y-2 max-h-[35dvh] overflow-y-auto text-sm">{loan.items.filter(row=>row.pendiente>0).map(row=><li key={row.elementoId} className="break-words">{row.codigo} · {row.nombre}: <strong>{internalNumber(row.pendiente)} {row.unidad}</strong></li>)}</ul>
      {uncertain&&<p role="status" className="text-sm">Hay una conversión por confirmar. Reintente para consultar su resultado sin volver a descontar stock.</p>}
      {error&&<p role="alert" className="text-red-700">{error}</p>}
      <div className="grid grid-cols-2 gap-4"><button type="button" data-action="cancel" disabled={busy} onClick={onClose} className="rounded-xl px-3 py-2">Cancelar</button><button type="submit" data-action="dispatch" disabled={busy} className="rounded-xl px-3 py-2 font-semibold">{busy?'Guardando…':uncertain?'Reintentar conversión':'Confirmar permanente'}</button></div>
    </form>
  </FormDialog>;
}
