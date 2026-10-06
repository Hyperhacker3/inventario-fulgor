import { Select } from '../ui/Select';
import { NumberInput } from '../NumberInput';

interface Props {
  quantity: number; unit: string; minimum: number;
  onQuantity: (value: number) => void; onUnit: (value: string) => void; onMinimum: (value: number) => void;
}
const units = ['UND', 'MTS', 'RLL', 'KG', 'KL', 'PAR', 'PARES', 'JGO', 'JUEGO', 'CAJA', 'COSTALES'];
export function ItemStockFields({ quantity, unit, minimum, onQuantity, onUnit, onMinimum }: Props) {
  return <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t">
    <label className="text-xs font-bold text-[#454651] uppercase">Stock inicial
      <div className="flex mt-2 border rounded-lg overflow-hidden bg-white">
        <button type="button" onClick={() => onQuantity(Math.max(0, quantity - 1))} className="px-3 bg-[#f8fafc]">−</button>
        <NumberInput id="input-stock-inicial" min="0" step="0.001" required value={quantity}
          onValueChange={onQuantity} className="w-full text-center py-2" />
        <button type="button" onClick={() => onQuantity(quantity + 1)} className="px-3 bg-[#f8fafc]">+</button>
      </div>
    </label>
    <label className="text-xs font-bold text-[#454651] uppercase">Unidad de medida
      <Select id="select-unidad" value={unit} onChange={event => onUnit(event.target.value)} className="block w-full mt-2 px-3 py-2 border rounded-lg bg-white">
        {units.map(value => <option key={value} value={value}>{value}</option>)}
      </Select>
    </label>
    <label className="text-xs font-bold text-[#454651] uppercase">Stock mínimo
      <NumberInput min="0" step="0.001" required value={minimum} onValueChange={onMinimum}
        className="block w-full mt-2 px-3 py-2 border rounded-lg" />
    </label>
  </section>;
}
