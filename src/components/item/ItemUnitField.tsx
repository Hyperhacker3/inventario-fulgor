import { useId } from 'react';
import { Select } from '../ui/Select';

const units = ['UND', 'MTS', 'RLL', 'KG', 'KL', 'PAR', 'PARES', 'JGO', 'JUEGO', 'CAJA', 'COSTALES'];

export function ItemUnitField({ value, onChange, id, disabled = false }: {
  value: string; onChange: (value: string) => void; id?: string; disabled?: boolean;
}) {
  const generatedId = useId(), controlId = id || `item-unit-${generatedId}`;
  return <label htmlFor={controlId} className="block min-w-0 text-xs font-bold text-[#454651] uppercase"><span className="item-field-title">Unidad de medida</span>
    <Select id={controlId} aria-label="Unidad de medida" value={value} disabled={disabled} required onChange={event => onChange(event.target.value)}
      className="block w-full mt-2 px-3 py-2 border rounded-lg bg-white">
      {!units.includes(value) && <option value={value}>{value}</option>}
      {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
    </Select>
  </label>;
}
