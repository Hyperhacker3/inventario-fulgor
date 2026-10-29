import { useInventory } from '../../context/InventoryContext';
import { InternalIssueForm } from './InternalIssueForm';
import { InternalHistory } from './InternalHistory';

export function InternalDispatchArea({enabled=true}:{enabled?:boolean}) {
  const {internalTab,setInternalTab,internalPending}=useInventory();
  return <div className="space-y-5"><div role="group" aria-label="Opciones de salidas internas" className="flex flex-wrap gap-3">
    {([['new','Nueva salida'],['pending','Materiales sin regresar'],['history','Historial']] as const).map(([id,label])=><button key={id} type="button" disabled={internalPending} aria-pressed={internalTab===id} onClick={()=>setInternalTab(id)} className="ui-flat-choice rounded-xl px-4 py-3">{label}</button>)}
  </div><div hidden={internalTab!=='new'} inert={internalTab!=='new'}><InternalIssueForm enabled={enabled&&internalTab==='new'} /></div><div hidden={internalTab==='new'} inert={internalTab==='new'}><InternalHistory pending={internalTab==='pending'} enabled={enabled&&internalTab!=='new'} /></div></div>;
}
