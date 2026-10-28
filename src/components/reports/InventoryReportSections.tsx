import { reportDate, reportQuantity, type InventoryReport } from '../../domain/inventoryReport';
import { formatKg, formatUnitWeight } from '../../domain/weight';
import { formatCOP } from '../../domain/money';
import type { ReactNode } from 'react';

export function InventoryReportHeader({ report }: { report: InventoryReport }) {
  const company = report.company;
  return <header className="ir-header">
    <div className="rm-brand"><div className="rm-logo"><img src={company.logo} alt={company.nombre} width="303" height="131" /></div>
      <div className="rm-company"><strong className="rm-company-name">{company.nombre}</strong><span className="rm-company-nit">NIT: {company.nit}</span>
        {company.direccion && <span>{company.direccion}</span>}{company.telefono && <span>Tel.: {company.telefono}</span>}
      </div>
      <div className="rm-document-meta"><span className="rm-eyebrow">INFORME DE INVENTARIO</span><p>{reportDate(report.createdAt)}</p></div>
    </div>
    <h1 className="ir-title">Informe de productos seleccionados</h1>
    <p className="ir-intro">Generado por: {report.generatedBy} · {report.rows.length} producto(s). Cantidades de stock total, incluidas las unidades dañadas declaradas.</p>
  </header>;
}

function ReportCell({ value, className, children, multiline = false }: { value: string; className?: string; children?: ReactNode; multiline?: boolean }) {
  return <td className={className}><span className={`ir-cell${multiline ? ' ir-cell-multiline' : ''}`} title={value}>
    {multiline ? <span className="ir-cell-text">{children ?? value}</span> : children ?? value}
  </span></td>;
}

export function InventoryReportTable({ report, indices }: { report: InventoryReport; indices: number[] }) {
  return <table className="ir-table"><colgroup>{[4, 7, 41, 7, 7, 9, 7, 18].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
    <thead><tr><th>#</th><th>CÓDIGO</th><th>PRODUCTO</th><th>MARCA</th><th>CANTIDAD</th><th>VALOR UND</th><th>PESO UND</th><th>UBICACIÓN</th></tr></thead>
    <tbody>{indices.map(index => {
      const row = report.rows[index];
      const damage = row.damaged > 0 ? ` · Dañado declarado: ${reportQuantity(row.damaged)} ${row.unit}` : '';
      return <tr data-report-row key={row.id}>
        <ReportCell value={String(index + 1)} /><ReportCell value={row.code} className="ir-product-code" />
        <ReportCell value={`${row.name}${damage}`} multiline><strong className="ir-product-name">{row.name}</strong>{damage && <small>{damage}</small>}</ReportCell>
        <ReportCell value={row.brand || '—'} />
        <ReportCell value={row.quantity === null ? 'Pendiente' : `${reportQuantity(row.quantity)} ${row.unit}`} />
        <ReportCell value={formatCOP(row.unitValueCOP)} /><ReportCell value={row.unitWeight ? formatUnitWeight(row.unitWeight) : '—'} /><ReportCell value={row.location} multiline />
      </tr>;
    })}</tbody>
  </table>;
}

function summaryEntries(report: InventoryReport): [string, string][] {
  return [
    ['Productos incluidos', String(report.rows.length)],
    ...report.quantities.map(row => [`Cantidad ${row.unit}`, `${reportQuantity(row.quantity)} ${row.unit}`] as [string, string]),
    [report.pendingWeight ? 'Peso parcial conocido' : 'Peso total', report.pendingWeight === report.rows.length ? 'Sin peso total verificable' : formatKg(report.weightKg)],
    [report.pendingValue ? 'Valor parcial conocido' : 'Valor total de stock', report.pendingValue === report.rows.length ? 'Sin cantidades verificadas' : formatCOP(report.valueCOP)],
    ...(report.pendingQuantity ? [['Cantidad pendiente', `${report.pendingQuantity} producto(s) por verificar`]] as [string, string][] : []),
    ...(report.pendingWeight ? [['Peso pendiente', `${report.pendingWeight} producto(s) sin peso total verificable`]] as [string, string][] : []),
    ...(report.pendingValue ? [['Valor pendiente', `${report.pendingValue} producto(s) con cantidad por verificar`]] as [string, string][] : []),
    ...(report.zeroPrice ? [['Valor unitario en cero', `${report.zeroPrice} producto(s) registrados con 0 COP`]] as [string, string][] : []),
    ['Alcance', 'Solo los productos seleccionados. Las cantidades se agrupan por unidad; los datos pendientes no se sustituyen por cantidades, pesos o valores inventados.'],
  ];
}

export function InventoryReportSummary({ report, indices }: { report: InventoryReport; indices?: number[] }) {
  const entries = summaryEntries(report);
  return <>{(indices || entries.map((_, index) => index)).map(index => <div data-report-summary key={index} className="ir-summary-line">
    <strong>{entries[index][0]}</strong><span>{entries[index][1]}</span>
  </div>)}</>;
}
