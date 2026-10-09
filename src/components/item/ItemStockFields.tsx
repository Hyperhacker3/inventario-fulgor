import { Select } from '../ui/Select';
import { NumberInput } from '../NumberInput';
import type { ReactNode } from 'react';

interface Props {
  quantity: number; unit: string; minimum: number;
  onQuantity: (value: number) => void; onUnit: (value: string) => void; onMinimum: (value: number) => void;
  valueField: ReactNode;
}
const units = ['UND', 'MTS', 'RLL', 'KG', 'KL', 'PAR', 'PARES', 'JGO', 'JUEGO', 'CAJA', 'COSTALES'];
export function ItemStockFields({ quantity, unit, minimum, onQuantity, onUnit, onMinimum, valueField }: Props) {
  return <section className="item-stock-controls space-y-6 pt-2 border-t">
    <div className="item-form-pair">
    <label className="text-xs font-bold text-[#454651] uppercase"><span className="item-field-title">Unidad de medida</span>
      <Select id="select-unidad" value={unit} onChange={event => onUnit(event.target.value)} className="block w-full mt-2 px-3 py-2 border rounded-lg bg-white">
        {units.map(value => <option key={value} value={value}>{value}</option>)}
      </Select>
    </label>
    <label className="text-xs font-bold text-[#454651] uppercase"><span className="item-field-title">Stock inicial</span>
      <NumberInput id="input-stock-inicial" min="0" step="0.001" required value={quantity}
        onValueChange={onQuantity} className="block w-full mt-2 px-3 py-2 border rounded-lg" />
    </label>
    </div>
    <div className="item-form-pair">
    <label className="text-xs font-bold text-[#454651] uppercase"><span className="item-field-title">Stock mínimo</span>
      <NumberInput min="0" step="0.001" required value={minimum} onValueChange={onMinimum}
        className="block w-full mt-2 px-3 py-2 border rounded-lg" />
    </label>
    {valueField}
    </div>
  </section>;
}
