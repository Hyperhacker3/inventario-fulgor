import { useRef, useState, type FormEvent } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { internalNumber, returnAmounts, type InternalDispatch, type InternalReturnInput } from '../../domain/internalDispatch';
import { errorMessage } from '../../shared/errors';
import { FormDialog } from '../ui/FormDialog';
import { NumberInput } from '../NumberInput';

export function InternalReturnDialog({ loan, onClose }: {loan:InternalDispatch;onClose:()=>void}) {
  const inventory=useInventory(),job=inventory.internalJobs[`return:${loan.id}`];
  const original=job?.payload as unknown as InternalReturnInput | undefined;
  return <InternalReturnForm loan={loan} original={original} save={inventory.returnInternal} onClose={onClose} />;
}
export function InternalReturnForm({loan,original,save,onClose}:{loan:InternalDispatch;original?:InternalReturnInput;save:(input:InternalReturnInput)=>Promise<InternalDispatch>;onClose:()=>void}) {
  const [amounts,setAmounts]=useState<Record<string,number>>(()=>Object.fromEntries((original?.items||[]).map(row=>[row.elementoId,row.cantidad])));
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),saving=useRef(false);
  const submit=async(event:FormEvent)=>{
    event.preventDefault();if(saving.current)return;setError('');
    try{const input=original||{salidaId:loan.id,items:returnAmounts(loan,amounts)};saving.current=true;setBusy(true);await save(input);onClose();}
    catch(cause){setError(errorMessage(cause));}finally{saving.current=false;setBusy(false);}
  };
  return <FormDialog title="Registrar devolución interna" busy={busy} onClose={onClose}>
    <form onSubmit={submit} className="space-y-4"><p className="text-sm break-words">{loan.codigo} · {loan.recibido_por}</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {original && <p className="text-sm">Reintente para confirmar la devolución original.</p>}
      <fieldset disabled={busy||!!original} className="space-y-4 max-h-[50dvh] overflow-y-auto p-2">
        {loan.items.filter(row=>row.pendiente>0||original?.items.some(item=>item.elementoId===row.elementoId)).map(row=><label key={row.elementoId} className="block text-sm">
          <strong className="block break-words">{row.codigo} · {row.nombre}</strong><span className="block text-xs text-slate-500">Pendiente: {internalNumber(row.pendiente)} {row.unidad}</span>
          <NumberInput aria-label={`Devolver ${row.codigo}`} min={0} max={original?undefined:row.pendiente} step="0.001" value={amounts[row.elementoId]||0} onValueChange={q=>setAmounts({...amounts,[row.elementoId]:q})} className="w-full rounded-xl p-3 mt-1" />
        </label>)}
        <button type="button" onClick={()=>setAmounts(Object.fromEntries(loan.items.map(row=>[row.elementoId,row.pendiente])))} className="rounded-xl px-3 py-2">Devolver todo lo pendiente</button>
      </fieldset>
      <div className="grid grid-cols-2 gap-4"><button type="button" data-action="cancel" disabled={busy} onClick={onClose} className="rounded-xl px-3 py-2">Cancelar</button><button disabled={busy} data-action="entry" className="rounded-xl px-3 py-2">{busy?'Guardando…':original?'Reintentar':'Registrar devolución'}</button></div>
    </form>
  </FormDialog>;
}
