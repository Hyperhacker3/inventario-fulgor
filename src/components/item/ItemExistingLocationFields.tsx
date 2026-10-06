import { useId } from 'react';
import { Select } from '../ui/Select';
import type { Almacen, Estanteria, Caja } from '../../types';
import type { ItemLocationDraft } from '../../domain/itemLocation';

interface Props {
  value: ItemLocationDraft; onChange: (value: ItemLocationDraft) => void;
  warehouses: Almacen[]; racks: Estanteria[]; boxes: Caja[]; disabled?: boolean;
}
export function ItemExistingLocationFields({ value, onChange, warehouses, racks, boxes, disabled = false }: Props) {
  const id = useId();
  const availableRacks = racks.filter(rack => value.warehouseId && rack.almacenId === value.warehouseId);
  const availableBoxes = boxes.filter(box => value.rackId && box.estanteriaId === value.rackId);
  return <fieldset disabled={disabled} className="min-w-0 border rounded-xl bg-[#f8fafc] p-4">
    <legend className="text-sm font-semibold text-[#253685] px-1">Ubicación del elemento</legend>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="min-w-0 sm:col-span-2"><label htmlFor={`${id}-warehouse`} className="block text-sm font-semibold">Almacén</label>
        <Select id={`${id}-warehouse`} value={value.warehouseId} disabled={disabled} className="block w-full mt-1 p-2.5 border rounded-lg"
          onChange={event => onChange({ warehouseId: event.target.value, rackId: '', boxId: '' })}>
          <option value="">Sin almacén asignado</option>
          {warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.nombre} ({warehouse.codigo})</option>)}
        </Select>
      </div>
      <div className="min-w-0"><label htmlFor={`${id}-rack`} className="block text-sm font-semibold">Estantería</label>
        <Select id={`${id}-rack`} value={value.rackId} disabled={disabled || !value.warehouseId} className="block w-full mt-1 p-2.5 border rounded-lg"
          onChange={event => onChange({ ...value, rackId: event.target.value, boxId: '' })}>
          <option value="">Sin estantería asignada</option>
          {availableRacks.map(rack => <option key={rack.id} value={rack.id}>{rack.codigo} - {rack.nombre}</option>)}
        </Select>
      </div>
      <div className="min-w-0"><label htmlFor={`${id}-box`} className="block text-sm font-semibold">Caja</label>
        <Select id={`${id}-box`} value={value.boxId} disabled={disabled || !value.rackId} className="block w-full mt-1 p-2.5 border rounded-lg"
          onChange={event => onChange({ ...value, boxId: event.target.value })}>
          <option value="">Sin caja asignada</option>
          {availableBoxes.map(box => <option key={box.id} value={box.id}>{box.codigoCaja}</option>)}
        </Select>
      </div>
    </div>
    <p className="mt-3 text-xs text-slate-500">Seleccione ubicaciones existentes. La estantería y la caja son opcionales.</p>
  </fieldset>;
}
