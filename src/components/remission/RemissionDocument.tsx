import { useEffect, useRef, useState } from 'react';
import type { Remision } from '../../types';
import { observationChunks, paginateRemission, type RemissionPage } from '../../domain/remissionLayout';
import { RemissionHeader, RemissionClosing, RemissionTable } from './RemissionSections';
import './remission.css';

export function RemissionDocument({ remision, scale, onReady }: { remision: Remision; scale: number; onReady?: (ready: boolean) => void }) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<RemissionPage[]>([]);
  const notes = observationChunks(remision.observaciones);
  const closingIndices = Array.from({ length: notes.length + 3 }, (_, i) => i);
  useEffect(() => {
    let cancelled = false;
    onReady?.(false);
    const measure = () => {
      const node = measureRef.current;
      if (!node || cancelled) return;
      const height = (selector: string) => node.querySelector(selector)!.getBoundingClientRect().height;
      const rows = [...node.querySelectorAll('[data-material-row]')].map(row => row.getBoundingClientRect().height + 1);
      const closing = [...node.querySelectorAll('[data-closing-block]')].map(block => block.getBoundingClientRect().height);
      const capacity = 1122 - 72 - height('.rm-header') - height('.rm-footer') - 20;
      setPages(paginateRemission(rows, closing, capacity, height('thead')));
      onReady?.(true);
    };
    const logo = measureRef.current?.querySelector('img');
    void Promise.all([document.fonts.ready, logo?.decode().catch(() => {})]).then(measure);
    return () => { cancelled = true; };
  }, [remision, onReady]);
  const footer = (page: number, total: number) => <footer className="rm-footer"><span>Inventario turpial · Remisión de entrega</span><span>Página {page} de {total}</span></footer>;
  return <>
    <div ref={measureRef} className="rm-measure" aria-hidden="true">
      <div className="rm-content"><RemissionHeader remision={remision} />
        <RemissionTable remision={remision} indices={remision.items.map((_, index) => index)} />
        <RemissionClosing remision={remision} notes={notes} indices={closingIndices} />{footer(1, 1)}
      </div>
    </div>
    <div className="rm-document" style={{ width: 794 * scale, height: (pages.length * 1122 + Math.max(0, pages.length - 1) * 20) * scale }}>
      <div className="rm-sheets" style={{ transform: `scale(${scale})` }}>
        {pages.map((page, index) => <section className="a4-print-container rm-sheet" key={index} aria-label={`Remisión, página ${index + 1} de ${pages.length}`}>
          <div className="rm-content"><RemissionHeader remision={remision} />
            {!!page.rows.length && <RemissionTable remision={remision} indices={page.rows} />}
            <RemissionClosing remision={remision} notes={notes} indices={page.closing} />{footer(index + 1, pages.length)}
          </div>
        </section>)}
      </div>
    </div>
  </>;
}
