import { internalDate, internalNumber, internalStatus, type InternalDispatch } from '../../domain/internalDispatch';

export function InternalPrintHeader({loan}:{loan:InternalDispatch}) {
  const company=loan.empresa;
  return <header className="ip-header"><div className="rm-brand"><div className="rm-logo"><img src={company.logo} alt={company.nombre} width={303} height={131}/></div><div className="rm-company"><strong className="rm-company-name">{company.nombre}</strong><span>NIT: {company.nit}</span><span>{company.direccion}</span><span>{company.telefono}</span></div><div className="rm-document-meta"><span className="rm-eyebrow">SALIDA INTERNA</span><p>{internalDate(loan.created_at)}</p></div></div><h1 className="ip-title">{loan.codigo}</h1>
    <div className="ip-parties"><div><strong>ENTREGA</strong><p>{loan.entregado_por}</p><p>{loan.cargo_entregado}</p></div><div><strong>RECIBE</strong><p>{loan.recibido_por}</p><p>{loan.cargo_recibido}</p></div></div>
    <p className="ip-caption"><strong>PROYECTO DE DESTINO:</strong> {loan.proyecto?.nombre || 'Sin proyecto'}{loan.proyecto?.ubicacion?` · ${loan.proyecto.ubicacion}`:''}</p>
    <p className="ip-caption"><strong>{loan.estado==='PERMANENTE'?'SALIDA PERMANENTE':'SALIDA TEMPORAL'}</strong> · {loan.estado==='PERMANENTE'?'Sin devolución requerida':internalStatus(loan.estado)}</p></header>;
}
export function InternalPrintTable({loan,indices}:{loan:InternalDispatch;indices:number[]}) {
  return <table className="ip-table"><colgroup>{[4,12,39,9,12,12,12].map((width,i)=><col key={i} style={{width:`${width}%`}}/>)}</colgroup><thead><tr>{['#','CÓDIGO','PRODUCTO','UNIDAD','ENTREGADO','DEVUELTO',loan.estado==='PERMANENTE'?'PERMANENTE':'PENDIENTE'].map(title=><th key={title}>{title}</th>)}</tr></thead><tbody>{indices.map(index=>{const row=loan.items[index];return <tr data-internal-row key={row.elementoId}><td>{index+1}</td><td>{row.codigo}</td><td><strong>{row.nombre}</strong>{row.marca&&<p>{row.marca}</p>}<small>{row.ubicacion}</small></td><td>{row.unidad}</td><td>{internalNumber(row.cantidad)}</td><td>{internalNumber(row.devuelta)}</td><td>{internalNumber(loan.estado==='PERMANENTE'?(row.permanente ?? row.cantidad-row.devuelta):row.pendiente)}</td></tr>;})}</tbody></table>;
}
export function internalClosing(loan:InternalDispatch) {
  return [...(loan.conversion?[<p key="conversion"><strong>Convertida de temporal a permanente el {internalDate(loan.conversion.created_at)}</strong> · Registró: {loan.conversion.registrado_por} · {loan.conversion.cargo}. Se descontaron únicamente las cantidades pendientes de devolución.</p>]:loan.estado==='PERMANENTE'?[<p key="permanent">Salida permanente desde su registro. Las cantidades permanentes están descontadas del stock y no requieren devolución.</p>]:[]),<p key="intro">Registro de devoluciones</p>,...(loan.devoluciones.length?loan.devoluciones.flatMap(event=>[
    <p key={event.id}><strong>{internalDate(event.created_at)}</strong> · Registró: {event.registrado_por} · {event.cargo}</p>,
    ...event.items.map(row=><p key={`${event.id}-${row.elementoId}`}>{row.codigo} · {row.nombre} · Regresaron {internalNumber(row.cantidad)} {row.unidad}</p>),
  ]):[<p key="none">Sin devoluciones registradas.</p>])];
}
