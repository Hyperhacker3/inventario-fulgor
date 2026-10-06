import { useId } from 'react';
import { NumberInput } from '../NumberInput';
import { formatCOP, MAX_UNIT_VALUE_COP } from '../../domain/money';

export function ItemValueField({ value, onChange, unit, disabled = false }: { value: number; onChange: (value: number) => void; unit: string; disabled?: boolean }) {
  const id = useId();
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-semibold">Valor por 1 {unit.toUpperCase()} (COP)</label>
    <NumberInput id={id} required min="0" step="0.01" max={MAX_UNIT_VALUE_COP} value={value} onValueChange={onChange} disabled={disabled}
      aria-describedby={`${id}-hint`} className="block w-full border rounded-lg p-2.5" />
    <p id={`${id}-hint`} className="text-xs text-slate-500">{formatCOP(value)} por {unit.toUpperCase()}. Valor de una unidad en pesos colombianos; deje 0 mientras lo define.</p>
  </div>;
}
