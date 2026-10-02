import { useRef, useState } from 'react';
import type { Elemento } from '../../types';
import { itemPhotos } from '../../domain/photos';
import { ItemImage } from '../ItemImage';

export function ItemPhotoGallery({ item }: { item: Elemento }) {
  const photos = itemPhotos(item);
  const slides = photos.length ? photos : [''];
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const active = Math.min(current, slides.length - 1);
  const go = (index: number) => {
    const element = track.current;
    element?.scrollTo({ left: index * element.clientWidth, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  return <section aria-label="Fotografías del producto" className="space-y-3">
    <div className="relative">
      <div ref={track} onScroll={event => { const element = event.currentTarget; if (element.clientWidth) setCurrent(Math.round(element.scrollLeft / element.clientWidth)); }}
        tabIndex={0} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); go(Math.max(0, Math.min(slides.length - 1, active + (event.key === 'ArrowRight' ? 1 : -1)))); } }}
        className="flex overflow-x-auto snap-x snap-mandatory rounded-xl border bg-[#f8fafc] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slides.map((source, index) => <div key={source || 'empty'} className="relative w-full aspect-square shrink-0 snap-center snap-always" role="group" aria-label={`Foto ${index + 1} de ${slides.length}`}>
          {Math.abs(index - active) <= 1 && <ItemImage source={source} category={item.categoria} alt={`${item.nombre} · foto ${index + 1}`} className="absolute inset-0 w-full h-full object-cover" />}
        </div>)}
      </div>
      {photos.length > 1 && <>
        <button type="button" aria-label="Foto anterior" disabled={active === 0} onClick={() => go(active - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 w-9 h-9 shadow text-xl disabled:opacity-30">‹</button>
        <button type="button" aria-label="Foto siguiente" disabled={active === slides.length - 1} onClick={() => go(active + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 w-9 h-9 shadow text-xl disabled:opacity-30">›</button>
      </>}
    </div>
    {photos.length > 1 && <div className="flex flex-col items-center gap-1">
      <div className="flex flex-wrap justify-center gap-1" aria-label="Elegir fotografía">{photos.map((source, index) => <button key={source} type="button" aria-label={`Ver foto ${index + 1}`} aria-current={index === active ? 'true' : undefined} onClick={() => go(index)} className="w-7 h-7 flex items-center justify-center">
        <span className={`h-2.5 rounded-full transition-all ${index === active ? 'w-6 bg-[#3e4e9e]' : 'w-2.5 bg-slate-300'}`} />
      </button>)}</div>
      <p className="text-xs text-slate-500" aria-live="polite">Foto {active + 1} de {photos.length}</p>
    </div>}
  </section>;
}
