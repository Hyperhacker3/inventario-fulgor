import { Select } from '../ui/Select';
import type { WeightDraft } from '../../domain/weight';
export function ItemWeightFields({ value, onChange, stockUnit, disabled }: { value: WeightDraft; onChange: (value: WeightDraft) => void; stockUnit: string; disabled?: boolean }) {
  return <fieldset disabled={disabled} className="space-y-2" aria-label={`Peso por 1 ${stockUnit.toUpperCase()}`}>
    <div className="item-form-pair item-weight-controls">
      <label className="text-xs font-bold text-[#454651] uppercase"><span className="item-field-title">Unidad del peso</span>
        <Select value={value.unit} onChange={event => onChange({ ...value, unit: event.target.value as 'g' | 'kg' })} aria-label="Unidad del peso" className="block w-full mt-2 border rounded-lg p-2.5 bg-white"><option value="g">Gramos (g)</option><option value="kg">Kilogramos (kg)</option></Select>
      </label>
      <label className="text-xs font-bold text-[#454651] uppercase"><span className="item-field-title">Peso por 1 {stockUnit.toUpperCase()}</span>
        <input autoComplete="off" autoCorrect="off" spellCheck={false} type="number" min="0.001" step="0.001" max={value.unit === 'g' ? '999999999.999' : '999999.999'} value={value.amount} onChange={event => onChange({ ...value, amount: event.target.value })} aria-label="Peso por unidad" placeholder="Pendiente de declarar" className="block w-full mt-2 min-w-0 border rounded-lg p-2.5" />
      </label>
    </div><p className="text-xs text-slate-500">Indique el peso de una unidad del inventario, no del stock completo. En las remisiones se convierte automáticamente a kilos. Deje vacío si aún no lo conoce.</p>
  </fieldset>;
}
