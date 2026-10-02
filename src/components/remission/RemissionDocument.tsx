import type { Remision } from '../../types';

export function RemissionDocument({ remision, scale }: { remision: Remision; scale: number }) {
  const totalUnidades = remision.items.reduce((sum, item) => sum + item.cantidad, 0);
  return (
            <div
              style={{
                width: `${794}px`,
                minHeight: `${1123}px`,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
              className="a4-print-container bg-white text-[#131b2e] p-8 sm:p-12 rounded-xl shadow-2xl border border-[#cbd5e1] flex flex-col justify-between select-text"
            >
              {/* Top Section */}
              <div>
                {/* Header */}
                <div className="flex justify-between items-start pb-5 border-b-2 border-[#253685]">
                  {/* Brand Info */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-xl bg-[#253685] flex items-center justify-center text-white shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        solar_power
                      </span>
                    </div>
                    <div>
                      <h1 className="text-2xl font-black text-[#253685] tracking-tight">EL TURPIAL</h1>
                      <p className="text-[11px] text-[#767682]">Logística Fotovoltaica & Suministros Solares</p>
                    </div>
                  </div>

                  {/* Remission Box */}
                  <div className="text-right">
                    <span className="text-[10px] font-bold tracking-widest text-[#454651] uppercase block mb-1">
                      REMISIÓN DE ENTREGA
                    </span>
                    <div className="font-mono-code font-bold text-lg text-[#dd4c42] bg-[#fce8e6] px-3.5 py-1 rounded-lg border border-[#ffdad6] inline-block shadow-2xs">
                      {remision.numeroRemision}
                    </div>
                    <p className="text-xs text-[#454651] mt-1.5">
                      <strong>Fecha:</strong> {remision.fecha}
                    </p>
                  </div>
                </div>

                {/* Project & Client Information Box */}
                <div className="my-5 p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#767682] block mb-0.5">
                      PROYECTO DE DESTINO
                    </span>
                    <p className="font-bold text-sm text-[#253685]">{remision.proyectoNombre}</p>
                    <p className="text-[#454651] mt-0.5">{remision.ubicacion}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#767682] block mb-0.5">
                      CLIENTE / TITULAR
                    </span>
                    <p className="font-bold text-sm text-[#131b2e]">{remision.cliente}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#767682] block mb-0.5">
                      DESPACHADO POR (BODEGA)
                    </span>
                    <p className="font-semibold text-[#131b2e]">{remision.entregadoPor}</p>
                    <p className="text-[#767682]">{remision.cargoEntregado}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#767682] block mb-0.5">
                      RECIBE EN SITIO (OBRA)
                    </span>
                    <p className="font-semibold text-[#131b2e]">{remision.recibidoPor}</p>
                    <p className="text-[#767682]">{remision.cargoRecibido}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-5">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#253685] text-white">
                        <th className="p-2.5 rounded-l-lg text-center w-10">#</th>
                        <th className="p-2.5 w-24">CÓDIGO</th>
                        <th className="p-2.5">DESCRIPCIÓN DEL COMPONENTE SOLAR</th>
                        <th className="p-2.5 text-right w-24">CANTIDAD</th>
                        <th className="p-2.5 rounded-r-lg text-center w-16">UNIDAD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {remision.items.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-[#f8fafc]' : 'bg-white'}>
                          <td className="p-2.5 text-center font-mono-code text-[#767682]">{idx + 1}</td>
                          <td className="p-2.5 font-mono-code font-bold text-[#253685]">{item.codigo}</td>
                          <td className="p-2.5 font-medium text-[#131b2e]">{item.nombre}</td>
                          <td className="p-2.5 text-right font-mono-code font-bold text-sm text-[#131b2e]">
                            {item.cantidad}
                          </td>
                          <td className="p-2.5 text-center text-[#767682] font-mono-code">{item.unidad}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#253685] bg-[#eaedff]/60 font-bold">
                        <td colSpan={3} className="p-2.5 text-right uppercase text-[11px] text-[#253685]">
                          Total Unidades Despachadas:
                        </td>
                        <td className="p-2.5 text-right font-mono-code text-sm text-[#253685]">
                          {totalUnidades}
                        </td>
                        <td className="p-2.5 text-center text-[10px] text-[#253685]">ITEMS</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Observaciones */}
                <div className="p-3.5 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] text-xs mb-6">
                  <span className="font-bold uppercase text-[10px] text-[#767682] block mb-1">
                    OBSERVACIONES & CONDICIONES DE TRANSPORTE
                  </span>
                  <p className="text-[#454651] leading-relaxed">
                    {remision.observaciones || 'Sin observaciones.'}
                  </p>
                </div>
              </div>

              {/* Signatures & Footer Section */}
              <div>
                {/* Signatures Section */}
                <div className="pt-6 border-t border-[#cbd5e1] grid grid-cols-2 gap-12 text-xs">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-full border-b border-[#131b2e] mb-2 pb-8 text-[#cbd5e1] italic">
                      Firma responsable despacho
                    </div>
                    <span className="font-bold text-[#131b2e]">{remision.entregadoPor}</span>
                    <span className="text-[11px] text-[#767682]">{remision.cargoEntregado}</span>
                    <span className="text-[10px] text-[#767682] mt-0.5">EL TURPIAL - Bodega Central</span>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="w-full border-b border-[#131b2e] mb-2 pb-8 text-[#cbd5e1] italic">
                      Firma recibido a conformidad
                    </div>
                    <span className="font-bold text-[#131b2e]">{remision.recibidoPor}</span>
                    <span className="text-[11px] text-[#767682]">{remision.cargoRecibido}</span>
                    <span className="text-[10px] text-[#767682] mt-0.5">{remision.proyectoNombre}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-4 mt-6 border-t border-[#e2e8f0] flex justify-between items-center text-[10px] text-[#767682]">
                  <span>Documento generado por Inventario turpial</span>
                </div>
              </div>
            </div>
  );
}
