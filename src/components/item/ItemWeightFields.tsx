import { Select } from '../ui/Select';
import type { WeightDraft } from '../../domain/weight';
export function ItemWeightFields({ value, onChange, stockUnit, disabled }: { value: WeightDraft; onChange: (value: WeightDraft) => void; stockUnit: string; disabled?: boolean }) {
  return <fieldset disabled={disabled} className="space-y-2">
    <legend className="text-sm font-semibold">Peso por 1 {stockUnit.toUpperCase()}</legend>
    <div className="flex gap-3">
      <input autoComplete="off" autoCorrect="off" spellCheck={false} type="number" min="0.001" step="0.001" max={value.unit === 'g' ? '999999999.999' : '999999.999'} value={value.amount} onChange={event => onChange({ ...value, amount: event.target.value })} aria-label="Peso por unidad" placeholder="Pendiente de declarar" className="w-full min-w-0 border rounded-lg p-2.5" />
      <Select value={value.unit} onChange={event => onChange({ ...value, unit: event.target.value as 'g' | 'kg' })} aria-label="Unidad del peso" className="border rounded-lg p-2.5 bg-white"><option value="g">Gramos (g)</option><option value="kg">Kilogramos (kg)</option></Select>
    </div><p className="text-xs text-slate-500">Indique el peso de una unidad del inventario, no del stock completo. En las remisiones se convierte automáticamente a kilos. Deje vacío si aún no lo conoce.</p>
  </fieldset>;
}
