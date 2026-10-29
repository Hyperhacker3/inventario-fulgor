import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useStaff } from '../../state/useInternalQueries';
import type { StaffMember, InternalIssueInput } from '../../domain/internalDispatch';
import { displayCargo } from '../../domain/userProfile';
import { errorMessage } from '../../shared/errors';
import { Select } from '../ui/Select';
import { AvailableInventory } from '../dispatch/AvailableInventory';
import { DispatchCartLine } from '../dispatch/DispatchCartLine';
import { useFormScroll } from '../../hooks/useFormScroll';
import { validateDispatch } from '../../domain/dispatch';

export function InternalIssueForm({enabled=true}:{enabled?:boolean}) {
  const inventory=useInventory(),staff=useStaff(enabled);
  return <InternalIssueContent inventory={inventory} staff={staff} search={<AvailableInventory idPrefix="internal-"/>}/>;
}
type IssueInventory=Pick<ReturnType<typeof useInventory>,'user'|'internalJobs'|'internalRecipient'|'setInternalRecipient'|'dispatchCart'|'elementos'|'issueInternal'|'clearDispatchCart'|'openItemDetail'|'updateDispatchCartQuantity'|'removeFromDispatchCart'>;
export function InternalIssueContent({inventory,staff,search}:{inventory:IssueInventory;staff:{data?:StaffMember[];isError:boolean;error:unknown;refetch:()=>unknown};search:ReactNode}) {
  const saving=useRef(false);
  const {ref,onInvalidCapture,revealError,scrollToStart}=useFormScroll();
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const job=inventory.internalJobs.issue,payload=job?.payload as unknown as InternalIssueInput | undefined;
  const recipient=payload?.personalId || inventory.internalRecipient;
  const worker=staff.data?.find(row=>row.id===recipient);
  const frozen=!!job;
  const submit=async(event:FormEvent)=>{
    event.preventDefault();if(saving.current)return;setError('');setMessage('');
    try{
      if(!job)validateDispatch(inventory.dispatchCart,inventory.elementos);
      saving.current=true;setBusy(true);
      const loan=await inventory.issueInternal(payload || {personalId:recipient,items:inventory.dispatchCart.map(row=>({elementoId:row.elemento.id,cantidad:row.cantidad}))});
      setMessage(`Salida ${loan.codigo} confirmada. Consulte su estado en Materiales sin regresar o Historial.`);scrollToStart();
    }catch(cause){setError(errorMessage(cause));revealError();}finally{saving.current=false;setBusy(false);}
  };
  return <div ref={ref} onInvalidCapture={onInvalidCapture} className="space-y-5">
    <p className="text-sm text-slate-600">Materiales para usar dentro de las instalaciones y devolver a la bodega. Comparten la selección de productos con las salidas externas.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}{message && <p role="status" className="text-green-700">{message}</p>}
    {staff.isError && <div role="alert" className="space-y-2"><p>{errorMessage(staff.error)}</p><button type="button" onClick={()=>{void staff.refetch();}} className="rounded-xl px-4 py-2">Comprobar de nuevo</button></div>}
    {frozen && <p role="status" className="text-sm">Hay una salida por confirmar. Reintente el registro original; sus materiales y destinatario se conservan.</p>}
    <fieldset disabled={busy||frozen} className="min-w-0">{search}</fieldset>
    <form onSubmit={submit} aria-busy={busy} className="rounded-2xl bg-white p-4 sm:p-6 space-y-5">
      <fieldset disabled={busy||frozen} className="min-w-0 space-y-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <section className="min-w-0 space-y-3"><h3 className="font-bold text-sm">ENTREGA</h3><p className="break-words">{inventory.user.name}</p><p className="text-sm text-slate-500 break-words">{displayCargo(inventory.user)}</p></section>
          <div className="min-w-0 space-y-3"><label className="block text-sm font-semibold" htmlFor="internal-recipient">RECIBE</label>
            <Select id="internal-recipient" value={recipient} required disabled={!staff.data} onChange={e=>inventory.setInternalRecipient(e.target.value)} className="w-full rounded-xl px-3 py-2">
              <option value="">Seleccione un trabajador</option>{staff.data?.filter(row=>row.activo||row.id===recipient).map(row=><option key={row.id} value={row.id} disabled={!row.activo}>{row.nombre} · {row.cargo}{!row.activo?' (Inactivo)':''}</option>)}
            </Select><p className="text-sm text-slate-500 break-words">{worker?.cargo || 'El cargo se completa al seleccionar al trabajador.'}</p>
          </div>
        </div>
        {staff.data && !staff.data.some(row=>row.activo) && <p className="text-sm">Agregue trabajadores activos en Administración de datos → Personal.</p>}
        <div className="flex flex-wrap gap-3 justify-between items-center"><h3 className="font-semibold">Materiales seleccionados ({inventory.dispatchCart.length})</h3><button type="button" data-action="cancel" onClick={inventory.clearDispatchCart} className="rounded-xl px-3 py-2">Vaciar</button></div>
        <div className="space-y-4 max-h-96 overflow-y-auto p-3">{inventory.dispatchCart.map(row=><DispatchCartLine key={row.elemento.id} item={row} onOpen={()=>inventory.openItemDetail(row.elemento)} onQuantity={q=>inventory.updateDispatchCartQuantity(row.elemento.id,q)} onRemove={()=>inventory.removeFromDispatchCart(row.elemento.id)} />)}</div>
        {!inventory.dispatchCart.length && <p className="text-sm text-slate-500">Busque y añada los materiales que va a entregar.</p>}
      </fieldset>
      <button type="submit" data-action="dispatch" disabled={busy||(!job&&(!recipient||!worker?.activo||!inventory.dispatchCart.length))} className="w-full rounded-xl px-4 py-3 font-bold">{busy?'Registrando…':job?'Reintentar salida interna':'Registrar salida interna'}</button>
      <p className="text-xs text-slate-500">Se guarda en el historial interno. Puede abrir su PDF cuando lo necesite.</p>
    </form>
  </div>;
}
