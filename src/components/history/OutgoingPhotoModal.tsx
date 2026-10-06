import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useInventory } from '../../context/InventoryContext';
import { readRemisionById } from '../../data/repository';
import { resolveOutgoingImage } from '../../shared/outgoingImages';
import { errorMessage } from '../../shared/errors';

function EvidencePhoto({ source, index }: { source: string; index: number }) {
  const [resolved, setResolved] = useState<{ source: string; url?: string; error?: string } | null>(null);
  useEffect(() => {
    let active = true;
    void resolveOutgoingImage(source).then(url => { if (active) setResolved({source,url}); })
      .catch(cause => { if (active) setResolved({source,error:errorMessage(cause)}); });
    return () => { active = false; };
  }, [source]);
  if (resolved?.source !== source) return <p role="status">Cargando foto…</p>;
  if (resolved.error) return <p role="alert" className="text-red-700">{resolved.error}</p>;
  return <img src={resolved.url} alt={`Registro de salida, fotografía ${index + 1}`} className="w-full max-h-[60vh] object-contain" onError={() => setResolved({source,error:'No se pudo cargar la imagen. Cierre y vuelva a abrir el registro para reintentar.'})} />;
}

export function OutgoingPhotoModal({ remissionId, onClose }: { remissionId: string; onClose: () => void }) {
  const { user, remisiones } = useInventory();
  const query = useQuery({ queryKey: ['fulgor',user.email,'outgoing-record',remissionId], queryFn: () => readRemisionById(remissionId),
    initialData: remisiones.find(row => row.id === remissionId), staleTime:30_000 });
  const [current, setCurrent] = useState(0);
  const dialog = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const focused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; close.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); onClose(); }
      if (event.key === 'Tab') {
        const buttons = [...(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [])];
        const first=buttons[0], last=buttons.at(-1);
        if (event.shiftKey && document.activeElement===first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement===last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown',key,true);
    return () => { document.body.style.overflow=overflow; document.removeEventListener('keydown',key,true); if (focused?.isConnected) focused.focus(); };
  }, [onClose]);
  const photos = query.data?.fotosSalida || [];
  const index = Math.min(current,Math.max(0,photos.length-1));
  return createPortal(<div className="no-print fixed inset-0 z-[70] bg-black/70 grid place-items-center p-3 sm:p-6">
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="outgoing-record-title" className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-5 space-y-4">
      <header className="flex gap-4 justify-between items-start"><div><h2 id="outgoing-record-title" className="font-bold text-xl">Registro fotográfico de la salida</h2><p className="text-sm text-slate-600">{query.data?.numeroRemision} · {query.data?.proyectoNombre}</p></div><button ref={close} type="button" aria-label="Cerrar fotografías" onClick={onClose} className="text-2xl">×</button></header>
      {query.isPending ? <p role="status">Cargando registro…</p> : query.isError ? <div><p role="alert" className="text-red-700">{errorMessage(query.error)}</p><button type="button" onClick={() => { void query.refetch(); }} className="underline mt-2">Reintentar</button></div> : photos.length ? <>
        <div className="bg-slate-50 rounded-xl p-2 min-h-40 grid place-items-center"><EvidencePhoto key={photos[index]} source={photos[index]} index={index} /></div>
        <div className="flex justify-between items-center gap-3"><button type="button" disabled={index===0} onClick={() => setCurrent(index-1)} className="border rounded-lg px-3 py-2 disabled:opacity-40">Anterior</button><span aria-live="polite" className="text-sm">Foto {index+1} de {photos.length}</span><button type="button" disabled={index===photos.length-1} onClick={() => setCurrent(index+1)} className="border rounded-lg px-3 py-2 disabled:opacity-40">Siguiente</button></div>
        <div className="flex gap-1 flex-wrap justify-center">{photos.map((photo,i) => <button key={photo} type="button" aria-label={`Ver fotografía ${i+1}`} aria-current={i===index ? 'true' : undefined} onClick={() => setCurrent(i)} className="w-7 h-7 grid place-items-center"><span className={`rounded-full h-2.5 ${i===index ? 'w-5 bg-[#253685]' : 'w-2.5 bg-slate-300'}`} /></button>)}</div>
      </> : <p role="status" className="text-slate-600 py-6">Esta salida no tiene registro fotográfico.</p>}
    </section>
  </div>,document.body);
}
