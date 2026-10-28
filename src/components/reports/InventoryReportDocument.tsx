import { useEffect, useRef, useState } from 'react';
import type { InventoryReport } from '../../domain/inventoryReport';
import { paginateRemission, type RemissionPage } from '../../domain/remissionLayout';
import { InventoryReportHeader, InventoryReportTable, InventoryReportSummary } from './InventoryReportSections';
import '../remission/remission.css';
import './inventory-report.css';

export function InventoryReportDocument({ report, scale, onReady }: { report: InventoryReport; scale: number; onReady: (ready: boolean) => void }) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<RemissionPage[]>([]);
  const footer = (page: number, total: number) => <footer className="rm-footer"><span>{report.company.nombre} · Informe de inventario</span><span>Página {page} de {total}</span></footer>;
  useEffect(() => {
    let cancelled = false;
    onReady(false);
    const measure = () => {
      if (cancelled || !measureRef.current) return;
      const node = measureRef.current;
      const height = (selector: string) => node.querySelector(selector)!.getBoundingClientRect().height;
      const rows = [...node.querySelectorAll('[data-report-row]')].map(row => row.getBoundingClientRect().height + 1);
      const closing = [...node.querySelectorAll('[data-report-summary]')].map(row => row.getBoundingClientRect().height);
      const capacity = 1122 - 72 - height('.ir-header') - height('.rm-footer') - 20;
      setPages(paginateRemission(rows, closing, capacity, height('thead')));
      onReady(true);
    };
    const logo = measureRef.current?.querySelector('img');
    void Promise.all([document.fonts?.ready, logo?.decode?.().catch(() => {})]).then(measure);
    return () => { cancelled = true; };
  }, [report, onReady]);
  return <>
    <div ref={measureRef} className="rm-measure" aria-hidden="true"><div className="rm-content">
      <InventoryReportHeader report={report} /><InventoryReportTable report={report} indices={report.rows.map((_, index) => index)} />
      <InventoryReportSummary report={report} />{footer(1, 1)}
    </div></div>
    <div className="rm-document" style={{ width: 794 * scale, height: (pages.length * 1122 + Math.max(0, pages.length - 1) * 20) * scale }}>
      <div className="rm-sheets" style={{ transform: `scale(${scale})` }}>{pages.map((page, index) => <section key={index} className="a4-print-container rm-sheet" aria-label={`Informe, página ${index + 1} de ${pages.length}`}>
        <div className="rm-content"><InventoryReportHeader report={report} />
          {!!page.rows.length && <InventoryReportTable report={report} indices={page.rows} />}
          <InventoryReportSummary report={report} indices={page.closing} />{footer(index + 1, pages.length)}
        </div>
      </section>)}</div>
    </div>
  </>;
}
