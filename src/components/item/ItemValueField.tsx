import { useId } from 'react';
import { NumberInput } from '../NumberInput';
import { MAX_UNIT_VALUE_COP } from '../../domain/money';

export function ItemValueField({ value, onChange, unit, disabled = false }: { value: number; onChange: (value: number) => void; unit: string; disabled?: boolean }) {
  const id = useId();
  return <div className="space-y-2">
    <label htmlFor={id} className="item-field-title block text-xs font-bold text-[#454651] uppercase">Valor por 1 {unit.toUpperCase()} (COP)</label>
    <NumberInput id={id} required min="0" step="0.01" max={MAX_UNIT_VALUE_COP} value={value} onValueChange={onChange} disabled={disabled}
      className="block w-full border rounded-lg p-2.5" />
  </div>;
}
