import { reportDate, reportQuantity, type InventoryReport } from '../../domain/inventoryReport';
import { formatKg, formatUnitWeight } from '../../domain/weight';
import { formatCOP } from '../../domain/money';

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

export function InventoryReportTable({ report, indices }: { report: InventoryReport; indices: number[] }) {
  return <table className="ir-table"><colgroup>{[4, 28, 10, 12, 12, 14, 20].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
    <thead><tr><th>#</th><th>Producto</th><th>Cantidad</th><th>Peso total (kg)</th><th>Valor unitario (COP)</th><th>Valor de stock (COP)</th><th>Ubicación</th></tr></thead>
    <tbody>{indices.map(index => {
      const row = report.rows[index];
      return <tr data-report-row key={row.id}><td>{index + 1}</td>
        <td><strong className="ir-product-name">{row.name}</strong><small className="ir-product-code">{row.code}</small>{row.brand && <small>Marca: {row.brand}</small>}
          <small>{row.category}</small>{row.unitWeight && <small>Peso por unidad: {formatUnitWeight(row.unitWeight)}</small>}
          {row.damaged > 0 && <small>Dañado declarado: {reportQuantity(row.damaged)} {row.unit}</small>}
        </td>
        <td>{row.quantity === null ? 'Pendiente' : `${reportQuantity(row.quantity)} ${row.unit}`}</td>
        <td>{row.weightKg === null ? 'Pendiente' : row.weightKg.toLocaleString('es-CO', { maximumFractionDigits: 9 })}</td>
        <td>{formatCOP(row.unitValueCOP)}</td><td>{row.valueCOP === null ? 'Pendiente' : formatCOP(row.valueCOP)}</td><td>{row.location}</td>
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
