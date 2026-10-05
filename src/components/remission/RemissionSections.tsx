import type { Remision } from '../../types';
import { formatKg, lineWeightKg, totalWeight } from '../../domain/weight';
const quantity = (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 3 });
const date = (value?: string) => value?.match(/^\d{4}-\d{2}-\d{2}$/) ? value.split('-').reverse().join('/') : value;
function Field({ label, value }: { label: string; value?: string }) {
  return <div className="rm-field"><span>{label}</span><strong>{value || '____________________'}</strong></div>;
}
export function RemissionHeader({ remision: r }: { remision: Remision }) {
  const details = r.datosTransporte;
  return <header className="rm-header">
    <div className="rm-brand"><img src="/logo-completo.png" alt="EL TURPIAL" width="303" height="131" /><div><span className="rm-eyebrow">FORMATO DE REMISIÓN</span><h1>{r.numeroRemision}</h1><p>Fecha de remisión: <strong>{r.fecha}</strong></p></div></div>
    <p className="rm-declaration">Constancia de entrega de los materiales relacionados a continuación, en las cantidades indicadas. Las novedades se registran en las observaciones.</p>
    <div className="rm-details"><Field label="Proyecto de obra" value={r.proyectoNombre} /><Field label="Cliente / destinatario" value={r.cliente} />
      <Field label="Persona que realiza la remisión" value={[r.entregadoPor, r.cargoEntregado].filter(Boolean).join(' · ')} /><Field label="Entregar a" value={[r.recibidoPor, r.cargoRecibido].filter(Boolean).join(' · ')} />
      <Field label="Lugar de destino" value={r.ubicacion} /><Field label="Teléfono de quien recibe" value={details?.telefonoRecibe} /><Field label="Teléfono de quien remite" value={details?.telefonoRemite} /><Field label="Fecha de devolución (si aplica)" value={date(details?.fechaDevolucion)} /></div>
  </header>;
}
export function RemissionTable({ remision, indices }: { remision: Remision; indices: number[] }) {
  return <table className="rm-table"><colgroup><col style={{ width: '6%' }} /><col style={{ width: '13%' }} /><col style={{ width: '44%' }} /><col style={{ width: '9%' }} /><col style={{ width: '14%' }} /><col style={{ width: '14%' }} /></colgroup>
    <thead><tr><th>Ítem</th><th>Cód. / Ref.</th><th>Descripción</th><th>Unidad</th><th>Cantidad</th><th>Peso (kg)</th></tr></thead>
    <tbody>{indices.map(index => { const item = remision.items[index]; return <tr data-material-row key={index}><td>{index + 1}</td><td>{item.codigo}</td><td>{item.nombre}{item.pesoUnitario && <small className="rm-unit-weight">Por unidad: {formatKg(lineWeightKg(item.pesoUnitario, 1)!)}</small>}</td><td>{item.unidad.toUpperCase()}</td><td>{quantity(item.cantidad)}</td><td>{item.pesoTotalKg == null ? 'Pendiente' : item.pesoTotalKg.toLocaleString('es-CO', { maximumFractionDigits: 9 })}</td></tr>; })}</tbody>
  </table>;
}
export function RemissionClosing({ remision: r, notes, indices }: { remision: Remision; notes: string[]; indices: number[] }) {
  const totals = new Map<string, number>();
  r.items.forEach(item => { const unit = item.unidad.toUpperCase(); totals.set(unit, (totals.get(unit) || 0) + item.cantidad); });
  const weights = totalWeight(r.items);
  const details = r.datosTransporte;
  return <>{indices.map(index => {
    if (index === 0) return <div data-closing-block className="rm-summary" key={index}><strong>{r.items.length} referencias</strong><span>{[...totals].map(([unit, total]) => `${quantity(total)} ${unit}`).join(' · ')}<br />Peso {weights.pending ? 'parcial conocido' : 'total'}: {weights.known ? formatKg(weights.total) : 'Sin declarar'}{weights.pending > 0 && <><br />{weights.pending} material(es) con peso pendiente</>}</span></div>;
    if (index <= notes.length) return <div data-closing-block key={index} className="rm-note">{index === 1 && <h2>Observaciones</h2>}<p>{notes[index - 1]}</p></div>;
    if (index === notes.length + 1) return <div data-closing-block key={index} className="rm-delivery"><h2>Datos de despacho y transporte</h2><div className="rm-details"><Field label="Entregado a / transportador" value={details?.transportador} /><Field label="Número de cédula" value={details?.cedulaTransportador} /><Field label="Placa del vehículo" value={details?.placaVehiculo} /><Field label="Teléfono del transportador" value={details?.telefonoTransportador} /><Field label="Fecha de despacho" value={date(details?.fechaDespacho) || r.fecha} /></div></div>;
    return <div data-closing-block key={index} className="rm-signatures"><p>Favor devolver firmado por correo o en físico, con nombre legible de quien recibe.</p><div className="rm-signature-grid">
      {['Proveedor / entrega', 'Transportador', 'Recibe a conformidad'].map((label, position) => <div key={label}><div className="rm-signature-space" /><h2>{label}</h2><strong>{[r.entregadoPor, details?.transportador, r.recibidoPor][position] || 'Nombre: ____________________'}</strong><span>{[r.cargoEntregado, details?.cedulaTransportador, r.cargoRecibido][position] || '\u00a0'}</span></div>)}
    </div></div>;
  })}</>;
}
