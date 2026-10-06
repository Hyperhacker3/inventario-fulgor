import { EMPTY_LOCATION_VALUES, formatCOP, type LocationValues } from '../../domain/money';

export const locationValueHint = 'Stock confirmado × valor unitario en COP. El total incluye material dañado. Se excluyen archivados y conteos pendientes.';

export function LocationValueSummary({ values = EMPTY_LOCATION_VALUES, prominent = false }: { values?: LocationValues; prominent?: boolean }) {
  return <dl className={`grid ${prominent ? 'sm:grid-cols-2 gap-3 w-full' : 'gap-2 border-t border-slate-100 pt-3'}`}>
    {[
      { label: 'Valor total', value: values.total, color: 'text-[#253685]' },
      { label: 'Valor del material dañado', value: values.damaged, color: 'text-rose-700' },
    ].map(row => <div key={row.label} className={prominent ? 'min-w-0 bg-slate-50 rounded-xl p-4' : 'min-w-0'}>
      <dt className="text-xs text-slate-600">{row.label}</dt>
      <dd className={`${prominent ? 'text-xl' : 'text-sm'} font-bold break-words ${row.color}`}>{formatCOP(row.value)}</dd>
    </div>)}
  </dl>;
}
